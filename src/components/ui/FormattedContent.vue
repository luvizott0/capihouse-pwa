<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  content?: string | null
}>()

interface Token {
  type: 'text' | 'mention'
  value: string
  username?: string
}

const tokens = computed<Token[]>(() => {
  if (!props.content) return []
  const text = props.content
  const regex = /@([a-zA-Z0-9_-]+)/g
  const result: Token[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      result.push({
        type: 'text',
        value: text.substring(lastIndex, match.index),
      })
    }
    result.push({
      type: 'mention',
      value: match[0],
      username: match[1],
    })
    lastIndex = regex.lastIndex
  }

  if (lastIndex < text.length) {
    result.push({
      type: 'text',
      value: text.substring(lastIndex),
    })
  }

  return result
})
</script>

<template>
  <span class="formatted-content">
    <template v-for="(token, index) in tokens" :key="index">
      <router-link
        v-if="token.type === 'mention' && token.username"
        :to="`/profile/${token.username}`"
        class="mention-link"
        @click.stop
      >{{ token.value }}</router-link>
      <span v-else>{{ token.value }}</span>
    </template>
  </span>
</template>

<style scoped>
.formatted-content {
  white-space: pre-wrap;
  word-break: break-word;
}

.mention-link {
  color: var(--color-primary, #a66130);
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-weight: 700;
  font-size: 0.9em;
  text-decoration: none;
  background-color: var(--color-primary-100, #f8efe6);
  padding: 0.05rem 0.35rem;
  border-radius: 2px;
  border-bottom: 1px solid var(--color-primary-300, #d9aa7d);
  transition: all 0.15s ease;
  display: inline-block;
  vertical-align: baseline;
}

.mention-link:hover {
  background-color: var(--color-primary, #a66130);
  color: #ffffff;
  border-bottom-color: var(--color-primary-800);
}
</style>