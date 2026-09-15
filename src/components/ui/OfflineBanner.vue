<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useNetworkStatus } from '@/composables/useNetworkStatus'
import { useRegisterSW } from 'virtual:pwa-register/vue'

const { isOnline } = useNetworkStatus()

// PWA update registration
const { offlineReady, needRefresh, updateServiceWorker } = useRegisterSW()

const dismissedOffline = ref(false)

// PWA Install prompt handling
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

onMounted(() => {
  window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
})

onUnmounted(() => {
  window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
})
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

  <!-- PWA Update Available Banner -->
  <transition name="slide-fade">
    <div v-if="needRefresh" class="pwa-banner update-banner" role="alert">
      <div class="banner-content">
        <span class="banner-icon">⚡</span>
        <div class="banner-text">
          Nova versão do <strong>CapiHouse</strong> disponível!
        </div>
        <button type="button" class="banner-action-btn" @click="updateServiceWorker()">
          [ Atualizar agora ]
        </button>
      </div>
    </div>
  </transition>

  <!-- PWA Install Prompt Banner (quando o navegador permite instalação e não foi instalado ainda) -->
  <transition name="slide-fade">
    <div v-if="showInstallBanner" class="pwa-banner install-banner">
      <div class="banner-content">
        <span class="banner-icon">🦫</span>
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
  background-color: #dbeafe;
  color: #1e40af;
  border-color: #3b82f6;
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
