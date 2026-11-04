<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { useUsersStore } from '@/stores/users'
import { useAuthStore } from '@/stores/auth'
import UserAvatar from '@/components/ui/UserAvatar.vue'
import OnlineIndicator from '@/components/ui/OnlineIndicator.vue'
import { getUserSpotifyStatus } from '@/api/spotify'

const usersStore = useUsersStore()
const authStore = useAuthStore()

const selfSpotifyTrack = computed(() => {
  const currentId = authStore.user?.id
  const inStore = usersStore.allUsers.find(u => u.id === currentId) || usersStore.onlineUsers.find(u => u.id === currentId)
  return inStore?.spotify_current_track || authStore.user?.spotify_current_track || null
})

const isSelfOnline = computed(() => {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return false
  }
  return true
})

async function checkSelfSpotify() {
  const hasMusic = authStore.user?.has_spotify_connected || authStore.user?.has_lastfm_connected
  if (hasMusic && authStore.user?.username) {
    try {
      const res = await getUserSpotifyStatus(authStore.user.username)
      if (res.data.is_playing && res.data.title) {
        if (!authStore.user.spotify_current_track) {
          authStore.user.spotify_current_track = {
            is_playing: true,
            title: res.data.title || '',
            artist: res.data.artist || '',
            spotify_url: res.data.spotify_url || res.data.url || null,
            source: res.data.source || 'spotify',
          }
        } else {
          authStore.user.spotify_current_track.is_playing = true
          authStore.user.spotify_current_track.title = res.data.title || ''
          authStore.user.spotify_current_track.artist = res.data.artist || ''
          authStore.user.spotify_current_track.spotify_url = res.data.spotify_url || res.data.url || null
          authStore.user.spotify_current_track.source = res.data.source || 'spotify'
        }
      } else if (authStore.user.spotify_current_track) {
        authStore.user.spotify_current_track.is_playing = false
      }
    } catch {
      // Falha silenciosa
    }
  }
}

onMounted(() => {
  usersStore.startPolling()
  checkSelfSpotify()
})

onUnmounted(() => {
  usersStore.stopPolling()
})

const displayUsers = computed(() => {
  const currentId = authStore.user?.id
  const list = usersStore.allUsers.length > 0 ? usersStore.allUsers : usersStore.onlineUsers
  return list
    .filter(u => u.id !== currentId)
    .sort((a, b) => {
      if (a.is_online === b.is_online) return a.name.localeCompare(b.name)
      return a.is_online ? -1 : 1
    })
})

const onlineCount = computed(() => displayUsers.value.filter(u => u.is_online).length)
</script>

<template>
  <div class="retro-card">
    <div class="retro-card-header">
      » Amigos da Casa
    </div>
    <div class="sidebar-users-body">

      <!-- ── Section: Self Profile Preview (Como você aparece) ── -->
      <div v-if="authStore.user" class="self-preview-section">
        <div class="preview-header">
          <span class="preview-title">👤 COMO VOCÊ APARECE</span>
          <span class="preview-tag">[ Prévia ]</span>
        </div>

        <router-link
          :to="`/profile/${authStore.user.username}`"
          class="online-user-item self-preview-item"
          title="Clique para ver seu perfil"
        >
          <div style="position: relative; flex-shrink: 0;">
            <UserAvatar :user="authStore.user" size="sm" />
            <OnlineIndicator :isOnline="isSelfOnline" style="position: absolute; bottom: -2px; right: -2px;" />
          </div>
          <div class="user-info">
            <span class="user-name">{{ authStore.user.name }}</span>
            <span class="user-username">@{{ authStore.user.username }}</span>
            <div
              v-if="selfSpotifyTrack?.is_playing"
              class="listening-track-badge"
              :title="`Ouvindo: ${selfSpotifyTrack.title} - ${selfSpotifyTrack.artist}`"
            >
              <span class="music-note-icon">🎵</span>
              <span class="music-track-text">{{ selfSpotifyTrack.title }} • {{ selfSpotifyTrack.artist }}</span>
            </div>
          </div>
          <span class="status-pill" :class="isSelfOnline ? 'pill-online' : 'pill-offline'">
            {{ isSelfOnline ? 'Online' : 'Offline' }}
          </span>
        </router-link>

        <span class="self-hint">» Assim que os outros membros veem você nesta lista.</span>
      </div>

      <div class="sidebar-divider"></div>

      <!-- ── Section: Other Users List ── -->
      <div class="other-users-header">
        <span class="other-title">» MEMBROS DA CASA</span>
        <span class="count-badge count-online" title="Usuários online">{{ onlineCount }} online</span>
      </div>

      <div v-if="usersStore.isLoading && displayUsers.length === 0" class="empty-text">Carregando membros...</div>
      <div v-else-if="displayUsers.length === 0" class="empty-text">Nenhum membro encontrado.</div>
      <router-link 
        v-for="user in displayUsers" 
        :key="user.id" 
        :to="`/profile/${user.username}`"
        class="online-user-item"
      >
        <div style="position: relative; flex-shrink: 0;">
          <UserAvatar :user="user" size="sm" />
          <OnlineIndicator :isOnline="!!user.is_online" style="position: absolute; bottom: -2px; right: -2px;" />
        </div>
        <div class="user-info">
          <span class="user-name">{{ user.name }}</span>
          <span class="user-username">@{{ user.username }}</span>
          <div
            v-if="user.spotify_current_track?.is_playing"
            class="listening-track-badge"
            :title="`Ouvindo: ${user.spotify_current_track.title} - ${user.spotify_current_track.artist}`"
          >
            <span class="music-note-icon">🎵</span>
            <span class="music-track-text">{{ user.spotify_current_track.title }} • {{ user.spotify_current_track.artist }}</span>
          </div>
        </div>
        <span class="status-pill" :class="user.is_online ? 'pill-online' : 'pill-offline'">
          {{ user.is_online ? 'Online' : 'Offline' }}
        </span>
      </router-link>
    </div>
  </div>
