<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import RetroModal from '@/components/ui/RetroModal.vue'
import RetroButton from '@/components/ui/RetroButton.vue'
import ImageCropper from '@/components/profile/ImageCropper.vue'
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

// Effective background image URL for display
const effectiveBgImageUrl = computed(() => {
  if (draft.value.bg_type !== 'image') return ''
  return bgImagePreviewUrl.value || draft.value.bg_value || ''
})

// CSS style object applied to the profile emulation mockup screen
const mockupBackgroundStyle = computed(() => {
  if (draft.value.bg_type === 'image' && effectiveBgImageUrl.value) {
    return {
      backgroundColor: '#f8f6f1',
      backgroundImage: `url("${effectiveBgImageUrl.value}")`,
      backgroundSize: draft.value.bg_size || 'cover',
      backgroundRepeat: draft.value.bg_repeat || 'no-repeat',
      backgroundPosition: draft.value.bg_position || 'center',
    }
  }

  return {
    backgroundColor: draft.value.bg_value || '#f8f6f1',
    backgroundImage: 'none',
    backgroundSize: 'auto',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'center',
  }
})

// ── Custom percentage background size helpers ──
const isCustomSize = computed(() => {
  const s = draft.value.bg_size || ''
  return !['cover', 'contain', 'auto', '100% 100%'].includes(s)
})

const sizeSelectMode = computed(() => {
  return isCustomSize.value ? 'custom' : (draft.value.bg_size || 'cover')
})

const customSizePercent = ref<number>(100)

function syncCustomSizeFromDraft() {
  const val = draft.value.bg_size || ''
  const m = /^(\d+)%/.exec(val)
  if (m && m[1]) {
    customSizePercent.value = parseInt(m[1], 10)
  } else {
    customSizePercent.value = 100
  }
}

function onSizeSelectChange(e: Event) {
  const val = (e.target as HTMLSelectElement).value
  if (val === 'custom') {
    draft.value.bg_size = `${customSizePercent.value}%`
  } else {
    draft.value.bg_size = val
  }
}

function onCustomPercentInput() {
  const safeVal = Math.min(500, Math.max(10, customSizePercent.value || 100))
  draft.value.bg_size = `${safeVal}%`
}

function setCustomPercent(p: number) {
  customSizePercent.value = p
  draft.value.bg_size = `${p}%`
}

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

    syncCustomSizeFromDraft()

    bgImageFile.value = null
    bgImagePreviewUrl.value = draft.value.bg_type === 'image' ? draft.value.bg_value : ''
  }
})

// ── Live preview — apply draft to app DOM as the user edits ──
watch(draft, (d) => {
  const previewTheme: UserTheme = {
    ...d,
    bg_value: bgImagePreviewUrl.value && d.bg_type === 'image'
      ? bgImagePreviewUrl.value
      : d.bg_value,
  }
  themeStore.applyTheme(previewTheme)
}, { deep: true })

// ── Background Image Cropping State ──
const showBgCropper = ref(false)
const rawBgToCrop = ref<string | null>(null)

// ── File input handler ──
function onBgFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  rawBgToCrop.value = URL.createObjectURL(file)
  showBgCropper.value = true
  input.value = ''
}

function openCropCurrent() {
  if (bgImagePreviewUrl.value) {
    rawBgToCrop.value = bgImagePreviewUrl.value
    showBgCropper.value = true
  } else if (draft.value.bg_value) {
    rawBgToCrop.value = draft.value.bg_value
    showBgCropper.value = true
  }
}

function handleBgCropped(blob: Blob) {
  const file = new File([blob], 'theme-bg.jpg', { type: 'image/jpeg' })
  bgImageFile.value = file
  bgImagePreviewUrl.value = URL.createObjectURL(blob)
  draft.value.bg_type = 'image'
  draft.value = { ...draft.value }
}

