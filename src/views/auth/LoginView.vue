<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import * as authApi from '@/api/auth'
import GuestShell from '@/components/layout/GuestShell.vue'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const form = ref({
  login: '',
  password: '',
  remember: false,
})

const showPassword = ref(false)
const errorMsg = ref('')
const devUsers = ref<any[]>([])
const selectedDevUserId = ref<number | ''>('')
const isLoggingInDev = ref(false)

onMounted(async () => {
  if (route.query.notice === 'pending') {
    errorMsg.value = 'A sua conta ainda não foi aprovada pelo administrador. Aguarde a aprovação.'
  }

  try {
    const res = await authApi.getDevUsers()
    if (res.data?.users) {
      devUsers.value = res.data.users
      if (devUsers.value.length > 0) {
        selectedDevUserId.value = devUsers.value[0].id
      }
    }
  } catch {
    // Em produção ou indisponível, devUsers permanece vazio
  }
})

async function handleSubmit() {
  errorMsg.value = ''
  try {
    await authStore.login(form.value)
    router.push('/feed')
  } catch (err: any) {
    errorMsg.value =
      err.response?.data?.message ||
      'Credenciais inválidas. Tente novamente.'
  }
}

async function handleDevLogin() {
  if (!selectedDevUserId.value) return
  errorMsg.value = ''
  isLoggingInDev.value = true
  try {
    await authStore.impersonate({ user_id: Number(selectedDevUserId.value) })
    router.push('/feed')
  } catch (err: any) {
    errorMsg.value =
      err.response?.data?.message ||
      'Erro ao realizar login via impersonate.'
  } finally {
    isLoggingInDev.value = false
  }
}
</script>

<template>
  <GuestShell>
    <div class="auth-wrapper">
      <!-- Welcome Card -->
      <div class="retro-box">
        <div class="retro-header-center">
          ★ Bem-vindo ao CapiHouse ★
        </div>
        <div class="welcome-body">
          <img src="/capihouse-logo.png" alt="CapiHouse" class="auth-logo" />
          <h1 class="welcome-title">Entrar</h1>
          <p class="welcome-subtitle">A rede social dos amigos da casa.</p>
        </div>
      </div>

      <!-- Login Form Card -->
      <div class="retro-box">
        <div class="retro-header-left">
          » Acessar conta
        </div>
        <div class="form-body">
          <div v-if="errorMsg" class="error-banner">
            {{ errorMsg }}
          </div>

          <form @submit.prevent="handleSubmit" class="login-form">
            <!-- Email / Username -->
            <div class="form-group">
              <label for="login" class="form-label">
                Email ou usuário
              </label>
              <input
                id="login"
                v-model="form.login"
                type="text"
                required
                autofocus
                autocomplete="username"
                class="retro-field"
                placeholder="seu.usuario ou email"
              />
            </div>

            <!-- Password -->
            <div class="form-group">
              <label for="password" class="form-label">
                Senha
              </label>
              <div class="password-input-wrapper">
                <input
                  id="password"
                  v-model="form.password"
                  :type="showPassword ? 'text' : 'password'"
                  required
                  autocomplete="current-password"
                  class="retro-field"
                />
                <button
                  type="button"
                  class="password-toggle-btn"
                  @click="showPassword = !showPassword"
                  :title="showPassword ? 'Ocultar senha' : 'Ver senha'"
                  :aria-label="showPassword ? 'Ocultar senha' : 'Ver senha'"
                  tabindex="-1"
                >
                  <svg v-if="!showPassword" xmlns="http://www.w3.org/2000/svg" class="eye-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <svg v-else xmlns="http://www.w3.org/2000/svg" class="eye-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                  </svg>
                </button>
              </div>
            </div>

            <!-- Remember Me -->
            <div class="remember-row">
              <label class="remember-label">
                <input
                  type="checkbox"
                  v-model="form.remember"
                  class="retro-checkbox"
                />
                <span>Manter logado</span>
              </label>
            </div>

            <!-- Submit Button -->
            <button
              type="submit"
              class="retro-submit-btn"
              :disabled="authStore.isLoading"
            >
              <span v-if="authStore.isLoading">[ Entrando... ]</span>
              <span v-else>[ Entrar ]</span>
            </button>
          </form>
        </div>
      </div>

      <!-- Dev Impersonate Quick Login Card (Apenas em ambiente local/desenvolvimento) -->
      <div v-if="devUsers.length > 0" class="retro-box dev-box">
        <div class="retro-header-center dev-header">
          ⚡ Personificar / Teste Local ({{ devUsers.length }} usuários)
        </div>
        <div class="form-body">
          <p class="dev-desc">
            Selecione qualquer usuário de teste local para logar sem precisar digitar senha:
          </p>
          <div class="form-group">
            <select v-model="selectedDevUserId" class="retro-field dev-select">
              <option v-for="u in devUsers" :key="u.id" :value="u.id">
                {{ u.name }} (@{{ u.username }}) — [{{ u.role === 'admin' ? 'ADMIN' : 'USUÁRIO' }} | {{ u.status.toUpperCase() }}]
              </option>
            </select>
          </div>
          <button
            type="button"
            @click="handleDevLogin"
            class="retro-submit-btn dev-btn"
            :disabled="isLoggingInDev || !selectedDevUserId"
          >
            <span v-if="isLoggingInDev">[ Entrando... ]</span>
            <span v-else>🎭 [ Entrar como Selecionado ]</span>
          </button>
        </div>
      </div>

      <!-- Register Link Footer -->
      <div class="auth-footer">
        Ainda não tem conta?
        <router-link to="/register" class="register-link">
          Registrar
        </router-link>
      </div>
    </div>
  </GuestShell>
