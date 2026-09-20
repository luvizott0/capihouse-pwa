<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Poll, PollOption } from '@/types/models'
import { useFeedStore } from '@/stores/feed'

const props = defineProps<{
  postId: number
  poll: Poll
}>()

const feedStore = useFeedStore()
const isVoting = ref(false)
const votingOptionId = ref<number | null>(null)
const errorMsg = ref('')

const canSeeResults = computed(() => Boolean(props.poll.can_see_results ?? props.poll.has_voted))

async function handleVote(option: PollOption) {
  if (isVoting.value) return
  if (props.poll.has_voted && props.poll.user_voted_option_id === option.id) {
    return // Já está votado nesta opção
  }

  isVoting.value = true
  votingOptionId.value = option.id
  errorMsg.value = ''

  try {
    await feedStore.votePoll(props.postId, option.id)
  } catch (err: any) {
    errorMsg.value = err?.response?.data?.message || 'Erro ao registrar voto. Tente novamente.'
  } finally {
    isVoting.value = false
    votingOptionId.value = null
  }
}
</script>

<template>
  <div class="retro-poll-card">
    <div class="poll-header">
      <div class="poll-title-wrapper">
        <span class="poll-icon">📊</span>
        <span class="poll-badge-label">Votação</span>
      </div>
      <div v-if="poll.question" class="poll-question">
        {{ poll.question }}
      </div>
    </div>

    <div v-if="errorMsg" class="poll-error-banner">
      ⚠️ {{ errorMsg }}
    </div>

    <!-- Options List -->
    <div class="poll-options-list">
      <div
        v-for="option in poll.options"
        :key="option.id"
        class="poll-option-item"
        :class="{
          'is-voted-mine': poll.has_voted && poll.user_voted_option_id === option.id,
          'is-clickable': !isVoting && (!poll.has_voted || poll.user_voted_option_id !== option.id),
          'is-submitting': isVoting && votingOptionId === option.id,
        }"
        @click="handleVote(option)"
      >
        <!-- Background progress bar when results are visible -->
        <div
          v-if="canSeeResults"
          class="poll-option-progress"
          :style="{ width: `${Math.min(100, Math.max(0, option.percentage ?? 0))}%` }"
        ></div>

        <div class="poll-option-content">
          <!-- Radio or check visual indicator -->
          <div class="option-marker">
            <span v-if="isVoting && votingOptionId === option.id" class="option-spinner">⌛</span>
            <span v-else-if="poll.has_voted && poll.user_voted_option_id === option.id" class="option-check">✓</span>
            <span v-else-if="poll.has_voted" class="option-circle">○</span>
            <span v-else class="option-radio">◎</span>
          </div>

          <!-- Option text -->
          <span class="option-text">{{ option.text }}</span>

          <!-- Vote metrics (shown when results are visible) -->
          <div v-if="canSeeResults" class="option-metrics">
            <span class="option-percentage">{{ option.percentage ?? 0 }}%</span>
            <span class="option-count">({{ option.votes_count ?? 0 }})</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer information -->
    <div class="poll-footer">
      <template v-if="canSeeResults">
        <span class="total-votes">
          👥 {{ poll.total_votes ?? 0 }} {{ (poll.total_votes === 1) ? 'voto' : 'votos' }}
        </span>
        <span v-if="poll.has_voted" class="poll-change-hint">
          • Clique em outra opção para alterar seu voto
        </span>
        <span v-else class="poll-change-hint">
          • Você é o autor (resultados visíveis). Clique em uma opção para votar se desejar.
        </span>
      </template>
      <template v-else>
        <span class="poll-secret-hint">
          🔒 Votos e porcentagens são revelados após você votar.
        </span>
      </template>
    </div>
  </div>
</template>

