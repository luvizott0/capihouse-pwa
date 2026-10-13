<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import UserAvatar from '@/components/ui/UserAvatar.vue'
import type { CapyActivity } from '@/stores/entertainment'

const props = defineProps<{
  activity: CapyActivity
}>()

const router = useRouter()

const posterUrl = computed(() => {
  const p = props.activity.series.poster_url
  if (!p) return null
  if (p.startsWith('http://') || p.startsWith('https://')) return p
  return `https://image.tmdb.org/t/p/w300${p}`
})

function formatEpCode(season: number, ep: number): string {
  const s = String(season).padStart(2, '0')
  const e = String(ep).padStart(2, '0')
  return `S${s}E${e}`
}

function openCapyShowTime() {
  window.open(`https://bmo.tailf56388.ts.net:8443/series/${props.activity.series.tmdb_id}`, '_blank')
}

function goToUserProfile() {
  if (props.activity.user?.username) {
    router.push(`/users/${props.activity.user.username}`)
  }
}
</script>

<template>
  <article class="series-activity-card">
    <!-- Header do Usuário -->
    <div class="card-header">
      <div class="user-info" @click="goToUserProfile">
        <UserAvatar :user="activity.user" size="sm" />
        <div class="user-meta">
          <span class="user-name">{{ activity.user.name }}</span>
          <span class="activity-time">{{ activity.watched_at }}</span>
        </div>
      </div>
      <div class="header-badges">
        <span v-if="activity.type === 'completed'" class="type-tag completed">
          🏆 Concluiu a série
        </span>
        <span v-else-if="activity.type === 'comment'" class="type-tag comment">
          💬 Comentou
        </span>
        <span v-else-if="activity.rating" class="type-tag rating">
          ⭐ Avaliou
        </span>
        <span class="platform-badge" title="Atividade registrada no CapyShowTime">
          📺 CapyShowTime
        </span>
      </div>
    </div>

    <!-- Conteúdo da Série / Episódio -->
    <div class="card-body">
      <div class="poster-wrapper" @click="openCapyShowTime">
        <img
          v-if="posterUrl"
          :src="posterUrl"
          :alt="activity.series.name"
          class="series-poster"
          loading="lazy"
        />
        <div v-else class="poster-placeholder">
          🎬
        </div>
      </div>

      <div class="activity-details">
        <div class="series-headline">
          <h4 class="series-name" @click="openCapyShowTime">
            {{ activity.series.name }}
          </h4>
        </div>

        <!-- Série Concluída -->
        <div v-if="activity.type === 'completed'" class="completed-headline">
          <span class="completed-pill">🏆 Concluiu todas as temporadas!</span>
          <span v-if="activity.series.number_of_seasons" class="seasons-count">
            {{ activity.series.number_of_seasons }} temp.
          </span>
        </div>

        <!-- Episódio (para avaliação ou comentário) -->
        <div v-else-if="activity.episode" class="episode-box">
          <span class="ep-badge">
            {{ formatEpCode(activity.episode.season_number, activity.episode.episode_number) }}
          </span>
          <span class="ep-name">{{ activity.episode.name }}</span>
        </div>

        <!-- Comentário em Episódio -->
        <div v-if="activity.comment" class="comment-box">
          <span v-if="activity.comment.is_spoiler" class="spoiler-badge">⚠️ Contém Spoiler</span>
          <p class="comment-content">“{{ activity.comment.content }}”</p>
        </div>

        <div class="card-footer-meta">
          <div v-if="activity.rating" class="rating-badge">
            <span class="star-icon">⭐</span>
            <span class="rating-value">{{ Number(activity.rating).toFixed(1) }}</span>
          </div>
          <div v-else-if="activity.type === 'comment'" class="meta-tag comment-meta">
            💬 Comentário
          </div>
          <div v-else-if="activity.type === 'completed'" class="meta-tag completed-meta">
            🏆 Série Finalizada
          </div>

          <button
            type="button"
            class="view-series-btn"
            title="Ver no CapyShowTime"
            @click="openCapyShowTime"
          >
            Abrir série ↗
          </button>
        </div>
      </div>
    </div>
  </article>
</template>

