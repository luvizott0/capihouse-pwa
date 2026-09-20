<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Poll, PollOption, PollOptionVoters } from '@/types/models'
import { useFeedStore } from '@/stores/feed'
import { getPollVoters } from '@/api/posts'
import RetroModal from '@/components/ui/RetroModal.vue'
import UserAvatar from '@/components/ui/UserAvatar.vue'

const props = withDefaults(
  defineProps<{
    postId: number
    poll: Poll
    isAuthor?: boolean
  }>(),
  {
    isAuthor: false,
  }
)

const feedStore = useFeedStore()
const isVoting = ref(false)
const votingOptionId = ref<number | null>(null)
const errorMsg = ref('')

const showVotersModal = ref(false)
const isLoadingVoters = ref(false)
const votersError = ref('')
const optionVotersList = ref<PollOptionVoters[]>([])

async function openVotersModal() {
  showVotersModal.value = true
  isLoadingVoters.value = true
  votersError.value = ''
  try {
    const res = await getPollVoters(props.postId)
    optionVotersList.value = res.data.options
  } catch (err: any) {
    votersError.value = err?.response?.data?.message || 'Erro ao carregar votantes.'
  } finally {
    isLoadingVoters.value = false
  }
}

const canSeeResults = computed(() => Boolean(props.poll?.can_see_results ?? props.poll?.has_voted))

