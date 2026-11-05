<script setup lang="ts">
import { ref, watch } from 'vue'
import type { User } from '@/types/models'
import { getPostLikers } from '@/api/posts'
import RetroModal from '@/components/ui/RetroModal.vue'
import UserAvatar from '@/components/ui/UserAvatar.vue'
import OnlineIndicator from '@/components/ui/OnlineIndicator.vue'
import RetroButton from '@/components/ui/RetroButton.vue'
import axios from 'axios'

const props = defineProps<{
  modelValue: boolean
  postId: number
  likesCount?: number
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const likers = ref<User[]>([])
const isLoading = ref(false)
const errorMsg = ref('')

async function fetchLikers() {
  if (!props.postId) return
  isLoading.value = true
  errorMsg.value = ''
  try {
    const res = await getPostLikers(props.postId)
    likers.value = ((res.data as unknown as Record<string, unknown>)?.data || res.data) as User[]
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response?.data?.message) {
      errorMsg.value = err.response.data.message
    } else {
      errorMsg.value = 'Erro ao carregar quem curtiu a publicação.'
    }
  } finally {
    isLoading.value = false
  }
}

watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) {
      fetchLikers()
    } else {
      likers.value = []
      errorMsg.value = ''
    }
  }
)

function handleClose() {
  emit('update:modelValue', false)
}
</script>

<template>
  <RetroModal
    :modelValue="modelValue"
    title="» Quem curtiu esta publicação"
    size="sm"
    @update:modelValue="emit('update:modelValue', $event)"
  >
    <div class="likes-modal-body">
      <!-- Loading State -->
      <div v-if="isLoading" class="likes-state-box">
        <span class="loading-icon">⌛</span>
        <span>Carregando curtidas...</span>
      </div>

      <!-- Error State -->
      <div v-else-if="errorMsg" class="likes-state-box error-box">
        <p class="error-text">⚠️ {{ errorMsg }}</p>
        <button type="button" class="retry-btn" @click="fetchLikers">[ Tentar novamente ]</button>
      </div>

      <!-- Empty State -->
      <div v-else-if="likers.length === 0" class="likes-state-box">
        <span class="empty-heart-icon">🤍</span>
        <p class="empty-title">Nenhuma curtida ainda</p>
        <p class="empty-desc">Seja o primeiro a curtir esta publicação!</p>
      </div>

      <!-- Likers List -->
      <div v-else class="likers-list">
        <router-link
          v-for="user in likers"
          :key="user.id"
          :to="`/profile/${user.username}`"
          class="liker-row"
          @click="handleClose"
        >
          <div class="avatar-wrap">
            <UserAvatar :user="user" size="sm" />
            <OnlineIndicator :isOnline="!!user.is_online" class="liker-online-dot" />
          </div>

          <div class="liker-info">
            <span class="liker-name">{{ user.name }}</span>
            <span class="liker-username">@{{ user.username }}</span>
          </div>

          <div class="liker-action">
            <span class="heart-badge">❤️</span>
          </div>
        </router-link>
      </div>

      <div class="likes-modal-footer">
        <RetroButton size="sm" variant="secondary" @click="handleClose">
          [ Fechar ]
        </RetroButton>
      </div>
    </div>
  </RetroModal>
</template>

<style scoped>
.likes-modal-body {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-height: 70vh;
}

.likes-state-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1.5rem 1rem;
  text-align: center;
  color: var(--color-muted, #847062);
  font-family: var(--font-heading, monospace);
  font-size: 0.85rem;
  gap: 0.35rem;
}

.loading-icon, .empty-heart-icon {
  font-size: 1.6rem;
}

.empty-title {
  font-weight: bold;
  color: var(--color-text, #181818);
  font-size: 0.9rem;
}

.empty-desc {
  font-size: 0.75rem;
  color: var(--color-muted, #847062);
}

.error-box {
  color: #b91c1c;
}

.retry-btn {
  background: none;
  border: none;
  color: var(--color-primary, #a66130);
  font-family: var(--font-heading, monospace);
  font-size: 0.8rem;
  font-weight: bold;
  cursor: pointer;
  margin-top: 0.4rem;
}
.retry-btn:hover {
  text-decoration: underline;
}

.likers-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  overflow-y: auto;
  max-height: 50vh;
  padding-right: 0.25rem;
}

.liker-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.45rem 0.5rem;
  border-radius: 2px;
  text-decoration: none;
  color: inherit;
  border: 1px solid transparent;
  transition: all 0.1s ease;
}
.liker-row:hover {
  background-color: var(--color-primary-50, #f8f6f1);
  border-color: var(--color-border, #e5e7eb);
}

.avatar-wrap {
  position: relative;
  flex-shrink: 0;
}

.liker-online-dot {
  position: absolute;
  bottom: -2px;
  right: -2px;
}

.liker-info {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.liker-name {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text, #181818);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.liker-username {
  font-size: 0.72rem;
  color: var(--color-muted, #847062);
  font-family: var(--font-heading, monospace);
}

.liker-action {
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

.heart-badge {
  font-size: 0.85rem;
}

.likes-modal-footer {
  display: flex;
  justify-content: flex-end;
  padding-top: 0.5rem;
  border-top: 1px solid var(--color-border, #e5e7eb);
}
</style>