function clearBgImage() {
  bgImageFile.value = null
  bgImagePreviewUrl.value = ''
  rawBgToCrop.value = null
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
  } catch (err: unknown) {
    const error = err as { response?: { data?: { message?: string } } }
    saveError.value = error.response?.data?.message || 'Erro ao salvar o tema.'
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
  } catch (err: unknown) {
    const error = err as { response?: { data?: { message?: string } } }
    saveError.value = error.response?.data?.message || 'Erro ao restaurar o tema.'
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <RetroModal :modelValue="modelValue" @update:modelValue="cancel" title="» Personalizar tema do perfil" size="xl">

    <div class="customizer-container">

      <!-- Status banners -->
      <div v-if="saveError" class="banner banner-error">{{ saveError }}</div>
      <div v-if="saveSuccess" class="banner banner-success">{{ saveSuccess }}</div>

      <div class="customizer-grid">

        <!-- ── Left Column: Controls ─────────────────────── -->
        <div class="controls-column">

          <!-- Section 1: Primary Colour -->
          <section class="section">
            <div class="section-title">🎨 Cor do Sistema (Primária)</div>
            <p class="section-hint">Define a cor de destaque dos botões, menus e cabeçalhos de caixas.</p>

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
              <label class="picker-label">Cor personalizada:</label>
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

          <!-- Section 2: Background -->
          <section class="section">
            <div class="section-title">🖼️ Plano de Fundo da Rede</div>
            <p class="section-hint">Personaliza o fundo geral do app e do seu perfil para você e seus visitantes.</p>

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
                Imagem de fundo
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
                  <span class="upload-text">{{ bgImageFile ? bgImageFile.name : (draft.bg_value ? 'Alterar imagem...' : 'Escolher imagem...') }}</span>
                </label>
                <input
                  id="bg-upload"
                  ref="bgImageInputRef"
                  type="file"
                  accept="image/*"
                  class="file-input-hidden"
                  @change="onBgFileChange"
                />
                <button
                  v-if="bgImagePreviewUrl || draft.bg_value"
                  type="button"
                  class="crop-btn"
                  @click="openCropCurrent"
                  title="Recortar enquadramento da imagem"
                >
                  ✂️ Cortar
                </button>
                <button v-if="bgImageFile || draft.bg_value" type="button" class="clear-btn" @click="clearBgImage">
                  ✕ Remover
                </button>
              </div>

              <!-- bg-size -->
              <div class="select-group">
                <label class="select-label">Ajuste:</label>
                <select :value="sizeSelectMode" @change="onSizeSelectChange" class="retro-select">
                  <option value="cover">Cover (Cobrir toda a tela)</option>
                  <option value="contain">Contain (Caber sem cortar)</option>
                  <option value="auto">Auto (Tamanho original)</option>
                  <option value="100% 100%">Esticar (100% x 100%)</option>
                  <option value="custom">Personalizado em %</option>
                </select>
              </div>

              <!-- Manual Percentage Control -->
              <div v-if="isCustomSize" class="custom-size-box">
                <div class="custom-size-top">
                  <span class="custom-size-label">Tamanho manual:</span>
                  <div class="custom-size-number-wrap">
                    <input
                      type="number"
                      min="10"
                      max="500"
                      v-model.number="customSizePercent"
                      @input="onCustomPercentInput"
                      class="custom-percent-input"
                    />
                    <span class="percent-symbol">%</span>
                  </div>
                </div>

                <input
                  type="range"
                  min="10"
                  max="300"
                  step="5"
                  v-model.number="customSizePercent"
                  @input="onCustomPercentInput"
                  class="custom-size-range"
                />

                <div class="size-chips-row">
                  <button
                    v-for="chip in [25, 50, 75, 100, 150, 200]"
                    :key="chip"
                    type="button"
                    class="size-chip-btn"
                    :class="{ active: customSizePercent === chip }"
                    @click="setCustomPercent(chip)"
                  >
                    {{ chip }}%
                  </button>
                </div>
              </div>

              <!-- bg-repeat -->
              <div class="select-group">
                <label class="select-label">Repetição:</label>
                <select v-model="draft.bg_repeat" class="retro-select">
                  <option value="no-repeat">Sem repetição</option>
                  <option value="repeat">Repetir padrão (Mosaico)</option>
                  <option value="repeat-x">Repetir só na horizontal</option>
                  <option value="repeat-y">Repetir só na vertical</option>
                </select>
              </div>

              <!-- bg-position -->
              <div class="select-group">
                <label class="select-label">Posição:</label>
                <select v-model="draft.bg_position" class="retro-select">
                  <option value="center">Centro</option>
                  <option value="top">Topo central</option>
                  <option value="bottom">Rodapé central</option>
                  <option value="left">Esquerda</option>
                  <option value="right">Direita</option>
                  <option value="top left">Topo à esquerda</option>
                  <option value="top right">Topo à direita</option>
                </select>
              </div>
            </div>
          </section>

          <!-- Restore default button -->
          <button type="button" class="restore-btn" @click="restoreDefaults" :disabled="isSaving">
            ↺ Testar visual original padrão
          </button>
        </div>

        <!-- ── Right Column: Interactive Profile Screen Mockup ─────────────────────── -->
        <div class="preview-column">
          <div class="preview-header">
            <span class="preview-title">📱 Emulador de Perfil (Preview)</span>
            <span class="preview-badge" :style="{ backgroundColor: draft.color_primary }">
              {{ draft.bg_type === 'image' ? '🖼️ Imagem' : '🎨 Cor' }}
            </span>
          </div>

          <div class="mockup-frame">
            <!-- Mockup Phone Bezel Top -->
            <div class="mockup-top-bar">
              <span class="mockup-time">16:20</span>
              <div class="mockup-speaker"></div>
              <span class="mockup-battery">100%</span>
            </div>

            <!-- Mockup Screen Body (receives dynamic background) -->
            <div class="mockup-screen" :style="mockupBackgroundStyle">

              <!-- Emulated App Header -->
              <div class="mockup-app-header">
                <div class="mockup-app-brand">
                  <img src="/capihouse-logo.png" alt="Logo" class="mockup-mini-logo" />
                  <span class="mockup-app-title" :style="{ color: draft.color_primary }">CapiHouse</span>
                </div>
                <div class="mockup-app-icons">
                  <span class="mockup-dot-icon" :style="{ backgroundColor: draft.color_primary }">🔔</span>
                </div>
              </div>

              <!-- Emulated Profile Content -->
              <div class="mockup-profile-container">

                <!-- Header Box (Banner + Avatar + Info) -->
                <div class="mockup-box">
                  <!-- Banner -->
                  <div
                    class="mockup-banner"
                    :style="authStore.user?.banner_url ? { backgroundImage: `url(${authStore.user.banner_url})` } : { backgroundColor: draft.color_primary }"
                  ></div>

                  <!-- Profile Bar -->
                  <div class="mockup-profile-bar">
                    <div class="mockup-avatar-wrapper">
                      <img
                        v-if="authStore.user?.avatar_url"
                        :src="authStore.user.avatar_url"
                        alt="Avatar"
                        class="mockup-avatar"
                      />
                      <div
                        v-else
                        class="mockup-avatar-fallback"
                        :style="{ backgroundColor: draft.color_primary }"
                      >
                        {{ authStore.user?.initials || 'CR' }}
                      </div>
                    </div>

                    <div class="mockup-names">
                      <div class="mockup-display-name">{{ authStore.user?.name || 'Seu Nome' }}</div>
                      <div class="mockup-username" :style="{ color: draft.color_primary }">@{{ authStore.user?.username || 'usuario' }}</div>
                    </div>

                    <div class="mockup-actions">
                      <span class="mockup-btn" :style="{ backgroundColor: draft.color_primary }">[ 🎨 ]</span>
                      <span class="mockup-btn-outline" :style="{ borderColor: draft.color_primary, color: draft.color_primary }">[ ⚙️ ]</span>
                    </div>
                  </div>
                </div>

                <!-- Box: Sobre mim -->
                <div class="mockup-box">
                  <div class="mockup-box-header" :style="{ backgroundColor: draft.color_primary }">
                    » SOBRE MIM
                  </div>
                  <div class="mockup-box-content">
                    <p class="mockup-bio-text">
                      "{{ authStore.user?.bio || 'Bem-vindo ao meu perfil no CapiHouse!' }}"
                    </p>
                  </div>
                </div>

                <!-- Box: Meus Interesses -->
                <div class="mockup-box">
                  <div class="mockup-box-header" :style="{ backgroundColor: draft.color_primary }">
                    » MEUS INTERESSES
                  </div>
                  <div class="mockup-box-content mockup-interests-row">
                    <span class="mockup-tag">Capivaras</span>
                    <span class="mockup-tag">Música</span>
                    <span class="mockup-tag">Retro</span>
                  </div>
                </div>

                <!-- Mini Post -->
                <div class="mockup-box mockup-post">
                  <div class="mockup-post-head">
                    <span class="mockup-post-author">{{ authStore.user?.name || 'Você' }}</span>
                    <span class="mockup-post-time">há pouco</span>
                  </div>
                  <p class="mockup-post-content">
                    Personalizando meu perfil com as novas cores e plano de fundo! 🦫✨
                  </p>
                  <div class="mockup-post-footer">
                    <span class="mockup-like-badge" :style="{ color: draft.color_primary, borderColor: draft.color_primary }">
                      ❤️ Curtir
                    </span>
                  </div>
                </div>

              </div>
            </div>

            <!-- Mockup Bottom Bar -->
            <div class="mockup-bottom-bar">
              <div class="mockup-home-indicator"></div>
            </div>
          </div>

          <p class="mockup-caption">
            💡 Role a tela acima para ver como o fundo interage com o conteúdo.
          </p>
        </div>

      </div>

    </div>

    <!-- Footer -->
    <template #footer>
      <div class="modal-footer">
        <RetroButton variant="danger" :disabled="isSaving" @click="resetAndSave">
          Restaurar padrão original
        </RetroButton>
        <div class="footer-right">
          <RetroButton variant="secondary" :disabled="isSaving" @click="cancel">Cancelar</RetroButton>
          <RetroButton :loading="isSaving" @click="save">Salvar personalização</RetroButton>
        </div>
      </div>
    </template>

  </RetroModal>

  <!-- Cropper Modal para imagem de fundo -->
  <ImageCropper
    v-model="showBgCropper"
    :initialImage="rawBgToCrop"
    :aspectRatio="0"
    title="Cortar Imagem de Fundo"
    @cropped="handleBgCropped"
  />
</template>

<style scoped>
.crop-btn {
  background: none;
  border: 1px solid var(--color-primary);
  color: var(--color-primary);
  font-family: var(--font-heading);
  font-size: 0.75rem;
  font-weight: bold;
  padding: 0.35rem 0.6rem;
  border-radius: 2px;
  cursor: pointer;
  white-space: nowrap;
  transition: background-color 0.15s;
}
.crop-btn:hover {
  background-color: var(--color-primary-50);
}

.customizer-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
  max-width: 100%;
  overflow-x: hidden;
  box-sizing: border-box;
}