</template>

<style scoped>
.auth-wrapper {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  width: 100%;
}

.retro-box {
  border: 2px solid var(--color-primary, #a66130);
  background-color: #ffffff;
  overflow: hidden;
  border-radius: 2px;
}

.retro-header-center {
  background-color: var(--color-primary, #a66130);
  color: #ffffff;
  padding: 0.5rem 1rem;
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-align: center;
  text-transform: uppercase;
}

.retro-header-left {
  background-color: var(--color-primary, #a66130);
  color: #ffffff;
  padding: 0.5rem 1rem;
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.welcome-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1.75rem 1.5rem;
  background-color: #ffffff;
  text-align: center;
}

.auth-logo {
  width: 7rem;
  height: 7rem;
  object-fit: contain;
}

.welcome-title {
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-primary-800, #5f4120);
  margin-top: 0.25rem;
}

.welcome-subtitle {
  font-size: 0.875rem;
  color: var(--color-primary-600, #9a6a32);
}

.form-body {
  padding: 1.5rem;
  background-color: #ffffff;
}

.error-banner {
  margin-bottom: 1rem;
  padding: 0.5rem 0.75rem;
  background-color: #fee2e2;
  border: 1px solid #ef4444;
  color: #b91c1c;
  font-size: 0.8rem;
  border-radius: 2px;
  text-align: center;
}

.login-form {
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
  font-family: var(--font-body, 'Outfit', sans-serif);
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--color-primary-800, #5f4120);
}

.retro-field {
  width: 100%;
  padding: 0.55rem 0.75rem;
  font-size: 0.9rem;
  font-family: var(--font-body, 'Outfit', sans-serif);
  border: 2px solid var(--color-primary-200, #e8c9a5);
  background-color: var(--color-primary-50, #f8f6f1);
  color: #222222;
  border-radius: 2px;
  outline: none;
  transition: border-color 0.15s ease-in-out;
}

.retro-field:focus {
  border-color: var(--color-primary-400, #c4884e);
}

.remember-row {
  display: flex;
  justify-content: flex-end;
  margin-top: -0.25rem;
}

.remember-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: var(--color-primary-800, #5f4120);
  cursor: pointer;
  user-select: none;
}

.retro-checkbox {
  accent-color: var(--color-primary, #a66130);
  width: 1rem;
  height: 1rem;
  cursor: pointer;
}

.retro-submit-btn {
  width: 100%;
  padding: 0.75rem 1rem;
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 0.9rem;
  font-weight: 700;
  color: #ffffff;
  background-color: var(--color-primary, #a66130);
  border: none;
  border-radius: 2px;
  cursor: pointer;
  transition: background-color 0.15s ease-in-out;
  text-align: center;
}

.retro-submit-btn:hover:not(:disabled) {
  background-color: var(--color-primary-600, #9a6a32);
}

.retro-submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.auth-footer {
  text-align: center;
  font-size: 0.875rem;
  color: var(--color-primary-700, #7d5628);
}

.register-link {
  font-weight: 700;
  text-decoration: underline;
  color: var(--color-primary-800, #5f4120);
  margin-left: 0.25rem;
}

.register-link:hover {
  color: var(--color-primary-600, #9a6a32);
}

.dev-box {
  border-color: #ca8a04;
}

.dev-header {
  background-color: #ca8a04;
  color: #ffffff;
}

.dev-desc {
  font-size: 0.8rem;
  color: #713f12;
  margin-bottom: 0.75rem;
}

.dev-select {
  border-color: #fde047;
  background-color: #fefce8;
  font-size: 0.82rem;
  width: 100%;
}

.dev-btn {
  background-color: #ca8a04;
  margin-top: 0.75rem;
}

.dev-btn:hover:not(:disabled) {
  background-color: #a16207;
}
</style>
