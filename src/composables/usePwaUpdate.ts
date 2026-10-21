import { ref } from 'vue'
import { useRegisterSW } from 'virtual:pwa-register/vue'

let registrationRef: ServiceWorkerRegistration | undefined = undefined
let isVisibilityListenerAttached = false
let isControllerChangeListenerAttached = false

const isChecking = ref(false)
const feedbackMessage = ref('')

const { offlineReady, needRefresh, updateServiceWorker: baseUpdateSW } = useRegisterSW({
  immediate: true,
  onRegisteredSW(_swScriptUrl, registration) {
    registrationRef = registration

    if (registration) {
      // Checa atualizações quando o app volta ao primeiro plano (foreground)
      if (typeof document !== 'undefined' && !isVisibilityListenerAttached) {
        isVisibilityListenerAttached = true
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') {
            registration.update().catch((err) => console.warn('Erro ao verificar atualização no foreground:', err))
          }
        })
      }

      // Periodicamente verifica novas versões a cada 30 minutos
      setInterval(() => {
        registration.update().catch((err) => console.warn('Erro na verificação periódica de atualização:', err))
      }, 30 * 60 * 1000)
    }
  },
  onNeedRefresh() {
    feedbackMessage.value = 'Nova versão disponível para atualização!'
  },
  onOfflineReady() {
    // App pronto para uso offline
  }
})

// Escuta quando um novo Service Worker assume o controle dos clientes (clientsClaim)
if (typeof window !== 'undefined' && 'serviceWorker' in navigator && !isControllerChangeListenerAttached) {
  isControllerChangeListenerAttached = true
  let refreshing = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true
      window.location.reload()
    }
  })
}

/**
 * Busca ativamente por atualizações no Service Worker.
 */
async function checkForUpdates(): Promise<{ hasUpdate: boolean; message: string }> {
  isChecking.value = true
  feedbackMessage.value = ''

  try {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      const msg = 'Service Worker não é suportado neste navegador.'
      feedbackMessage.value = msg
      return { hasUpdate: false, message: msg }
    }

    const reg = registrationRef || await navigator.serviceWorker.getRegistration()
    if (!reg) {
      const msg = 'Nenhum Service Worker ativo encontrado.'
      feedbackMessage.value = msg
      return { hasUpdate: false, message: msg }
    }

    // Se já houver um worker aguardando ativação ou needRefresh já estiver true
    if (reg.waiting || needRefresh.value) {
      needRefresh.value = true
      const msg = 'Nova versão disponível para atualização!'
      feedbackMessage.value = msg
      return { hasUpdate: true, message: msg }
    }

    // Se já estiver em processo de instalação
    if (reg.installing) {
      const msg = 'Baixando nova versão do sistema...'
      feedbackMessage.value = msg

      return await new Promise<{ hasUpdate: boolean; message: string }>((resolve) => {
        const worker = reg.installing
        if (!worker) {
          resolve({ hasUpdate: false, message: 'O CapiHouse já está na versão mais recente!' })
          return
        }

        const onStateChange = () => {
          if (worker.state === 'installed' || worker.state === 'activated') {
            worker.removeEventListener('statechange', onStateChange)
            needRefresh.value = true
            const readyMsg = 'Nova versão pronta para instalar!'
            feedbackMessage.value = readyMsg
            resolve({ hasUpdate: true, message: readyMsg })
          }
        }

        worker.addEventListener('statechange', onStateChange)

        setTimeout(() => {
          worker.removeEventListener('statechange', onStateChange)
          resolve({ hasUpdate: true, message: msg })
        }, 4000)
      })
    }

    // Monitora evento updatefound que o navegador emite ao encontrar novo SW
    const updateCheckPromise = new Promise<{ hasUpdate: boolean; message: string }>((resolve) => {
      let resolved = false

      const cleanup = () => {
        reg.removeEventListener('updatefound', onUpdateFound)
      }

      const onUpdateFound = () => {
        const newWorker = reg.installing
        if (!newWorker) return

        feedbackMessage.value = 'Nova versão encontrada! Baixando novidades...'

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' || newWorker.state === 'activated') {
            if (!resolved) {
              resolved = true
              cleanup()
              needRefresh.value = true
              const readyMsg = 'Nova versão pronta para instalar!'
              feedbackMessage.value = readyMsg
              resolve({ hasUpdate: true, message: readyMsg })
            }
          }
        })
      }

      reg.addEventListener('updatefound', onUpdateFound)

      // Timeout de verificação (aguarda até 2.5s por resposta do SW na rede)
      setTimeout(() => {
        if (!resolved) {
          resolved = true
          cleanup()
          if (reg.waiting || needRefresh.value) {
            needRefresh.value = true
            const readyMsg = 'Nova versão pronta para instalar!'
            feedbackMessage.value = readyMsg
            resolve({ hasUpdate: true, message: readyMsg })
          } else {
            const latestMsg = 'O CapiHouse já está na versão mais recente!'
            feedbackMessage.value = latestMsg
            resolve({ hasUpdate: false, message: latestMsg })
          }
        }
      }, 2500)
    })

    // Solicita checagem ao Service Worker na rede
    await reg.update()

    return await updateCheckPromise
  } catch (error) {
    console.error('Erro ao verificar atualizações do app:', error)
    const msg = 'Não foi possível verificar atualizações no momento.'
    feedbackMessage.value = msg
    return { hasUpdate: false, message: msg }
  } finally {
    isChecking.value = false
  }
}

/**
 * Aplica a atualização do Service Worker e recarrega o app.
 */
async function updateServiceWorker() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      const reg = registrationRef || await navigator.serviceWorker.getRegistration()
      if (reg?.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' })
      }
    } catch (err) {
      console.warn('Erro ao enviar SKIP_WAITING para o Service Worker:', err)
    }
  }

  await baseUpdateSW(true)
}

/**
 * Hard Reset / Recarregamento Forçado:
 * 1. Limpa todas as instâncias do CacheStorage local (Workbox e browser cache)
 * 2. Desregistra Service Workers presos
 * 3. Recarrega a página direto da rede com parâmetro anti-cache
 */
async function forceReloadApp() {
  feedbackMessage.value = 'Limpando caches locais e recarregando...'

  if (typeof window !== 'undefined') {
    // 1. Limpa todos os caches do CacheStorage
    if ('caches' in window) {
      try {
        const cacheKeys = await caches.keys()
        await Promise.all(cacheKeys.map((key) => caches.delete(key)))
      } catch (err) {
        console.warn('Erro ao limpar CacheStorage:', err)
      }
    }

    // 2. Desregistra Service Workers ativos para forçar uma reinstalação limpa
    if ('serviceWorker' in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations()
        await Promise.all(registrations.map((reg) => reg.unregister()))
      } catch (err) {
        console.warn('Erro ao desregistrar Service Worker:', err)
      }
    }

    // 3. Força navegação direta pela rede com timestamp anti-cache
    try {
      const url = new URL(window.location.href)
      url.searchParams.set('reload', Date.now().toString())
      window.location.replace(url.toString())
    } catch {
      window.location.reload()
    }
  }
}

export function usePwaUpdate() {
  return {
    needRefresh,
    offlineReady,
    isChecking,
    feedbackMessage,
    checkForUpdates,
    updateServiceWorker,
    forceReloadApp
  }
}
