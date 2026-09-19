<script setup lang="ts">
import { computed } from 'vue'
import type { Post } from '@/types/models'
import { parseRecapData } from '@/utils/recap'
import { getInitials } from '@/utils/initials'

const props = defineProps<{
  post: Post
}>()

const recap = computed(() => parseRecapData(props.post))

const podiumColors = [
  { bg: '#FEF3C7', border: '#F59E0B', medal: '🥇' }, // Ouro
  { bg: '#F1F5F9', border: '#94A3B8', medal: '🥈' }, // Prata
  { bg: '#FFEDD5', border: '#F97316', medal: '🥉' }, // Bronze
]
</script>

<template>
  <div class="recap-feed-card">
    <!-- Moldura Interna Vintage -->
    <div class="recap-inner-frame">
      <!-- Cantos Decorativos -->
      <span class="corner-accent corner-tl"></span>
      <span class="corner-accent corner-tr"></span>
      <span class="corner-accent corner-bl"></span>
      <span class="corner-accent corner-br"></span>

      <!-- 1. Cabeçalho / Branding -->
      <div class="recap-header">
        <div class="recap-tag-pill">🐾 CAPIHOUSE • RECAP</div>
        <h2 class="recap-title">RECAP DE SENTIMENTOS</h2>
        <div class="recap-subtitle">• {{ recap.monthYear.full }} •</div>
      </div>

      <!-- 2. Cartão do Usuário -->
      <div class="recap-user-box">
        <div class="user-avatar-wrapper">
          <img
            v-if="recap.targetUser.avatar_url"
            :src="recap.targetUser.avatar_url"
            :alt="recap.targetUser.name"
            class="user-avatar-img"
          />
          <div v-else class="user-avatar-initials">
            {{ getInitials(recap.targetUser.name) }}
          </div>
        </div>
        <div class="user-info">
          <span class="user-name">{{ recap.targetUser.name }}</span>
          <router-link
            :to="`/profile/${recap.targetUser.username}`"
            class="user-handle"
            @click.stop
          >
            @{{ recap.targetUser.username }}
          </router-link>
        </div>
      </div>

      <!-- 3. Seção 1: Jornada de Sentimentos -->
      <div class="recap-section-box">
        <div class="section-title">📜 JORNADA DE SENTIMENTOS NO MÊS</div>
        <div class="section-divider"></div>
        <div class="emoji-stream">
          <span
            v-for="(emoji, index) in recap.emojiJourney"
            :key="index"
            class="stream-emoji"
          >
            {{ emoji }}
          </span>
        </div>
      </div>

      <!-- 4. Seção 2: Pódio dos Sentimentos Mais Frequentes -->
      <div class="recap-section-box">
        <div class="section-title">🏆 SENTIMENTOS MAIS FREQUENTES</div>
        <div class="section-divider"></div>
        <div class="podium-list">
          <div
            v-for="(item, index) in recap.podium.slice(0, 3)"
            :key="index"
            class="podium-card"
            :style="{
              backgroundColor: podiumColors[index]?.bg || '#FEF3C7',
              borderColor: podiumColors[index]?.border || '#F59E0B',
            }"
          >
            <div class="podium-left">
              <span class="podium-medal">{{ item.medal }}</span>
              <span class="podium-emoji">{{ item.emoji }}</span>
              <span v-if="item.name" class="podium-word" :title="item.name">{{ item.name }}</span>
            </div>
            <div class="podium-count">{{ item.count }}</div>
          </div>
        </div>
      </div>

      <!-- 5. Rodapé Minimalista com Patinha -->
      <div class="recap-footer">
        • 🐾 •
      </div>
    </div>
  </div>
</template>

<style scoped>
.recap-feed-card {
  width: 100%;
  background: linear-gradient(180deg, #faf5ed 0%, #f5ede1 50%, #efe4d4 100%);
  border: 4px solid #7d4720;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  padding: 6px;
  box-sizing: border-box;
  margin: 0.5rem 0;
}

.recap-inner-frame {
  position: relative;
  border: 2px solid #d4a373;
  border-radius: 10px;
  padding: 1.5rem 1rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 1.15rem;
}

/* Cantos decorativos estilo retrô */
.corner-accent {
  position: absolute;
  width: 10px;
  height: 10px;
  background-color: #7d4720;
}
.corner-tl { top: -2px; left: -2px; }
.corner-tr { top: -2px; right: -2px; }
.corner-bl { bottom: -2px; left: -2px; }
.corner-br { bottom: -2px; right: -2px; }

/* 1. Cabeçalho */
.recap-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 0.35rem;
}

.recap-tag-pill {
  background-color: #7d4720;
  color: #faf5ed;
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 0.72rem;
  font-weight: 700;
  padding: 0.25rem 0.85rem;
  border-radius: 6px;
  letter-spacing: 0.04em;
}

.recap-title {
  margin: 0.2rem 0 0;
  color: #7d4720;
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 1.25rem;
  font-weight: 900;
  letter-spacing: -0.01em;
}

.recap-subtitle {
  color: #a66130;
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 0.85rem;
  font-weight: 700;
}

