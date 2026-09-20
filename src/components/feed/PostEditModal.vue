<script setup lang="ts">
import { ref, watch } from 'vue'
import type { Post } from '@/types/models'
import { useFeedStore } from '@/stores/feed'
import RetroModal from '@/components/ui/RetroModal.vue'
import RetroButton from '@/components/ui/RetroButton.vue'
import EmojiPicker from '@/components/ui/EmojiPicker.vue'
import MentionInput from '@/components/ui/MentionInput.vue'

const props = defineProps<{
  modelValue: boolean
  post: Post
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'updated'): void
}>()

const feedStore = useFeedStore()

const content = ref('')
const feelingEmoji = ref('😊')
const feelingText = ref('')
const hashtagInput = ref('')
const hashtags = ref<string[]>([])
const errorMsg = ref('')

function populate() {
  if (props.post) {
    content.value = props.post.content || ''
    feelingEmoji.value = props.post.feeling?.emoji || '😊'
    feelingText.value = props.post.feeling?.name || ''
    hashtags.value = (props.post.hashtags || []).map(h => h.name)
    errorMsg.value = ''
  }
}

watch(() => props.post, populate, { immediate: true })
watch(() => props.modelValue, (isOpen) => {
  if (isOpen) populate()
})

function clearFeeling() {
  feelingText.value = ''
  feelingEmoji.value = '😊'
}

