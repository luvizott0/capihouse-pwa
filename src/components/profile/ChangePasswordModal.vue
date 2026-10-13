<script setup lang="ts">
import { ref } from 'vue'
import RetroModal from '@/components/ui/RetroModal.vue'
import RetroInput from '@/components/ui/RetroInput.vue'
import RetroButton from '@/components/ui/RetroButton.vue'
import { useProfileStore } from '@/stores/profile'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ (e: 'update:modelValue', value: boolean): void }>()
const profileStore = useProfileStore()

const form = ref({ password: '', password_confirmation: '' })
const errorMsg = ref('')

async function submit() {
  if (form.value.password.length < 8) {
    errorMsg.value = 'A senha deve ter pelo menos 8 caracteres.'
    return
  }
  if (form.value.password !== form.value.password_confirmation) {
    errorMsg.value = 'As senhas não coincidem.'
    return
  }
  try {
    await profileStore.updatePassword(form.value)
    emit('update:modelValue', false)
  } catch (err: any) {
    errorMsg.value = err.response?.data?.message || 'Erro ao alterar senha.'
  }
}
</script>
<template>
  <RetroModal :modelValue="modelValue" @update:modelValue="emit('update:modelValue', $event)" title="Definir Nova Senha" size="sm">
    <form @submit.prevent="submit">
      <RetroInput v-model="form.password" type="password" label="Nova Senha" required />
      <RetroInput v-model="form.password_confirmation" type="password" label="Confirmar Nova Senha" required />
      
      <div v-if="errorMsg" style="color: var(--color-danger); margin-bottom: 1rem; font-size: 0.85rem;">{{ errorMsg }}</div>
      
      <div style="display: flex; justify-content: flex-end; gap: 1rem; margin-top: 1.5rem;">
        <RetroButton type="button" variant="secondary" @click="emit('update:modelValue', false)">Cancelar</RetroButton>
        <RetroButton type="submit" :loading="profileStore.isLoading">Alterar</RetroButton>
      </div>
    </form>
  </RetroModal>
</template>
