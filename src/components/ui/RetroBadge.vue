<script setup lang="ts">
import { computed } from 'vue'
const props = defineProps<{
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'primary'
  text: string
}>()

const variantColors = computed(() => {
  const map: Record<string, string> = {
    success: 'var(--color-success)',
    warning: 'var(--color-warning)',
    danger: 'var(--color-danger)',
    info: 'var(--color-info)',
    primary: 'var(--color-primary)',
    neutral: 'var(--color-muted)'
  }
  return { color: map[props.variant || 'primary'] }
})
</script>
<template>
  <span class="retro-badge" :style="variantColors">{{ text }}</span>
</template>