<style scoped>
.series-activity-card {
  background-color: var(--color-surface, #fff);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-sm, 6px);
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 2px 2px 0 var(--color-border);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.series-activity-card:hover {
  transform: translateY(-1px);
  box-shadow: 3px 3px 0 var(--color-border);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px dashed var(--color-border);
}

.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}

.user-meta {
  display: flex;
  flex-direction: column;
}

.user-name {
  font-weight: 700;
  font-size: 0.95rem;
  color: var(--color-text-main, inherit);
}

.activity-time {
  font-size: 0.75rem;
  color: var(--color-text-muted, #888);
}

.platform-badge {
  font-family: var(--font-heading, monospace);
  font-size: 0.7rem;
  padding: 3px 8px;
  border-radius: 999px;
  background-color: var(--color-primary-100, #fef3c7);
  color: var(--color-primary-900, #92400e);
  font-weight: 600;
  border: 1px solid var(--color-primary-300, #fcd34d);
}

.card-body {
  display: flex;
  gap: 14px;
}

.poster-wrapper {
  flex-shrink: 0;
  width: 72px;
  height: 108px;
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid var(--color-border);
  background-color: var(--color-surface-sunken, #f3f4f6);
  cursor: pointer;
}

.series-poster {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.2s ease;
}

.poster-wrapper:hover .series-poster {
  transform: scale(1.05);
}

.poster-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
}

.activity-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.series-headline {
  margin-bottom: 6px;
}

.series-name {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--color-text-main, inherit);
  cursor: pointer;
  line-height: 1.3;
}

.series-name:hover {
  text-decoration: underline;
  color: var(--color-primary, #d97706);
}

.episode-box {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  font-size: 0.88rem;
  color: var(--color-text-main, inherit);
}

.ep-badge {
  font-family: var(--font-heading, monospace);
  font-weight: 700;
  font-size: 0.78rem;
  background-color: var(--color-surface-sunken, #e5e7eb);
  color: var(--color-text-main, inherit);
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid var(--color-border);
}

.ep-name {
  font-size: 0.85rem;
  color: var(--color-text-muted, #666);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 220px;
}

.card-footer-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: auto;
}

.rating-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background-color: #fef08a;
  color: #854d0e;
  padding: 3px 8px;
  border-radius: 4px;
  font-family: var(--font-heading, monospace);
  font-weight: 700;
  font-size: 0.85rem;
  border: 1px solid #facc15;
}

.header-badges {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.type-tag {
  font-family: var(--font-heading, monospace);
  font-size: 0.7rem;
  padding: 2px 7px;
  border-radius: 999px;
  font-weight: 700;
}

.type-tag.completed {
  background-color: #dcfce7;
  color: #15803d;
  border: 1px solid #86efac;
}

.type-tag.comment {
  background-color: #dbeafe;
  color: #1d4ed8;
  border: 1px solid #93c5fd;
}

.type-tag.rating {
  background-color: #fef08a;
  color: #854d0e;
  border: 1px solid #facc15;
}

.completed-headline {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.completed-pill {
  font-size: 0.8rem;
  font-weight: 700;
  color: #15803d;
  background-color: #dcfce7;
  border: 1px solid #86efac;
  padding: 2px 8px;
  border-radius: 4px;
}

.seasons-count {
  font-size: 0.78rem;
  color: var(--color-text-muted, #666);
  font-family: var(--font-heading, monospace);
}

.comment-box {
  background-color: rgba(245, 158, 11, 0.07);
  border-left: 3px solid #f59e0b;
  padding: 8px 12px;
  border-radius: 0 4px 4px 0;
  margin-bottom: 10px;
}

.spoiler-badge {
  display: inline-block;
  font-size: 0.68rem;
  font-weight: 700;
  color: #b45309;
  background-color: #fef3c7;
  padding: 1px 5px;
  border-radius: 3px;
  margin-bottom: 4px;
}

.comment-content {
  font-size: 0.82rem;
  color: var(--color-text-main, inherit);
  font-style: italic;
  margin: 0;
  line-height: 1.35;
}

.meta-tag {
  font-size: 0.78rem;
  font-weight: 700;
}

.comment-meta {
  color: #2563eb;
}

.completed-meta {
  color: #16a34a;
}

.view-series-btn {
  background: none;
  border: none;
  font-size: 0.8rem;
  color: var(--color-primary, #b45309);
  font-weight: 600;
  cursor: pointer;
  padding: 2px 6px;
}

.view-series-btn:hover {
  text-decoration: underline;
}
</style>
