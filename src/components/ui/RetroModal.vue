<script setup lang="ts">
import RetroCard from './RetroCard.vue'

defineProps<{
  modelValue: boolean
  title?: string
  size?: 'sm' | 'md' | 'lg'
}>()
defineEmits<{ (e: 'update:modelValue', value: boolean): void }>()
</script>
<template>
  <div v-if="modelValue" class="modal-overlay" @click.self="$emit('update:modelValue', false)">
    <div class="modal-content" :class="`modal-${size || 'md'}`">
      <RetroCard :title="title">
        <template #header>
          <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
            <span>{{ title }}</span>
            <button @click="$emit('update:modelValue', false)" style="background: none; border: none; color: white; cursor: pointer; font-family: var(--font-heading); font-weight: bold;">[X]</button>
          </div>
        </template>
        <slot />
      </RetroCard>
    </div>
  </div>
</template>
<style scoped>
.modal-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background-color: rgba(0,0,0,0.5);
  display: flex; align-items: center; justify-content: center;
  z-index: 9999;
  padding: 1rem;
}
.modal-content { width: 100%; max-width: 500px; }
.modal-sm { max-width: 360px; }
.modal-lg { max-width: 800px; }
</style>
