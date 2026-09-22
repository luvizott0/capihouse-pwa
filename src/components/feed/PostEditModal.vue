<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import type { Post, Media } from '@/types/models'
import { useFeedStore } from '@/stores/feed'
import RetroModal from '@/components/ui/RetroModal.vue'
import RetroButton from '@/components/ui/RetroButton.vue'
import EmojiPicker from '@/components/ui/EmojiPicker.vue'
import MentionInput from '@/components/ui/MentionInput.vue'
import { compressImageFile } from '@/utils/imageCompressor'

const props = defineProps<{
  modelValue: boolean
  post: Post
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'updated'): void
}>()

const feedStore = useFeedStore()

const MAX_FILES = 5
const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20 MB por arquivo
const MAX_TOTAL_SIZE = 50 * 1024 * 1024 // 50 MB total do lote

const content = ref('')
const feelingEmoji = ref('😊')
const feelingText = ref('')
const hashtagInput = ref('')
const hashtags = ref<string[]>([])
const existingMedia = ref<Media[]>([])
const removedMediaIds = ref<number[]>([])
const selectedFiles = ref<File[]>([])
const filePreviews = ref<string[]>([])
const errorMsg = ref('')
const isCompressing = ref(false)

const totalMediaCount = computed(() => {
  return existingMedia.value.length + selectedFiles.value.length
})

const totalFilesSize = computed(() => {
  return selectedFiles.value.reduce((acc, file) => acc + file.size, 0)
})

const isOverTotalLimit = computed(() => {
  return totalFilesSize.value > MAX_TOTAL_SIZE
})

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const mb = bytes / (1024 * 1024)
  if (mb >= 1) {
    return `${mb.toFixed(1)} MB`
  }
  const kb = bytes / 1024
  return `${kb.toFixed(0)} KB`
}

function cleanupPreviews() {
  filePreviews.value.forEach(url => URL.revokeObjectURL(url))
  filePreviews.value = []
}

function populate() {
  if (props.post) {
    content.value = props.post.content || ''
    feelingEmoji.value = props.post.feeling?.emoji || '😊'
    feelingText.value = props.post.feeling?.name || ''
    hashtags.value = (props.post.hashtags || []).map(h => h.name)
    existingMedia.value = props.post.media ? [...props.post.media] : []
    removedMediaIds.value = []
    cleanupPreviews()
    selectedFiles.value = []
    errorMsg.value = ''
  }
}

watch(() => props.post, populate, { immediate: true })
watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    populate()
  } else {
    cleanupPreviews()
  }
})