.customizer-grid {
  display: grid;
  grid-template-columns: 1fr 340px;
  gap: 1.5rem;
  align-items: start;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

@media (max-width: 860px) {
  .customizer-grid {
    grid-template-columns: 1fr;
    gap: 1.25rem;
  }
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

/* ── Controls Column ── */
.controls-column {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
}

.section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
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
  transform: scale(1.12);
}
.swatch-btn.active {
  border-color: #181818;
  outline: 2px solid #ffffff;
  outline-offset: 1px;
}

/* ── Colour picker row ── */
.color-picker-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  width: 100%;
  box-sizing: border-box;
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
  max-width: 100%;
  box-sizing: border-box;
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
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
}

.upload-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

.upload-label {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.45rem 0.8rem;
  font-family: var(--font-heading);
  font-size: 0.8rem;
  font-weight: bold;
  border: 2px dashed var(--color-border);
  border-radius: 2px;
  cursor: pointer;
  color: var(--color-primary-800);
  background-color: var(--color-primary-50);
  transition: border-color 0.15s;
  flex: 1 1 140px;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  box-sizing: border-box;
}
.upload-label:hover {
  border-color: var(--color-primary);
}

.upload-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
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
  padding: 0.35rem 0.6rem;
  border-radius: 2px;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
}
.clear-btn:hover {
  background-color: #fee2e2;
}

