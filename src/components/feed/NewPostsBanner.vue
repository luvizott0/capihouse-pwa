<script setup lang="ts">
import { useFeedStore } from '@/stores/feed'

const feedStore = useFeedStore()

function handleClick() {
  feedStore.flushPendingPosts()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
</script>

<template>
  <Transition name="banner-slide">
    <div
      v-if="feedStore.pendingPosts.length > 0"
      class="new-posts-banner"
      role="status"
      aria-live="polite"
      @click="handleClick"
    >
      <span class="banner-icon">📢</span>
      <span class="banner-text">
        {{ feedStore.pendingPosts.length }}
        nova{{ feedStore.pendingPosts.length > 1 ? 's publicações' : ' publicação' }}
        — clique para ver
      </span>
      <span class="banner-arrow">↑</span>
    </div>
  </Transition>
</template>

<style scoped>
.new-posts-banner {
  position: fixed;
  top: 72px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 200;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 20px;
  background: linear-gradient(rgba(0, 0, 0, 0.18), rgba(0, 0, 0, 0.28)), var(--color-primary, #a66130);
  color: #ffffff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.85), 0 0 2px rgba(0, 0, 0, 0.65);
  font-family: 'Space Mono', 'Courier New', Courier, monospace;
  font-size: 0.85rem;
  font-weight: bold;
  letter-spacing: -0.01em;
  border: 2px solid #000;
  box-shadow: 3px 3px 0 #000;
  cursor: pointer;
  white-space: nowrap;
  user-select: none;
  transition: transform 0.1s ease, box-shadow 0.1s ease, filter 0.15s ease;
}

.new-posts-banner:hover {
  transform: translateX(-50%) translateY(-1px);
  box-shadow: 4px 4px 0 #000;
  filter: brightness(1.08);
}

.new-posts-banner:hover .banner-arrow {
  transform: translateY(-2px);
}

.new-posts-banner:active {
  transform: translateX(-50%) translateY(1px);
  box-shadow: 2px 2px 0 #000;
  filter: brightness(0.96);
}

.banner-icon {
  font-size: 1rem;
  line-height: 1;
}

.banner-arrow {
  font-size: 1.1rem;
  font-weight: bold;
  display: inline-block;
  transition: transform 0.15s ease;
}

/* Slide-down animation */
.banner-slide-enter-active,
.banner-slide-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.banner-slide-enter-from,
.banner-slide-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-12px);
}
</style>
