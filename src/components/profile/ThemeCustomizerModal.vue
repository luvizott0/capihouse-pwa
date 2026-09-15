<script setup lang="ts">
import { ref, watch } from 'vue'
import RetroModal from '@/components/ui/RetroModal.vue'
import RetroButton from '@/components/ui/RetroButton.vue'
import { useProfileStore } from '@/stores/profile'
import { useThemeStore, DEFAULT_THEME } from '@/stores/theme'
import { useAuthStore } from '@/stores/auth'
import type { UserTheme } from '@/types/models'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
}>()

const profileStore = useProfileStore()
const themeStore = useThemeStore()
const authStore = useAuthStore()

// ── Local draft state (does NOT mutate saved state until user clicks Save) ──
const draft = ref<Required<UserTheme>>({ ...DEFAULT_THEME })
// Snapshot of the theme that was active when the modal opened — used by Cancel
const snapshotBeforeOpen = ref<UserTheme | null>(null)

const isSaving = ref(false)
const saveError = ref('')
const saveSuccess = ref('')

// Background image file
const bgImageFile = ref<File | null>(null)
const bgImagePreviewUrl = ref<string>('')
const bgImageInputRef = ref<HTMLInputElement | null>(null)

// Preset primary colour swatches
const colorSwatches = [
  '#a66130', // Default capihouse brown-orange
  '#2563eb', // Blue
  '#16a34a', // Green
  '#dc2626', // Red
  '#7c3aed', // Purple
  '#d97706', // Amber
  '#0891b2', // Cyan
  '#be185d', // Pink
  '#374151', // Dark gray
  '#1e293b', // Slate dark
]

// ── Sync draft with current saved theme when modal opens ──
watch(() => props.modelValue, (open) => {
  if (open) {
    saveError.value = ''
    saveSuccess.value = ''
    const current = authStore.user?.theme ?? null
    snapshotBeforeOpen.value = current ? { ...current } : null

    draft.value = {
      bg_type:      current?.bg_type      ?? DEFAULT_THEME.bg_type,
      bg_value:     current?.bg_value     ?? DEFAULT_THEME.bg_value,
      bg_size:      current?.bg_size      ?? DEFAULT_THEME.bg_size,
      bg_repeat:    current?.bg_repeat    ?? DEFAULT_THEME.bg_repeat,
      bg_position:  current?.bg_position  ?? DEFAULT_THEME.bg_position,
      color_primary: current?.color_primary ?? DEFAULT_THEME.color_primary,
    }

    bgImageFile.value = null
    bgImagePreviewUrl.value = draft.value.bg_type === 'image' ? draft.value.bg_value : ''
  }
})

// ── Live preview — apply draft to DOM as the user edits ──
watch(draft, (d) => {
  // Build a preview theme; if a local file is selected, use its object URL
  const previewTheme: UserTheme = {
    ...d,
    bg_value: bgImagePreviewUrl.value && d.bg_type === 'image'
      ? bgImagePreviewUrl.value
      : d.bg_value,
  }
  themeStore.applyTheme(previewTheme)
}, { deep: true })

// ── File input handler ──
function onBgFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  bgImageFile.value = file
  bgImagePreviewUrl.value = URL.createObjectURL(file)
  draft.value.bg_type = 'image'
  // Trigger watcher to show preview immediately
  draft.value = { ...draft.value }
}

function clearBgImage() {
  bgImageFile.value = null
  bgImagePreviewUrl.value = ''
  if (bgImageInputRef.value) bgImageInputRef.value.value = ''
  draft.value.bg_type = 'color'
  draft.value.bg_value = DEFAULT_THEME.bg_value
}

// ── Restore defaults (preview only — not saved yet) ──
function restoreDefaults() {
  bgImageFile.value = null
  bgImagePreviewUrl.value = ''
  if (bgImageInputRef.value) bgImageInputRef.value.value = ''
  draft.value = { ...DEFAULT_THEME }
  themeStore.resetTheme()
}

