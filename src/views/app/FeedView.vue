<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useFeedStore } from '@/stores/feed'
import { useAuthStore } from '@/stores/auth'
import PostCard from '@/components/feed/PostCard.vue'
import PostCreateModal from '@/components/feed/PostCreateModal.vue'
import UserAvatar from '@/components/ui/UserAvatar.vue'

const feedStore = useFeedStore()
const authStore = useAuthStore()

const showCreateModal = ref(false)

onMounted(() => {
  feedStore.fetchPosts()
})
</script>

<template>
  <div class="feed-view-container">
    <!-- Quick Create Post Box -->
    <div class="quick-post-card" @click="showCreateModal = true">
      <div class="quick-post-row">
        <UserAvatar v-if="authStore.user" :user="authStore.user" size="sm" />
        <div class="fake-input">
          No que você está pensando, Capivara?
        </div>
      </div>
      <div class="quick-actions-row">
        <div class="quick-actions-left">
          <button type="button" class="quick-action-btn" @click.stop="showCreateModal = true">
            <span class="action-icon">📷</span>
            <span class="action-text-full">Anexar foto</span>
            <span class="action-text-short">Foto</span>
          </button>
          <button type="button" class="quick-action-btn" @click.stop="showCreateModal = true">
            <span class="action-icon">😊</span>
            <span>Sentimento</span>
          </button>
        </div>
        <button type="button" class="quick-publish-btn" @click.stop="showCreateModal = true">
          [ Criar post ]
        </button>
      </div>
    </div>

    <!-- Feed Header Title -->
    <div class="feed-header-line">
      <h2 class="feed-title">» Publicações recentes</h2>
      <button type="button" class="refresh-btn" @click="feedStore.fetchPosts(1)">
        [ Atualizar ]
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="feedStore.isLoading && feedStore.posts.length === 0" class="loading-state">
      Carregando publicações...
    </div>

    <!-- Posts List -->
    <div v-else-if="feedStore.posts.length" class="posts-stream">
      <PostCard
        v-for="post in feedStore.posts"
        :key="post.id"
        :post="post"
      />
    </div>

    <!-- Empty State -->
    <div v-else class="empty-feed-card">
      <img src="/capihouse-logo.png" alt="Capivara" class="empty-capivara-logo" />
      <h3 class="empty-title">Nenhuma publicação ainda</h3>
      <p class="empty-subtitle">Seja o primeiro a compartilhar algo com os amigos da casa!</p>
      <button type="button" class="empty-create-btn" @click="showCreateModal = true">
        [ Criar primeira publicação ]
      </button>
    </div>

    <!-- Modal to Create Post -->
    <PostCreateModal
      v-model="showCreateModal"
      @created="feedStore.fetchPosts(1)"
    />
  </div>
</template>

<style scoped>
.feed-view-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.quick-post-card {
  background-color: #ffffff;
  border: 2px solid var(--color-border, #D8CDC5);
  border-radius: 2px;
  padding: 0.75rem 1rem;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  transition: border-color 0.15s ease;
}
.quick-post-card:hover {
  border-color: var(--color-primary-400, #c4884e);
}

.quick-post-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.fake-input {
  flex: 1;
  padding: 0.5rem 0.75rem;
  font-size: 0.85rem;
  font-family: var(--font-body);
  color: var(--color-muted);
  background-color: var(--color-primary-50, #f8f6f1);
  border: 1px solid var(--color-border);
  border-radius: 2px;
}

.quick-actions-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  border-top: 1px solid var(--color-primary-100);
  padding-top: 0.5rem;
}

.quick-actions-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
}

.quick-action-btn {
  background: none;
  border: 1px solid transparent;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.78rem;
  color: var(--color-primary-800);
  font-family: var(--font-heading);
  cursor: pointer;
  white-space: nowrap;
  padding: 0.25rem 0.4rem;
  transition: all 0.15s ease;
}
.quick-action-btn:hover {
  background-color: var(--color-primary-50, #f8f6f1);
  border-color: var(--color-border);
}

.action-icon {
  font-size: 0.95rem;
  line-height: 1;
  display: inline-flex;
  align-items: center;
}

.action-text-short {
  display: none;
}
.action-text-full {
  display: inline;
}

@media (max-width: 480px) {
  .action-text-full {
    display: none;
  }
  .action-text-short {
    display: inline;
  }
}

.quick-publish-btn {
  background-color: var(--color-primary);
  color: white;
  border: none;
  font-family: var(--font-heading);
  font-size: 0.8rem;
  font-weight: bold;
  padding: 0.35rem 0.65rem;
  border-radius: 2px;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition: background-color 0.15s ease;
}
.quick-publish-btn:hover {
  background-color: var(--color-primary-600);
}

.feed-header-line {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.25rem;
}

.feed-title {
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 1.1rem;
  color: var(--color-primary-800, #5f4120);
}

.refresh-btn {
  background: none;
  border: none;
  font-family: var(--font-heading);
  font-size: 0.8rem;
  color: var(--color-primary);
  cursor: pointer;
  font-weight: bold;
}

.loading-state {
  text-align: center;
  padding: 2rem;
  font-family: var(--font-heading);
  color: var(--color-muted);
}

.empty-feed-card {
  background: #ffffff;
  border: 2px solid var(--color-border);
  border-radius: 2px;
  padding: 2.5rem 1rem;
  text-align: center;
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
  font-size: 1.2rem;
  color: var(--color-primary-800);
}

.empty-subtitle {
  font-size: 0.85rem;
  color: var(--color-muted);
  max-width: 320px;
}

.empty-create-btn {
  margin-top: 0.75rem;
  background-color: var(--color-primary);
  color: white;
  border: none;
  font-family: var(--font-heading);
  font-size: 0.85rem;
  font-weight: bold;
  padding: 0.5rem 1rem;
  border-radius: 2px;
  cursor: pointer;
}
.empty-create-btn:hover {
  background-color: var(--color-primary-600);
}
</style>
