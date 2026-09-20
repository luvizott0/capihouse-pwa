<script setup lang="ts">
import type { User } from '@/types/models'
import { getInitials } from '@/utils/initials'
import { computed } from 'vue'
import { useImageViewerStore } from '@/stores/imageViewer'

const props = defineProps<{
  user: (Partial<User> & { name: string; avatar_url?: string | null }) | null
  size?: 'sm' | 'md' | 'lg' | 'xl'
  zoomable?: boolean
}>()

const imageViewer = useImageViewerStore()
const sizeClass = computed(() => `avatar-${props.size || 'md'}`)
const initials = computed(() => props.user ? getInitials(props.user.name) : '??')

function handleClick(e: MouseEvent) {
  if (props.zoomable && props.user?.avatar_url) {
    e.stopPropagation()
    imageViewer.openImage(props.user.avatar_url, props.user.name, 'Foto de Perfil')
  }
}
</script>
<template>
  <div
    class="user-avatar"
    :class="[sizeClass, { 'is-zoomable': zoomable && !!user?.avatar_url }]"
    :title="zoomable && !!user?.avatar_url ? 'Clique para ampliar foto de perfil' : undefined"
    @click="handleClick"
  >
    <img v-if="user?.avatar_url" :src="user.avatar_url" :alt="user.name" class="avatar-img" />
    <div v-else class="avatar-initials">{{ initials }}</div>
  </div>
</template>
<style scoped>
.user-avatar {
  border-radius: 2px;
  border: 2px solid var(--color-border);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-primary-200);
  color: var(--color-primary-900);
  font-family: var(--font-heading);
  font-weight: bold;
}
.user-avatar.is-zoomable {
  cursor: zoom-in;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.user-avatar.is-zoomable:hover {
  transform: scale(1.05);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
}
.avatar-img { width: 100%; height: 100%; object-fit: cover; }
.avatar-sm { width: 32px; height: 32px; font-size: 0.8rem; }
.avatar-md { width: 48px; height: 48px; font-size: 1rem; }
.avatar-lg { width: 80px; height: 80px; font-size: 1.5rem; }
.avatar-xl { width: 120px; height: 120px; font-size: 2rem; border-width: 4px; }
</style>