</template>

<style scoped>
.sidebar-users-body {
  padding: 0.65rem;
  display: flex;
  flex-direction: column;
}

/* ── Self Preview Section ── */
.self-preview-section {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.preview-title {
  font-family: var(--font-heading, monospace);
  font-size: 0.68rem;
  font-weight: bold;
  color: var(--color-primary, #a66130);
  letter-spacing: 0.03em;
}

.preview-tag {
  font-family: var(--font-heading, monospace);
  font-size: 0.62rem;
  color: var(--color-muted, #847062);
}

.self-preview-item {
  background-color: var(--color-primary-50, #f8f6f1);
  border: 1px dashed var(--color-primary-300, #c8956c) !important;
  border-radius: 2px;
  cursor: pointer;
}
.self-preview-item:hover {
  background-color: var(--color-primary-100, #f0e6d9);
}

.self-hint {
  font-size: 0.66rem;
  color: var(--color-muted, #847062);
  font-family: var(--font-heading, monospace);
  line-height: 1.2;
}

.sidebar-divider {
  height: 1px;
  background-color: var(--color-border);
  margin: 0.65rem 0;
}

/* ── Other Users Header ── */
.other-users-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.35rem;
}

.other-title {
  font-family: var(--font-heading, monospace);
  font-size: 0.68rem;
  font-weight: bold;
  color: var(--color-primary, #a66130);
  letter-spacing: 0.03em;
}

.count-badge {
  font-family: var(--font-heading, monospace);
  font-size: 0.62rem;
  font-weight: bold;
  padding: 0.1rem 0.35rem;
  border-radius: 2px;
}

.count-online {
  color: #15803d;
  background-color: #dcfce7;
  border: 1px solid #bbf7d0;
}

/* ── User Item ── */
.online-user-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.45rem 0.35rem;
  border-bottom: 1px solid var(--color-border);
  color: var(--text-main);
  border-radius: 2px;
  text-decoration: none;
  transition: background-color 0.1s ease;
}
.online-user-item:last-child { border-bottom: none; }
.online-user-item:hover { background-color: var(--color-primary-50); text-decoration: none; }

.user-info { display: flex; flex-direction: column; gap: 0.1rem; flex: 1; min-width: 0; }
.user-name { font-size: 0.85rem; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.user-username { font-size: 0.72rem; color: var(--color-muted, #847062); font-family: var(--font-heading, monospace); }

.listening-track-badge {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.68rem;
  color: #16a34a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 130px;
  margin-top: 1px;
}

.music-note-icon {
  font-size: 0.65rem;
  flex-shrink: 0;
}

.music-track-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-pill {
  font-size: 0.65rem;
  font-family: var(--font-heading, monospace);
  padding: 0.1rem 0.35rem;
  border-radius: 2px;
  font-weight: bold;
  flex-shrink: 0;
}
.pill-online {
  color: #15803d;
  background-color: #dcfce7;
}
.pill-offline {
  color: #9ca3af;
  background-color: #f3f4f6;
}

.empty-text {
  font-size: 0.8rem;
  color: var(--color-muted, #847062);
  text-align: center;
  padding: 1rem 0;
}
</style>
