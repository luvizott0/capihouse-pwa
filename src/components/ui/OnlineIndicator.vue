<script setup lang="ts">
defineProps<{ isOnline: boolean }>()
</script>
<template>
  <span class="online-indicator" :class="{ 'is-online': isOnline }"></span>
</template>
<style scoped>
.online-indicator {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: var(--color-muted);
  border: 1px solid var(--bg-white);
}
.is-online { background-color: var(--color-success); }
</style>
