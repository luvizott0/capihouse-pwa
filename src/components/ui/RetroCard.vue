<script setup lang="ts">
defineProps<{
  title?: string
  headerColor?: string
}>()
</script>
<template>
  <div class="retro-card">
    <div v-if="title || $slots.header" class="retro-card-header" :style="headerColor ? { backgroundColor: headerColor } : {}">
      <slot name="header">{{ title }}</slot>
    </div>
    <div style="padding: 1rem;">
      <slot />
    </div>
    <div v-if="$slots.footer" style="padding: 1rem; border-top: 1px solid var(--color-border); background-color: var(--color-primary-50)">
      <slot name="footer" />
    </div>
  </div>
</template>
