<script setup lang="ts">
// Skeleton retrô com animação shimmer para carregamento fluido de grupos de audiência
</script>

<template>
  <div class="skeleton-audience-card">
    <div class="skeleton-card-header">
      <div class="skeleton-header-left">
        <div class="skeleton-dot shimmer"></div>
        <div class="skeleton-line skeleton-title shimmer"></div>
      </div>
      <div class="skeleton-btn shimmer"></div>
    </div>

    <div class="skeleton-card-body">
      <div class="skeleton-line skeleton-meta shimmer"></div>
      <div class="skeleton-avatar-row">
        <div v-for="i in 4" :key="i" class="skeleton-avatar shimmer"></div>
      </div>
    </div>

    <div class="skeleton-card-footer">
      <div class="skeleton-line skeleton-footer-hint shimmer"></div>
    </div>
  </div>
</template>

<style scoped>
.skeleton-audience-card {
  display: flex;
  flex-direction: column;
  background-color: #ffffff;
  border: 2px solid var(--color-border, #D8CDC5);
  border-left: 6px solid #e8dfd8;
  border-radius: 3px;
  padding: 1rem;
  gap: 0.75rem;
}

.skeleton-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #f3ece5;
  padding-bottom: 0.5rem;
}

.skeleton-header-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 60%;
}

.skeleton-dot {
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 50%;
  flex-shrink: 0;
}

.skeleton-title {
  width: 75%;
  height: 16px;
  border-radius: 2px;
}

.skeleton-btn {
  width: 50px;
  height: 20px;
  border-radius: 2px;
}

.skeleton-card-body {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.skeleton-meta {
  width: 45%;
  height: 12px;
  border-radius: 2px;
}

.skeleton-avatar-row {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.skeleton-avatar {
  width: 1.8rem;
  height: 1.8rem;
  border-radius: 50%;
}

.skeleton-card-footer {
  margin-top: auto;
  border-top: 1px dashed #f3ece5;
  padding-top: 0.5rem;
}

.skeleton-footer-hint {
  width: 90%;
  height: 10px;
  border-radius: 2px;
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
