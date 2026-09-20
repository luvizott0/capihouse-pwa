<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useFeedStore } from '@/stores/feed'
import { useGroupsStore } from '@/stores/groups'
import RetroModal from '@/components/ui/RetroModal.vue'
import RetroButton from '@/components/ui/RetroButton.vue'
import EmojiPicker from '@/components/ui/EmojiPicker.vue'
import MentionInput from '@/components/ui/MentionInput.vue'
import { compressImageFile } from '@/utils/imageCompressor'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    eventId?: number | null
    eventName?: string | null
  }>(),
  {
    eventId: null,
    eventName: null,
  }
)
const emit = defineEmits<{ (e: 'update:modelValue', value: boolean): void; (e: 'created'): void }>()

const feedStore = useFeedStore()
const groupsStore = useGroupsStore()

const MAX_FILES = 5
const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20 MB por arquivo
const MAX_TOTAL_SIZE = 50 * 1024 * 1024 // 50 MB total do lote

const content = ref('')
const selectedGroupId = ref<number | null>(null)
const feelingEmoji = ref('😊')
const feelingText = ref('')
const hashtagInput = ref('')
const hashtags = ref<string[]>([])
const selectedFiles = ref<File[]>([])
const filePreviews = ref<string[]>([])
const errorMsg = ref('')
const isCompressing = ref(false)
const formContainerRef = ref<HTMLElement | null>(null)

// Poll / Enquete state
const hasPoll = ref(false)
const pollQuestion = ref('')
const pollOptions = ref<string[]>(['', ''])

function togglePoll() {
  hasPoll.value = !hasPoll.value
  if (!hasPoll.value) {
    pollQuestion.value = ''
    pollOptions.value = ['', '']
  } else if (pollOptions.value.length < 2) {
    pollOptions.value = ['', '']
  }
}

function addPollOption() {
  if (pollOptions.value.length < 5) {
    pollOptions.value.push('')
  }
}

function removePollOption(index: number) {
  if (pollOptions.value.length > 2) {
    pollOptions.value.splice(index, 1)
  }
}

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

onMounted(() => {
  groupsStore.fetchMyGroups()
})

watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    groupsStore.fetchMyGroups()
    errorMsg.value = ''
  } else {
    cleanupPreviews()
  }
})

onUnmounted(() => {
  cleanupPreviews()
})

function cleanupPreviews() {
  filePreviews.value.forEach(url => URL.revokeObjectURL(url))
}

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

