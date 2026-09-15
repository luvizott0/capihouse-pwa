<script setup lang="ts">
import { ref, watch } from 'vue'
import { useProfileStore } from '@/stores/profile'
import RetroModal from '@/components/ui/RetroModal.vue'
import RetroInput from '@/components/ui/RetroInput.vue'
import RetroButton from '@/components/ui/RetroButton.vue'
import RetroTextarea from '@/components/ui/RetroTextarea.vue'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ (e: 'update:modelValue', value: boolean): void }>()
const profileStore = useProfileStore()

const form = ref({ name: '', bio: '', birth: '', instagram: '', spotify: '' })

watch(() => props.modelValue, (isOpen) => {
  if (isOpen && profileStore.profile) {
    form.value = {
      name: profileStore.profile.name || '',
      bio: profileStore.profile.bio || '',
      birth: profileStore.profile.birth ? profileStore.profile.birth.substring(0, 10) : '',
      instagram: profileStore.profile.instagram || '',
      spotify: profileStore.profile.spotify || ''
    }
  }
})

async function save() {
  await profileStore.updateProfile(form.value)
  emit('update:modelValue', false)
}
</script>
<template>
  <RetroModal :modelValue="modelValue" @update:modelValue="emit('update:modelValue', $event)" title="Editar Perfil" size="md">
    <form @submit.prevent="save">
      <RetroInput v-model="form.name" label="Nome" required />
      <RetroTextarea v-model="form.bio" label="Sobre mim" :maxLength="500" />
      <RetroInput v-model="form.birth" type="date" label="Data de Nascimento" />
      <RetroInput v-model="form.instagram" label="Instagram (usuário)" />
      <RetroInput v-model="form.spotify" label="Spotify (link)" />
      
      <div style="display: flex; justify-content: flex-end; gap: 1rem; margin-top: 1.5rem;">
        <RetroButton type="button" variant="secondary" @click="emit('update:modelValue', false)">Cancelar</RetroButton>
        <RetroButton type="submit" :loading="profileStore.isLoading">Salvar</RetroButton>
      </div>
    </form>
  </RetroModal>
</template>
