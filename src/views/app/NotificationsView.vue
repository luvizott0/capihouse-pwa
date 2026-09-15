<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useNotificationsStore } from '@/stores/notifications'
import { formatRelativeTime } from '@/utils/date'
import axios from 'axios'
import RetroButton from '@/components/ui/RetroButton.vue'

const router = useRouter()
const notifStore = useNotificationsStore()

const actionLoadingId = ref<number | null>(null)
const actionMsg = ref('')

onMounted(async () => {
  await notifStore.fetchNotifications(1)
})

async function handleAccept(notifId: number, groupId: number) {
  actionLoadingId.value = notifId
  actionMsg.value = ''
  try {
    await notifStore.acceptGroupInvite(notifId, groupId)
    actionMsg.value = 'Convite aceito! Redirecionando para o grupo...'
    setTimeout(() => {
      router.push(`/groups/${groupId}`)
    }, 800)
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response?.data?.message) {
      actionMsg.value = err.response.data.message
    } else {
      actionMsg.value = 'Erro ao aceitar convite.'
    }
  } finally {
    actionLoadingId.value = null
  }
}

async function handleDecline(notifId: number, groupId: number) {
  actionLoadingId.value = notifId
  actionMsg.value = ''
  try {
    await notifStore.declineGroupInvite(notifId, groupId)
    actionMsg.value = 'Convite recusado.'
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response?.data?.message) {
      actionMsg.value = err.response.data.message
    } else {
      actionMsg.value = 'Erro ao recusar convite.'
    }
  } finally {
    actionLoadingId.value = null
  }
}

async function handleItemClick(item: any) {
  if (!item.read_at) {
    await notifStore.markAsRead(item.id)
  }
  if (item.data?.post_id) {
    router.push(`/feed#post-${item.data.post_id}`)
  }
}
</script>

<template>
  <div class="notifications-page">
    <div class="retro-card">
      <div class="retro-card-header notif-header-row">
        <span>» Notificações</span>
        <button
          v-if="notifStore.notifications.length"
          type="button"
          class="mark-all-btn"
          @click="notifStore.markAllAsRead"
        >
          [ Marcar todas como lidas ]
        </button>
      </div>

      <div class="notif-body">
        <div v-if="actionMsg" class="action-alert-box">
          {{ actionMsg }}
        </div>

        <div v-if="notifStore.isLoading && notifStore.notifications.length === 0" class="loading-state">
          Carregando notificações...
        </div>

        <div v-else-if="notifStore.notifications.length === 0" class="empty-notif-box">
          <img src="/capihouse-logo.png" alt="Capivara" class="empty-capivara-logo" />
          <h3 class="empty-title">Tudo limpo por aqui!</h3>
          <p class="empty-subtitle">Você não possui nenhuma notificação recente.</p>
        </div>

        <div v-else class="notif-list">
          <div
            v-for="item in notifStore.notifications"
            :key="item.id"
            class="notif-item"
            :class="{ unread: !item.read_at }"
            @click="handleItemClick(item)"
          >
            <!-- Unread primary dot indicator -->
            <div class="notif-status-col">
              <span v-if="!item.read_at" class="item-unread-dot" title="Não lida"></span>
            </div>

            <!-- Notification Icon: Group, Like, Comment or General -->
            <div class="notif-icon-col">
              <span v-if="item.type === 'group_invite'" class="type-icon">👥</span>
              <span v-else-if="item.type === 'post_like'" class="type-icon">❤️</span>
              <span v-else-if="item.type === 'post_comment'" class="type-icon">💬</span>
              <span v-else class="type-icon">🔔</span>
            </div>

            <!-- Content Details -->
            <div class="notif-content-col">
              <div class="notif-title-row">
                <span class="notif-title">{{ item.title }}</span>
                <span class="notif-time">{{ formatRelativeTime(item.created_at) }}</span>
              </div>
              <p class="notif-text">{{ item.content }}</p>

              <!-- Post Navigation Hint -->
              <div v-if="item.data?.post_id" class="post-action-hint">
                <span class="post-link-text">» Ver publicação</span>
              </div>

              <!-- Group Invite Actions & Status -->
              <template v-if="item.type === 'group_invite' && item.data?.group_id">
                <div
                  v-if="!item.data?.status || item.data?.status === 'pending'"
                  class="invite-actions-row"
                  @click.stop
                >
                  <RetroButton
                    size="sm"
                    :loading="actionLoadingId === item.id"
                    @click="handleAccept(item.id, item.data.group_id)"
                  >
                    Aceitar
                  </RetroButton>
                  <RetroButton
                    size="sm"
                    variant="secondary"
                    :disabled="actionLoadingId === item.id"
                    @click="handleDecline(item.id, item.data.group_id)"
                  >
                    Recusar
                  </RetroButton>
                </div>

                <div
                  v-else-if="item.data?.status === 'accepted'"
                  class="invite-status-row"
                  @click.stop
                >
                  <span class="status-badge status-accepted">✓ Convite aceito</span>
                  <RetroButton
                    size="sm"
                    variant="secondary"
                    @click="router.push(`/groups/${item.data.group_id}`)"
                  >
                    Ver Grupo
                  </RetroButton>
                </div>

                <div
                  v-else-if="item.data?.status === 'declined'"
                  class="invite-status-row"
                  @click.stop
                >
                  <span class="status-badge status-declined">✕ Convite recusado</span>
                </div>
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.notifications-page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.notif-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.mark-all-btn {
  background: none;
  border: none;
  color: #ffffff;
  font-family: var(--font-heading);
  font-size: 0.75rem;
  font-weight: bold;
  cursor: pointer;
  text-decoration: none;
}
.mark-all-btn:hover {
  text-decoration: underline;
}

