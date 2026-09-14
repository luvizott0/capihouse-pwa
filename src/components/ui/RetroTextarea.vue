<script setup lang="ts">
defineProps<{
  modelValue: string
  label?: string
  maxLength?: number
  error?: string
}>()
defineEmits<{ (e: 'update:modelValue', value: string): void }>()
</script>
<template>
  <div style="margin-bottom: 1rem;">
    <label v-if="label" style="display: block; font-family: var(--font-heading); margin-bottom: 0.25rem; font-size: 0.9rem;">
      {{ label }}
    </label>
    <textarea 
      :value="modelValue" 
      @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
      class="retro-input"
      :maxlength="maxLength"
      rows="4"
      style="resize: vertical; font-family: var(--font-body);"
    ></textarea>
    <div style="display: flex; justify-content: space-between; font-size: 0.8rem; margin-top: 0.25rem;">
      <span v-if="error" style="color: var(--color-danger);">{{ error }}</span>
      <span v-else></span>
      <span v-if="maxLength" style="color: var(--color-muted);">{{ modelValue.length }} / {{ maxLength }}</span>
    </div>
  </div>
</template>
