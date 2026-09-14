<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import GuestShell from '@/components/layout/GuestShell.vue'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const form = ref({
  login: '',
  password: '',
  remember: false,
})

const errorMsg = ref('')

onMounted(() => {
  if (route.query.notice === 'pending') {
    errorMsg.value = 'A sua conta ainda não foi aprovada pelo administrador. Aguarde a aprovação.'
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
              <input
                id="password"
                v-model="form.password"
                type="password"
                required
                autocomplete="current-password"
                class="retro-field"
              />
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
</style>
