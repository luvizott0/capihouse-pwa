<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useGroupsStore } from '@/stores/groups'
import { useAuthStore } from '@/stores/auth'
import { formatRelativeTime } from '@/utils/date'
import axios from 'axios'
import UserAvatar from '@/components/ui/UserAvatar.vue'
import RetroButton from '@/components/ui/RetroButton.vue'
import RetroConfirmModal from '@/components/ui/RetroConfirmModal.vue'
import RetroModal from '@/components/ui/RetroModal.vue'
import GroupInviteModal from '@/components/groups/GroupInviteModal.vue'
import ImageCropper from '@/components/profile/ImageCropper.vue'
import { useImageViewerStore } from '@/stores/imageViewer'

import type { GroupMessage } from '@/types/models'

const route = useRoute()
const router = useRouter()
const groupsStore = useGroupsStore()
const authStore = useAuthStore()
const imageViewer = useImageViewerStore()

const groupId = Number(route.params.id)
const messageInput = ref('')
const messagesContainer = ref<HTMLDivElement | null>(null)

const editingMessageId = ref<number | null>(null)
const editingContent = ref('')
const isUpdatingMessage = ref(false)

const showDeleteMessageModal = ref(false)
const messageToDelete = ref<GroupMessage | null>(null)
const isDeletingMessage = ref(false)

const showInviteModal = ref(false)
const showLeaveModal = ref(false)
const showMembersModal = ref(false)
const showCoverCropper = ref(false)
const isLeaving = ref(false)
const errorMsg = ref('')

const isOwnerOrAdmin = computed(() => {
  return groupsStore.currentGroup?.my_role === 'owner' || authStore.isAdmin
})

// Message options menu (3-dots)
const activeMessageMenuId = ref<number | null>(null)

function toggleMessageMenu(msgId: number) {
  if (activeMessageMenuId.value === msgId) {
    activeMessageMenuId.value = null
  } else {
    activeMessageMenuId.value = msgId
  }
}

function handleDocumentClick(e: MouseEvent) {
  const target = e.target as HTMLElement | null
  if (target && !target.closest('.message-menu-wrapper')) {
    activeMessageMenuId.value = null
  }
}

function canEditMessage(msg: GroupMessage) {
  return msg.user_id === authStore.user?.id && !msg.is_deleted && !msg.deleted_at
}

function canDeleteMessage(msg: GroupMessage) {
  return !msg.is_deleted && !msg.deleted_at && (msg.user_id === authStore.user?.id || isOwnerOrAdmin.value)
}

function startEditMessage(msg: GroupMessage) {
  activeMessageMenuId.value = null
  editingMessageId.value = msg.id
  editingContent.value = msg.content
}

function cancelEditMessage() {
  editingMessageId.value = null
  editingContent.value = ''
}

async function saveEditMessage() {
  if (!editingMessageId.value || !editingContent.value.trim() || isUpdatingMessage.value) return
  isUpdatingMessage.value = true
  try {
    await groupsStore.editMessage(groupId, editingMessageId.value, editingContent.value.trim())
    editingMessageId.value = null
    editingContent.value = ''
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response?.data?.message) {
      errorMsg.value = err.response.data.message
    } else {
      errorMsg.value = 'Erro ao editar mensagem.'
    }
  } finally {
    isUpdatingMessage.value = false
  }
}

function promptDeleteMessage(msg: GroupMessage) {
  activeMessageMenuId.value = null
  messageToDelete.value = msg
  showDeleteMessageModal.value = true
}

async function handleConfirmDeleteMessage() {
  if (!messageToDelete.value) return
  isDeletingMessage.value = true
  try {
    await groupsStore.deleteMessage(groupId, messageToDelete.value.id)
    showDeleteMessageModal.value = false
    messageToDelete.value = null
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response?.data?.message) {
      errorMsg.value = err.response.data.message
    } else {
      errorMsg.value = 'Erro ao excluir mensagem.'
    }
  } finally {
    isDeletingMessage.value = false
  }
}

function openGroupPhoto() {
  if (groupsStore.currentGroup?.image_url) {
    imageViewer.openImage(groupsStore.currentGroup.image_url, groupsStore.currentGroup.name, 'Foto do Grupo')
  }
}

