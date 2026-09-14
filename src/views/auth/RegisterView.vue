<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import GuestShell from '@/components/layout/GuestShell.vue'

const authStore = useAuthStore()

const form = ref({
  name: '',
  username: '',
  email: '',
  password: '',
  password_confirmation: '',
})

const errorMsg = ref('')
const successMsg = ref(false)

async function handleSubmit() {
  errorMsg.value = ''
  try {
    await authStore.register(form.value)
    successMsg.value = true
  } catch (err: any) {
    errorMsg.value =
      err.response?.data?.message ||
      'Erro ao solicitar registro. Verifique os dados inseridos.'
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
          <h1 class="welcome-title">Criar conta</h1>
          <p class="welcome-subtitle">A rede social dos amigos da casa.</p>
        </div>
      </div>

      <!-- Success Card -->
      <div v-if="successMsg" class="retro-box success-box">
        <div class="retro-header-center success-header">
          ✓ Pedido enviado!
        </div>
        <div class="form-body success-body">
          <p class="success-message">
            Seu pedido foi enviado ao administrador. Em breve você receberá uma resposta.
          </p>
          <div class="login-return-container">
            <router-link to="/login" class="register-link">
              Voltar ao login
            </router-link>
          </div>
        </div>
      </div>

      <!-- Register Form Card -->
      <div v-else class="retro-box">
        <div class="retro-header-left">
          » Criar nova conta
        </div>
        <div class="form-body">
          <div v-if="errorMsg" class="error-banner">
            {{ errorMsg }}
          </div>

          <form @submit.prevent="handleSubmit" class="register-form">
            <!-- Name -->
            <div class="form-group">
              <label for="name" class="form-label">
                Nome completo
              </label>
              <input
                id="name"
                v-model="form.name"
                type="text"
                required
                autofocus
                autocomplete="name"
                class="retro-field"
                placeholder="Ex: Capivara Silva"
              />
            </div>

            <!-- Username -->
            <div class="form-group">
              <label for="username" class="form-label">
                Nome de usuário
              </label>
              <input
                id="username"
                v-model="form.username"
                type="text"
                required
                autocomplete="username"
                class="retro-field"
                placeholder="Ex: capivara.silva"
              />
            </div>

            <!-- Email -->
            <div class="form-group">
              <label for="email" class="form-label">
                Email
              </label>
              <input
                id="email"
                v-model="form.email"
                type="email"
                required
                autocomplete="email"
                class="retro-field"
                placeholder="seu.email@exemplo.com"
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
                autocomplete="new-password"
                class="retro-field"
              />
            </div>

            <!-- Password Confirmation -->
            <div class="form-group">
              <label for="password_confirmation" class="form-label">
                Confirmar senha
              </label>
              <input
                id="password_confirmation"
                v-model="form.password_confirmation"
                type="password"
                required
                autocomplete="new-password"
                class="retro-field"
              />
            </div>

            <!-- Submit Button -->
            <button
              type="submit"
              class="retro-submit-btn"
              :disabled="authStore.isLoading"
            >
              <span v-if="authStore.isLoading">[ Solicitando... ]</span>
              <span v-else>[ Solicitar registro ]</span>
            </button>
          </form>
        </div>
      </div>

      <!-- Login Link Footer -->
      <div v-if="!successMsg" class="auth-footer">
        Já tem uma conta?
        <router-link to="/login" class="register-link">
          Entrar
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

.success-box {
  border-color: #22c55e;
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

.success-header {
  background-color: #22c55e;
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

.success-body {
  text-align: center;
}

.success-message {
  font-size: 0.875rem;
  color: #15803d;
  line-height: 1.5;
}

.login-return-container {
  margin-top: 1rem;
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

.register-form {
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