async function handleVote(option: PollOption) {
  if (isVoting.value) return
  if (props.poll?.has_voted && props.poll?.user_voted_option_id === option.id) {
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
        v-for="option in (poll?.options || [])"
        :key="option.id"
        class="poll-option-item"
        :class="{
          'is-voted-mine': poll?.has_voted && poll?.user_voted_option_id === option.id,
          'is-clickable': !isVoting && (!poll?.has_voted || poll?.user_voted_option_id !== option.id),
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
            <span v-else-if="poll?.has_voted && poll?.user_voted_option_id === option.id" class="option-check">✓</span>
            <span v-else-if="poll?.has_voted" class="option-circle">○</span>
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
      <div class="poll-footer-row">
        <template v-if="canSeeResults">
          <span class="total-votes">
            👥 {{ poll?.total_votes ?? 0 }} {{ (poll?.total_votes === 1) ? 'voto' : 'votos' }}
          </span>
          <button
            v-if="isAuthor"
            type="button"
            class="poll-voters-btn"
            title="Ver quem votou em cada opção"
            @click="openVotersModal"
          >
            [ 👥 Ver votos ]
          </button>
        </template>
        <template v-else>
          <span class="poll-secret-hint">
            🔒 Votos e porcentagens são revelados após você votar.
          </span>
        </template>
      </div>

      <div v-if="canSeeResults" class="poll-hints-row">
        <span v-if="poll?.has_voted" class="poll-change-hint">
          • Clique em outra opção para alterar seu voto
        </span>
        <span v-else-if="isAuthor" class="poll-change-hint">
          • Você é o autor (resultados visíveis). Clique em uma opção para votar se desejar.
        </span>
      </div>
    </div>

    <!-- Voters Modal (Author only) -->
    <RetroModal
      v-model="showVotersModal"
      title="Quem votou na Enquete"
      size="md"
    >
      <div class="poll-voters-modal-body">
        <div v-if="poll.question" class="voters-question-header">
          <strong>Enquete:</strong> {{ poll.question }}
        </div>

        <div v-if="isLoadingVoters" class="voters-loading-state">
          <span class="loading-spinner">⌛</span> Carregando votos...
        </div>

        <div v-else-if="votersError" class="voters-error-state">
          <p class="error-text">⚠️ {{ votersError }}</p>
          <button type="button" class="retry-btn" @click="openVotersModal">[ Tentar novamente ]</button>
        </div>

        <div v-else class="voters-options-group">
          <div
            v-for="opt in optionVotersList"
            :key="opt.id"
            class="voters-option-block"
          >
            <div class="voters-option-title-row">
              <span class="voters-option-title">{{ opt.text }}</span>
              <span class="voters-option-badge">
                {{ opt.votes_count }} {{ opt.votes_count === 1 ? 'voto' : 'votos' }}
              </span>
            </div>

            <div v-if="!opt.voters || opt.voters.length === 0" class="voters-empty-opt">
              Nenhum voto nesta opção.
            </div>

            <div v-else class="voters-user-list">
              <router-link
                v-for="voter in opt.voters"
                :key="voter.id"
                :to="`/profile/${voter.username}`"
                class="voter-user-card"
                @click="showVotersModal = false"
              >
                <UserAvatar :user="voter" size="sm" />
                <div class="voter-info">
                  <span class="voter-name">{{ voter.name }}</span>
                  <span class="voter-username">@{{ voter.username }}</span>
                </div>
              </router-link>
            </div>
          </div>
        </div>
      </div>
    </RetroModal>
  </div>
</template>

<style scoped>
.retro-poll-card {
  margin-top: 0.875rem;
  padding: 0.75rem 0.875rem;
  background-color: var(--color-bg-alt, #f6f8fa);
  border: 2px solid var(--color-border, #000000);
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

:global(.dark) .retro-poll-card {
  background-color: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.2);
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
  flex-direction: column;
  gap: 0.35rem;
  padding-top: 0.25rem;
}

:global(.dark) .poll-footer {
  color: #9ca3af;
}

.poll-footer-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.total-votes {
  font-weight: 600;
  color: var(--color-text, #374151);
}

:global(.dark) .total-votes {
  color: #d1d5db;
}

.poll-voters-btn {
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 0.72rem;
  font-weight: bold;
  background: none;
  border: 1px solid var(--color-border, #d8cdc5);
  color: var(--color-primary-800, #5f4120);
  padding: 0.15rem 0.45rem;
  border-radius: 2px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  transition: all 0.15s ease;
}

.poll-voters-btn:hover {
  background-color: var(--color-primary-50, #fdf8f3);
  border-color: var(--color-primary, #0055ff);
}

:global(.dark) .poll-voters-btn {
  border-color: rgba(255, 255, 255, 0.2);
  color: #93c5fd;
}

:global(.dark) .poll-voters-btn:hover {
  background-color: rgba(59, 130, 246, 0.15);
  border-color: #60a5fa;
}

.poll-hints-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.poll-change-hint,
.poll-secret-hint {
  font-style: italic;
}

/* Voters Modal Styles */
.poll-voters-modal-body {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  max-height: 60vh;
  max-height: 60dvh;
  overflow-y: auto;
  padding: 0.25rem 0;
}

.voters-question-header {
  font-size: 0.85rem;
  color: var(--color-text-muted, #555555);
  padding-bottom: 0.5rem;
  border-bottom: 1px dashed var(--color-border, #e5ddd5);
}

:global(.dark) .voters-question-header {
  color: #9ca3af;
  border-color: rgba(255, 255, 255, 0.15);
}

.voters-loading-state,
.voters-error-state {
  padding: 1.5rem 1rem;
  text-align: center;
  font-family: var(--font-heading, monospace);
  font-size: 0.85rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.retry-btn {
  font-family: var(--font-heading, monospace);
  font-size: 0.75rem;
  font-weight: bold;
  background: none;
  border: 1px solid var(--color-border, #d8cdc5);
  color: var(--color-primary, #0055ff);
  padding: 0.2rem 0.5rem;
  cursor: pointer;
  border-radius: 2px;
}

.voters-options-group {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.voters-option-block {
  border: 1px solid var(--color-border, #d8cdc5);
  background-color: var(--color-bg-alt, #fafafa);
  border-radius: 4px;
  padding: 0.6rem 0.75rem;
}

:global(.dark) .voters-option-block {
  background-color: rgba(255, 255, 255, 0.03);
  border-color: rgba(255, 255, 255, 0.15);
}

.voters-option-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.45rem;
  gap: 0.5rem;
}

.voters-option-title {
  font-weight: 700;
  font-size: 0.85rem;
  color: var(--color-text, #111827);
  word-break: break-word;
}

:global(.dark) .voters-option-title {
  color: #f3f4f6;
}

.voters-option-badge {
  font-family: var(--font-heading, monospace);
  font-size: 0.72rem;
  font-weight: bold;
  padding: 0.1rem 0.4rem;
  background-color: var(--color-primary-100, #e0ecff);
  color: var(--color-primary-800, #0040aa);
  border-radius: 2px;
  white-space: nowrap;
  flex-shrink: 0;
}

:global(.dark) .voters-option-badge {
  background-color: rgba(59, 130, 246, 0.2);
  color: #93c5fd;
}

.voters-empty-opt {
  font-size: 0.75rem;
  font-style: italic;
  color: var(--color-muted, #888888);
  padding: 0.25rem 0;
}

:global(.dark) .voters-empty-opt {
  color: #9ca3af;
}

.voters-user-list {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.voter-user-card {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 0.45rem;
  border-radius: 3px;
  text-decoration: none;
  color: inherit;
  transition: background-color 0.15s ease;
}

.voter-user-card:hover {
  background-color: var(--color-primary-50, #f0f4ff);
}

:global(.dark) .voter-user-card:hover {
  background-color: rgba(255, 255, 255, 0.08);
}

.voter-info {
  display: flex;
  flex-direction: column;
  line-height: 1.25;
  min-width: 0;
}

.voter-name {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--color-text, #111827);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

:global(.dark) .voter-name {
  color: #f3f4f6;
}

.voter-username {
  font-size: 0.72rem;
  color: var(--color-muted, #6b7280);
}

:global(.dark) .voter-username {
  color: #9ca3af;
}

@keyframes pulse {
  from { opacity: 0.4; }
  to { opacity: 1; }
}
</style>