onUnmounted(() => {
  cleanupPreviews()
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

function removeExistingMedia(index: number) {
  const media = existingMedia.value[index]
  if (media) {
    removedMediaIds.value.push(media.id)
    existingMedia.value.splice(index, 1)
  }
  errorMsg.value = ''
}

function removeNewFile(index: number) {
  const [removedUrl] = filePreviews.value.splice(index, 1)
  if (removedUrl) {
    URL.revokeObjectURL(removedUrl)
  }
  selectedFiles.value.splice(index, 1)
  errorMsg.value = ''
}

async function handleFileSelect(e: Event) {
  errorMsg.value = ''
  const input = e.target as HTMLInputElement
  if (!input.files || input.files.length === 0) return

  const files = Array.from(input.files)
  isCompressing.value = true

  try {
    for (const file of files) {
      if (totalMediaCount.value >= MAX_FILES) {
        errorMsg.value = `Você pode anexar no máximo ${MAX_FILES} arquivos por publicação.`
        break
      }

      // Validar tipo de arquivo
      const isValidType = file.type.startsWith('image/') || file.type.startsWith('video/')
      if (!isValidType) {
        errorMsg.value = `O arquivo "${file.name}" não é suportado. Use imagens (JPG, PNG, GIF, WEBP) ou vídeos (MP4, MOV).`
        continue
      }

      // Validar tamanho individual original (20 MB)
      if (file.size > MAX_FILE_SIZE) {
        errorMsg.value = `O arquivo "${file.name}" (${formatBytes(file.size)}) ultrapassa o limite de 20MB por arquivo.`
        continue
      }

      // Se for imagem, comprime para economizar dados e acelerar upload
      let finalFile = file
      if (file.type.startsWith('image/') && file.type !== 'image/gif') {
        finalFile = await compressImageFile(file)
      }

      // Validar se excede tamanho total seguro de 50 MB
      if (totalFilesSize.value + finalFile.size > MAX_TOTAL_SIZE) {
        errorMsg.value = `Adicionar "${file.name}" ultrapassaria o limite total de 50MB para a publicação.`
        continue
      }

      selectedFiles.value.push(finalFile)
      filePreviews.value.push(URL.createObjectURL(finalFile))
    }
  } finally {
    isCompressing.value = false
    input.value = ''
  }
}

async function handleSubmit() {
  errorMsg.value = ''
  const hasContent = !!content.value.trim()
  const hasPoll = !!props.post.poll
  const isRepost = !!props.post.repost_of_id

  if (!hasContent && totalMediaCount.value === 0 && !hasPoll && !isRepost) {
    errorMsg.value = 'A publicação precisa de texto ou imagem.'
    return
  }

  if (isOverTotalLimit.value) {
    errorMsg.value = `O tamanho total dos arquivos (${formatBytes(totalFilesSize.value)}) ultrapassa o limite seguro de 50MB. Remova algumas imagens.`
    return
  }

  const formData = new FormData()
  formData.append('content', content.value)

  if (feelingText.value.trim()) {
    formData.append('feeling_name', feelingText.value.trim().substring(0, 15))
    formData.append('feeling_emoji', feelingEmoji.value || '😊')
  }

  if (hashtags.value.length === 0) {
    formData.append('clear_hashtags', '1')
  } else {
    hashtags.value.forEach(tag => {
      formData.append('hashtags[]', tag)
    })
  }

  removedMediaIds.value.forEach(id => {
    formData.append('remove_media_ids[]', id.toString())
  })

  selectedFiles.value.forEach(file => {
    formData.append('media[]', file)
  })

  try {
    await feedStore.updatePost(props.post.id, formData)
    cleanupPreviews()
    selectedFiles.value = []
    emit('updated')
    emit('update:modelValue', false)
  } catch (err: any) {
    if (err.response?.status === 413) {
      errorMsg.value = 'Os arquivos enviados excedem o limite de tamanho do servidor (413 Payload Too Large). Tente reduzir a resolução ou quantidade das fotos.'
    } else {
      errorMsg.value = err.response?.data?.message || 'Erro ao salvar alterações.'
    }
  }
}

function handleClose() {
  cleanupPreviews()
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

      <!-- Media Attachments Preview -->
      <div v-if="existingMedia.length || filePreviews.length" class="media-previews">
        <!-- Existing Media Items -->
        <div
          v-for="(item, index) in existingMedia"
          :key="'existing-' + item.id"
          class="preview-item"
        >
          <video
            v-if="item.type === 'video'"
            :src="item.url || item.path"
            class="preview-thumb"
          />
          <img
            v-else
            :src="item.url || item.path"
            alt="Mídia existente"
            class="preview-thumb"
          />
          <button
            type="button"
            class="remove-thumb-btn"
            title="Remover mídia"
            @click="removeExistingMedia(index)"
          >
            ×
          </button>
        </div>

        <!-- New Selected Files -->
        <div
          v-for="(preview, index) in filePreviews"
          :key="'new-' + index"
          class="preview-item"
        >
          <video
            v-if="selectedFiles[index]?.type.startsWith('video/')"
            :src="preview"
            class="preview-thumb"
          />
          <img
            v-else
            :src="preview"
            alt="Nova mídia"
            class="preview-thumb"
          />
          <span v-if="selectedFiles[index]" class="preview-size-badge">
            {{ formatBytes(selectedFiles[index].size) }}
          </span>
          <button
            type="button"
            class="remove-thumb-btn"
            title="Remover mídia"
            @click="removeNewFile(index)"
          >
            ×
          </button>
        </div>
      </div>

      <!-- Actions: Upload media -->
      <div class="media-upload-row">
        <label class="upload-label-btn" :class="{ 'disabled-btn': totalMediaCount >= MAX_FILES }">
          <input
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/quicktime"
            multiple
            :disabled="totalMediaCount >= MAX_FILES"
            class="hidden-file-input"
            @change="handleFileSelect"
          />
          📷 [ Anexar Fotos ]
        </label>

        <span v-if="isCompressing" class="compressing-hint">
          ⚡ Otimizando fotos...
        </span>
        <span v-else-if="totalMediaCount === 0" class="muted-hint">
          Máx: 5 fotos (até 20MB cada, 50MB total)
        </span>
        <span v-else class="media-status-hint" :class="{ 'limit-warning': isOverTotalLimit }">
          {{ totalMediaCount }}/{{ MAX_FILES }} fotos
          <template v-if="selectedFiles.length > 0">
            • novas: {{ formatBytes(totalFilesSize) }}
          </template>
        </span>
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
  background-color: #000;
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
  background: rgba(0, 0, 0, 0.75);
  color: white;
  border: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.15s ease;
}
.remove-thumb-btn:hover {
  background: #dc2626;
}

.preview-size-badge {
  position: absolute;
  bottom: 2px;
  left: 2px;
  background: rgba(0, 0, 0, 0.75);
  color: #ffffff;
  font-family: var(--font-heading, monospace);
  font-size: 0.65rem;
  padding: 1px 4px;
  border-radius: 2px;
  pointer-events: none;
}

.media-upload-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.25rem 0;
  flex-wrap: wrap;
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
  transition: all 0.15s ease;
}
.upload-label-btn:hover:not(.disabled-btn) {
  background-color: var(--color-primary-200, #e8c9a5);
}
.upload-label-btn.disabled-btn {
  opacity: 0.5;
  cursor: not-allowed;
  background-color: #eee;
}

.compressing-hint {
  font-family: var(--font-heading, monospace);
  font-size: 0.78rem;
  color: var(--color-primary);
  animation: pulse 1s infinite alternate;
}

.muted-hint {
  font-size: 0.75rem;
  color: var(--color-muted);
}

.media-status-hint {
  font-family: var(--font-heading, monospace);
  font-size: 0.78rem;
  color: var(--color-primary-800);
}

.limit-warning {
  color: #dc2626 !important;
  font-weight: bold;
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

@keyframes pulse {
  from {
    opacity: 0.6;
  }
  to {
    opacity: 1;
  }
}
</style>
