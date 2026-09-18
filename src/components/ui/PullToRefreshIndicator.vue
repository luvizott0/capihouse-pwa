<script setup lang="ts">
withDefaults(
  defineProps<{
    pullDistance: number
    isRefreshing: boolean
    refreshingText?: string
    releaseText?: string
    pullText?: string
  }>(),
  {
    refreshingText: 'Atualizando...',
    releaseText: 'Solte para atualizar',
    pullText: 'Puxe para atualizar...',
  }
)
</script>

<template>
  <div
    v-if="pullDistance > 0 || isRefreshing"
    class="pull-refresh-bar"
    :style="{ height: `${pullDistance}px` }"
  >
    <div class="pull-refresh-inner" :class="{ 'is-refreshing': isRefreshing }">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="pull-refresh-icon"
        :class="{ 'spin': isRefreshing }"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        stroke-width="2.5"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
        />
      </svg>
      <span class="pull-refresh-text">
        {{ isRefreshing ? refreshingText : (pullDistance >= 50 ? releaseText : pullText) }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.pull-refresh-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  transition: height 0.15s ease-out;
  background-color: var(--color-primary-50, #f8f6f1);
  border-bottom: 1px dashed var(--color-primary-300, #c4884e);
}

.pull-refresh-inner {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 0.8rem;
  font-weight: bold;
  color: var(--color-primary-800, #5f4120);
}

.pull-refresh-icon {
  width: 18px;
  height: 18px;
  stroke-width: 2.5;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.spin {
  animation: spin 0.8s linear infinite;
}
</style>
