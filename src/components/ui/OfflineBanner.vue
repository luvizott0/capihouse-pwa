<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useNetworkStatus } from '@/composables/useNetworkStatus'
import { usePwaUpdate } from '@/composables/usePwaUpdate'
import { useAuthStore } from '@/stores/auth'
import { useWebPush } from '@/composables/useWebPush'

const { isOnline } = useNetworkStatus()
const authStore = useAuthStore()

// PWA update registration via shared composable
const { needRefresh, updateServiceWorker } = usePwaUpdate()

const dismissedOffline = ref(false)
const dismissUpdate = ref(false)

// PWA Install prompt handling
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const deferredPrompt = ref<any>(null)
const showInstallBanner = ref(false)

function handleBeforeInstallPrompt(e: Event) {
  e.preventDefault()
  deferredPrompt.value = e
  showInstallBanner.value = true
}

async function installPWA() {
  if (!deferredPrompt.value) return
  deferredPrompt.value.prompt()
  const { outcome } = await deferredPrompt.value.userChoice
  if (outcome === 'accepted') {
    showInstallBanner.value = false
  }
  deferredPrompt.value = null
}

function dismissInstall() {
  showInstallBanner.value = false
}

// Push notification prompt handling
const {
  isSupported: isPushSupported,
  isIos: isPushIos,
  isStandalone: isPushStandalone,
  permission: pushPermission,
  isSubscribed: isPushSubscribed,
  isLoading: isPushLoading,
  errorMessage: pushErrorMessage,
  checkSubscription: checkPushSubscription,
  subscribe: subscribePush,
} = useWebPush()

const dismissedPush = ref(false)
const pushSuccessMessage = ref('')
const pushFeedbackError = ref('')
const isPushReady = ref(false)
const PUSH_PROMPT_STORAGE_KEY = 'capihouse_push_prompt_dismissed_until'

function isPushPromptDismissed(): boolean {
  try {
    const dismissedUntil = localStorage.getItem(PUSH_PROMPT_STORAGE_KEY)
    if (!dismissedUntil) return false
    const untilTime = parseInt(dismissedUntil, 10)
    if (isNaN(untilTime)) return false
    return Date.now() < untilTime
  } catch {
    return false
  }
}

const showPushBanner = computed(() => {
  if (!authStore.isAuthenticated) return false
  if (!isOnline.value) return false
  if (!isPushSupported.value) return false
  if (isPushIos.value && !isPushStandalone.value) return false
  // Não exibir enquanto o status inicial de push ainda estiver sendo verificado
  if (!isPushReady.value) return false
  // Apenas solicitar se a permissão ainda estiver indefinida ('default'). Se já foi 'granted' ou 'denied', não exibe
  if (pushPermission.value !== 'default') return false
  if (isPushSubscribed.value) return false
  if (dismissedPush.value) return false

  return true
})

async function initPushStatus() {
  if (authStore.isAuthenticated && isPushSupported.value) {
    await checkPushSubscription()
  }
  isPushReady.value = true
}

async function handleEnablePush() {
  pushFeedbackError.value = ''
  pushSuccessMessage.value = ''
  try {
    const success = await subscribePush()
    if (success) {
      pushSuccessMessage.value = 'Notificações ativadas com sucesso!'
      setTimeout(() => {
        dismissedPush.value = true
      }, 3000)
    } else if (pushErrorMessage.value) {
      pushFeedbackError.value = pushErrorMessage.value
    }
  } catch {
    pushFeedbackError.value = 'Não foi possível ativar as notificações no momento.'
  }
}

function dismissPushPrompt() {
  dismissedPush.value = true
  try {
    // Lembrar mais tarde: dispensa por 7 dias
    const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000
    localStorage.setItem(PUSH_PROMPT_STORAGE_KEY, String(Date.now() + sevenDaysInMs))
  } catch (err) {
    console.error('Falha ao salvar dispensa no localStorage:', err)
  }
}

function onWindowFocus() {
  if (authStore.isAuthenticated) {
    checkPushSubscription()
  }
}

onMounted(async () => {
  window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
  window.addEventListener('focus', onWindowFocus)
  dismissedPush.value = isPushPromptDismissed()

  await initPushStatus()
})

onUnmounted(() => {
  window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
  window.removeEventListener('focus', onWindowFocus)
})

watch(
  () => authStore.isAuthenticated,
  async (isAuth) => {
    if (isAuth) {
      await initPushStatus()
    }
  }
)
</script>