<style scoped>
.retro-poll-card {
  margin-top: 0.875rem;
  padding: 0.75rem 0.875rem;
  background-color: var(--color-bg-alt, #f6f8fa);
  border: 2px solid var(--color-border, #000000);
  border-radius: 4px;
  box-shadow: 2px 2px 0px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

:global(.dark) .retro-poll-card {
  background-color: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.2);
  box-shadow: 2px 2px 0px rgba(0, 0, 0, 0.4);
}

.poll-header {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.poll-title-wrapper {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
}

.poll-icon {
  font-size: 0.95rem;
}

.poll-badge-label {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0.125rem 0.375rem;
  background-color: var(--color-primary, #0055ff);
  color: #ffffff;
  border-radius: 2px;
}

.poll-question {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--color-text, #111827);
  margin-top: 0.25rem;
  line-height: 1.35;
}

:global(.dark) .poll-question {
  color: #f3f4f6;
}

.poll-error-banner {
  padding: 0.375rem 0.5rem;
  background-color: #fee2e2;
  border: 1px solid #ef4444;
  color: #b91c1c;
  font-size: 0.8rem;
  border-radius: 2px;
}

:global(.dark) .poll-error-banner {
  background-color: rgba(239, 68, 68, 0.2);
  color: #fca5a5;
}

.poll-options-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.poll-option-item {
  position: relative;
  overflow: hidden;
  border: 1.5px solid var(--color-border, #4b5563);
  background-color: var(--color-bg, #ffffff);
  border-radius: 4px;
  transition: all 0.15s ease;
  user-select: none;
}

:global(.dark) .poll-option-item {
  border-color: rgba(255, 255, 255, 0.25);
  background-color: rgba(0, 0, 0, 0.3);
}

.poll-option-item.is-clickable {
  cursor: pointer;
}

.poll-option-item.is-clickable:hover {
  border-color: var(--color-primary, #0055ff);
  transform: translateY(-1px);
  box-shadow: 1px 1px 0px rgba(0, 0, 0, 0.2);
}

.poll-option-item.is-clickable:active {
  transform: translateY(0px);
}

.poll-option-item.is-voted-mine {
  border-color: var(--color-primary, #0055ff);
  border-width: 2px;
  font-weight: 600;
}

.poll-option-progress {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  background-color: rgba(0, 85, 255, 0.15);
  transition: width 0.4s ease-out;
  pointer-events: none;
}

:global(.dark) .poll-option-progress {
  background-color: rgba(59, 130, 246, 0.25);
}

.is-voted-mine .poll-option-progress {
  background-color: rgba(0, 85, 255, 0.28);
}

:global(.dark) .is-voted-mine .poll-option-progress {
  background-color: rgba(59, 130, 246, 0.38);
}

.poll-option-content {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  padding: 0.5rem 0.75rem;
  gap: 0.5rem;
  font-size: 0.875rem;
}

.option-marker {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  height: 1.25rem;
  font-size: 0.85rem;
  flex-shrink: 0;
}

.option-check {
  color: var(--color-primary, #0055ff);
  font-weight: 800;
}

.option-radio {
  color: #6b7280;
}

.option-circle {
  color: #9ca3af;
}

.option-spinner {
  font-size: 0.8rem;
  animation: pulse 1s infinite alternate;
}

.option-text {
  flex: 1;
  word-break: break-word;
  color: var(--color-text, #1f2937);
}

:global(.dark) .option-text {
  color: #e5e7eb;
}

.option-metrics {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.8rem;
  font-weight: 600;
  flex-shrink: 0;
}

.option-percentage {
  color: var(--color-primary, #0055ff);
}

:global(.dark) .option-percentage {
  color: #60a5fa;
}

.option-count {
  font-size: 0.75rem;
  color: #6b7280;
}

:global(.dark) .option-count {
  color: #9ca3af;
}

.poll-footer {
  font-size: 0.75rem;
  color: #6b7280;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.25rem;
  padding-top: 0.25rem;
}

:global(.dark) .poll-footer {
  color: #9ca3af;
}

.total-votes {
  font-weight: 600;
  color: var(--color-text, #374151);
}

:global(.dark) .total-votes {
  color: #d1d5db;
}

.poll-change-hint,
.poll-secret-hint {
  font-style: italic;
}

@keyframes pulse {
  from { opacity: 0.4; }
  to { opacity: 1; }
}
</style>
