<script setup lang="ts">
defineProps<{
  modelValue: string | number
  label?: string
  options: { label: string, value: string | number }[]
  error?: string
}>()
defineEmits<{ (e: 'update:modelValue', value: string): void }>()
</script>
<template>
  <div style="margin-bottom: 1rem;">
    <label v-if="label" style="display: block; font-family: var(--font-heading); margin-bottom: 0.25rem; font-size: 0.9rem;">
      {{ label }}
    </label>
    <select 
      :value="modelValue" 
      @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
      class="retro-input"
    >
      <option v-for="opt in options" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
    </select>
    <span v-if="error" style="color: var(--color-danger); font-size: 0.8rem;">{{ error }}</span>
  </div>
</template>
