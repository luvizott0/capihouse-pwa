<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProfileStore } from '@/stores/profile'
import { useAuthStore } from '@/stores/auth'
import { useFeedStore } from '@/stores/feed'
import { useThemeStore } from '@/stores/theme'
import { useImageViewerStore } from '@/stores/imageViewer'
import RetroModal from '@/components/ui/RetroModal.vue'
import RetroButton from '@/components/ui/RetroButton.vue'
import RetroConfirmModal from '@/components/ui/RetroConfirmModal.vue'
import ImageCropper from '@/components/profile/ImageCropper.vue'
import ThemeCustomizerModal from '@/components/profile/ThemeCustomizerModal.vue'
import PostCard from '@/components/feed/PostCard.vue'
import PostCardSkeleton from '@/components/feed/PostCardSkeleton.vue'
import LetterboxdCard from '@/components/entertainment/LetterboxdCard.vue'
import { connectLetterboxd, disconnectLetterboxd, syncLetterboxd } from '@/api/letterboxd'
import { formatBirthDate, formatRelativeTime } from '@/utils/date'
import { usePwaUpdate } from '@/composables/usePwaUpdate'
import { useWebPush } from '@/composables/useWebPush'
import PullToRefreshIndicator from '@/components/ui/PullToRefreshIndicator.vue'
import { usePullToRefresh } from '@/composables/usePullToRefresh'

const route = useRoute()
const router = useRouter()
const profileStore = useProfileStore()
const authStore = useAuthStore()
const feedStore = useFeedStore()
const themeStore = useThemeStore()
const imageViewer = useImageViewerStore()

const isOwner = computed(() => {
  return !route.params.username || route.params.username === authStore.user?.username
})

const user = computed(() => isOwner.value ? authStore.user : profileStore.profile)

// Modals state
const showBannerCropper = ref(false)
const showAvatarCropper = ref(false)
const showSettingsModal = ref(false)
const showLogoutConfirm = ref(false)
const showThemeModal = ref(false)

// Settings form
const settingsName = ref('')
const settingsUsername = ref('')
const settingsCurrentPassword = ref('')
const settingsPassword = ref('')
const settingsPasswordConfirmation = ref('')
const showCurrentPassword = ref(false)
const showNewPassword = ref(false)
const showConfirmPassword = ref(false)
const settingsError = ref('')
const settingsSuccess = ref('')
const isSavingSettings = ref(false)

// PWA Updates
const {
  needRefresh: pwaNeedRefresh,
  isChecking: isCheckingUpdates,
  feedbackMessage: pwaFeedbackMessage,
  checkForUpdates: checkPwaUpdates,
  updateServiceWorker: applyPwaUpdate,
  forceReloadApp: reloadApp
} = usePwaUpdate()

// Web Push Notifications
const {
  isSupported: isPushSupported,
  isIos: isIosDevice,
  isStandalone: isPwaStandalone,
  permission: pushPermission,
  isSubscribed: isPushSubscribed,
  isLoading: isPushLoading,
  isTesting: isPushTesting,
  isSavingPreferences: isSavingNotificationPreferences,
  statusMessage: pushStatusMessage,
  errorMessage: pushErrorMessage,
  preferences: notificationPreferences,
  registeredDevicesCount: pushDevicesCount,
  checkSubscription: checkPushSubscription,
  loadPreferences: loadNotificationPreferences,
  subscribe: subscribePush,
  unsubscribe: unsubscribePush,
  testPush: sendTestNotification,
  updatePreference: setNotificationPreference,
} = useWebPush()

async function handleLogout() {
  await authStore.logout()
  router.push('/login')
}

// Inline editing: Bio
const isEditingBio = ref(false)
const bioInput = ref('')

// Inline editing: Birth
const isEditingBirth = ref(false)
const birthInput = ref('')

// New interest input
const newInterestInput = ref('')

const wasVisitingOther = ref(false)

async function loadProfile() {
  if (!isOwner.value && route.params.username) {
    wasVisitingOther.value = true
    await profileStore.fetchProfile(route.params.username as string)
    // Apply the visited user's theme while on their profile page
    themeStore.loadThemeFromUser(profileStore.profile)
  } else {
    wasVisitingOther.value = false
    // Restore own theme when viewing own profile
    themeStore.loadThemeFromUser(authStore.user)
  }
  if (user.value) {
    settingsName.value = user.value.name
    settingsUsername.value = user.value.username
    bioInput.value = user.value.bio || ''
    birthInput.value = user.value.birth ? user.value.birth.substring(0, 10) : ''
    // Fetch posts for this user profile (authored posts and tagged posts)
    await feedStore.fetchUserPosts(user.value.id, 1, profilePostTab.value)
  }
}

// Restore own theme when leaving a visited profile page
onUnmounted(() => {
  if (wasVisitingOther.value) {
    themeStore.loadThemeFromUser(authStore.user)
  }
})

onMounted(async () => {
  await loadProfile()
})

watch(() => route.params.username, loadProfile)
watch(() => authStore.user, (u) => {
  if (u && isOwner.value) {
    settingsName.value = u.name
    settingsUsername.value = u.username
    bioInput.value = u.bio || ''
    birthInput.value = u.birth ? u.birth.substring(0, 10) : ''
  }
})

// Modal notice state
const showAlertModal = ref(false)
const alertTitle = ref('» Aviso')
const alertMessage = ref('')
const alertDetails = ref('')

function showNotice(title: string, message: string, details: string = '') {
  alertTitle.value = title
  alertMessage.value = message
  alertDetails.value = details
  showAlertModal.value = true
}

// Crop Handlers
async function handleBannerCropped(blob: Blob) {
  try {
    await profileStore.uploadBanner(blob)
    await authStore.fetchMe()
    await loadProfile()
  } catch (err: any) {
    showNotice('» Erro no Banner', 'Não foi possível salvar o banner.', err.response?.data?.message || 'Verifique a imagem e tente novamente.')
  }
}

async function handleAvatarCropped(blob: Blob) {
  try {
    await profileStore.uploadAvatar(blob)
    await authStore.fetchMe()
    await loadProfile()
  } catch (err: any) {
    showNotice('» Erro no Avatar', 'Não foi possível salvar a foto de perfil.', err.response?.data?.message || 'Verifique a imagem e tente novamente.')
  }
}

function openAvatarPhoto() {
  if (user.value?.avatar_url) {
    imageViewer.openImage(user.value.avatar_url, user.value.name, 'Foto de Perfil')
  }
}

