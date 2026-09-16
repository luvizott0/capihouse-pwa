<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useFeedStore } from '@/stores/feed'
import { useGroupsStore } from '@/stores/groups'
import RetroModal from '@/components/ui/RetroModal.vue'
import RetroButton from '@/components/ui/RetroButton.vue'
import EmojiPicker from '@/components/ui/EmojiPicker.vue'
import MentionInput from '@/components/ui/MentionInput.vue'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ (e: 'update:modelValue', value: boolean): void; (e: 'created'): void }>()

const feedStore = useFeedStore()
const groupsStore = useGroupsStore()

const content = ref('')
const selectedGroupId = ref<number | null>(null)
const feelingEmoji = ref('😊')
const feelingText = ref('')
const hashtagInput = ref('')
const hashtags = ref<string[]>([])
const selectedFiles = ref<File[]>([])
const filePreviews = ref<string[]>([])
const errorMsg = ref('')

onMounted(() => {
  groupsStore.fetchMyGroups()
})

watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    groupsStore.fetchMyGroups()
  }
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

function handleFileSelect(e: Event) {
  const input = e.target as HTMLInputElement
  if (!input.files) return

  const files = Array.from(input.files)
  for (const file of files) {
    if (selectedFiles.value.length >= 5) break
    selectedFiles.value.push(file)
    filePreviews.value.push(URL.createObjectURL(file))
  }
  input.value = ''
}

function removeFile(index: number) {
  selectedFiles.value.splice(index, 1)
  filePreviews.value.splice(index, 1)
}

async function handleSubmit() {
  errorMsg.value = ''
  if (!content.value.trim() && selectedFiles.value.length === 0) {
    errorMsg.value = 'Escreva algo ou adicione uma imagem para publicar.'
    return
  }

  const formData = new FormData()
  if (content.value.trim()) {
    formData.append('content', content.value)
  }
  if (feelingText.value.trim()) {
    formData.append('feeling_name', feelingText.value.trim().substring(0, 15))
    formData.append('feeling_emoji', feelingEmoji.value || '😊')
  }
  hashtags.value.forEach(tag => {
    formData.append('hashtags[]', tag)
  })
  if (selectedGroupId.value) {
    formData.append('group_id', selectedGroupId.value.toString())
  }
  selectedFiles.value.forEach(file => {
    formData.append('media[]', file)
  })

  try {
    await feedStore.createPost(formData)
    // Reset form
    content.value = ''
    selectedGroupId.value = null
    feelingText.value = ''
    feelingEmoji.value = '😊'
    hashtags.value = []
    selectedFiles.value = []
    filePreviews.value = []
    emit('created')
    emit('update:modelValue', false)
  } catch (err: any) {
    errorMsg.value = err.response?.data?.message || 'Erro ao publicar.'
  }
}

function handleClose() {
  emit('update:modelValue', false)
}
</script>

<template>
  <RetroModal :modelValue="modelValue" @update:modelValue="handleClose" title="» Nova Publicação" size="md">
    <div class="post-create-form">
      <div v-if="errorMsg" class="error-banner">
        {{ errorMsg }}
      </div>

      <!-- Audience / Group selector -->
      <div class="audience-row">
        <label class="audience-label">Visibilidade:</label>
        <select v-model="selectedGroupId" class="audience-select">
          <option :value="null">🌐 Público (todos)</option>
          <option v-for="grp in groupsStore.myGroups" :key="grp.id" :value="grp.id">
            👥 Grupo: {{ grp.name }}
          </option>
        </select>
      </div>

      <MentionInput
        v-model="content"
        :rows="4"
        placeholder="O que está acontecendo na casa hoje? Use @ para marcar amigos..."
        :maxlength="2000"
      />

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

      <!-- Media Attachments Preview -->
      <div v-if="filePreviews.length" class="media-previews">
        <div v-for="(preview, index) in filePreviews" :key="index" class="preview-item">
          <img :src="preview" alt="Preview" class="preview-thumb" />
          <button type="button" @click="removeFile(index)" class="remove-thumb-btn">×</button>
        </div>
      </div>

      <!-- Actions: Upload media & Hashtags -->
      <div class="media-upload-row">
        <label class="upload-label-btn">
          <input
            type="file"
            accept="image/*,video/*"
            multiple
            class="hidden-file-input"
            @change="handleFileSelect"
          />
          📷 [ Anexar Fotos ]
        </label>
        <span class="muted-hint">Máx: 5 fotos</span>
      </div>

      <!-- Hashtags Section -->
      <div class="hashtag-section">
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
          <span v-for="tag in hashtags" :key="tag" class="retro-post-tag">
            #{{ tag }}
            <button type="button" class="remove-tag-x" @click="removeHashtag(tag)">×</button>
          </span>
        </div>
      </div>

      <!-- Footer Buttons -->
      <div class="modal-footer">
        <RetroButton variant="secondary" @click="handleClose">Cancelar</RetroButton>
        <RetroButton :loading="feedStore.isSubmitting" @click="handleSubmit">
          Publicar
        </RetroButton>
      </div>
    </div>
  </RetroModal>
