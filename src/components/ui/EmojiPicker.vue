<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import data from '@emoji-mart/data'
import i18nPt from '@emoji-mart/data/i18n/pt.json'
import { Picker } from 'emoji-mart'

const props = withDefaults(
  defineProps<{
    modelValue?: string
    buttonLabel?: string
    closeOnSelect?: boolean
    position?: 'left' | 'right'
  }>(),
  {
    modelValue: '',
    buttonLabel: '🙂',
    closeOnSelect: true,
    position: 'left',
  }
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'select', emoji: any): void
}>()

const isOpen = ref(false)
const triggerRef = ref<HTMLButtonElement | null>(null)
const pickerDesktopContainer = ref<HTMLDivElement | null>(null)
const pickerMobileContainer = ref<HTMLDivElement | null>(null)
const isMobile = ref(false)

const popoverStyle = ref<{ top?: string; bottom?: string; left?: string; right?: string }>({})

const displayEmoji = computed(() => {
  return props.modelValue || props.buttonLabel || '🙂'
})

function checkMobile() {
  isMobile.value = window.innerWidth < 640
}

let pickerInstance: any = null

function createPicker() {
  return new Picker({
    data,
    i18n: i18nPt,
    locale: 'pt',
    theme: 'light',
    previewPosition: 'none',
    skinTonePosition: 'search',
    navPosition: 'top',
    onEmojiSelect: (selectedEmoji: any) => {
      const emoji = selectedEmoji?.native
      if (emoji) {
        emit('update:modelValue', emoji)
        emit('select', selectedEmoji)
      }
      if (props.closeOnSelect) {
        close()
      }
    },
  })
}

function updatePopoverPosition() {
  if (!triggerRef.value || isMobile.value) return

  const rect = triggerRef.value.getBoundingClientRect()
  const pickerWidth = 352
  const pickerHeight = 435
  const margin = 8

  // Calculate vertical position
  const spaceBelow = window.innerHeight - rect.bottom
  const spaceAbove = rect.top

  const style: { top?: string; bottom?: string; left?: string; right?: string } = {}

  if (spaceBelow < pickerHeight && spaceAbove > spaceBelow) {
    // Show above
    style.bottom = `${window.innerHeight - rect.top + margin}px`
  } else {
    // Show below
    style.top = `${rect.bottom + margin}px`
  }

  // Calculate horizontal position
  if (props.position === 'right') {
    let right = window.innerWidth - rect.right
    if (right + pickerWidth > window.innerWidth) {
      right = margin
    }
    style.right = `${right}px`
  } else {
    let left = rect.left
    if (left + pickerWidth > window.innerWidth) {
      left = Math.max(margin, window.innerWidth - pickerWidth - margin)
    }
    style.left = `${left}px`
  }

  popoverStyle.value = style
}

function mountPicker() {
  const container = isMobile.value ? pickerMobileContainer.value : pickerDesktopContainer.value
  if (!container) return

  if (!pickerInstance) {
    pickerInstance = createPicker()
  }

  container.innerHTML = ''
  container.appendChild(pickerInstance)
}

function toggle() {
  if (isOpen.value) {
    close()
  } else {
    open()
  }
}

function open() {
  checkMobile()
  isOpen.value = true
  nextTick(() => {
    updatePopoverPosition()
    mountPicker()
  })
}

function close() {
  isOpen.value = false
}

function handleResize() {
  if (isOpen.value) {
    checkMobile()
    updatePopoverPosition()
    nextTick(() => {
      mountPicker()
    })
  }
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', handleResize)
  window.addEventListener('scroll', updatePopoverPosition, true)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  window.removeEventListener('scroll', updatePopoverPosition, true)
})
</script>

<template>
  <div class="emoji-picker-wrapper">
    <button
      ref="triggerRef"
      type="button"
      class="emoji-trigger-btn"
      title="Selecionar emoji"
      @click="toggle"
    >
      <span class="emoji-icon">{{ displayEmoji }}</span>
    </button>

    <Teleport to="body">
      <div v-if="isOpen" class="emoji-picker-teleport-root">
        <!-- Desktop Backdrop & Popover -->
        <template v-if="!isMobile">
          <div class="desktop-backdrop" @click="close"></div>
          <div
            ref="pickerDesktopContainer"
            class="picker-desktop-dropdown"
            :style="popoverStyle"
          ></div>
        </template>

        <!-- Mobile Backdrop & Bottom Sheet -->
        <template v-else>
          <div class="mobile-backdrop" @click="close"></div>
          <div class="mobile-sheet">
            <div class="mobile-sheet-header">
              <span class="sheet-title">» Selecionar Emoji</span>
              <button type="button" class="sheet-close-btn" @click="close">[×]</button>
            </div>
            <div ref="pickerMobileContainer" class="mobile-picker-box"></div>
          </div>
        </template>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.emoji-picker-wrapper {
  display: inline-block;
  position: relative;
}

.emoji-trigger-btn {
  width: 44px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.35rem;
  line-height: 1;
  background-color: var(--color-primary-50, #f8f6f1);
  border: 2px solid var(--color-primary-200, #e8c9a5);
  border-radius: 2px;
  cursor: pointer;
  transition: all 0.15s ease;
  user-select: none;
}

.emoji-trigger-btn:hover {
  border-color: var(--color-primary, #a66130);
  background-color: var(--color-primary-100, #fdf8f3);
}

.emoji-icon {
  display: inline-block;
  transform: translateY(1px);
}

/* Teleported Popover & Sheet Styles */
.emoji-picker-teleport-root {
  position: fixed;
  inset: 0;
  z-index: 100000;
  pointer-events: auto;
}

.desktop-backdrop {
  position: fixed;
  inset: 0;
  z-index: 100001;
  background: transparent;
}

.picker-desktop-dropdown {
  position: fixed;
  z-index: 100002;
  background-color: #ffffff;
  border: 2px solid var(--color-border, #D8CDC5);
  border-radius: 4px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
  overflow: hidden;
}

/* Mobile Bottom Sheet */
.mobile-backdrop {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 100001;
}

.mobile-sheet {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 100002;
  background: #ffffff;
  border-top: 2px solid var(--color-border, #D8CDC5);
  border-radius: 8px 8px 0 0;
  box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.25);
  max-height: 85vh;
  display: flex;
  flex-direction: column;
}

.mobile-sheet-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.6rem 1rem;
  background-color: var(--color-primary-50, #f8f6f1);
  border-bottom: 1px solid var(--color-border, #D8CDC5);
}

.sheet-title {
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-weight: bold;
  font-size: 0.9rem;
  color: var(--color-primary-800, #5f4120);
}

.sheet-close-btn {
  background: none;
  border: none;
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-weight: bold;
  font-size: 0.9rem;
  color: var(--color-danger, #ef4444);
  cursor: pointer;
  padding: 0.2rem 0.4rem;
}

.mobile-picker-box {
  overflow-y: auto;
  display: flex;
  justify-content: center;
  padding: 0.5rem 0;
}
</style>
