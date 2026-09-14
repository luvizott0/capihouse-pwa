<script setup lang="ts">
defineProps<{
  variant?: 'primary' | 'secondary' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  disabled?: boolean
}>()
</script>
<template>
  <button 
    :class="[
      'retro-button',
      variant ? `retro-button-${variant}` : '',
      size ? `retro-button-${size}` : 'retro-button-md'
    ]" 
    :disabled="disabled || loading"
  >
    <span v-if="loading">Aguarde...</span>
    <slot v-else />
  </button>
</template>