<template>
  <!-- Offline status banner -->
  <transition name="slide-fade">
    <div v-if="!isOnline && !dismissedOffline" class="pwa-banner offline-banner" role="alert">
      <div class="banner-content">
        <span class="banner-icon">📡</span>
        <div class="banner-text">
          <strong>Modo Offline:</strong> Você está desconectado. Exibindo dados salvos em cache.
        </div>
        <button type="button" class="banner-close" @click="dismissedOffline = true" title="Fechar">
          ✕
        </button>
      </div>
    </div>
  </transition>

  <!-- PWA Update Available Banner (cor fixa de aviso semelhante ao aviso offline) -->
  <transition name="slide-fade">
    <div v-if="needRefresh && !dismissUpdate" class="pwa-banner update-banner" role="alert">
      <div class="banner-content">
        <span class="banner-icon">⚠️</span>
        <div class="banner-text">
          <strong>Nova versão disponível:</strong> O <strong>CapiHouse</strong> possui atualizações recentes prontas para instalar.
        </div>
        <div class="banner-buttons">
          <button type="button" class="banner-action-btn update-btn" @click="updateServiceWorker()">
            [ Atualizar agora ]
          </button>
          <button type="button" class="banner-close" @click="dismissUpdate = true" title="Lembrar mais tarde">
            ✕
          </button>
        </div>
      </div>
    </div>
  </transition>

  <!-- Push Notification Permission Banner -->
  <transition name="slide-fade">
    <div v-if="showPushBanner" class="pwa-banner offline-banner notification-banner" role="alert">
      <div class="banner-content">
        <span class="banner-icon">🔔</span>
        <div class="banner-text">
          <template v-if="pushSuccessMessage">
            <strong>Notificações ativadas!</strong> {{ pushSuccessMessage }}
          </template>
          <template v-else-if="pushFeedbackError">
            <strong>Aviso:</strong> {{ pushFeedbackError }}
          </template>
          <template v-else>
            <strong>Notificações:</strong> Ative para receber avisos sobre curtidas, comentários e interações em tempo real.
          </template>
        </div>
        <div class="banner-buttons">
          <button
            v-if="!pushSuccessMessage"
            type="button"
            class="banner-action-btn notification-btn"
            :disabled="isPushLoading"
            @click="handleEnablePush"
          >
            {{ isPushLoading ? '[ Ativando... ]' : '[ Ativar Notificações ]' }}
          </button>
          <button
            type="button"
            class="banner-close"
            @click="dismissPushPrompt"
            title="Agora não"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  </transition>

  <!-- PWA Install Prompt Banner (quando o navegador permite instalação e não foi instalado ainda) -->
  <transition name="slide-fade">
    <div v-if="showInstallBanner" class="pwa-banner install-banner">
      <div class="banner-content">
        <img src="/capihouse-logo.png" alt="CapiHouse" class="banner-capivara-img" />
        <div class="banner-text">
          Instale o <strong>CapiHouse</strong> na tela inicial para uma experiência rápida e offline!
        </div>
        <div class="banner-buttons">
          <button type="button" class="banner-action-btn" @click="installPWA">
            [ Instalar App ]
          </button>
          <button type="button" class="banner-close" @click="dismissInstall" title="Agora não">
            ✕
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.pwa-banner {
  position: relative;
  z-index: 1100;
  width: 100%;
  font-family: var(--font-heading, monospace);
  font-size: 0.8rem;
  padding: 0.45rem 1rem;
  border-bottom: 2px solid;
}

.banner-content {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.banner-icon {
  font-size: 1.1rem;
  flex-shrink: 0;
}

.banner-capivara-img {
  width: 22px;
  height: 22px;
  object-fit: contain;
  flex-shrink: 0;
}

.banner-text {
  flex: 1;
  min-width: 200px;
}

.offline-banner {
  background-color: #fef3c7;
  color: #92400e;
  border-color: #f59e0b;
}

.update-banner {
  background-color: #fef3c7;
  color: #78350f;
  border-color: #f59e0b;
}

.update-btn {
  background-color: #b45309 !important;
  color: #ffffff !important;
  border: 1px solid #78350f !important;
  box-shadow: 2px 2px 0 #78350f;
}

.update-btn:hover {
  background-color: #92400e !important;
}

.notification-btn {
  background-color: #b45309 !important;
  color: #ffffff !important;
  border: 1px solid #78350f !important;
  box-shadow: 2px 2px 0 #78350f;
}

.notification-btn:hover:not(:disabled) {
  background-color: #92400e !important;
}

.notification-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.install-banner {
  background-color: #fdf8f3;
  color: #5f4120;
  border-color: var(--color-primary, #a66130);
}

.banner-buttons {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.banner-action-btn {
  background-color: var(--color-primary, #a66130);
  color: #ffffff;
  border: 1px solid var(--color-primary-800, #5f4120);
  padding: 0.25rem 0.6rem;
  border-radius: 2px;
  font-family: var(--font-heading, monospace);
  font-size: 0.75rem;
  font-weight: bold;
  cursor: pointer;
  transition: opacity 0.15s;
}

.banner-action-btn:hover {
  opacity: 0.9;
}

.banner-close {
  background: none;
  border: none;
  color: inherit;
  font-weight: bold;
  font-size: 0.9rem;
  cursor: pointer;
  padding: 0.2rem 0.4rem;
  border-radius: 2px;
  line-height: 1;
}

.banner-close:hover {
  background-color: rgba(0, 0, 0, 0.08);
}

.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.2s ease;
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}
</style>