async function handleFileSelect(e: Event) {
  errorMsg.value = ''
  const input = e.target as HTMLInputElement
  if (!input.files || input.files.length === 0) return

  const files = Array.from(input.files)
  isCompressing.value = true

  try {
    for (const file of files) {
      if (selectedFiles.value.length >= MAX_FILES) {
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

function removeFile(index: number) {
  const [removedUrl] = filePreviews.value.splice(index, 1)
  if (removedUrl) {
    URL.revokeObjectURL(removedUrl)
  }
  selectedFiles.value.splice(index, 1)
  errorMsg.value = ''
}

function scrollToError() {
  if (formContainerRef.value) {
    formContainerRef.value.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

async function handleSubmit() {
  errorMsg.value = ''

  const filledPollOptions = pollOptions.value.map(o => o.trim()).filter(Boolean)
  if (hasPoll.value && filledPollOptions.length < 2) {
    errorMsg.value = 'A votação precisa de pelo menos 2 opções preenchidas.'
    scrollToError()
    return
  }

  const hasValidPoll = hasPoll.value && filledPollOptions.length >= 2

  if (!content.value.trim() && selectedFiles.value.length === 0 && !hasValidPoll) {
    errorMsg.value = 'Escreva algo, adicione fotos ou crie uma votação para publicar.'
    scrollToError()
    return
  }

  if (isOverTotalLimit.value) {
    errorMsg.value = `O tamanho total dos arquivos (${formatBytes(totalFilesSize.value)}) ultrapassa o limite seguro de 50MB. Remova algumas imagens.`
    scrollToError()
    return
  }

  const formData = new FormData()
  if (content.value.trim()) {
    formData.append('content', content.value)
  }
  if (hasValidPoll) {
    if (pollQuestion.value.trim()) {
      formData.append('poll[question]', pollQuestion.value.trim())
    }
    filledPollOptions.forEach(opt => {
      formData.append('poll[options][]', opt)
    })
  }
  if (feelingText.value.trim()) {
    formData.append('feeling_name', feelingText.value.trim().substring(0, 15))
    formData.append('feeling_emoji', feelingEmoji.value || '😊')
  }
  hashtags.value.forEach(tag => {
    formData.append('hashtags[]', tag)
  })
  if (props.eventId) {
    formData.append('event_id', props.eventId.toString())
  } else if (selectedGroupId.value) {
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
    hasPoll.value = false
    pollQuestion.value = ''
    pollOptions.value = ['', '']
    cleanupPreviews()
    selectedFiles.value = []
    filePreviews.value = []
    emit('created')
    emit('update:modelValue', false)
  } catch (err: any) {
    if (err.response?.status === 413) {
      errorMsg.value = 'Os arquivos enviados excedem o limite de tamanho do servidor (413 Payload Too Large). Tente reduzir a resolução ou quantidade das fotos.'
    } else if (err.response?.status === 422 && err.response?.data?.errors) {
      const errorObj = err.response.data.errors
      const messages: string[] = []
      for (const key of Object.keys(errorObj)) {
        messages.push(...errorObj[key])
      }
      errorMsg.value = messages.join(' ') || err.response?.data?.message || 'Erro de validação dos campos.'
    } else if (err.response?.data?.message) {
      errorMsg.value = err.response.data.message
    } else if (err.code === 'ERR_NETWORK' || !err.response) {
      errorMsg.value = 'Falha na conexão com o servidor. Verifique sua rede ou se as fotos enviadas excederam o limite do proxy reverso.'
    } else {
      errorMsg.value = 'Erro ao publicar. Tente novamente mais tarde.'
    }
    scrollToError()
  }
}

function handleClose() {
  emit('update:modelValue', false)
}
</script>

<template>
  <RetroModal
    :modelValue="modelValue"
    @update:modelValue="handleClose"
    :title="props.eventId ? ('» Publicar no Evento: ' + (props.eventName || 'Evento')) : '» Nova Publicação'"
    size="md"
  >
    <div ref="formContainerRef" class="post-create-form">
      <div v-if="errorMsg" class="error-banner">
        ⚠️ {{ errorMsg }}
      </div>

      <!-- Audience / Group selector -->
      <div v-if="props.eventId" class="audience-row">
        <label class="audience-label">Visibilidade:</label>
        <div class="event-locked-badge">
          🔒 Exclusivo do Evento: <strong>{{ props.eventName || 'Evento' }}</strong>
        </div>
      </div>
      <div v-else class="audience-row">
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
          <span v-if="selectedFiles[index]" class="preview-size-badge">
            {{ formatBytes(selectedFiles[index].size) }}
          </span>
          <button type="button" @click="removeFile(index)" class="remove-thumb-btn" title="Remover">×</button>
        </div>
      </div>

      <!-- Actions: Upload media & Hashtags -->
      <div class="media-upload-row">
        <label class="upload-label-btn" :class="{ 'disabled-btn': selectedFiles.length >= MAX_FILES }">
          <input
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/quicktime"
            multiple
            :disabled="selectedFiles.length >= MAX_FILES"
            class="hidden-file-input"
            @change="handleFileSelect"
          />
          📷 [ Anexar Fotos ]
        </label>

        <button
          type="button"
          class="poll-toggle-btn"
          :class="{ 'is-active': hasPoll }"
          @click="togglePoll"
        >
          📊 {{ hasPoll ? '[ Votação Ativa ✓ ]' : '[ + Votação ]' }}
        </button>

        <span v-if="isCompressing" class="compressing-hint">
          ⚡ Otimizando fotos...
        </span>
        <span v-else-if="selectedFiles.length === 0 && !hasPoll" class="muted-hint">
          Máx: 5 fotos (até 20MB cada, 50MB total)
        </span>
        <span v-else-if="selectedFiles.length > 0" class="media-status-hint" :class="{ 'limit-warning': isOverTotalLimit }">
          {{ selectedFiles.length }}/{{ MAX_FILES }} fotos • {{ formatBytes(totalFilesSize) }}
        </span>
      </div>

      <!-- Poll Creator Section -->
      <div v-if="hasPoll" class="poll-creator-section">
        <div class="poll-creator-header">
          <div class="poll-creator-title">
            <span class="poll-creator-icon">📊</span>
            <span class="poll-creator-name">Votação (Enquete)</span>
            <span class="poll-creator-pill">Máx. 5 opções</span>
          </div>
          <button
            type="button"
            class="poll-remove-all-btn"
            title="Cancelar votação"
            @click="togglePoll"
          >
            [ × Remover ]
          </button>
        </div>

        <div class="poll-field-group">
          <label class="poll-field-label">Pergunta (opcional):</label>
          <input
            v-model="pollQuestion"
            type="text"
            maxlength="255"
            placeholder="Qual é a pergunta da votação?"
            class="retro-field-input"
          />
        </div>

        <div class="poll-options-group">
          <label class="poll-field-label">Opções da votação (2 a 5):</label>
          <div
            v-for="(_, index) in pollOptions"
            :key="index"
            class="poll-option-row"
          >
            <span class="poll-option-index">{{ index + 1 }}</span>
            <input
              v-model="pollOptions[index]"
              type="text"
              maxlength="100"
              :placeholder="`Opção ${index + 1}`"
              class="retro-field-input poll-option-field"
            />
            <button
              v-if="pollOptions.length > 2"
              type="button"
              class="poll-remove-option-btn"
              title="Remover opção"
              @click="removePollOption(index)"
            >
              ×
            </button>
          </div>
        </div>

        <div v-if="pollOptions.length < 5" class="poll-add-option-wrapper">
          <button
            type="button"
            class="poll-add-option-btn"
            @click="addPollOption"
          >
            + Adicionar opção ({{ pollOptions.length }}/5)
          </button>
        </div>
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

      <!-- Error banner near submit button for quick visibility when scrolled -->
      <div v-if="errorMsg" class="error-banner footer-error">
        ⚠️ {{ errorMsg }}
      </div>

      <!-- Footer Buttons -->
      <div class="modal-footer">
        <RetroButton variant="secondary" @click="handleClose">Cancelar</RetroButton>
        <RetroButton
          :loading="feedStore.isSubmitting"
          :disabled="isOverTotalLimit || isCompressing"
          @click="handleSubmit"
        >
          {{ isCompressing ? 'Otimizando...' : 'Publicar' }}
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
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
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
  width: 100%;
  min-width: 0;
}
.audience-label {
  font-family: var(--font-heading);
  font-size: 0.8rem;
  font-weight: bold;
  color: var(--color-primary-800);
  text-transform: uppercase;
  white-space: nowrap;
  flex-shrink: 0;
}
.audience-select {
  flex: 1 1 0%;
  min-width: 0;
  max-width: 100%;
  width: 100%;
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
  box-sizing: border-box;
  text-overflow: ellipsis;
  overflow: hidden;
}

.event-locked-badge {
  flex: 1 1 0%;
  min-width: 0;
  max-width: 100%;
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 0.8rem;
  font-weight: bold;
  color: var(--color-primary-800, #5f4120);
  background-color: var(--color-primary-50, #fdf8f3);
  border: 1px solid var(--color-primary-200, #eed9c4);
  padding: 0.45rem 0.6rem;
  border-radius: 2px;
  box-sizing: border-box;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
  width: 100%;
  min-width: 0;
}

.feeling-text-wrapper {
  position: relative;
  flex: 1 1 0%;
  min-width: 0;
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

.poll-toggle-btn {
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
.poll-toggle-btn:hover {
  background-color: var(--color-primary-200, #e8c9a5);
}
.poll-toggle-btn.is-active {
  background-color: var(--color-primary, #0055ff);
  color: #ffffff;
  border-color: var(--color-primary-800, #0033aa);
}

.poll-creator-section {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  padding: 0.75rem;
  background-color: var(--color-primary-50, #fdfaf6);
  border: 1.5px solid var(--color-border, #D8CDC5);
  border-radius: 4px;
  margin-top: 0.5rem;
}

:global(.dark) .poll-creator-section {
  background-color: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.2);
}

.poll-creator-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.poll-creator-title {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.poll-creator-name {
  font-family: var(--font-heading, monospace);
  font-weight: 700;
  font-size: 0.85rem;
  color: var(--color-primary-800, #5f4120);
}

:global(.dark) .poll-creator-name {
  color: #f3f4f6;
}

.poll-creator-pill {
  font-size: 0.7rem;
  background: var(--color-border, #e5e7eb);
  color: #4b5563;
  padding: 0.1rem 0.35rem;
  border-radius: 2px;
}

:global(.dark) .poll-creator-pill {
  background: rgba(255, 255, 255, 0.15);
  color: #d1d5db;
}

.poll-remove-all-btn {
  background: none;
  border: none;
  font-family: var(--font-heading, monospace);
  font-size: 0.75rem;
  color: var(--color-danger, #ef4444);
  cursor: pointer;
}
.poll-remove-all-btn:hover {
  text-decoration: underline;
}

.poll-field-group,
.poll-options-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.poll-field-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-muted, #847062);
  font-family: var(--font-heading, monospace);
}

.retro-field-input {
  width: 100%;
  padding: 0.4rem 0.6rem;
  font-size: 0.85rem;
  border: 1px solid var(--color-border, #D8CDC5);
  background: #ffffff;
  border-radius: 2px;
  color: var(--color-text, #111827);
  box-sizing: border-box;
}

:global(.dark) .retro-field-input {
  background: rgba(0, 0, 0, 0.4);
  border-color: rgba(255, 255, 255, 0.2);
  color: #f9fafb;
}

.poll-option-row {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.poll-option-index {
  font-family: var(--font-heading, monospace);
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--color-muted, #847062);
  width: 1.25rem;
  text-align: center;
  flex-shrink: 0;
}

.poll-option-field {
  flex: 1;
}

.poll-remove-option-btn {
  width: 1.75rem;
  height: 1.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: 1px solid var(--color-border, #D8CDC5);
  border-radius: 2px;
  color: var(--color-danger, #ef4444);
  font-size: 1rem;
  cursor: pointer;
  flex-shrink: 0;
}
.poll-remove-option-btn:hover {
  background: #fee2e2;
}

:global(.dark) .poll-remove-option-btn:hover {
  background: rgba(239, 68, 68, 0.2);
}

.poll-add-option-wrapper {
  margin-top: 0.25rem;
}

.poll-add-option-btn {
  font-family: var(--font-heading, monospace);
  font-size: 0.78rem;
  color: var(--color-primary, #0055ff);
  background: none;
  border: 1px dashed var(--color-primary, #0055ff);
  border-radius: 2px;
  padding: 0.35rem 0.6rem;
  cursor: pointer;
  width: 100%;
  text-align: center;
  transition: background-color 0.15s;
}
.poll-add-option-btn:hover {
  background-color: rgba(0, 85, 255, 0.08);
}

.muted-hint {
  font-size: 0.8rem;
  color: var(--color-muted, #847062);
}
.compressing-hint {
  font-family: var(--font-heading, monospace);
  font-size: 0.78rem;
  font-weight: bold;
  color: var(--color-primary, #a66130);
  animation: pulse 1s infinite alternate;
}
.media-status-hint {
  font-family: var(--font-heading, monospace);
  font-size: 0.75rem;
  font-weight: bold;
  color: var(--color-primary-800);
}
.media-status-hint.limit-warning {
  color: var(--color-danger, #b91c1c);
}

.footer-error {
  margin-top: 0.25rem;
  margin-bottom: -0.25rem;
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

@media (max-width: 480px) {
  .audience-row {
    flex-direction: column;
    align-items: stretch;
    gap: 0.35rem;
  }

  .audience-label {
    align-self: flex-start;
  }

  .audience-select {
    width: 100%;
  }

  .event-locked-badge {
    width: 100%;
    white-space: normal;
    word-break: break-word;
  }

  .media-upload-row {
    gap: 0.5rem;
  }

  .upload-label-btn,
  .poll-toggle-btn {
    font-size: 0.8rem;
    padding: 0.35rem 0.5rem;
    text-align: center;
  }
}
</style>