/* ── Selects ── */
.select-group {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
}

.select-label {
  font-family: var(--font-heading);
  font-size: 0.8rem;
  font-weight: bold;
  color: var(--color-primary-800);
  width: 75px;
  flex-shrink: 0;
}

.retro-select {
  flex: 1;
  min-width: 0;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
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

@media (max-width: 520px) {
  .select-group {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }
  .select-label {
    width: auto;
  }
}

/* ── Custom Size Control ── */
.custom-size-box {
  background-color: var(--color-primary-50, #f8f6f1);
  border: 1px solid var(--color-border, #D8CDC5);
  border-radius: 2px;
  padding: 0.65rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

.custom-size-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.custom-size-label {
  font-family: var(--font-heading);
  font-size: 0.8rem;
  font-weight: bold;
  color: var(--color-primary-800);
}

.custom-size-number-wrap {
  display: flex;
  align-items: center;
  gap: 0.2rem;
  background: #ffffff;
  border: 1px solid var(--color-border);
  border-radius: 2px;
  padding: 0.15rem 0.35rem;
}

.custom-percent-input {
  width: 48px;
  border: none;
  outline: none;
  font-family: var(--font-heading);
  font-size: 0.85rem;
  font-weight: bold;
  color: var(--color-primary-800);
  text-align: right;
  background: transparent;
}

.percent-symbol {
  font-family: var(--font-heading);
  font-size: 0.8rem;
  color: var(--color-muted);
  font-weight: bold;
}

.custom-size-range {
  width: 100%;
  accent-color: var(--color-primary);
  cursor: pointer;
}

.size-chips-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.size-chip-btn {
  background: #ffffff;
  border: 1px solid var(--color-border);
  color: var(--color-primary-800);
  font-family: var(--font-heading);
  font-size: 0.7rem;
  padding: 0.15rem 0.45rem;
  border-radius: 2px;
  cursor: pointer;
  transition: all 0.12s;
}
.size-chip-btn:hover {
  border-color: var(--color-primary);
  background-color: var(--color-primary-100);
}
.size-chip-btn.active {
  background-color: var(--color-primary);
  border-color: var(--color-primary);
  color: #ffffff;
  font-weight: bold;
}

/* ── Restore button ── */
.restore-btn {
  background: none;
  border: 1px dashed var(--color-border);
  color: var(--color-muted);
  font-family: var(--font-heading);
  font-size: 0.8rem;
  padding: 0.4rem 0.8rem;
  border-radius: 2px;
  cursor: pointer;
  align-self: flex-start;
  transition: color 0.15s, border-color 0.15s;
}
.restore-btn:hover:not(:disabled) {
  color: var(--color-primary);
  border-color: var(--color-primary);
}

/* ── Right Column: Mockup Preview ── */
.preview-column {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.6rem;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
}

.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0 0.25rem;
  box-sizing: border-box;
}

.preview-title {
  font-family: var(--font-heading);
  font-size: 0.8rem;
  font-weight: bold;
  color: var(--color-primary-800);
  text-transform: uppercase;
}

.preview-badge {
  font-family: var(--font-heading);
  font-size: 0.7rem;
  color: #ffffff;
  padding: 0.15rem 0.5rem;
  border-radius: 9999px;
  font-weight: bold;
}

/* ── Smartphone Mockup Device Frame ── */
.mockup-frame {
  width: 100%;
  max-width: 300px;
  height: 480px;
  background-color: #1e1e1e;
  border: 3px solid #333333;
  border-radius: 28px;
  padding: 8px 6px;
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.35);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-sizing: border-box;
}

@media (max-width: 480px) {
  .mockup-frame {
    max-width: 270px;
    height: 430px;
  }
}

.mockup-top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.15rem 0.8rem 0.35rem;
  font-size: 0.65rem;
  color: #888888;
  font-family: monospace;
}

.mockup-speaker {
  width: 36px;
  height: 4px;
  background-color: #444444;
  border-radius: 2px;
}

.mockup-bottom-bar {
  display: flex;
  justify-content: center;
  padding-top: 0.35rem;
}

.mockup-home-indicator {
  width: 80px;
  height: 3px;
  background-color: #555555;
  border-radius: 2px;
}

/* ── Mockup Internal Screen ── */
.mockup-screen {
  flex: 1;
  border-radius: 18px;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  position: relative;
  scrollbar-width: thin;
}

.mockup-app-header {
  position: sticky;
  top: 0;
  z-index: 10;
  background-color: #ffffff;
  border-bottom: 1px solid #D8CDC5;
  padding: 0.35rem 0.6rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.mockup-app-brand {
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.mockup-mini-logo {
  width: 16px;
  height: 16px;
  object-fit: contain;
}

.mockup-app-title {
  font-family: var(--font-heading);
  font-size: 0.75rem;
  font-weight: bold;
}

.mockup-dot-icon {
  font-size: 0.65rem;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 2px;
  color: white;
}

/* ── Mockup Content ── */
.mockup-profile-container {
  padding: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.mockup-box {
  background-color: #ffffff;
  border: 1px solid #D8CDC5;
  border-radius: 2px;
  overflow: hidden;
}

.mockup-banner {
  height: 52px;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}

.mockup-profile-bar {
  padding: 0 0.5rem 0.5rem;
  display: flex;
  align-items: flex-end;
  gap: 0.4rem;
  position: relative;
}

.mockup-avatar-wrapper {
  margin-top: -1.2rem;
  flex-shrink: 0;
}

.mockup-avatar {
  width: 38px;
  height: 38px;
  border-radius: 2px;
  border: 2px solid #ffffff;
  object-fit: cover;
  display: block;
}

.mockup-avatar-fallback {
  width: 38px;
  height: 38px;
  border-radius: 2px;
  border: 2px solid #ffffff;
  color: #ffffff;
  font-family: var(--font-heading);
  font-size: 0.75rem;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mockup-names {
  flex: 1;
  min-width: 0;
}

.mockup-display-name {
  font-family: var(--font-heading);
  font-size: 0.7rem;
  font-weight: bold;
  color: #333333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mockup-username {
  font-family: var(--font-heading);
  font-size: 0.55rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mockup-actions {
  display: flex;
  gap: 0.2rem;
}

.mockup-btn {
  font-size: 0.55rem;
  color: white;
  padding: 0.15rem 0.35rem;
  border-radius: 2px;
  font-family: monospace;
}

.mockup-btn-outline {
  font-size: 0.55rem;
  padding: 0.15rem 0.35rem;
  border-radius: 2px;
  border: 1px solid;
  font-family: monospace;
}

.mockup-box-header {
  color: #ffffff;
  font-family: var(--font-heading);
  font-size: 0.55rem;
  font-weight: bold;
  padding: 0.2rem 0.4rem;
  text-transform: uppercase;
}

.mockup-box-content {
  padding: 0.4rem;
}

.mockup-bio-text {
  font-size: 0.6rem;
  color: #555555;
  font-style: italic;
  line-height: 1.2;
}

.mockup-interests-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.mockup-tag {
  background-color: #344d0e;
  color: #ffffff;
  font-size: 0.55rem;
  padding: 0.1rem 0.35rem;
  border-radius: 2px;
}

.mockup-post {
  padding: 0.4rem;
}

.mockup-post-head {
  display: flex;
  justify-content: space-between;
  font-size: 0.55rem;
  margin-bottom: 0.2rem;
}

.mockup-post-author {
  font-weight: bold;
  color: #333333;
}

.mockup-post-time {
  color: #888888;
}

.mockup-post-content {
  font-size: 0.6rem;
  color: #444444;
  line-height: 1.2;
}

.mockup-post-footer {
  margin-top: 0.35rem;
}

.mockup-like-badge {
  font-size: 0.55rem;
  border: 1px solid;
  padding: 0.1rem 0.35rem;
  border-radius: 2px;
  font-weight: bold;
}

.mockup-caption {
  font-size: 0.72rem;
  color: var(--color-muted);
  text-align: center;
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

