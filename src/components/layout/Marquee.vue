<script setup lang="ts">
defineProps<{ text: string }>()
</script>
<template>
  <div class="marquee-container">
    <div class="marquee-content">
      {{ text }} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; {{ text }}
    </div>
  </div>
</template>