</template>

<style scoped>
.post-create-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.error-banner {
  padding: 0.5rem;
  background-color: #fee2e2;
  border: 1px solid #ef4444;
  color: #b91c1c;
  font-size: 0.85rem;
  border-radius: 2px;
}

.audience-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.audience-label {
  font-family: var(--font-heading);
  font-size: 0.8rem;
  font-weight: bold;
  color: var(--color-primary-800);
  text-transform: uppercase;
  white-space: nowrap;
}
.audience-select {
  flex: 1;
  padding: 0.45rem 0.6rem;
  font-family: var(--font-heading);
  font-size: 0.8rem;
  font-weight: bold;
  color: var(--color-primary-800);
  border: 1px solid var(--color-border);
  background-color: var(--color-primary-100);
  border-radius: 2px;
  outline: none;
  cursor: pointer;
}
.audience-select:focus {
  border-color: var(--color-primary);
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
  min-height: 100px;
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
}

.feeling-text-wrapper {
  position: relative;
  flex: 1;
}

.feeling-text-input {
  width: 100%;
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
}
.clear-feeling-btn:hover {
  background-color: #fee2e2;
}

.media-previews {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.preview-item {
  position: relative;
  width: 80px;
  height: 80px;
  border: 2px solid var(--color-border);
  border-radius: 2px;
  overflow: hidden;
}
.preview-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.remove-thumb-btn {
  position: absolute;
  top: 2px;
  right: 2px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  border: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
}

.media-upload-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.25rem 0;
}
.hidden-file-input {
  display: none;
}
.upload-label-btn {
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 0.85rem;
  font-weight: bold;
  color: var(--color-primary-800, #5f4120);
  cursor: pointer;
  padding: 0.35rem 0.75rem;
  border: 1px solid var(--color-border, #D8CDC5);
  background-color: var(--color-primary-100, #fdf8f3);
  border-radius: 2px;
}
.upload-label-btn:hover {
  background-color: var(--color-primary-200, #e8c9a5);
}
.muted-hint {
  font-size: 0.8rem;
  color: var(--color-muted, #847062);
}

.hashtag-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.hashtag-input-group {
  display: flex;
  gap: 0.5rem;
}
.retro-tag-field {
  flex: 1;
  padding: 0.4rem 0.6rem;
  font-size: 0.85rem;
  border: 1px solid var(--color-border);
  background: #ffffff;
  border-radius: 2px;
}
.add-tag-btn {
  font-family: var(--font-heading);
  font-weight: bold;
  background: var(--color-primary);
  color: white;
  border: none;
  padding: 0 0.75rem;
  cursor: pointer;
  border-radius: 2px;
}
.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-top: 0.5rem;
}
.retro-post-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.2rem 0.5rem;
  background-color: var(--color-primary, #a66130);
  color: #ffffff;
  font-family: var(--font-heading);
  font-size: 0.75rem;
  border-radius: 2px;
}
.remove-tag-x {
  background: none;
  border: none;
  cursor: pointer;
  color: #ffffff;
  font-weight: bold;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 0.5rem;
  border-top: 1px solid var(--color-border);
  padding-top: 0.75rem;
}
</style>
