<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter, RouterView } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import { useNotificationsStore } from '@/stores/notifications'
import OfflineBanner from '@/components/ui/OfflineBanner.vue'
import ImageZoomModal from '@/components/ui/ImageZoomModal.vue'

const router = useRouter()
const authStore = useAuthStore()
const themeStore = useThemeStore()
const notifStore = useNotificationsStore()

onMounted(() => {
  authStore.initFromStorage()
  // Apply saved theme immediately from cached user (prevents flash of unstyled content)
  themeStore.loadThemeFromUser(authStore.user)

  // Escuta cliques em notificações Push vindos do Service Worker quando o app já está aberto
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'PUSH_NOTIFICATION_CLICK') {
        const { url, notificationId } = event.data

        if (notificationId) {
          notifStore.markAsRead(Number(notificationId))
        }

        if (url) {
          try {
            const parsed = new URL(url, window.location.origin)
            const targetPath = parsed.pathname + parsed.search + parsed.hash
            router.push(targetPath)
          } catch {
            router.push(url)
          }
        }
      }
    })
  }
})
</script>

<template>
  <OfflineBanner />
  <RouterView />
  <ImageZoomModal />
</template>
