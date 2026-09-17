<script setup lang="ts">
// Skeleton retrô com animação shimmer para carregamento fluido de grupos
</script>

<template>
  <div class="skeleton-group-card">
    <!-- Photo Box Placeholder -->
    <div class="skeleton-photo-box shimmer"></div>

    <!-- Group Info Placeholder -->
    <div class="skeleton-info">
      <!-- Title row (group name & role badge) -->
      <div class="skeleton-title-row">
        <div class="skeleton-line skeleton-title shimmer"></div>
        <div class="skeleton-line skeleton-badge shimmer"></div>
      </div>

      <!-- Description lines -->
      <div class="skeleton-line skeleton-desc-line1 shimmer"></div>
      <div class="skeleton-line skeleton-desc-line2 shimmer"></div>

      <!-- Footer (members count & action link) -->
      <div class="skeleton-footer">
        <div class="skeleton-line skeleton-members shimmer"></div>
        <div class="skeleton-line skeleton-link shimmer"></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.skeleton-group-card {
  display: flex;
  flex-direction: column;
  background-color: #ffffff;
  border: 1px solid var(--color-border, #D8CDC5);
  border-radius: 2px;
  overflow: hidden;
}

.skeleton-photo-box {
  width: 100%;
  height: 120px;
}

.skeleton-info {
  padding: 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
}

.skeleton-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}

.skeleton-line {
  border-radius: 2px;
}

.skeleton-title {
  width: 60%;
  height: 16px;
}

.skeleton-badge {
  width: 25%;
  height: 14px;
}

.skeleton-desc-line1 {
  width: 90%;
  height: 12px;
  margin-top: 0.2rem;
}

.skeleton-desc-line2 {
  width: 65%;
  height: 12px;
}

.skeleton-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 0.5rem;
  margin-top: auto;
  border-top: 1px dashed var(--color-border, #D8CDC5);
}

.skeleton-members {
  width: 35%;
  height: 12px;
}

.skeleton-link {
  width: 40%;
  height: 12px;
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
