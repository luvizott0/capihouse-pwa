<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import * as usersApi from '@/api/users'
import type { User } from '@/types/models'
import UserAvatar from '@/components/ui/UserAvatar.vue'

const props = withDefaults(
  defineProps<{
    modelValue: string
    type?: 'textarea' | 'input'
    placeholder?: string
    rows?: number
    maxlength?: number
    disabled?: boolean
    inputClass?: string
    popupPosition?: 'top' | 'bottom'
  }>(),
  {
    type: 'textarea',
    placeholder: '',
    rows: 3,
    maxlength: undefined,
    disabled: false,
    inputClass: '',
    popupPosition: 'bottom',
  }
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'submit'): void
  (e: 'cancel'): void
}>()

const inputRef = ref<HTMLInputElement | HTMLTextAreaElement | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)

// Autocomplete state
const showDropdown = ref(false)
const searchQuery = ref('')
const mentionStartIndex = ref<number>(-1)
const selectedIndex = ref(0)
const isLoadingUsers = ref(false)
const cachedUsers = ref<User[]>([])
const searchResults = ref<User[]>([])

// Initial fetch to have quick offline/cached suggestions
async function preloadUsers() {
  try {
    const res = await usersApi.getUsers()
    cachedUsers.value = res.data
  } catch {
    // Silent
  }
}

onMounted(() => {
  preloadUsers()
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

function handleClickOutside(e: MouseEvent) {
  if (containerRef.value && !containerRef.value.contains(e.target as Node)) {
    closeDropdown()
  }
}

// Search users when searchQuery changes
let searchDebounceTimer: any = null

async function searchUsers(q: string) {
  if (!q.trim()) {
    // If just typed "@", show top users from cache or fetch
    searchResults.value = cachedUsers.value.slice(0, 8)
    return
  }

  clearTimeout(searchDebounceTimer)
  searchDebounceTimer = setTimeout(async () => {
    isLoadingUsers.value = true
    try {
      const res = await usersApi.getUsers(q)
      searchResults.value = res.data.slice(0, 8)
      selectedIndex.value = 0
    } catch {
      // Fallback to local filter
      const lower = q.toLowerCase()
      searchResults.value = cachedUsers.value
        .filter(u => u.name.toLowerCase().includes(lower) || u.username.toLowerCase().includes(lower))
        .slice(0, 8)
    } finally {
      isLoadingUsers.value = false
    }
  }, 120)
}

function checkMentionTrigger() {
  const el = inputRef.value
  if (!el) return

  const cursorPos = el.selectionStart ?? 0
  const textBeforeCursor = el.value.substring(0, cursorPos)

  // Look for @word immediately before cursor
  // Regex: matches (@query) where @ is either at start of text or preceded by whitespace
  const match = textBeforeCursor.match(/(?:^|\s)@([a-zA-Z0-9_.-]*)$/)

  if (match) {
    const fullMatch = match[0]
    const query = match[1] ?? ''
    const atOffsetInMatch = fullMatch.indexOf('@')
    const matchStart = (match.index ?? 0) + atOffsetInMatch

    mentionStartIndex.value = matchStart
    searchQuery.value = query
    showDropdown.value = true
    searchUsers(query)
  } else {
    closeDropdown()
  }
}

function handleInput(e: Event) {
  const target = e.target as HTMLInputElement | HTMLTextAreaElement
  emit('update:modelValue', target.value)
  nextTick(() => {
    checkMentionTrigger()
  })
}

function handleKeyDown(e: KeyboardEvent) {
  if (showDropdown.value && searchResults.value.length > 0) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      selectedIndex.value = (selectedIndex.value + 1) % searchResults.value.length
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      selectedIndex.value =
        (selectedIndex.value - 1 + searchResults.value.length) % searchResults.value.length
      return
    }
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault()
      const targetUser = searchResults.value[selectedIndex.value]
      if (targetUser) {
        selectUser(targetUser)
      }
      return
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      closeDropdown()
      return
    }
  } else {
    if (e.key === 'Enter' && !e.shiftKey && props.type === 'input') {
      e.preventDefault()
      emit('submit')
      return
    }
    if (e.key === 'Escape') {
      emit('cancel')
      return
    }
  }
}

function selectUser(user: User) {
  const el = inputRef.value
  if (!el || mentionStartIndex.value === -1) return

  const currentVal = props.modelValue
  const cursorPos = el.selectionStart ?? currentVal.length

  const beforeMention = currentVal.substring(0, mentionStartIndex.value)
  const afterMention = currentVal.substring(cursorPos)

  const inserted = `@${user.username} `
  const newVal = `${beforeMention}${inserted}${afterMention}`

  emit('update:modelValue', newVal)
  closeDropdown()

  nextTick(() => {
    if (el) {
      el.focus()
      const nextPos = beforeMention.length + inserted.length
      el.setSelectionRange(nextPos, nextPos)
    }
  })
}