function openBannerPhoto() {
  if (user.value?.banner_url) {
    imageViewer.openImage(user.value.banner_url, user.value.name, 'Banner de Perfil')
  }
}

// Inline Bio
function startEditBio() {
  bioInput.value = user.value?.bio || ''
  isEditingBio.value = true
}

async function saveBio() {
  await profileStore.updateProfile({ bio: bioInput.value })
  await authStore.fetchMe()
  isEditingBio.value = false
}

// Inline Birth
function startEditBirth() {
  birthInput.value = user.value?.birth ? user.value.birth.substring(0, 10) : ''
  isEditingBirth.value = true
}

async function saveBirth() {
  await profileStore.updateProfile({ birth: birthInput.value })
  await authStore.fetchMe()
  isEditingBirth.value = false
}

// Interesses
async function addInterest() {
  const name = newInterestInput.value.trim()
  if (!name || !user.value) return

  const currentNames = (user.value.interests || []).map(i => i.name)
  if (!currentNames.includes(name)) {
    const updated = [...currentNames, name]
    await profileStore.syncInterests(updated)
    await authStore.fetchMe()
  }
  newInterestInput.value = ''
}

async function removeInterest(interestName: string) {
  if (!user.value) return
  const updated = (user.value.interests || []).map(i => i.name).filter(n => n !== interestName)
  await profileStore.syncInterests(updated)
  await authStore.fetchMe()
}

// Settings modal
function openSettings() {
  if (user.value) {
    settingsName.value = user.value.name
    settingsUsername.value = user.value.username
  }
  settingsCurrentPassword.value = ''
  settingsPassword.value = ''
  settingsPasswordConfirmation.value = ''
  settingsError.value = ''
  settingsSuccess.value = ''
  pwaFeedbackMessage.value = ''
  showSettingsModal.value = true

  // Check push subscription & preferences
  checkPushSubscription()
  loadNotificationPreferences()
}

async function saveSettings() {
  settingsError.value = ''
  settingsSuccess.value = ''
  isSavingSettings.value = true

  try {
    // Update profile info
    await profileStore.updateProfile({
      name: settingsName.value,
      username: settingsUsername.value,
    })

    // If password provided, update password
    if (settingsPassword.value) {
      await profileStore.updatePassword({
        current_password: settingsCurrentPassword.value,
        password: settingsPassword.value,
        password_confirmation: settingsPasswordConfirmation.value,
      })
    }

    await authStore.fetchMe()
    settingsSuccess.value = 'Configurações salvas com sucesso!'
    setTimeout(() => {
      showSettingsModal.value = false
    }, 1000)
  } catch (err: any) {
    settingsError.value = err.response?.data?.message || 'Erro ao salvar configurações.'
  } finally {
    isSavingSettings.value = false
  }
}

// User's own posts and posts where user is tagged
const userPosts = computed(() => feedStore.userPosts)

// Profile publication tabs: feed vs entertainment
const profilePostTab = ref<'feed' | 'entertainment'>('feed')

async function setProfilePostTab(tab: 'feed' | 'entertainment') {
  profilePostTab.value = tab
  if (user.value) {
    await feedStore.fetchUserPosts(user.value.id, 1, tab)
  }
}

// Letterboxd connection state
const letterboxdInput = ref('')
const isConnectingLetterboxd = ref(false)
const isSyncingLetterboxd = ref(false)
const isDisconnectingLetterboxd = ref(false)
const letterboxdMessage = ref('')
const letterboxdError = ref('')

async function handleConnectLetterboxd() {
  if (!letterboxdInput.value.trim()) return
  isConnectingLetterboxd.value = true
  letterboxdError.value = ''
  letterboxdMessage.value = ''
  try {
    const res = await connectLetterboxd(letterboxdInput.value.trim())
    await authStore.fetchMe()
    letterboxdMessage.value = res.data.message
    letterboxdInput.value = ''
  } catch (err: any) {
    letterboxdError.value = err.response?.data?.message || 'Erro ao conectar conta do Letterboxd.'
  } finally {
    isConnectingLetterboxd.value = false
  }
}

async function handleDisconnectLetterboxd() {
  isDisconnectingLetterboxd.value = true
  letterboxdError.value = ''
  letterboxdMessage.value = ''
  try {
    const res = await disconnectLetterboxd()
    await authStore.fetchMe()
    letterboxdMessage.value = res.data.message
  } catch (err: any) {
    letterboxdError.value = err.response?.data?.message || 'Erro ao desconectar Letterboxd.'
  } finally {
    isDisconnectingLetterboxd.value = false
  }
}

async function handleSyncLetterboxd() {
  isSyncingLetterboxd.value = true
  letterboxdError.value = ''
  letterboxdMessage.value = ''
  try {
    const res = await syncLetterboxd()
    letterboxdMessage.value = res.data.message
    if (profilePostTab.value === 'entertainment' && user.value) {
      setTimeout(() => {
        if (user.value) feedStore.fetchUserPosts(user.value.id, 1, 'entertainment')
      }, 1500)
    }
  } catch (err: any) {
    letterboxdError.value = err.response?.data?.message || 'Erro ao iniciar sincronização.'
  } finally {
    isSyncingLetterboxd.value = false
  }
}

const {
  pullDistance,
  isRefreshingFromPull,
  handleTouchStart,
  handleTouchMove,
  handleTouchEnd,
} = usePullToRefresh(async () => {
  if (isOwner.value) {
    await authStore.fetchMe()
  }
  await loadProfile()
})
</script>

