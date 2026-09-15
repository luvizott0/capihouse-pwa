<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProfileStore } from '@/stores/profile'
import { useAuthStore } from '@/stores/auth'
import { useFeedStore } from '@/stores/feed'
import { useThemeStore } from '@/stores/theme'
import UserAvatar from '@/components/ui/UserAvatar.vue'
import RetroModal from '@/components/ui/RetroModal.vue'
import RetroButton from '@/components/ui/RetroButton.vue'
import RetroConfirmModal from '@/components/ui/RetroConfirmModal.vue'
import ImageCropper from '@/components/profile/ImageCropper.vue'
import ThemeCustomizerModal from '@/components/profile/ThemeCustomizerModal.vue'
import PostCard from '@/components/feed/PostCard.vue'

const route = useRoute()
const router = useRouter()
const profileStore = useProfileStore()
const authStore = useAuthStore()
const feedStore = useFeedStore()
const themeStore = useThemeStore()

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

async function loadProfile() {
  if (!isOwner.value && route.params.username) {
    await profileStore.fetchProfile(route.params.username as string)
    // Apply the visited user's theme while on their profile page
    themeStore.loadThemeFromUser(profileStore.profile)
  } else {
    // Restore own theme when viewing own profile
    themeStore.loadThemeFromUser(authStore.user)
  }
  if (user.value) {
    settingsName.value = user.value.name
    settingsUsername.value = user.value.username
    bioInput.value = user.value.bio || ''
    birthInput.value = user.value.birth ? user.value.birth.substring(0, 10) : ''
  }
}

// Restore own theme when leaving a visited profile page
onUnmounted(() => {
  if (!isOwner.value) {
    themeStore.loadThemeFromUser(authStore.user)
  }
})

onMounted(() => {
  loadProfile()
  feedStore.fetchPosts()
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
  showSettingsModal.value = true
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

// User's own posts
const userPosts = computed(() => {
  if (!user.value) return []
  return feedStore.posts.filter(p => p.user_id === user.value?.id)
})
</script>

<template>
  <div v-if="user" class="profile-page-container">
    <!-- Header Card (Banner + Avatar + Info) -->
    <div class="retro-box profile-header-box">
      <!-- Banner -->
      <div
        class="profile-banner"
        :style="user.banner_url ? { backgroundImage: `url(${user.banner_url})` } : {}"
      >
        <button
          v-if="isOwner"
          type="button"
          class="banner-edit-btn"
          @click="showBannerCropper = true"
        >
          📷 [ Editar banner ]
        </button>
      </div>

      <!-- Avatar & Basic info bar -->
      <div class="profile-bar">
        <div class="avatar-wrapper">
          <div class="avatar-circle">
            <img v-if="user.avatar_url" :src="user.avatar_url" alt="Avatar" class="avatar-photo" />
            <div v-else class="avatar-fallback">{{ user.initials || 'CR' }}</div>
          </div>
          <button
            v-if="isOwner"
            type="button"
            class="avatar-edit-btn"
            title="Editar foto de perfil"
            @click="showAvatarCropper = true"
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
              {{ user.birth ? new Date(user.birth).toLocaleDateString('pt-BR') : 'Aniversário não informado' }}
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

    <!-- User's Posts Feed -->
    <div class="user-posts-section">
      <h2 class="user-posts-title">» Publicações de {{ user.name }}</h2>
      <div v-if="userPosts.length" class="posts-stream">
        <PostCard v-for="post in userPosts" :key="post.id" :post="post" />
      </div>
      <div v-else class="retro-box empty-user-posts">
        <p>Nenhuma publicação feita ainda por este usuário.</p>
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

.user-posts-title {
  font-family: var(--font-heading);
  font-size: 1.1rem;
  color: var(--color-primary-800);
}

.empty-user-posts {
  padding: 2rem;
  text-align: center;
  color: var(--color-muted);
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
</style>
