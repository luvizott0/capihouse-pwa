<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useFeedStore } from '@/stores/feed'
import type { Post } from '@/types/models'
import PostCard from '@/components/feed/PostCard.vue'
import LetterboxdCard from '@/components/entertainment/LetterboxdCard.vue'
import RetroButton from '@/components/ui/RetroButton.vue'

const route = useRoute()
const router = useRouter()
const feedStore = useFeedStore()

const postId = computed(() => Number(route.params.id))
const post = computed<Post | undefined>(() => {
  return feedStore.posts.find(p => p.id === postId.value)
})

const isLoading = ref(true)
const errorMsg = ref('')

async function loadPost() {
  if (!postId.value || isNaN(postId.value)) {
    errorMsg.value = 'Publicação inválida.'
    isLoading.value = false
    return
  }

  isLoading.value = true
  errorMsg.value = ''
  try {
    await feedStore.fetchSinglePost(postId.value)
  } catch (err: any) {
    if (err.response?.status === 403) {
      errorMsg.value = 'Você não tem permissão para visualizar esta publicação.'
    } else if (err.response?.status === 404) {
      errorMsg.value = 'Esta publicação não foi encontrada ou foi excluída.'
    } else {
      errorMsg.value = 'Não foi possível carregar a publicação.'
    }
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  loadPost()
})

watch(
  () => route.params.id,
  () => {
    loadPost()
  }
)

function handleBack() {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/feed')
  }
}

function handlePostDeleted() {
  router.push('/feed')
}
</script>

<template>
  <div class="post-detail-container">
    <!-- Standardized Header Line -->
    <div class="post-detail-header">
      <div class="header-content">
        <button
          type="button"
          class="back-btn"
          @click="handleBack"
          title="Voltar à tela anterior"
        >
          [ ← Voltar ]
        </button>
        <h2 class="post-detail-title">» Publicação em destaque</h2>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="loading-state">
      Carregando publicação...
    </div>

    <!-- Error / Not Found State -->
    <div v-else-if="errorMsg || !post" class="empty-detail-card">
      <img src="/capihouse-logo.png" alt="Capivara" class="empty-capivara-logo" />
      <h3 class="empty-title">Publicação indisponível</h3>
      <p class="empty-subtitle">{{ errorMsg || 'Não foi possível encontrar este post.' }}</p>
      <RetroButton @click="handleBack">
        ← Voltar
      </RetroButton>
    </div>

    <!-- Post Highlight Card -->
    <div v-else class="post-wrapper">
      <LetterboxdCard
        v-if="post.category === 'entertainment'"
        :post="post"
        :default-show-comments="true"
        @deleted="handlePostDeleted"
      />
      <PostCard
        v-else
        :post="post"
        :default-show-comments="true"
        @deleted="handlePostDeleted"
      />
    </div>
  </div>
</template>

<style scoped>
.post-detail-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* Standardized primary header with white text */
.post-detail-header {
  background-color: var(--color-primary, #a66130);
  border: 1px solid var(--color-primary-800, #5f4120);
  border-radius: 2px;
  padding: 0.6rem 0.85rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.header-content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.post-detail-title {
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 1.05rem;
  font-weight: 700;
  color: #ffffff;
  margin: 0;
}

.back-btn {
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.4);
  color: #ffffff;
  border-radius: 2px;
  padding: 0.25rem 0.55rem;
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.25);
  border-color: #ffffff;
}

.loading-state {
  text-align: center;
  padding: 2.5rem;
  font-family: var(--font-heading, 'Space Mono', monospace);
  color: var(--color-muted, #847062);
  background-color: #ffffff;
  border: 1px solid var(--color-border, #D8CDC5);
  border-radius: 2px;
}

.empty-detail-card {
  text-align: center;
  padding: 3rem 1.5rem;
  background-color: #ffffff;
  border: 1px solid var(--color-border, #D8CDC5);
  border-radius: 2px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.6rem;
}

.empty-capivara-logo {
  width: 54px;
  height: 54px;
  opacity: 0.6;
}

.empty-title {
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 1.1rem;
  color: var(--color-primary-800, #5f4120);
  margin: 0;
}

.empty-subtitle {
  font-size: 0.85rem;
  color: var(--color-muted, #847062);
  margin: 0 0 0.5rem 0;
  max-width: 400px;
}

.post-wrapper {
  animation: fadeIn 0.2s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
