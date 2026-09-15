<script setup lang="ts">
import { ref } from 'vue'

defineProps<{
  modelValue: string | number
  label?: string
  type?: string
  placeholder?: string
  error?: string
  required?: boolean
}>()
defineEmits<{ (e: 'update:modelValue', value: string): void }>()

const showPassword = ref(false)
</script>
<template>
  <div style="margin-bottom: 1rem;">
    <label v-if="label" style="display: block; font-family: var(--font-heading); margin-bottom: 0.25rem; font-size: 0.9rem;">
      {{ label }} <span v-if="required" style="color: var(--color-danger)">*</span>
    </label>
    <div :class="{ 'password-input-wrapper': type === 'password' }">
      <input 
        :type="type === 'password' ? (showPassword ? 'text' : 'password') : (type || 'text')" 
        :value="modelValue" 
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
        class="retro-input"
        :placeholder="placeholder"
      />
      <button
        v-if="type === 'password'"
        type="button"
        class="password-toggle-btn"
        @click="showPassword = !showPassword"
        :title="showPassword ? 'Ocultar senha' : 'Ver senha'"
        :aria-label="showPassword ? 'Ocultar senha' : 'Ver senha'"
        tabindex="-1"
      >
        <svg v-if="!showPassword" xmlns="http://www.w3.org/2000/svg" class="eye-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" class="eye-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
        </svg>
      </button>
    </div>
    <span v-if="error" style="color: var(--color-danger); font-size: 0.8rem; margin-top: 0.25rem; display: block;">{{ error }}</span>
  </div>
</template>
