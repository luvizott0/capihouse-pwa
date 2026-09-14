<script setup lang="ts">
import type { User } from '@/types/models'
import { getInitials } from '@/utils/initials'
import { computed } from 'vue'

const props = defineProps<{
  user: User | null
  size?: 'sm' | 'md' | 'lg' | 'xl'
}>()

const sizeClass = computed(() => `avatar-${props.size || 'md'}`)
const initials = computed(() => props.user ? getInitials(props.user.name) : '??')
</script>
<template>
  <div class="user-avatar" :class="sizeClass">
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
.avatar-img { width: 100%; height: 100%; object-fit: cover; }
.avatar-sm { width: 32px; height: 32px; font-size: 0.8rem; }
.avatar-md { width: 48px; height: 48px; font-size: 1rem; }
.avatar-lg { width: 80px; height: 80px; font-size: 1.5rem; }
.avatar-xl { width: 120px; height: 120px; font-size: 2rem; border-width: 4px; }
</style>