.notif-body {
  background-color: #ffffff;
  padding: 1rem;
}

.action-alert-box {
  background-color: var(--color-primary-100);
  border: 1px solid var(--color-primary-300);
  color: var(--color-primary-800);
  font-family: var(--font-heading);
  font-size: 0.85rem;
  font-weight: bold;
  padding: 0.6rem 0.8rem;
  border-radius: 2px;
  margin-bottom: 0.75rem;
}

.loading-state {
  text-align: center;
  padding: 2rem;
  font-family: var(--font-heading);
  color: var(--color-muted);
}

.empty-notif-box {
  text-align: center;
  padding: 3rem 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}
.empty-icon {
  font-size: 3rem;
}
.empty-title {
  font-family: var(--font-heading);
  font-size: 1.1rem;
  color: var(--color-primary-800);
}
.empty-subtitle {
  font-size: 0.85rem;
  color: var(--color-muted);
}

.notif-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.notif-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 2px;
  background-color: var(--color-primary-50);
  transition: all 0.15s ease;
  cursor: pointer;
}
.notif-item:hover {
  background-color: var(--color-primary-100);
  border-color: var(--color-primary-300);
}

.notif-item.unread {
  background-color: #ffffff;
  border-left: 4px solid var(--color-primary);
}

.notif-status-col {
  width: 12px;
  display: flex;
  justify-content: center;
  padding-top: 4px;
}
.item-unread-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: var(--color-primary);
}

.notif-icon-col {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background-color: var(--color-primary-100);
  border: 1px solid var(--color-border);
  border-radius: 2px;
  font-size: 1.1rem;
  flex-shrink: 0;
}

.notif-content-col {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.notif-title-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 0.5rem;
}

.notif-title {
  font-family: var(--font-heading);
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--color-primary-800);
}

.notif-time {
  font-size: 0.75rem;
  color: var(--color-muted);
  white-space: nowrap;
}

.notif-text {
  font-size: 0.85rem;
  color: #333333;
  line-height: 1.4;
}

.invite-actions-row {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.invite-status-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 0.5rem;
  flex-wrap: wrap;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  font-family: var(--font-heading);
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.25rem 0.6rem;
  border-radius: 2px;
  letter-spacing: 0.02em;
}

.status-accepted {
  background-color: var(--color-primary-100);
  color: var(--color-primary-800);
  border: 1px solid var(--color-primary-400);
}

.status-declined {
  background-color: #f3f4f6;
  color: #6b7280;
  border: 1px solid #d1d5db;
}

.post-action-hint {
  margin-top: 0.25rem;
}

.post-link-text {
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--color-primary, #a66130);
}

.notif-item:hover .post-link-text {
  text-decoration: underline;
}
</style>