<template>
  <div
    v-if="user"
    class="profile-page-container"
    @touchstart="handleTouchStart"
    @touchmove="handleTouchMove"
    @touchend="handleTouchEnd"
  >
    <!-- Pull-to-refresh indicator box -->
    <PullToRefreshIndicator
      :pull-distance="pullDistance"
      :is-refreshing="isRefreshingFromPull"
      refreshing-text="Atualizando perfil..."
    />

    <!-- Header Card (Banner + Avatar + Info) -->
    <div class="retro-box profile-header-box">
      <!-- Banner -->
      <div
        class="profile-banner"
        :class="{ 'clickable-banner': !!user.banner_url }"
        :style="user.banner_url ? { backgroundImage: `url(${user.banner_url})` } : {}"
        :title="user.banner_url ? 'Clique para ampliar o banner' : ''"
        @click="openBannerPhoto"
      >
        <button
          v-if="isOwner"
          type="button"
          class="banner-edit-btn"
          @click.stop="showBannerCropper = true"
        >
          📷 [ Editar banner ]
        </button>
      </div>

      <!-- Avatar & Basic info bar -->
      <div class="profile-bar">
        <div class="avatar-wrapper">
          <div
            class="avatar-circle"
            :class="{ 'clickable-avatar': !!user.avatar_url }"
            :title="user.avatar_url ? 'Clique para ampliar a foto de perfil' : ''"
            @click="openAvatarPhoto"
          >
            <img v-if="user.avatar_url" :src="user.avatar_url" alt="Avatar" class="avatar-photo" />
            <div v-else class="avatar-fallback">{{ user.initials || 'CR' }}</div>
            <div v-if="user.avatar_url" class="avatar-zoom-badge" title="Ampliar">
              🔍
            </div>
          </div>
          <button
            v-if="isOwner"
            type="button"
            class="avatar-edit-btn"
            title="Editar foto de perfil"
            @click.stop="showAvatarCropper = true"
          >
            ✏️
          </button>
        </div>

        <div class="profile-info-col">
          <div class="name-status-row">
            <div>
              <h1 class="user-display-name">{{ user.name }}</h1>
              <div class="user-username">@{{ user.username }}</div>
            </div>

            <!-- Settings / Actions (Compact Icons) -->
            <div v-if="isOwner" class="owner-actions">
              <button
                type="button"
                class="profile-icon-btn settings-btn"
                title="Configurações"
                aria-label="Configurações"
                @click="openSettings"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="btn-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              <button
                type="button"
                class="profile-icon-btn customize-btn"
                title="Personalizar tema"
                aria-label="Personalizar tema"
                @click="showThemeModal = true"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="btn-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                </svg>
              </button>
              <button
                type="button"
                class="profile-icon-btn logout-btn"
                title="Sair da conta"
                aria-label="Sair da conta"
                @click="showLogoutConfirm = true"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="btn-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Personal Info (Sobre mim + Interesses) -->
    <div class="profile-sections-grid">
      <!-- Sobre Mim -->
      <div class="retro-box section-box">
        <div class="box-header">
          » Sobre mim
        </div>
        <div class="box-body">
          <!-- Bio -->
          <div class="info-block">
            <div class="block-title-row">
              <span class="block-label">BIO</span>
              <button v-if="isOwner && !isEditingBio" type="button" class="edit-icon-btn" @click="startEditBio" title="Editar bio">
                ✏️
              </button>
            </div>

            <!-- Bio edit mode -->
            <div v-if="isEditingBio" class="inline-editor">
              <textarea
                v-model="bioInput"
                class="retro-textarea"
                rows="3"
                maxlength="255"
                placeholder="Diga algo sobre você..."
              ></textarea>
              <div class="editor-buttons">
                <button type="button" class="btn-save" @click="saveBio">[ Salvar ]</button>
                <button type="button" class="btn-cancel" @click="isEditingBio = false">Cancelar</button>
              </div>
            </div>
            <!-- Bio read mode -->
            <div v-else class="bio-text">
              "{{ user.bio || 'Diga algo sobre você...' }}"
            </div>
          </div>

          <!-- Birthday -->
          <div class="info-block">
            <div class="block-title-row">
              <span class="block-label">🎂 ANIVERSÁRIO</span>
              <button v-if="isOwner && !isEditingBirth" type="button" class="edit-icon-btn" @click="startEditBirth" title="Editar aniversário">
                ✏️
              </button>
            </div>

            <!-- Birth edit mode -->
            <div v-if="isEditingBirth" class="inline-editor">
              <input v-model="birthInput" type="date" class="retro-field" />
              <div class="editor-buttons">
                <button type="button" class="btn-save" @click="saveBirth">[ Salvar ]</button>
                <button type="button" class="btn-cancel" @click="isEditingBirth = false">Cancelar</button>
              </div>
            </div>
            <!-- Birth read mode -->
            <div v-else class="info-text">
              {{ user.birth ? formatBirthDate(user.birth) : 'Aniversário não informado' }}
            </div>
          </div>
        </div>
      </div>

      <!-- Meus Interesses -->
      <div class="retro-box section-box">
        <div class="box-header">
          » Meus interesses
        </div>
        <div class="box-body">
          <!-- Add interest row -->
          <div v-if="isOwner" class="add-interest-row">
            <input
              v-model="newInterestInput"
              placeholder="novo interesse..."
              class="retro-field interest-input"
              @keydown.enter.prevent="addInterest"
            />
            <button type="button" class="btn-add-interest" @click="addInterest">
              +
            </button>
          </div>

          <!-- Interests Tags list -->
          <div v-if="user.interests && user.interests.length" class="interests-tags">
            <div v-for="interest in user.interests" :key="interest.id" class="interest-tag">
              <span>{{ interest.name }}</span>
              <button v-if="isOwner" type="button" class="remove-interest-x" @click="removeInterest(interest.name)">
                ×
              </button>
            </div>
          </div>
          <p v-else class="empty-interests-text">
            Nenhum interesse cadastrado ainda.
          </p>
        </div>
      </div>
    </div>

    <!-- User's Posts Feed / Entertainment Section -->
    <div class="user-posts-section">
      <div class="user-posts-header">
        <h2 class="user-posts-title">» Atividades de {{ user.name }}</h2>
      </div>

      <div class="profile-tabs-bar">
        <button
          type="button"
          class="profile-tab-btn"
          :class="{ active: profilePostTab === 'feed' }"
          @click="setProfilePostTab('feed')"
        >
          📰 Feed
        </button>
        <button
          type="button"
          class="profile-tab-btn"
          :class="{ active: profilePostTab === 'entertainment' }"
          @click="setProfilePostTab('entertainment')"
        >
          🍿 Entretenimento
        </button>
      </div>

      <div v-if="feedStore.isLoadingUserPosts && !userPosts.length" class="posts-stream">
        <PostCardSkeleton v-for="i in 2" :key="i" />
      </div>
      <template v-else-if="userPosts.length">
        <div class="posts-stream">
          <template v-if="profilePostTab === 'entertainment'">
            <LetterboxdCard
              v-for="post in userPosts"
              :key="post.id"
              :post="post"
              @deleted="feedStore.deletePost(post.id)"
            />
          </template>
          <template v-else>
            <PostCard v-for="post in userPosts" :key="post.id" :post="post" />
          </template>
        </div>
        <div v-if="feedStore.hasMoreUserPosts" class="load-more-container">
          <button
            type="button"
            class="retro-load-more-btn"
            :disabled="feedStore.isLoadingMoreUserPosts"
            @click="feedStore.loadMoreUserPosts()"
          >
            {{ feedStore.isLoadingMoreUserPosts ? 'Carregando mais...' : '[ Carregar mais ]' }}
          </button>
        </div>
      </template>
      <div v-else class="retro-box empty-user-posts">
        <p v-if="profilePostTab === 'entertainment'">
          Nenhuma atividade de entretenimento registrada ainda por este usuário.
        </p>
        <p v-else>
          Nenhuma publicação feita ainda por este usuário no feed.
        </p>
      </div>
    </div>

    <!-- Banner Cropper Modal -->
    <ImageCropper
      v-model="showBannerCropper"
      :aspectRatio="3 / 1"
      title="Editar Banner"
      @cropped="handleBannerCropped"
    />

    <!-- Avatar Cropper Modal -->
    <ImageCropper
      v-model="showAvatarCropper"
      :aspectRatio="1"
      title="Editar Foto de Perfil"
      @cropped="handleAvatarCropped"
    />

    <!-- Theme Customizer Modal -->
    <ThemeCustomizerModal v-model="showThemeModal" />

    <!-- Settings & Password Modal -->
    <RetroModal v-model="showSettingsModal" title="» Configurações da Conta" size="md">
      <div class="settings-form">
        <div v-if="settingsError" class="error-banner">{{ settingsError }}</div>
        <div v-if="settingsSuccess" class="success-banner">{{ settingsSuccess }}</div>

        <div class="form-group">
          <label class="form-label">Nome Completo</label>
          <input v-model="settingsName" type="text" class="retro-field" required />
        </div>

        <div class="form-group">
          <label class="form-label">Nome de Usuário</label>
          <input v-model="settingsUsername" type="text" class="retro-field" required />
        </div>

        <!-- Password Change Box -->
        <div class="password-change-box">
          <h4 class="password-section-title">Alterar Senha</h4>
          <div class="form-group">
            <label class="form-label">Senha atual</label>
            <div class="password-input-wrapper">
              <input
                v-model="settingsCurrentPassword"
                :type="showCurrentPassword ? 'text' : 'password'"
                class="retro-field"
                placeholder="••••••••"
              />
              <button
                type="button"
                class="password-toggle-btn"
                @click="showCurrentPassword = !showCurrentPassword"
                :title="showCurrentPassword ? 'Ocultar senha' : 'Ver senha'"
                :aria-label="showCurrentPassword ? 'Ocultar senha' : 'Ver senha'"
                tabindex="-1"
              >
                <svg v-if="!showCurrentPassword" xmlns="http://www.w3.org/2000/svg" class="eye-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <svg v-else xmlns="http://www.w3.org/2000/svg" class="eye-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                </svg>
              </button>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Nova senha</label>
            <div class="password-input-wrapper">
              <input
                v-model="settingsPassword"
                :type="showNewPassword ? 'text' : 'password'"
                class="retro-field"
                placeholder="••••••••"
              />
              <button
                type="button"
                class="password-toggle-btn"
                @click="showNewPassword = !showNewPassword"
                :title="showNewPassword ? 'Ocultar senha' : 'Ver senha'"
                :aria-label="showNewPassword ? 'Ocultar senha' : 'Ver senha'"
                tabindex="-1"
              >
                <svg v-if="!showNewPassword" xmlns="http://www.w3.org/2000/svg" class="eye-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <svg v-else xmlns="http://www.w3.org/2000/svg" class="eye-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                </svg>
              </button>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Confirmar nova senha</label>
            <div class="password-input-wrapper">
              <input
                v-model="settingsPasswordConfirmation"
                :type="showConfirmPassword ? 'text' : 'password'"
                class="retro-field"
                placeholder="••••••••"
              />
              <button
                type="button"
                class="password-toggle-btn"
                @click="showConfirmPassword = !showConfirmPassword"
                :title="showConfirmPassword ? 'Ocultar senha' : 'Ver senha'"
                :aria-label="showConfirmPassword ? 'Ocultar senha' : 'Ver senha'"
                tabindex="-1"
              >
                <svg v-if="!showConfirmPassword" xmlns="http://www.w3.org/2000/svg" class="eye-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <svg v-else xmlns="http://www.w3.org/2000/svg" class="eye-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Connected Accounts (Contas Conectadas) -->
        <div class="connected-accounts-box">
          <h4 class="settings-section-title">
            <svg xmlns="http://www.w3.org/2000/svg" class="section-title-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            Contas Conectadas
          </h4>
          <p class="settings-section-desc">
            Vincule plataformas externas para sincronizar suas atividades automaticamente com a casa.
          </p>

          <div v-if="letterboxdMessage" class="success-banner mb-2">
            {{ letterboxdMessage }}
          </div>
          <div v-if="letterboxdError" class="error-banner mb-2">
            {{ letterboxdError }}
          </div>

          <!-- Letterboxd Connection Card -->
          <div class="account-item-card">
            <div class="account-item-header">
              <div class="account-brand">
                <span class="account-logo-letterboxd">🍿</span>
                <div>
                  <strong class="account-name">Letterboxd</strong>
                  <div class="account-status">
                    <span v-if="user.letterboxd_username" class="badge-connected">
                      ● Conectado como @{{ user.letterboxd_username }}
                    </span>
                    <span v-else class="badge-disconnected">
                      ○ Não conectado
                    </span>
                  </div>
                </div>
              </div>

              <span v-if="user.letterboxd_last_synced_at" class="last-synced-label">
                Sincronizado {{ formatRelativeTime(user.letterboxd_last_synced_at) }}
              </span>
            </div>

            <!-- If NOT connected: Input to connect -->
            <div v-if="!user.letterboxd_username" class="account-connect-form">
              <div class="letterboxd-input-group">
                <span class="input-prefix">@</span>
                <input
                  v-model="letterboxdInput"
                  type="text"
                  class="retro-field letterboxd-field"
                  placeholder="seu_usuario_letterboxd"
                  @keyup.enter="handleConnectLetterboxd"
                />
                <button
                  type="button"
                  class="retro-action-btn primary-action"
                  :disabled="isConnectingLetterboxd || !letterboxdInput.trim()"
                  @click="handleConnectLetterboxd"
                >
                  {{ isConnectingLetterboxd ? 'Conectando...' : 'Conectar' }}
                </button>
              </div>
              <span class="account-hint">
                Seu perfil deve ser público no Letterboxd para importarmos suas resenhas e filmes assistidos.
              </span>
            </div>

            <!-- If connected: Sync and Disconnect buttons -->
            <div v-else class="account-connected-actions">
              <button
                type="button"
                class="retro-action-btn primary-action"
                :disabled="isSyncingLetterboxd"
                @click="handleSyncLetterboxd"
              >
                <svg v-if="isSyncingLetterboxd" class="spin-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
                <span>{{ isSyncingLetterboxd ? 'Sincronizando...' : '🔄 Sincronizar Agora' }}</span>
              </button>

              <button
                type="button"
                class="retro-action-btn danger-action"
                :disabled="isDisconnectingLetterboxd"
                @click="handleDisconnectLetterboxd"
              >
                {{ isDisconnectingLetterboxd ? 'Desconectando...' : 'Desconectar' }}
              </button>
            </div>
          </div>
        </div>

        <!-- Push Notifications & Preferences Section -->
        <div class="push-notifications-box">
          <h4 class="settings-section-title">
            <svg xmlns="http://www.w3.org/2000/svg" class="section-title-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            Notificações Push
          </h4>
          <p class="settings-section-desc">
            Receba notificações direto no seu navegador ou celular sobre interações na comunidade.
          </p>

          <!-- iOS Alert banner -->
          <div v-if="isIosDevice && !isPwaStandalone" class="ios-pwa-notice">
            <span class="notice-icon">💡</span>
            <div class="notice-text">
              No iPhone/iPad, para receber notificações você precisa instalar o CapiHouse na Tela de Início (toque em <strong>Compartilhar</strong> e depois em <strong>Adicionar à Tela de Início</strong>).
            </div>
          </div>

          <!-- Status Banners -->
          <div v-if="pushStatusMessage" class="success-banner mb-2">
            {{ pushStatusMessage }}
          </div>
          <div v-if="pushErrorMessage" class="error-banner mb-2">
            {{ pushErrorMessage }}
          </div>

          <!-- Device Subscription Card -->
          <div class="device-status-card">
            <div class="device-info">
              <div class="device-label">Status deste aparelho:</div>
              <div class="device-badge" :class="isPushSubscribed ? 'badge-active' : 'badge-inactive'">
                <span class="badge-dot"></span>
                {{ isPushSubscribed ? 'Ativo e Conectado' : 'Não Ativado' }}
              </div>
            </div>

            <div class="device-actions">
              <button
                v-if="!isPushSubscribed"
                type="button"
                class="retro-action-btn primary-action"
                :disabled="isPushLoading"
                @click="subscribePush"
              >
                <svg v-if="isPushLoading" class="spin-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
                <svg v-else xmlns="http://www.w3.org/2000/svg" class="action-svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <span>{{ isPushLoading ? 'Ativando...' : 'Ativar Notificações neste Aparelho' }}</span>
              </button>

              <template v-else>
                <button
                  type="button"
                  class="retro-action-btn"
                  :disabled="isPushTesting"
                  title="Disparar notificação de teste"
                  @click="sendTestNotification"
                >
                  <svg v-if="isPushTesting" class="spin-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                  </svg>
                  <svg v-else xmlns="http://www.w3.org/2000/svg" class="action-svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>{{ isPushTesting ? 'Enviando...' : 'Testar Notificação' }}</span>
                </button>

                <button
                  type="button"
                  class="retro-action-btn btn-danger-action"
                  :disabled="isPushLoading"
                  title="Desativar notificações neste aparelho"
                  @click="unsubscribePush"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="action-svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                  <span>Desativar</span>
                </button>
              </template>
            </div>
          </div>

          <!-- Preferences Category Toggles -->
          <div class="preferences-toggles-section">
            <h5 class="preferences-subtitle">Quais notificações deseja receber:</h5>
            <div class="toggles-grid">
              <label class="retro-toggle-item">
                <input
                  type="checkbox"
                  class="retro-checkbox"
                  :checked="notificationPreferences.likes"
                  @change="setNotificationPreference('likes', ($event.target as HTMLInputElement).checked)"
                />
                <span class="toggle-text">
                  <span class="toggle-title">Curtidas</span>
                  <span class="toggle-desc">Quando curtirem suas publicações ou comentários</span>
                </span>
              </label>

              <label class="retro-toggle-item">
                <input
                  type="checkbox"
                  class="retro-checkbox"
                  :checked="notificationPreferences.comments"
                  @change="setNotificationPreference('comments', ($event.target as HTMLInputElement).checked)"
                />
                <span class="toggle-text">
                  <span class="toggle-title">Comentários e Respostas</span>
                  <span class="toggle-desc">Novos comentários em posts e respostas aos seus comentários</span>
                </span>
              </label>

              <label class="retro-toggle-item">
                <input
                  type="checkbox"
                  class="retro-checkbox"
                  :checked="notificationPreferences.mentions"
                  @change="setNotificationPreference('mentions', ($event.target as HTMLInputElement).checked)"
                />
                <span class="toggle-text">
                  <span class="toggle-title">Marcações (@você)</span>
                  <span class="toggle-desc">Quando alguém citar seu @username na casa</span>
                </span>
              </label>

              <label class="retro-toggle-item">
                <input
                  type="checkbox"
                  class="retro-checkbox"
                  :checked="notificationPreferences.group_invites"
                  @change="setNotificationPreference('group_invites', ($event.target as HTMLInputElement).checked)"
                />
                <span class="toggle-text">
                  <span class="toggle-title">Convites de Grupos</span>
                  <span class="toggle-desc">Quando convidarem você para participar de uma comunidade</span>
                </span>
              </label>

              <label class="retro-toggle-item">
                <input
                  type="checkbox"
                  class="retro-checkbox"
                  :checked="notificationPreferences.event_invites"
                  @change="setNotificationPreference('event_invites', ($event.target as HTMLInputElement).checked)"
                />
                <span class="toggle-text">
                  <span class="toggle-title">Eventos da Casa</span>
                  <span class="toggle-desc">Convites e confirmações de presença em eventos</span>
                </span>
              </label>
            </div>
          </div>
        </div>

        <!-- App Updates Section -->
        <div class="app-updates-box">
          <h4 class="settings-section-title">
            <svg xmlns="http://www.w3.org/2000/svg" class="section-title-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Atualizações do Aplicativo
          </h4>
          <p class="updates-description">
            Busque a versão mais recente do CapiHouse ou recarregue o aplicativo para sincronizar dados e novidades.
          </p>

          <!-- Warning banner if update is ready -->
          <div v-if="pwaNeedRefresh" class="update-alert-banner">
            <span class="update-alert-icon">⚠️</span>
            <div class="update-alert-text">
              <strong>Nova versão disponível!</strong>
              <div>Uma atualização recente do CapiHouse está pronta para ser instalada.</div>
            </div>
            <button
              type="button"
              class="apply-update-btn"
              @click="applyPwaUpdate"
            >
              Atualizar Agora
            </button>
          </div>

          <!-- Status feedback message from check -->
          <div v-else-if="pwaFeedbackMessage" class="update-feedback-banner">
            ℹ️ {{ pwaFeedbackMessage }}
          </div>

          <div class="updates-buttons-row">
            <button
              type="button"
              class="retro-action-btn"
              :disabled="isCheckingUpdates"
              @click="checkPwaUpdates"
            >
              <svg v-if="isCheckingUpdates" class="spin-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
              </svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" class="action-svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>{{ isCheckingUpdates ? 'Buscando...' : 'Buscar Atualizações' }}</span>
            </button>

            <button
              type="button"
              class="retro-action-btn"
              title="Recarregar aplicativo"
              @click="reloadApp"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="action-svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              <span>Recarregar App</span>
            </button>
          </div>
        </div>

        <div class="modal-footer">
          <RetroButton variant="secondary" @click="showSettingsModal = false">Cancelar</RetroButton>
          <RetroButton :loading="isSavingSettings" @click="saveSettings">
            Salvar Configurações
          </RetroButton>
        </div>
      </div>
    </RetroModal>

    <!-- Retro Alert/Notice Modal -->
    <RetroConfirmModal
      v-model="showAlertModal"
      :title="alertTitle"
      :message="alertMessage"
      :details="alertDetails"
      variant="warning"
      alertOnly
      confirmText="OK"
      @confirm="showAlertModal = false"
    />

    <!-- Logout Confirm Modal -->
    <RetroConfirmModal
      v-model="showLogoutConfirm"
      title="» Sair da Conta"
      message="Tem certeza que deseja encerrar a sua sessão no CapiHouse?"
      confirmText="Sair da Conta"
      cancelText="Cancelar"
      variant="danger"
      @confirm="handleLogout"
    />
  </div>

  <div v-else-if="profileStore.isLoading" class="loading-state">
    Carregando perfil...
  </div>
  <div v-else class="retro-box not-found-box">
    Usuário não encontrado.
  </div>