// ── Cancel — revert preview to what was active before opening ──
function cancel() {
  if (snapshotBeforeOpen.value) {
    themeStore.applyTheme(snapshotBeforeOpen.value)
  } else {
    themeStore.resetTheme()
  }
  emit('update:modelValue', false)
}

// ── Save ──
async function save() {
  isSaving.value = true
  saveError.value = ''
  saveSuccess.value = ''

  try {
    let finalBgValue = draft.value.bg_value

    // Upload background image if a new file was selected
    if (draft.value.bg_type === 'image' && bgImageFile.value) {
      finalBgValue = await profileStore.uploadThemeBackground(bgImageFile.value)
    }

    const themeToSave: UserTheme = {
      ...draft.value,
      bg_value: finalBgValue,
    }

    await profileStore.updateTheme(themeToSave)
    saveSuccess.value = 'Tema salvo com sucesso!'
    setTimeout(() => emit('update:modelValue', false), 800)
  } catch (err: any) {
    saveError.value = err?.response?.data?.message || 'Erro ao salvar o tema.'
  } finally {
    isSaving.value = false
  }
}

// ── Reset & persist to server ──
async function resetAndSave() {
  isSaving.value = true
  saveError.value = ''
  try {
    await profileStore.resetProfileTheme()
    draft.value = { ...DEFAULT_THEME }
    bgImageFile.value = null
    bgImagePreviewUrl.value = ''
    saveSuccess.value = 'Tema restaurado!'
    setTimeout(() => emit('update:modelValue', false), 800)
  } catch (err: any) {
    saveError.value = err?.response?.data?.message || 'Erro ao restaurar o tema.'
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <RetroModal :modelValue="modelValue" @update:modelValue="cancel" title="» Personalizar tema" size="lg">

    <div class="customizer-body">

      <!-- Status banners -->
      <div v-if="saveError" class="banner banner-error">{{ saveError }}</div>
      <div v-if="saveSuccess" class="banner banner-success">{{ saveSuccess }}</div>

      <!-- ── Section: Primary colour ─────────────────────── -->
      <section class="section">
        <div class="section-title">🎨 Cor primária</div>
        <p class="section-hint">Afeta botões, headers, links e todos os elementos de destaque.</p>

        <!-- Swatches -->
        <div class="swatches">
          <button
            v-for="swatch in colorSwatches"
            :key="swatch"
            type="button"
            class="swatch-btn"
            :class="{ active: draft.color_primary === swatch }"
            :style="{ backgroundColor: swatch }"
            :title="swatch"
            @click="draft.color_primary = swatch"
          />
        </div>

        <!-- Custom colour picker -->
        <div class="color-picker-row">
          <label class="picker-label">Personalizada:</label>
          <input
            type="color"
            v-model="draft.color_primary"
            class="color-input"
            title="Escolher cor personalizada"
          />
          <span class="color-hex-display">{{ draft.color_primary }}</span>
        </div>
      </section>

      <div class="divider" />

      <!-- ── Section: Background ──────────────────────────── -->
      <section class="section">
        <div class="section-title">🖼️ Plano de fundo</div>

        <!-- Toggle: Color vs Image -->
        <div class="toggle-group">
          <button
            type="button"
            class="toggle-btn"
            :class="{ active: draft.bg_type === 'color' }"
            @click="draft.bg_type = 'color'; bgImageFile = null; bgImagePreviewUrl = ''"
          >
            Cor sólida
          </button>
          <button
            type="button"
            class="toggle-btn"
            :class="{ active: draft.bg_type === 'image' }"
            @click="draft.bg_type = 'image'"
          >
            Imagem
          </button>
        </div>

        <!-- Colour background options -->
        <div v-if="draft.bg_type === 'color'" class="color-picker-row">
          <label class="picker-label">Cor do fundo:</label>
          <input type="color" v-model="draft.bg_value" class="color-input" />
          <span class="color-hex-display">{{ draft.bg_value }}</span>
        </div>

        <!-- Image background options -->
        <div v-else class="image-options">
          <!-- File upload -->
          <div class="upload-row">
            <label class="upload-label" for="bg-upload">
              <span class="upload-icon">📁</span>
              {{ bgImageFile ? bgImageFile.name : 'Escolher imagem...' }}
            </label>
            <input
              id="bg-upload"
              ref="bgImageInputRef"
              type="file"
              accept="image/*"
              class="file-input-hidden"
              @change="onBgFileChange"
            />
            <button v-if="bgImageFile || draft.bg_value" type="button" class="clear-btn" @click="clearBgImage">
              ✕ Remover
            </button>
          </div>

          <!-- Current image preview thumbnail -->
          <div v-if="bgImagePreviewUrl || draft.bg_value" class="bg-thumbnail-wrap">
            <img
              :src="bgImagePreviewUrl || draft.bg_value"
              alt="Preview do fundo"
              class="bg-thumbnail"
            />
          </div>

          <!-- bg-size -->
          <div class="select-group">
            <label class="select-label">Tamanho:</label>
            <select v-model="draft.bg_size" class="retro-select">
              <option value="cover">Cover (cobrir toda a tela)</option>
              <option value="contain">Contain (caber na tela)</option>
              <option value="auto">Auto (tamanho original)</option>
              <option value="100% 100%">Esticar (100% x 100%)</option>
            </select>
          </div>

          <!-- bg-repeat -->
          <div class="select-group">
            <label class="select-label">Repetição:</label>
            <select v-model="draft.bg_repeat" class="retro-select">
              <option value="no-repeat">Sem repetição</option>
              <option value="repeat">Repetir (X e Y)</option>
              <option value="repeat-x">Repetir horizontal</option>
              <option value="repeat-y">Repetir vertical</option>
            </select>
          </div>

          <!-- bg-position -->
          <div class="select-group">
            <label class="select-label">Posição:</label>
            <select v-model="draft.bg_position" class="retro-select">
              <option value="center">Centro</option>
              <option value="top">Topo</option>
              <option value="bottom">Rodapé</option>
              <option value="left">Esquerda</option>
              <option value="right">Direita</option>
              <option value="top left">Topo esquerda</option>
              <option value="top right">Topo direita</option>
            </select>
          </div>
        </div>
      </section>

      <!-- Preview hint -->
      <p class="preview-hint">
        💡 O preview está sendo aplicado em tempo real no app. Feche o modal ou clique em Cancelar para reverter.
      </p>

      <!-- Restore default button -->
      <button type="button" class="restore-btn" @click="restoreDefaults" :disabled="isSaving">
        ↺ Pré-visualizar tema padrão
      </button>
    </div>

    <!-- Footer -->
    <template #footer>
      <div class="modal-footer">
        <RetroButton variant="danger" :disabled="isSaving" @click="resetAndSave">
          Restaurar padrão
        </RetroButton>
        <div class="footer-right">
          <RetroButton variant="secondary" :disabled="isSaving" @click="cancel">Cancelar</RetroButton>
          <RetroButton :loading="isSaving" @click="save">Salvar tema</RetroButton>
        </div>
      </div>
    </template>

  </RetroModal>
</template>

<style scoped>
.customizer-body {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 0.25rem 0;
}

.banner {
  padding: 0.5rem 0.75rem;
  border-radius: 2px;
  font-size: 0.85rem;
}
.banner-error {
  background-color: #fee2e2;
  border: 1px solid #ef4444;
  color: #b91c1c;
}
.banner-success {
  background-color: #dcfce7;
  border: 1px solid #22c55e;
  color: #15803d;
}

.section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.section-title {
  font-family: var(--font-heading);
  font-size: 0.9rem;
  font-weight: bold;
  color: var(--color-primary-800);
  text-transform: uppercase;
}

.section-hint {
  font-size: 0.8rem;
  color: var(--color-muted);
  margin-top: -0.4rem;
}

.divider {
  border-top: 1px solid var(--color-border);
}

/* ── Swatches ── */
.swatches {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.swatch-btn {
  width: 32px;
  height: 32px;
  border-radius: 2px;
  border: 2px solid transparent;
  cursor: pointer;
  transition: transform 0.1s, border-color 0.1s;
}
.swatch-btn:hover {
  transform: scale(1.15);
}
.swatch-btn.active {
  border-color: var(--color-primary-800);
  outline: 2px solid #ffffff;
  outline-offset: 1px;
}

/* ── Colour picker row ── */
.color-picker-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.picker-label {
  font-family: var(--font-heading);
  font-size: 0.8rem;
  font-weight: bold;
  color: var(--color-primary-800);
  white-space: nowrap;
}

.color-input {
  width: 48px;
  height: 36px;
  border: 2px solid var(--color-border);
  border-radius: 2px;
  padding: 2px;
  cursor: pointer;
  background: none;
}

.color-hex-display {
  font-family: var(--font-heading);
  font-size: 0.8rem;
  color: var(--color-muted);
}

/* ── Toggle ── */
.toggle-group {
  display: flex;
  gap: 0;
  border: 2px solid var(--color-border);
  border-radius: 2px;
  overflow: hidden;
  width: fit-content;
}

.toggle-btn {
  padding: 0.35rem 1rem;
  font-family: var(--font-heading);
  font-size: 0.8rem;
  font-weight: bold;
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--color-muted);
  transition: background-color 0.15s, color 0.15s;
}
.toggle-btn:not(:last-child) {
  border-right: 2px solid var(--color-border);
}
.toggle-btn.active {
  background-color: var(--color-primary);
  color: #ffffff;
}

/* ── Image options ── */
.image-options {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.upload-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.upload-label {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.8rem;
  font-family: var(--font-heading);
  font-size: 0.8rem;
  font-weight: bold;
  border: 2px dashed var(--color-border);
  border-radius: 2px;
  cursor: pointer;
  color: var(--color-primary-800);
  background-color: var(--color-primary-50);
  transition: border-color 0.15s;
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.upload-label:hover {
  border-color: var(--color-primary);
}

.file-input-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

.clear-btn {
  background: none;
  border: 1px solid var(--color-danger, #ef4444);
  color: var(--color-danger, #ef4444);
  font-family: var(--font-heading);
  font-size: 0.75rem;
  font-weight: bold;
  padding: 0.3rem 0.6rem;
  border-radius: 2px;
  cursor: pointer;
}
.clear-btn:hover {
  background-color: #fee2e2;
}

.bg-thumbnail-wrap {
  width: 100%;
  height: 100px;
  border: 2px solid var(--color-border);
  border-radius: 2px;
  overflow: hidden;
}
.bg-thumbnail {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* ── Selects ── */
.select-group {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.select-label {
  font-family: var(--font-heading);
  font-size: 0.8rem;
  font-weight: bold;
  color: var(--color-primary-800);
  width: 80px;
  flex-shrink: 0;
}

.retro-select {
  flex: 1;
  padding: 0.4rem 0.6rem;
  font-family: var(--font-body);
  font-size: 0.85rem;
  border: 2px solid var(--color-border);
  border-radius: 2px;
  background-color: var(--color-primary-50);
  outline: none;
  cursor: pointer;
}
.retro-select:focus {
  border-color: var(--color-primary);
}

/* ── Preview hint ── */
.preview-hint {
  font-size: 0.78rem;
  color: var(--color-muted);
  background-color: var(--color-primary-50);
  padding: 0.5rem 0.75rem;
  border-left: 3px solid var(--color-primary);
  border-radius: 0 2px 2px 0;
}

/* ── Restore default ── */
.restore-btn {
  background: none;
  border: 1px dashed var(--color-border);
  color: var(--color-muted);
  font-family: var(--font-heading);
  font-size: 0.8rem;
  padding: 0.35rem 0.75rem;
  border-radius: 2px;
  cursor: pointer;
  align-self: flex-start;
  transition: color 0.15s, border-color 0.15s;
}
.restore-btn:hover:not(:disabled) {
  color: var(--color-primary);
  border-color: var(--color-primary);
}
.restore-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ── Modal footer ── */
.modal-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  border-top: 1px solid var(--color-border);
  padding-top: 0.75rem;
  flex-wrap: wrap;
}

.footer-right {
  display: flex;
  gap: 0.5rem;
  margin-left: auto;
}
</style>
