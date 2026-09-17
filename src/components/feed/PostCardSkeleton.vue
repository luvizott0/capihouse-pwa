<script setup lang="ts">
// Skeleton retrô com animação shimmer para carregamento fluido de posts
</script>

<template>
  <div class="skeleton-post-card">
    <!-- Header -->
    <div class="skeleton-header">
      <div class="skeleton-avatar shimmer"></div>
      <div class="skeleton-meta">
        <div class="skeleton-line skeleton-title shimmer"></div>
        <div class="skeleton-line skeleton-subtitle shimmer"></div>
      </div>
    </div>

    <!-- Body text -->
    <div class="skeleton-body">
      <div class="skeleton-line skeleton-text-full shimmer"></div>
      <div class="skeleton-line skeleton-text-short shimmer"></div>
    </div>

    <!-- Media placeholder (4:3) -->
    <div class="skeleton-media shimmer"></div>

    <!-- Actions bar -->
    <div class="skeleton-actions">
      <div class="skeleton-btn shimmer"></div>
      <div class="skeleton-btn shimmer"></div>
    </div>
  </div>
</template>

<style scoped>
.skeleton-post-card {
  border: 2px solid var(--color-border, #D8CDC5);
  background-color: #ffffff;
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 1rem;
}

.skeleton-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background-color: var(--color-primary-50, #f8f6f1);
  border-bottom: 1px solid var(--color-border, #D8CDC5);
}

.skeleton-avatar {
  width: 40px;
  height: 40px;
  border-radius: 2px;
  flex-shrink: 0;
}

.skeleton-meta {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  flex: 1;
}

.skeleton-line {
  height: 12px;
  border-radius: 2px;
}

.skeleton-title {
  width: 40%;
}

.skeleton-subtitle {
  width: 25%;
  height: 10px;
}

.skeleton-body {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.skeleton-text-full {
  width: 90%;
}

.skeleton-text-short {
  width: 60%;
}

.skeleton-media {
  width: 100%;
  aspect-ratio: 4 / 3;
  max-height: 420px;
  min-height: 240px;
  border-top: 1px solid var(--color-border, #D8CDC5);
  border-bottom: 1px solid var(--color-border, #D8CDC5);
}

.skeleton-actions {
  display: flex;
  gap: 1rem;
  padding: 0.6rem 1rem;
  background-color: var(--color-primary-50, #f8f6f1);
}

.skeleton-btn {
  width: 80px;
  height: 24px;
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