function addHashtag() {
  const tag = hashtagInput.value.trim().replace(/^#/, '')
  if (tag && !hashtags.value.includes(tag)) {
    hashtags.value.push(tag)
  }
  hashtagInput.value = ''
}

function removeHashtag(tag: string) {
  hashtags.value = hashtags.value.filter(t => t !== tag)
}

async function handleSubmit() {
  errorMsg.value = ''
  if (!content.value.trim() && (!props.post.media || props.post.media.length === 0) && !props.post.poll) {
    errorMsg.value = 'A publicação precisa de texto ou imagem.'
    return
  }

  try {
    await feedStore.updatePost(props.post.id, {
      content: content.value.trim(),
      feeling_name: feelingText.value.trim() ? feelingText.value.trim().substring(0, 15) : undefined,
      feeling_emoji: feelingText.value.trim() ? (feelingEmoji.value || '😊') : undefined,
      hashtags: hashtags.value,
    })
    emit('updated')
    emit('update:modelValue', false)
  } catch (err: any) {
    errorMsg.value = err.response?.data?.message || 'Erro ao salvar alterações.'
  }
}

function handleClose() {
  emit('update:modelValue', false)
}
</script>

<template>
  <RetroModal :modelValue="modelValue" @update:modelValue="handleClose" title="» Editar Publicação" size="md">
    <div class="post-edit-form">
      <div v-if="errorMsg" class="error-banner">
        {{ errorMsg }}
      </div>

      <div class="form-group">
        <label class="form-label">Conteúdo do Post</label>
        <MentionInput
          v-model="content"
          :rows="4"
          placeholder="O que está acontecendo na casa hoje? Use @ para marcar amigos..."
          :maxlength="2000"
        />
      </div>

      <!-- Feelings Section with EmojiPicker -->
      <div class="feelings-section">
        <div class="section-label">Como você está se sentindo?</div>

        <div class="custom-feeling-row">
          <EmojiPicker v-model="feelingEmoji" />
          <div class="feeling-text-wrapper">
            <input
              v-model="feelingText"
              type="text"
              maxlength="15"
              placeholder="Me sentindo..."
              class="feeling-text-input"
            />
            <span class="char-count">{{ feelingText.length }}/15</span>
          </div>
          <button
            v-if="feelingText"
            type="button"
            class="clear-feeling-btn"
            @click="clearFeeling"
            title="Limpar sentimento"
          >
            ×
          </button>
        </div>
      </div>

      <!-- Hashtags Section -->
      <div class="hashtag-section">
        <div class="section-label">Hashtags</div>
        <div class="hashtag-input-group">
          <input
            v-model="hashtagInput"
            placeholder="#adicionar_tag"
            class="retro-tag-field"
            @keydown.enter.prevent="addHashtag"
          />
          <button type="button" class="add-tag-btn" @click="addHashtag">[ + ]</button>
        </div>
        <div v-if="hashtags.length" class="tags-container">
          <span v-for="tag in hashtags" :key="tag" class="tag-badge-item">
            #{{ tag }}
            <button type="button" class="remove-tag-btn" @click="removeHashtag(tag)">×</button>
          </span>
        </div>
      </div>

      <!-- Modal Footer -->
      <div class="modal-footer">
        <RetroButton variant="secondary" @click="handleClose">Cancelar</RetroButton>
        <RetroButton :loading="feedStore.isSubmitting" @click="handleSubmit">
          Salvar Alterações
        </RetroButton>
      </div>
    </div>
  </RetroModal>
</template>

<style scoped>
.post-edit-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.form-label {
  font-family: var(--font-heading);
  font-size: 0.8rem;
  font-weight: bold;
  color: var(--color-primary-800);
}

.error-banner {
  padding: 0.5rem;
  background-color: #fee2e2;
  border: 1px solid #ef4444;
  color: #b91c1c;
  font-size: 0.85rem;
  border-radius: 2px;
}

.retro-textarea {
  width: 100%;
  padding: 0.75rem;
  font-family: var(--font-body, 'Outfit', sans-serif);
  font-size: 0.95rem;
  border: 2px solid var(--color-primary-200, #e8c9a5);
  background-color: var(--color-primary-50, #f8f6f1);
  border-radius: 2px;
  outline: none;
  resize: vertical;
  min-height: 90px;
}
.retro-textarea:focus {
  border-color: var(--color-primary, #a66130);
}

.section-label {
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 0.8rem;
  font-weight: bold;
  color: var(--color-primary-800, #5f4120);
  margin-bottom: 0.4rem;
  text-transform: uppercase;
}

.custom-feeling-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  width: 100%;
  box-sizing: border-box;
}

.feeling-text-wrapper {
  position: relative;
  flex: 1;
  min-width: 0;
}

.feeling-text-input {
  width: 100%;
  box-sizing: border-box;
  padding: 0.45rem 2.8rem 0.45rem 0.6rem;
  font-family: var(--font-body);
  font-size: 0.85rem;
  border: 2px solid var(--color-primary-200);
  background-color: var(--color-primary-50);
  border-radius: 2px;
  outline: none;
}
.feeling-text-input:focus {
  border-color: var(--color-primary);
}

.char-count {
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 0.7rem;
  font-family: var(--font-heading);
  color: var(--color-muted);
}

.clear-feeling-btn {
  background: none;
  border: 1px solid var(--color-border);
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  cursor: pointer;
  border-radius: 2px;
  color: var(--color-danger);
  touch-action: manipulation;
  flex-shrink: 0;
}
.clear-feeling-btn:hover {
  background-color: #fee2e2;
}

.hashtag-section {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  width: 100%;
  box-sizing: border-box;
}

.hashtag-input-group {
  display: flex;
  gap: 0.5rem;
  width: 100%;
  box-sizing: border-box;
}

.retro-tag-field {
  flex: 1;
  min-width: 0;
  box-sizing: border-box;
  padding: 0.45rem 0.6rem;
  font-size: 0.85rem;
  border: 1px solid var(--color-border);
  border-radius: 2px;
  background: #ffffff;
}

.add-tag-btn {
  font-family: var(--font-heading);
  font-size: 0.8rem;
  font-weight: bold;
  background-color: var(--color-primary-100);
  border: 1px solid var(--color-border);
  color: var(--color-primary-800);
  padding: 0 0.6rem;
  border-radius: 2px;
  cursor: pointer;
  touch-action: manipulation;
  flex-shrink: 0;
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-top: 0.25rem;
}

.tag-badge-item {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-family: var(--font-heading);
  font-size: 0.75rem;
  background-color: var(--color-primary, #a66130);
  color: #ffffff;
  padding: 0.2rem 0.5rem;
  border-radius: 2px;
}

.remove-tag-btn {
  background: none;
  border: none;
  font-size: 0.9rem;
  cursor: pointer;
  color: #ffffff;
  line-height: 1;
}
.remove-tag-btn:hover {
  opacity: 0.8;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  border-top: 1px solid var(--color-border);
  padding-top: 0.75rem;
  margin-top: 0.5rem;
}
</style>