</template>

<style scoped>
.profile-page-container {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.retro-box {
  border: 2px solid var(--color-border, #D8CDC5);
  background-color: #ffffff;
  border-radius: 2px;
  overflow: hidden;
}

.profile-header-box {
  position: relative;
}

.profile-banner {
  position: relative;
  width: 100%;
  aspect-ratio: 3 / 1;
  max-height: 220px;
  background: linear-gradient(90deg, #d6bda2 0%, #e8d3bc 100%);
  background-size: cover;
  background-position: center;
  border-bottom: 2px solid var(--color-primary, #a66130);
}

.profile-banner.clickable-banner {
  cursor: zoom-in;
}

.banner-edit-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  font-family: var(--font-heading);
  font-size: 0.75rem;
  font-weight: bold;
  background-color: rgba(255, 255, 255, 0.9);
  border: 1px solid var(--color-border);
  color: var(--color-primary-800);
  padding: 0.3rem 0.6rem;
  border-radius: 2px;
  cursor: pointer;
  z-index: 2;
}
.banner-edit-btn:hover {
  background-color: #ffffff;
}

.profile-bar {
  padding: 0 1.5rem 1.25rem;
  display: flex;
  gap: 1.25rem;
  align-items: flex-end;
}

.avatar-wrapper {
  position: relative;
  margin-top: -3.5rem;
  flex-shrink: 0;
}

.avatar-circle {
  width: 96px;
  height: 96px;
  border: 4px solid #ffffff;
  border-radius: 2px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  background-color: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.avatar-circle.clickable-avatar {
  cursor: zoom-in;
}

.avatar-circle.clickable-avatar:hover {
  transform: scale(1.03);
  box-shadow: 0 4px 12px rgba(0,0,0,0.25);
  border-color: var(--color-primary-100, #fdf8f3);
}

.avatar-zoom-badge {
  position: absolute;
  bottom: 4px;
  left: 4px;
  background-color: rgba(0, 0, 0, 0.65);
  color: #ffffff;
  border-radius: 2px;
  padding: 1px 3px;
  font-size: 0.65rem;
  opacity: 0;
  transition: opacity 0.15s ease;
  pointer-events: none;
}

.avatar-circle.clickable-avatar:hover .avatar-zoom-badge {
  opacity: 1;
}

.avatar-photo {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-fallback {
  color: #ffffff;
  font-size: 1.8rem;
  font-weight: bold;
  font-family: var(--font-heading);
}

.avatar-edit-btn {
  position: absolute;
  bottom: -4px;
  right: -4px;
  background-color: #ffffff;
  border: 1px solid var(--color-border);
  border-radius: 2px;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.avatar-edit-btn:hover {
  background-color: var(--color-primary-100);
}

.profile-info-col {
  flex: 1;
  min-width: 0;
  padding-top: 0.5rem;
}

.name-status-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.user-display-name {
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 1.5rem;
  color: var(--color-primary-800);
  line-height: 1.2;
  margin: 0;
}

.user-username {
  font-family: var(--font-heading);
  font-size: 0.9rem;
  color: var(--color-primary);
}

.owner-actions {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.profile-icon-btn {
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 2px;
  cursor: pointer;
  border: 1px solid var(--color-border);
  transition: all 0.15s ease;
  padding: 0;
}

.profile-icon-btn .btn-icon {
  width: 17px;
  height: 17px;
}

.profile-icon-btn.settings-btn {
  background-color: var(--color-primary-100, #f8f1ea);
  border-color: var(--color-border, #D8CDC5);
  color: var(--color-primary-800, #5f4120);
}
.profile-icon-btn.settings-btn:hover {
  background-color: var(--color-primary-200, #ebd5c1);
  border-color: var(--color-primary);
  color: var(--color-primary-900);
  transform: translateY(-1px);
}

.profile-icon-btn.customize-btn {
  background-color: #ede9fe;
  border-color: #c4b5fd;
  color: #6d28d9;
}
.profile-icon-btn.customize-btn:hover {
  background-color: #ddd6fe;
  border-color: #7c3aed;
  color: #5b21b6;
  transform: translateY(-1px);
}

.profile-icon-btn.logout-btn {
  background-color: #fee2e2;
  border-color: #fca5a5;
  color: #dc2626;
}
.profile-icon-btn.logout-btn:hover {
  background-color: #fecaca;
  border-color: #ef4444;
  color: #b91c1c;
  transform: translateY(-1px);
}

.profile-sections-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}
@media (max-width: 768px) {
  .profile-sections-grid {
    grid-template-columns: 1fr;
  }
}

.box-header {
  background-color: var(--color-primary);
  color: #ffffff;
  padding: 0.4rem 0.75rem;
  font-family: var(--font-heading);
  font-size: 0.85rem;
  font-weight: bold;
  text-transform: uppercase;
}

.box-body {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.info-block {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.block-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.block-label {
  font-size: 0.75rem;
  font-family: var(--font-heading);
  font-weight: bold;
  color: var(--color-muted);
}

.edit-icon-btn {
  background: none;
  border: 1px solid var(--color-border);
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 2px;
  background-color: #ffffff;
}
.edit-icon-btn:hover {
  background-color: var(--color-primary-100);
}

.bio-text {
  font-size: 0.95rem;
  color: var(--color-primary-800);
  font-style: italic;
  white-space: pre-wrap;
}

.info-text {
  font-size: 0.9rem;
  color: var(--color-primary-800);
}

.inline-editor {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0.25rem;
}

.editor-buttons {
  display: flex;
  gap: 0.5rem;
}

.btn-save {
  background-color: var(--color-primary);
  color: white;
  border: none;
  font-family: var(--font-heading);
  font-size: 0.8rem;
  font-weight: bold;
  padding: 0.3rem 0.6rem;
  border-radius: 2px;
  cursor: pointer;
}
.btn-save:hover { background-color: var(--color-primary-600); }

.btn-cancel {
  background: none;
  border: 1px solid var(--color-border);
  font-size: 0.8rem;
  padding: 0.3rem 0.6rem;
  border-radius: 2px;
  cursor: pointer;
}

.add-interest-row {
  display: flex;
  gap: 0.4rem;
}

.interest-input {
  flex: 1;
}

.btn-add-interest {
  background-color: var(--color-primary);
  color: white;
  border: none;
  font-family: var(--font-heading);
  font-size: 1.1rem;
  font-weight: bold;
  padding: 0 0.8rem;
  border-radius: 2px;
  cursor: pointer;
}

.interests-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.interest-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0.6rem;
  background-color: #344d0e;
  color: #ffffff;
  font-size: 0.75rem;
  font-weight: 500;
  border-radius: 2px;
}

.remove-interest-x {
  background: none;
  border: none;
  color: #ffffff;
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
}

.empty-interests-text {
  font-size: 0.8rem;
  color: var(--color-muted);
}

.user-posts-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.user-posts-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  background-color: var(--color-primary, #a66130);
  border: 1px solid var(--color-primary-800, #5f4120);
  border-radius: 2px;
  padding: 0.6rem 0.85rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.user-posts-title {
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 1.05rem;
  font-weight: 700;
  color: #ffffff;
  margin: 0;
}

.profile-tabs-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.25rem;
  margin-bottom: 0.25rem;
}

.profile-tab-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.85rem;
  background-color: var(--color-primary-50, #f8f6f1);
  border: 1px solid var(--color-border, #D8CDC5);
  color: var(--color-primary-800, #5f4120);
  border-radius: 2px;
  font-family: var(--font-mono, monospace);
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  box-shadow: 1px 1px 0px rgba(0, 0, 0, 0.05);
}

.profile-tab-btn:hover {
  background-color: var(--color-primary-100, #fdf8f3);
  border-color: var(--color-primary, #a66130);
}

.profile-tab-btn.active {
  background-color: var(--color-primary, #a66130);
  color: #ffffff;
  border-color: var(--color-primary-800, #5f4120);
}

.empty-user-posts {
  padding: 2rem;
  text-align: center;
  color: var(--color-muted);
}

/* Connected Accounts Section */
.connected-accounts-box {
  background-color: var(--color-primary-50, #f8f6f1);
  border: 1px solid var(--color-border, #D8CDC5);
  border-radius: 2px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.account-item-card {
  background-color: #ffffff;
  border: 1px solid var(--color-border, #D8CDC5);
  border-radius: 4px;
  padding: 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.account-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.account-brand {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.account-logo-letterboxd {
  font-size: 1.5rem;
}

.account-name {
  display: block;
  font-family: var(--font-heading, monospace);
  font-size: 0.95rem;
  color: var(--color-primary-900, #3d2a14);
}

.account-status {
  font-size: 0.75rem;
  font-family: var(--font-mono, monospace);
}

.badge-connected {
  color: #00c030;
  font-weight: 600;
}

.badge-disconnected {
  color: #718096;
}

.last-synced-label {
  font-size: 0.75rem;
  color: #a0aec0;
  font-family: var(--font-mono, monospace);
}

.account-connect-form {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.letterboxd-input-group {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.input-prefix {
  font-family: var(--font-mono, monospace);
  font-weight: 700;
  color: #718096;
  font-size: 0.95rem;
}

.letterboxd-field {
  flex: 1;
}

.account-hint {
  font-size: 0.75rem;
  color: #718096;
  font-style: italic;
}

.account-connected-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.danger-action {
  color: #e53e3e !important;
  border-color: #feb2b2 !important;
}
.danger-action:hover {
  background-color: #fff5f5 !important;
}

/* Settings Form in modal */
.settings-form {
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
  font-size: 0.85rem;
  font-weight: bold;
  color: var(--color-primary-800);
}

.retro-field {
  width: 100%;
  padding: 0.5rem 0.75rem;
  font-size: 0.9rem;
  font-family: var(--font-body);
  border: 2px solid var(--color-primary-200);
  background-color: var(--color-primary-50);
  border-radius: 2px;
  outline: none;
}
.retro-field:focus {
  border-color: var(--color-primary);
}

.password-change-box {
  border-top: 1px solid var(--color-border);
  padding-top: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.password-section-title {
  font-family: var(--font-heading);
  font-size: 0.85rem;
  text-transform: uppercase;
  color: var(--color-primary-800);
}

.push-notifications-box {
  border-top: 1px solid var(--color-border);
  padding-top: 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.settings-section-desc {
  font-size: 0.8rem;
  color: var(--color-muted, #666);
  margin: 0;
  line-height: 1.4;
}

.ios-pwa-notice {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.55rem 0.75rem;
  background-color: #fefce8;
  border: 1px solid #fde047;
  color: #713f12;
  font-size: 0.78rem;
  border-radius: 2px;
  line-height: 1.35;
}

.device-status-card {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  background-color: var(--color-primary-50, #f8f6f1);
  border: 1px solid var(--color-primary-200, #e8c9a5);
  padding: 0.65rem 0.85rem;
  border-radius: 2px;
}

.device-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.device-label {
  font-size: 0.8rem;
  font-weight: bold;
  color: var(--color-primary-900, #422d16);
}

.device-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.75rem;
  font-weight: bold;
  padding: 0.2rem 0.5rem;
  border-radius: 9999px;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.badge-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.badge-active {
  background-color: #dcfce7;
  color: #166534;
  border: 1px solid #86efac;
}

.badge-active .badge-dot {
  background-color: #22c55e;
}

.badge-inactive {
  background-color: #f1f5f9;
  color: #475569;
  border: 1px solid #cbd5e1;
}

.badge-inactive .badge-dot {
  background-color: #94a3b8;
}

.device-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.primary-action {
  background-color: var(--color-primary) !important;
  color: #ffffff !important;
  border-color: var(--color-primary-700, #804a1f) !important;
}

.primary-action:hover:not(:disabled) {
  background-color: var(--color-primary-600, #915324) !important;
}

.btn-danger-action {
  color: #b91c1c !important;
  border-color: #fca5a5 !important;
  background-color: #fff1f2 !important;
}

.btn-danger-action:hover:not(:disabled) {
  background-color: #ffe4e6 !important;
  border-color: #f87171 !important;
}

.preferences-toggles-section {
  margin-top: 0.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.preferences-subtitle {
  font-size: 0.8rem;
  font-weight: bold;
  color: var(--color-primary-900, #422d16);
  margin: 0;
}

.toggles-grid {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.retro-toggle-item {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  padding: 0.45rem 0.65rem;
  background-color: #ffffff;
  border: 1px solid var(--color-border);
  border-radius: 2px;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.retro-toggle-item:hover {
  background-color: var(--color-primary-50, #f8f6f1);
}

.retro-checkbox {
  margin-top: 0.15rem;
  accent-color: var(--color-primary);
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.toggle-text {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.toggle-title {
  font-size: 0.8rem;
  font-weight: bold;
  color: var(--color-primary-900, #422d16);
}

.toggle-desc {
  font-size: 0.72rem;
  color: var(--color-muted, #777);
  line-height: 1.25;
}

.app-updates-box {
  border-top: 1px solid var(--color-border);
  padding-top: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.settings-section-title {
  font-family: var(--font-heading);
  font-size: 0.85rem;
  text-transform: uppercase;
  color: var(--color-primary-800);
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.section-title-icon {
  width: 16px;
  height: 16px;
}

.updates-description {
  font-size: 0.8rem;
  color: var(--color-muted, #666);
  margin: 0;
  line-height: 1.4;
}

.update-alert-banner {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.6rem 0.75rem;
  background-color: #fef3c7;
  color: #78350f;
  border: 1px solid #f59e0b;
  border-radius: 2px;
  font-size: 0.8rem;
  flex-wrap: wrap;
}

.update-alert-icon {
  font-size: 1.1rem;
  flex-shrink: 0;
}

.update-alert-text {
  flex: 1;
  min-width: 180px;
}

.apply-update-btn {
  background-color: #b45309;
  color: #ffffff;
  border: 1px solid #78350f;
  box-shadow: 2px 2px 0 #78350f;
  padding: 0.35rem 0.75rem;
  border-radius: 2px;
  font-family: var(--font-heading, monospace);
  font-size: 0.75rem;
  font-weight: bold;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.1s ease;
}

.apply-update-btn:hover {
  background-color: #92400e;
  transform: translateY(-1px);
}

.update-feedback-banner {
  padding: 0.45rem 0.65rem;
  background-color: var(--color-primary-50, #f8f6f1);
  border: 1px dashed var(--color-primary-300, #d4a574);
  color: var(--color-primary-900, #422d16);
  font-size: 0.8rem;
  border-radius: 2px;
}

.updates-buttons-row {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.retro-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.45rem 0.8rem;
  background-color: var(--color-primary-100, #fdf8f3);
  color: var(--color-primary-900, #422d16);
  border: 1px solid var(--color-primary-300, #d4a574);
  font-family: var(--font-heading, monospace);
  font-size: 0.8rem;
  font-weight: bold;
  border-radius: 2px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.retro-action-btn:hover:not(:disabled) {
  background-color: var(--color-primary-200, #e8c9a5);
  border-color: var(--color-primary);
}

.retro-action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.action-svg {
  width: 15px;
  height: 15px;
  flex-shrink: 0;
}

.spin-icon {
  width: 15px;
  height: 15px;
  flex-shrink: 0;
  animation: pwa-spin 1s linear infinite;
}

@keyframes pwa-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.error-banner {
  padding: 0.5rem;
  background-color: #fee2e2;
  border: 1px solid #ef4444;
  color: #b91c1c;
  font-size: 0.85rem;
  border-radius: 2px;
}

.success-banner {
  padding: 0.5rem;
  background-color: #dcfce7;
  border: 1px solid #22c55e;
  color: #15803d;
  font-size: 0.85rem;
  border-radius: 2px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  border-top: 1px solid var(--color-border);
  padding-top: 0.75rem;
}

.load-more-container {
  display: flex;
  justify-content: center;
  padding: 0.75rem 0;
}

.retro-load-more-btn {
  background: none;
  border: 1px dashed var(--color-primary-400, #c4884e);
  color: var(--color-primary-800, #5f4120);
  font-family: var(--font-heading, monospace);
  font-size: 0.85rem;
  font-weight: bold;
  padding: 0.5rem 1rem;
  border-radius: 2px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.retro-load-more-btn:hover:not(:disabled) {
  background-color: var(--color-primary-50, #f8f6f1);
  border-color: var(--color-primary);
}

.retro-load-more-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