async function handleCoverCropped(blob: Blob) {
  try {
    await groupsStore.updateGroupCover(groupId, blob)
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response?.data?.message) {
      errorMsg.value = err.response.data.message
    } else {
      errorMsg.value = 'Erro ao atualizar foto do grupo.'
    }
  }
}

onMounted(async () => {
  document.addEventListener('click', handleDocumentClick)
  await loadGroupData()

  // Subscribe to real-time group chat messages via WebSocket
  if (groupsStore.currentGroup?.is_member || authStore.isAdmin) {
    groupsStore.subscribeToGroupChat(groupId)
  }
})

onUnmounted(() => {
  document.removeEventListener('click', handleDocumentClick)
  groupsStore.unsubscribeFromGroupChat(groupId)
})

async function loadGroupData() {
  errorMsg.value = ''
  try {
    await groupsStore.fetchGroup(groupId)
    if (groupsStore.currentGroup?.is_member || authStore.isAdmin) {
      await groupsStore.fetchMessages(groupId)
      await groupsStore.markGroupAsRead(groupId)
      await scrollToBottom()
    }
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response?.data?.message) {
      errorMsg.value = err.response.data.message
    } else {
      errorMsg.value = 'Erro ao carregar dados do grupo.'
    }
  }
}

async function scrollToBottom() {
  await nextTick()
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

async function handleSendMessage() {
  if (!messageInput.value.trim() || groupsStore.isSending) return
  const text = messageInput.value.trim()
  messageInput.value = ''
  try {
    await groupsStore.sendMessage(groupId, text)
    await scrollToBottom()
  } catch (err: unknown) {
    messageInput.value = text // Revert on failure
    if (axios.isAxiosError(err) && err.response?.data?.message) {
      errorMsg.value = err.response.data.message
    } else {
      errorMsg.value = 'Erro ao enviar mensagem.'
    }
  }
}

async function handleLeaveGroup() {
  isLeaving.value = true
  try {
    await groupsStore.leaveGroup(groupId)
    showLeaveModal.value = false
    router.push('/groups')
  } finally {
    isLeaving.value = false
  }
}

async function handleAcceptInvite() {
  try {
    await groupsStore.acceptInvite(groupId)
    await loadGroupData()
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response?.data?.message) {
      errorMsg.value = err.response.data.message
    } else {
      errorMsg.value = 'Erro ao aceitar convite.'
    }
  }
}

async function handleDeclineInvite() {
  try {
    await groupsStore.declineInvite(groupId)
    router.push('/groups')
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response?.data?.message) {
      errorMsg.value = err.response.data.message
    } else {
      errorMsg.value = 'Erro ao recusar convite.'
    }
  }
}

async function openMembersModal() {
  await groupsStore.fetchMembers(groupId)
  showMembersModal.value = true
}
</script>

