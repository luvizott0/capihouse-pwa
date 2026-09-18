import { ref } from 'vue'
import { useRegisterSW } from 'virtual:pwa-register/vue'

let registrationRef: ServiceWorkerRegistration | undefined = undefined

const isChecking = ref(false)
const feedbackMessage = ref('')

const { offlineReady, needRefresh, updateServiceWorker: baseUpdateSW } = useRegisterSW({
  immediate: true,
  onRegisteredSW(_swScriptUrl, registration) {
    registrationRef = registration
    // Periodicamente verifica novas versões a cada 60 minutos
    if (registration) {
      setInterval(() => {
        registration.update()
      }, 60 * 60 * 1000)
    }
  },
  onNeedRefresh() {
    feedbackMessage.value = 'Nova versão disponível para atualização!'
  },
  onOfflineReady() {
    // App pronto para uso offline
  }
})

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

    // Solicita checagem ao Service Worker
    await reg.update()

    // Se já estiver aguardando ativação ou needRefresh estiver true
    if (reg.waiting || needRefresh.value) {
      needRefresh.value = true
      const msg = 'Nova versão disponível para atualização!'
      feedbackMessage.value = msg
      return { hasUpdate: true, message: msg }
    }

    // Se estiver em processo de instalação
    if (reg.installing) {
      const msg = 'Baixando nova versão do sistema...'
      feedbackMessage.value = msg
      reg.installing.addEventListener('statechange', (event: Event) => {
        const target = event.target as ServiceWorker | null
        if (target?.state === 'installed') {
          needRefresh.value = true
          feedbackMessage.value = 'Nova versão pronta para instalar!'
        }
      })
      return { hasUpdate: true, message: msg }
    }

    const msg = 'O CapiHouse já está na versão mais recente!'
    feedbackMessage.value = msg
    return { hasUpdate: false, message: msg }
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
  await baseUpdateSW(true)
}

/**
 * Força atualização do Service Worker e recarrega a página.
 */
async function forceReloadApp() {
  if (needRefresh.value) {
    await updateServiceWorker()
    return
  }

  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      const reg = registrationRef || await navigator.serviceWorker.getRegistration()
      if (reg) {
        await reg.update()
        if (reg.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' })
        }
      }
    } catch {
      // continua para o reload
    }
  }

  window.location.reload()
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