/* 2. Cartão do Usuário */
.recap-user-box {
  background-color: #ffffff;
  border: 1.5px solid #e2d3c0;
  border-radius: 12px;
  padding: 0.75rem 1rem;
  display: flex;
  align-items: center;
  gap: 0.85rem;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.03);
}

.user-avatar-wrapper {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: 3px solid #7d4720;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #a66130;
  flex-shrink: 0;
}

.user-avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.user-avatar-initials {
  color: #ffffff;
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 1.15rem;
  font-weight: bold;
}

.user-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.user-name {
  color: #2d1f17;
  font-family: var(--font-heading, 'Space Mono', sans-serif);
  font-size: 1.05rem;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-handle {
  color: #a66130;
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 0.82rem;
  font-weight: bold;
  text-decoration: none;
}
.user-handle:hover {
  text-decoration: underline;
}

/* 3. Seções */
.recap-section-box {
  background-color: #fffdf9;
  border: 1.5px solid #e2d3c0;
  border-radius: 12px;
  padding: 0.85rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.03);
}

.section-title {
  color: #7d4720;
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 0.78rem;
  font-weight: bold;
  letter-spacing: 0.02em;
}

.section-divider {
  width: 100%;
  height: 1.5px;
  background-color: #efe4d4;
}

/* Fluxo de emojis */
.emoji-stream {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.45rem 0.55rem;
  padding: 0.35rem 0;
}

.stream-emoji {
  font-size: 1.5rem;
  line-height: 1.2;
  transition: transform 0.15s ease;
}
.stream-emoji:hover {
  transform: scale(1.25);
}

/* Pódio (Top 3) */
.podium-list {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.podium-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.6rem 0.85rem;
  border-radius: 10px;
  border-width: 1.5px;
  border-style: solid;
  white-space: nowrap;
  gap: 0.5rem;
  min-width: 0;
}

.podium-left {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  min-width: 0;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
}

.podium-medal {
  font-size: 1.35rem;
  line-height: 1;
  flex-shrink: 0;
}

.podium-emoji {
  font-size: 1.55rem;
  line-height: 1;
  flex-shrink: 0;
}

.podium-word {
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 0.92rem;
  font-weight: 700;
  color: #7d4720;
  white-space: nowrap;
  word-break: keep-all;
  overflow-wrap: normal;
  letter-spacing: -0.02em;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-shrink: 1;
  min-width: 0;
}

.podium-count {
  color: #7d4720;
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 0.95rem;
  font-weight: 700;
  flex-shrink: 0;
  white-space: nowrap;
  background-color: rgba(125, 71, 32, 0.08);
  padding: 0.15rem 0.45rem;
  border-radius: 6px;
  line-height: 1.2;
}

/* 5. Rodapé Minimalista */
.recap-footer {
  text-align: center;
  color: #b08865;
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 0.85rem;
  margin-top: -0.25rem;
}

@media (max-width: 640px) {
  .recap-feed-card {
    padding: 4px;
    border-width: 3px;
    border-radius: 12px;
  }
  .recap-inner-frame {
    padding: 1rem 0.65rem 0.75rem;
    gap: 0.85rem;
  }
  .recap-section-box {
    padding: 0.65rem 0.65rem;
  }
  .podium-card {
    padding: 0.5rem 0.6rem;
    gap: 0.35rem;
  }
  .podium-left {
    gap: 0.35rem;
  }
  .podium-medal {
    font-size: 1.2rem;
  }
  .podium-emoji {
    font-size: 1.35rem;
  }
  .podium-word {
    font-size: 0.82rem;
    letter-spacing: -0.025em;
  }
  .podium-count {
    font-size: 0.88rem;
    padding: 0.12rem 0.35rem;
  }
}

@media (max-width: 480px) {
  .recap-title {
    font-size: 1.05rem;
  }
  .stream-emoji {
    font-size: 1.3rem;
  }
  .recap-inner-frame {
    padding: 0.85rem 0.5rem 0.65rem;
    gap: 0.75rem;
  }
  .recap-section-box {
    padding: 0.6rem 0.5rem;
    gap: 0.45rem;
  }
  .podium-card {
    padding: 0.45rem 0.5rem;
    gap: 0.3rem;
  }
  .podium-left {
    gap: 0.3rem;
  }
  .podium-medal {
    font-size: 1.1rem;
  }
  .podium-emoji {
    font-size: 1.25rem;
  }
  .podium-word {
    font-size: 0.78rem;
    letter-spacing: -0.03em;
  }
  .podium-count {
    font-size: 0.82rem;
    padding: 0.1rem 0.3rem;
  }
}

@media (max-width: 360px) {
  .recap-inner-frame {
    padding: 0.75rem 0.35rem 0.5rem;
  }
  .recap-section-box {
    padding: 0.5rem 0.35rem;
  }
  .podium-card {
    padding: 0.35rem 0.4rem;
    gap: 0.2rem;
  }
  .podium-left {
    gap: 0.2rem;
  }
  .podium-medal {
    font-size: 1rem;
  }
  .podium-emoji {
    font-size: 1.15rem;
  }
  .podium-word {
    font-size: 0.7rem;
    letter-spacing: -0.035em;
  }
  .podium-count {
    font-size: 0.75rem;
    padding: 0.08rem 0.25rem;
  }
}
</style>