<template>
  <div class="group-detail-page">
    <div v-if="errorMsg" class="error-banner">
      {{ errorMsg }}
    </div>

    <!-- Group Header Card -->
    <div v-if="groupsStore.currentGroup" class="retro-card group-header-card">
      <div class="group-header-row">
        <!-- Square Photo (1:1) -->
        <div class="group-photo-wrapper">
          <div
            class="group-photo-square"
            :class="{ 'clickable-photo': !!groupsStore.currentGroup.image_url }"
            :title="groupsStore.currentGroup.image_url ? 'Clique para ampliar a foto do grupo' : ''"
            @click="openGroupPhoto"
          >
            <img
              v-if="groupsStore.currentGroup.image_url"
              :src="groupsStore.currentGroup.image_url"
              :alt="groupsStore.currentGroup.name"
              class="photo-img"
            />
            <span v-else class="photo-fallback">👥</span>
            <div v-if="groupsStore.currentGroup.image_url" class="photo-zoom-badge" title="Ampliar">
              🔍
            </div>
          </div>
          <button
            v-if="isOwnerOrAdmin"
            type="button"
            class="group-photo-edit-btn"
            @click.stop="showCoverCropper = true"
            title="Editar foto do grupo"
          >
            ✏️
          </button>
        </div>

        <!-- Info -->
        <div class="group-header-info">
          <div class="group-title-line">
            <h1 class="group-title">{{ groupsStore.currentGroup.name }}</h1>
            <span v-if="groupsStore.currentGroup.my_role === 'owner'" class="role-tag">[ Proprietário ]</span>
            <span v-else-if="groupsStore.currentGroup.is_member" class="role-tag">[ Membro ]</span>
          </div>

          <p v-if="groupsStore.currentGroup.description" class="group-description">
            {{ groupsStore.currentGroup.description }}
          </p>

          <div class="group-meta-stats">
            <button type="button" class="members-badge-btn" @click="openMembersModal">
              👥 {{ groupsStore.currentGroup.members_count }} {{ groupsStore.currentGroup.members_count === 1 ? 'membro' : 'membros' }} (ver lista)
            </button>
            <span v-if="groupsStore.currentGroup.creator" class="creator-credit">
              Criado por <strong>{{ groupsStore.currentGroup.creator.name }}</strong>
            </span>
          </div>
        </div>

        <!-- Header Actions -->
        <div class="group-header-actions">
          <template v-if="groupsStore.currentGroup.is_member || authStore.isAdmin">
            <RetroButton size="sm" @click="showInviteModal = true">
              + Convidar Amigos
            </RetroButton>
            <RetroButton
              v-if="groupsStore.currentGroup.is_member"
              size="sm"
              variant="danger"
              @click="showLeaveModal = true"
            >
              Sair do Grupo
            </RetroButton>
          </template>

          <template v-else-if="groupsStore.currentGroup.membership_status === 'pending'">
            <div class="invite-cta-box">
              <span class="invite-cta-text">Você foi convidado!</span>
              <div class="invite-cta-btns">
                <RetroButton size="sm" @click="handleAcceptInvite">Aceitar</RetroButton>
                <RetroButton size="sm" variant="secondary" @click="handleDeclineInvite">Recusar</RetroButton>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- Group Chat Section -->
    <div class="retro-card chat-card">
      <div class="retro-card-header chat-header-row">
        <span>» Chat do Grupo</span>
        <button
          type="button"
          class="chat-refresh-btn"
          @click="loadGroupData"
        >
          [ Atualizar Mensagens ]
        </button>
      </div>

      <!-- Messages Stream -->
      <div
        ref="messagesContainer"
        class="messages-stream"
      >
        <div
          v-if="!groupsStore.currentGroup?.is_member && !authStore.isAdmin"
          class="chat-locked-box"
        >
          <span class="lock-icon">🔒</span>
          <p>Você precisa fazer parte deste grupo para visualizar e participar do chat.</p>
        </div>

        <div
          v-else-if="groupsStore.messages.length === 0"
          class="empty-chat-box"
        >
          <span>💬</span>
          <p>Nenhuma mensagem ainda no chat do grupo. Diga olá aos outros membros!</p>
        </div>

        <div
          v-else
          class="messages-list"
        >
          <div
            v-for="msg in groupsStore.messages"
            :key="msg.id"
            class="message-item"
            :class="{
              'my-message': msg.user_id === authStore.user?.id,
              'is-deleted': msg.is_deleted || msg.deleted_at,
            }"
          >
            <router-link :to="`/profile/${msg.user?.username}`" class="message-avatar-link">
              <UserAvatar :user="msg.user" size="sm" />
            </router-link>

            <div class="message-bubble-box">
              <div class="message-header-line">
                <span class="message-sender-name">{{ msg.user?.name }}</span>
                <div class="message-meta-right">
                  <span class="message-time">{{ formatRelativeTime(msg.created_at) }}</span>
                  <div
                    v-if="editingMessageId !== msg.id && (canEditMessage(msg) || canDeleteMessage(msg))"
                    class="message-menu-wrapper"
                  >
                    <button
                      type="button"
                      class="message-menu-trigger"
                      title="Mais opções"
                      aria-label="Mais opções"
                      @click.stop="toggleMessageMenu(msg.id)"
                    >
                      ⋮
                    </button>
                    <div
                      v-if="activeMessageMenuId === msg.id"
                      class="message-dropdown-menu"
                      @click.stop
                    >
                      <button
                        v-if="canEditMessage(msg)"
                        type="button"
                        class="message-menu-item edit-item"
                        @click="startEditMessage(msg)"
                      >
                        <span class="item-icon">✎</span> Editar
                      </button>
                      <button
                        v-if="canDeleteMessage(msg)"
                        type="button"
                        class="message-menu-item delete-item"
                        @click="promptDeleteMessage(msg)"
                      >
                        <span class="item-icon">×</span> Excluir
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Inline edit mode -->
              <div v-if="editingMessageId === msg.id" class="message-edit-box">
                <input
                  v-model="editingContent"
                  type="text"
                  class="message-edit-input"
                  maxlength="2000"
                  :disabled="isUpdatingMessage"
                  @keydown.enter.prevent="saveEditMessage"
                  @keydown.esc="cancelEditMessage"
                />
                <div class="message-edit-actions">
                  <button
                    type="button"
                    class="msg-edit-btn save"
                    :disabled="!editingContent.trim() || isUpdatingMessage"
                    @click="saveEditMessage"
                  >
                    Salvar
                  </button>
                  <button
                    type="button"
                    class="msg-edit-btn cancel"
                    :disabled="isUpdatingMessage"
                    @click="cancelEditMessage"
                  >
                    Cancelar
                  </button>
                </div>
              </div>

              <!-- Message content & tags -->
              <template v-else>
                <div
                  class="message-content"
                  :class="{ 'content-deleted': msg.is_deleted || msg.deleted_at }"
                >
                  {{ msg.content }}
                </div>
                <div
                  v-if="!msg.is_deleted && !msg.deleted_at && (msg.is_edited || msg.edited_at)"
                  class="message-edited-tag"
                >
                  (mensagem editada)
                </div>
              </template>
            </div>
          </div>
        </div>
      </div>

      <!-- Chat Input Footer -->
      <div
        v-if="groupsStore.currentGroup?.is_member || authStore.isAdmin"
        class="chat-footer-form"
      >
        <form @submit.prevent="handleSendMessage" class="chat-form">
          <input
            v-model="messageInput"
            type="text"
            placeholder="Digite sua mensagem no grupo..."
            class="chat-input"
            maxlength="2000"
            :disabled="groupsStore.isSending"
          />
          <RetroButton
            type="submit"
            :loading="groupsStore.isSending"
            :disabled="!messageInput.trim()"
          >
            Enviar
          </RetroButton>
        </form>
      </div>
    </div>

    <!-- Invite Friends Modal -->
    <GroupInviteModal
      v-if="groupsStore.currentGroup"
      v-model="showInviteModal"
      :group="groupsStore.currentGroup"
      @invited="loadGroupData"
    />

    <!-- Leave Group Confirm Modal -->
    <RetroConfirmModal
      v-model="showLeaveModal"
      title="» Sair do Grupo"
      :message="`Tem certeza que deseja sair do grupo ${groupsStore.currentGroup?.name}?`"
      details="Você deixará de ter acesso ao chat e às publicações exclusivas deste grupo."
      confirmText="Sair do Grupo"
      :loading="isLeaving"
      @confirm="handleLeaveGroup"
    />

    <!-- Members List Modal -->
    <RetroModal
      v-model="showMembersModal"
      :title="`» Membros (${groupsStore.members.length})`"
      size="sm"
    >
      <div class="members-modal-content">
        <div
          v-for="member in groupsStore.members"
          :key="member.id"
          class="member-list-item"
        >
          <UserAvatar :user="member" size="sm" />
          <div class="member-info">
            <span class="member-name">{{ member.name }}</span>
            <span class="member-username">@{{ member.username }}</span>
          </div>
        </div>
      </div>
    </RetroModal>

    <!-- Group Photo Cropper Modal -->
    <ImageCropper
      v-model="showCoverCropper"
      :aspectRatio="1"
      title="Editar Foto do Grupo"
      formatNote="Formato quadrado (1:1)"
      @cropped="handleCoverCropped"
    />

    <!-- Delete Message Confirm Modal -->
    <RetroConfirmModal
      v-model="showDeleteMessageModal"
      title="» Excluir Mensagem"
      message="Tem certeza que deseja excluir esta mensagem?"
      details="O conteúdo será substituído por 'mensagem deletada' no histórico do grupo."
      confirmText="Excluir Mensagem"
      :loading="isDeletingMessage"
      @confirm="handleConfirmDeleteMessage"
    />
  </div>
