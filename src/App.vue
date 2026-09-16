<script setup lang="ts">
import { onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import { RouterView } from 'vue-router'
import OfflineBanner from '@/components/ui/OfflineBanner.vue'
import ImageZoomModal from '@/components/ui/ImageZoomModal.vue'

const authStore = useAuthStore()
const themeStore = useThemeStore()

onMounted(() => {
  authStore.initFromStorage()
  // Apply saved theme immediately from cached user (prevents flash of unstyled content)
  themeStore.loadThemeFromUser(authStore.user)
})
</script>

<template>
  <OfflineBanner />
  <RouterView />
  <ImageZoomModal />
</template>