function closeDropdown() {
  showDropdown.value = false
  mentionStartIndex.value = -1
  searchQuery.value = ''
  selectedIndex.value = 0
}

defineExpose({
  focus: () => inputRef.value?.focus(),
})
</script>

<template>
  <div ref="containerRef" class="mention-input-wrapper">
    <textarea
      v-if="type === 'textarea'"
      ref="inputRef"
      :value="modelValue"
      :placeholder="placeholder"
      :rows="rows"
      :maxlength="maxlength"
      :disabled="disabled"
      class="retro-textarea-field"
      :class="inputClass"
      @input="handleInput"
      @click="checkMentionTrigger"
      @keyup="checkMentionTrigger"
      @keydown="handleKeyDown"
    ></textarea>

    <input
      v-else
      ref="inputRef"
      type="text"
      :value="modelValue"
      :placeholder="placeholder"
      :maxlength="maxlength"
      :disabled="disabled"
      class="retro-single-input-field"
      :class="inputClass"
      @input="handleInput"
      @click="checkMentionTrigger"
      @keyup="checkMentionTrigger"
      @keydown="handleKeyDown"
    />

    <!-- Mention suggestions popup -->
    <div
      v-if="showDropdown"
      class="mention-dropdown"
      :class="{ 'position-top': popupPosition === 'top' }"
    >
      <div class="mention-header">
        » Marcar amigo (@)
      </div>

      <div v-if="isLoadingUsers && searchResults.length === 0" class="mention-loading">
        Buscando amigos...
      </div>

      <div v-else-if="searchResults.length === 0" class="mention-empty">
        Nenhum amigo encontrado com "{{ searchQuery }}"
      </div>

      <div v-else class="mention-list">
        <div
          v-for="(user, idx) in searchResults"
          :key="user.id"
          class="mention-item"
          :class="{ active: idx === selectedIndex }"
          @mousedown.prevent="selectUser(user)"
          @mouseenter="selectedIndex = idx"
        >
          <UserAvatar :user="user" size="sm" />
          <div class="mention-user-info">
            <span class="mention-name">{{ user.name }}</span>
            <span class="mention-handle">@{{ user.username }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mention-input-wrapper {
  position: relative;
  width: 100%;
}

.retro-textarea-field {
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
  box-sizing: border-box;
}
.retro-textarea-field:focus {
  border-color: var(--color-primary, #a66130);
}

.retro-single-input-field {
  width: 100%;
  padding: 0.45rem 0.6rem;
  font-size: 0.85rem;
  font-family: var(--font-body);
  border: 1px solid var(--color-border);
  background: #ffffff;
  border-radius: 2px;
  outline: none;
  box-sizing: border-box;
}
.retro-single-input-field:focus {
  border-color: var(--color-primary);
}

/* Mention Dropdown */
.mention-dropdown {
  position: absolute;
  left: 0;
  top: 100%;
  margin-top: 4px;
  width: 280px;
  max-width: 90vw;
  background-color: #ffffff;
  border: 2px solid var(--color-primary, #a66130);
  border-radius: 2px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1050;
  overflow: hidden;
}

.mention-dropdown.position-top {
  top: auto;
  bottom: 100%;
  margin-top: 0;
  margin-bottom: 4px;
}

.mention-header {
  background-color: var(--color-primary-100, #f8efe6);
  padding: 0.35rem 0.6rem;
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 0.75rem;
  font-weight: bold;
  color: var(--color-primary-800, #5f4120);
  border-bottom: 1px solid var(--color-border, #D8CDC5);
}

.mention-loading,
.mention-empty {
  padding: 0.6rem;
  font-size: 0.8rem;
  font-family: var(--font-heading);
  color: var(--color-muted);
  text-align: center;
}

.mention-list {
  max-height: 200px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.mention-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.6rem;
  cursor: pointer;
  border-bottom: 1px solid var(--color-primary-50, #fcf9f6);
  transition: background-color 0.1s ease;
}
.mention-item:last-child {
  border-bottom: none;
}
.mention-item:hover,
.mention-item.active {
  background-color: var(--color-primary-100, #f8efe6);
}

.mention-user-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.mention-name {
  font-family: var(--font-heading);
  font-size: 0.8rem;
  font-weight: bold;
  color: var(--color-primary-900, #3E2723);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mention-handle {
  font-family: var(--font-heading);
  font-size: 0.7rem;
  color: var(--color-primary, #a66130);
}
</style>