</template>

<style scoped>
.group-detail-page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.error-banner {
  padding: 0.5rem 0.75rem;
  background-color: #fee2e2;
  border: 1px solid #ef4444;
  color: #b91c1c;
  font-size: 0.85rem;
  border-radius: 2px;
}

.group-header-card {
  padding: 1.25rem;
  background-color: #ffffff;
  border: 1px solid var(--color-border, #d8cdc5);
  border-radius: 2px;
}

.group-header-row {
  display: flex;
  align-items: flex-start;
  gap: 1.25rem;
  flex-wrap: wrap;
}

.group-photo-wrapper {
  position: relative;
  flex-shrink: 0;
}

.group-photo-square {
  width: 96px;
  height: 96px;
  border: 2px solid var(--color-border, #d8cdc5);
  border-radius: 2px;
  overflow: hidden;
  background-color: var(--color-primary-100, #faede0);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  position: relative;
}

.clickable-photo {
  cursor: zoom-in;
}

.photo-zoom-badge {
  position: absolute;
  bottom: 3px;
  left: 3px;
  font-size: 0.75rem;
  background-color: rgba(255, 255, 255, 0.85);
  border-radius: 2px;
  padding: 1px 3px;
  pointer-events: none;
}

.group-photo-edit-btn {
  position: absolute;
  bottom: -4px;
  right: -4px;
  width: 28px;
  height: 28px;
  background-color: #ffffff;
  border: 1px solid var(--color-border, #d8cdc5);
  border-radius: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
  transition: all 0.15s ease;
  z-index: 2;
}

.group-photo-edit-btn:hover {
  background-color: var(--color-primary-50, #faede0);
  border-color: var(--color-primary, #a66130);
  transform: scale(1.05);
}

.photo-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.photo-fallback {
  font-size: 2.5rem;
  opacity: 0.55;
}

.group-header-info {
  flex: 1;
  min-width: 240px;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.group-title-line {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.group-title {
  font-family: var(--font-heading);
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--color-primary-800);
  margin: 0;
}

.role-tag {
  font-family: var(--font-heading);
  font-size: 0.75rem;
  font-weight: bold;
  color: var(--color-primary);
}

.group-description {
  font-size: 0.9rem;
  color: #444444;
  line-height: 1.4;
}

.group-meta-stats {
  display: flex;
  align-items: center;
  gap: 1rem;
  font-size: 0.8rem;
  color: var(--color-muted);
  flex-wrap: wrap;
}

.members-badge-btn {
  background: none;
  border: none;
  color: var(--color-primary);
  font-family: var(--font-heading);
  font-weight: bold;
  font-size: 0.8rem;
  cursor: pointer;
  padding: 0;
}
.members-badge-btn:hover {
  text-decoration: underline;
}

.creator-credit {
  font-size: 0.8rem;
}

.group-header-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.invite-cta-box {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  background-color: var(--color-primary-50);
  border: 1px solid var(--color-border);
  padding: 0.5rem 0.75rem;
  border-radius: 2px;
}
.invite-cta-text {
  font-family: var(--font-heading);
  font-size: 0.75rem;
  font-weight: bold;
  color: var(--color-primary-800);
}
.invite-cta-btns {
  display: flex;
  gap: 0.35rem;
}

/* Chat Card */
.chat-card {
  display: flex;
  flex-direction: column;
  height: 520px;
}

.chat-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chat-refresh-btn {
  background: none;
  border: none;
  color: #ffffff;
  font-family: var(--font-heading);
  font-size: 0.75rem;
  font-weight: bold;
  cursor: pointer;
}
.chat-refresh-btn:hover {
  text-decoration: underline;
}

.messages-stream {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  background-color: #faf8f5;
  display: flex;
  flex-direction: column;
}

.chat-locked-box,
.empty-chat-box {
  margin: auto;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  color: var(--color-muted);
  font-size: 0.9rem;
  max-width: 320px;
}
.lock-icon {
  font-size: 2.5rem;
}

.messages-list {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.message-item {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  max-width: 80%;
}
.message-item.my-message {
  align-self: flex-end;
  flex-direction: row-reverse;
}

.message-avatar-link {
  flex-shrink: 0;
}

.message-bubble-box {
  background-color: #ffffff;
  border: 1px solid var(--color-border);
  border-radius: 2px;
  padding: 0.5rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}
.my-message .message-bubble-box {
  background-color: var(--color-primary-100);
  border-color: var(--color-primary-300);
}

.message-header-line {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
}

.message-sender-name {
  font-family: var(--font-heading);
  font-size: 0.8rem;
  font-weight: bold;
  color: var(--color-primary-800);
}

.message-time {
  font-size: 0.7rem;
  color: var(--color-muted);
}

.message-content {
  font-size: 0.85rem;
  color: #222222;
  line-height: 1.4;
  white-space: pre-wrap;
  word-break: break-word;
}

.content-deleted {
  font-style: italic;
  color: #888888 !important;
}

.message-meta-right {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.message-menu-wrapper {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.message-menu-trigger {
  background: none;
  border: 1px solid transparent;
  font-size: 1rem;
  font-weight: bold;
  line-height: 1;
  color: var(--color-muted, #847062);
  cursor: pointer;
  padding: 0;
  border-radius: 2px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  transition: all 0.15s ease;
}
.message-menu-trigger:hover {
  color: var(--color-primary-800, #5f4120);
  background-color: var(--color-primary-50, #f8f6f1);
  border-color: var(--color-border, #d8cdc5);
}

.message-dropdown-menu {
  position: absolute;
  right: 0;
  top: calc(100% + 2px);
  background: #ffffff;
  border: 1px solid var(--color-border, #d8cdc5);
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.14);
  border-radius: 2px;
  z-index: 30;
  min-width: 90px;
  display: flex;
  flex-direction: column;
  padding: 0.2rem 0;
}

.message-menu-item {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.55rem;
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 0.72rem;
  font-weight: bold;
  background: none;
  border: none;
  text-align: left;
  width: 100%;
  cursor: pointer;
  white-space: nowrap;
  transition: background-color 0.1s ease;
}
.message-menu-item .item-icon {
  font-size: 0.8rem;
  line-height: 1;
}

.message-menu-item.edit-item {
  color: var(--color-primary-800, #7d5628);
}
.message-menu-item.edit-item:hover {
  background-color: var(--color-primary-50, #fdf8f3);
}

.message-menu-item.delete-item {
  color: var(--color-danger, #ef4444);
}
.message-menu-item.delete-item:hover {
  background-color: #fee2e2;
}

.message-edit-box {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-top: 0.25rem;
  min-width: 180px;
}

.message-edit-input {
  width: 100%;
  padding: 0.35rem 0.5rem;
  font-size: 0.85rem;
  border: 1px solid var(--color-primary);
  border-radius: 2px;
  outline: none;
  background-color: #ffffff;
}
.message-edit-input:focus {
  box-shadow: 0 0 0 1px var(--color-primary);
}

.message-edit-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.35rem;
}

.msg-edit-btn {
  font-family: var(--font-heading);
  font-size: 0.7rem;
  font-weight: bold;
  padding: 0.2rem 0.5rem;
  border-radius: 2px;
  cursor: pointer;
  border: 1px solid var(--color-border);
}
.msg-edit-btn.save {
  background-color: var(--color-primary);
  color: #ffffff;
  border-color: var(--color-primary);
}
.msg-edit-btn.save:hover:not(:disabled) {
  opacity: 0.9;
}
.msg-edit-btn.save:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.msg-edit-btn.cancel {
  background-color: #f3f4f6;
  color: #374151;
}
.msg-edit-btn.cancel:hover {
  background-color: #e5e7eb;
}

.message-edited-tag {
  font-size: 0.68rem;
  color: var(--color-muted);
  font-style: italic;
  align-self: flex-end;
  margin-top: 0.1rem;
}

.chat-footer-form {
  padding: 0.75rem 1rem;
  background-color: #ffffff;
  border-top: 1px solid var(--color-border);
}

.chat-form {
  display: flex;
  gap: 0.5rem;
}

.chat-input {
  flex: 1;
  padding: 0.5rem 0.75rem;
  font-size: 0.9rem;
  border: 2px solid var(--color-border);
  background-color: var(--color-primary-50);
  border-radius: 2px;
  outline: none;
}
.chat-input:focus {
  border-color: var(--color-primary);
}

.members-modal-content {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 300px;
  overflow-y: auto;
}

.member-list-item {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.35rem 0;
  border-bottom: 1px solid var(--color-border);
}
.member-list-item:last-child {
  border-bottom: none;
}

.member-info {
  display: flex;
  flex-direction: column;
}
.member-name {
  font-family: var(--font-heading);
  font-size: 0.85rem;
  font-weight: bold;
  color: var(--color-primary-800);
}
.member-username {
  font-size: 0.75rem;
  color: var(--color-muted);
}
</style>
