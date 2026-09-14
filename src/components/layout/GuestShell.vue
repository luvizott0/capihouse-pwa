<script setup lang="ts">
// Guest layout wrapper for Auth views (Login, Register)
</script>

<template>
  <div class="guest-shell">
    <div class="guest-container">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.guest-shell {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-primary-50, #f8f6f1);
  padding: 1.5rem 1rem;
}

.guest-container {
  width: 100%;
  max-width: 440px;
}
</style>
