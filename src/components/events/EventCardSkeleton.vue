<script setup lang="ts">
// Skeleton retrô com animação shimmer para carregamento fluido de eventos
</script>

<template>
  <div class="skeleton-event-card">
    <!-- Cover Placeholder -->
    <div class="skeleton-cover shimmer"></div>

    <!-- Event Body -->
    <div class="skeleton-body">
      <div class="skeleton-badge shimmer"></div>
      <div class="skeleton-line skeleton-title shimmer"></div>
      <div class="skeleton-line skeleton-organizer shimmer"></div>
      <div class="skeleton-line skeleton-desc shimmer"></div>
    </div>
  </div>
</template>

<style scoped>
.skeleton-event-card {
  border: 2px solid var(--color-border, #D8CDC5);
  background-color: #ffffff;
  border-radius: 2px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.skeleton-cover {
  width: 100%;
  height: 140px;
}

.skeleton-body {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  background-color: #ffffff;
}

.skeleton-badge {
  width: 50%;
  height: 20px;
  border-radius: 2px;
}

.skeleton-line {
  height: 12px;
  border-radius: 2px;
}

.skeleton-title {
  width: 80%;
  height: 16px;
  margin-top: 0.25rem;
}

.skeleton-organizer {
  width: 60%;
  height: 10px;
}

.skeleton-desc {
  width: 95%;
  height: 32px;
  margin-top: 0.25rem;
}

/* Shimmer animation */
.shimmer {
  background: linear-gradient(
    90deg,
    #e8dfd8 0%,
    #f5eee8 50%,
    #e8dfd8 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite linear;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
</style>
