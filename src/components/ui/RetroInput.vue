<script setup lang="ts">
defineProps<{
  modelValue: string | number
  label?: string
  type?: string
  placeholder?: string
  error?: string
  required?: boolean
}>()
defineEmits<{ (e: 'update:modelValue', value: string): void }>()
</script>
<template>
  <div style="margin-bottom: 1rem;">
    <label v-if="label" style="display: block; font-family: var(--font-heading); margin-bottom: 0.25rem; font-size: 0.9rem;">
      {{ label }} <span v-if="required" style="color: var(--color-danger)">*</span>
    </label>
    <input 
      :type="type || 'text'" 
      :value="modelValue" 
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      class="retro-input"
      :placeholder="placeholder"
    />
    <span v-if="error" style="color: var(--color-danger); font-size: 0.8rem; margin-top: 0.25rem; display: block;">{{ error }}</span>
  </div>
</template>
