<script setup lang="ts">
import { ref, computed } from 'vue'
import { useExternalLinkStore } from '@/stores/externalLink'

const props = defineProps<{
  content?: string | null
}>()

const externalLinkStore = useExternalLinkStore()
const copiedLink = ref<string | null>(null)

interface Token {
  type: 'text' | 'mention' | 'link'
  value: string
  username?: string
  url?: string
}

const tokens = computed<Token[]>(() => {
  if (!props.content) return []
  const text = props.content
  const regex = /(@[a-zA-Z0-9_-]+)|(https?:\/\/[^\s<]+[^<.,:;"')\]\s]|www\.[^\s<]+[^<.,:;"')\]\s])/gi
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

    if (match[1]) {
      result.push({
        type: 'mention',
        value: match[1],
        username: match[1].slice(1),
      })
    } else if (match[2]) {
      const rawUrl = match[2]
      const normalizedUrl =
        rawUrl.startsWith('http://') || rawUrl.startsWith('https://')
          ? rawUrl
          : `https://${rawUrl}`

      result.push({
        type: 'link',
        value: rawUrl,
        url: normalizedUrl,
      })
    }

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

function onLinkClick(targetUrl: string) {
  externalLinkStore.open(targetUrl)
}

async function copyQuickLink(targetUrl: string) {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(targetUrl)
    } else if (typeof document !== 'undefined') {
      const el = document.createElement('textarea')
      el.value = targetUrl
      el.style.position = 'fixed'
      el.style.opacity = '0'
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    copiedLink.value = targetUrl
    setTimeout(() => {
      if (copiedLink.value === targetUrl) {
        copiedLink.value = null
      }
    }, 2000)
  } catch (err) {
    console.warn('Erro ao copiar link:', err)
  }
}
</script>

<template>
  <span class="formatted-content">
    <template v-for="(token, index) in tokens" :key="index">
      <span
        v-if="token.type === 'mention' && token.username?.toLowerCase() === 'todos'"
        class="mention-everyone-pill"
        title="Menção global para todos os usuários"
      >
        <span class="everyone-icon">📢</span>{{ token.value }}
      </span>
      <router-link
        v-else-if="token.type === 'mention' && token.username"
        :to="`/profile/${token.username}`"
        class="mention-link"
        @click.stop
      >{{ token.value }}</router-link>
      <span v-else-if="token.type === 'link' && token.url" class="external-link-inline">
        <a
          :href="token.url"
          class="external-link-anchor"
          target="_blank"
          rel="noopener noreferrer"
          :title="`Abrir link externo: ${token.url}`"
          @click.stop.prevent="onLinkClick(token.url)"
        >
          <span class="link-icon">🔗</span>
          <span class="link-label">{{ token.value }}</span>
          <span class="external-arrow">↗</span>
        </a>
        <button
          type="button"
          class="link-quick-copy-btn"
          :class="{ 'copied': copiedLink === token.url }"
          :title="copiedLink === token.url ? 'Link copiado!' : 'Copiar link'"
          :aria-label="copiedLink === token.url ? 'Link copiado!' : 'Copiar link'"
          @click.stop.prevent="copyQuickLink(token.url)"
        >
          <span v-if="copiedLink === token.url" class="copied-check">✓</span>
          <span v-else class="copy-icon">📋</span>
        </button>
      </span>
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

.mention-everyone-pill {
  color: #ffffff;
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-weight: 700;
  font-size: 0.88em;
  background-color: var(--color-primary, #a66130);
  border: 1px solid var(--color-primary-800, #5f4120);
  padding: 0.05rem 0.4rem;
  border-radius: 3px;
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  vertical-align: baseline;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
}

.everyone-icon {
  font-size: 0.85em;
}

/* External Link Elements */
.external-link-inline {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  vertical-align: baseline;
  margin: 0 1px;
}

.external-link-anchor {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 0.86em;
  font-weight: 700;
  color: var(--color-primary-800, #5f4120);
  background-color: var(--color-primary-50, #fcf9f5);
  border: 1px solid var(--color-primary-300, #d4a574);
  border-radius: 3px;
  padding: 0.05rem 0.35rem;
  text-decoration: none;
  word-break: break-all;
  transition: all 0.15s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.external-link-anchor:hover {
  background-color: var(--color-primary, #a66130);
  color: #ffffff;
  border-color: var(--color-primary-800, #5f4120);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.link-icon {
  font-size: 0.8em;
  line-height: 1;
}

.external-arrow {
  font-size: 0.85em;
  line-height: 1;
}

.link-quick-copy-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background-color: #ffffff;
  border: 1px solid var(--color-border, #D8CDC5);
  border-radius: 3px;
  padding: 0.1rem 0.25rem;
  font-size: 0.75em;
  cursor: pointer;
  line-height: 1;
  transition: all 0.15s ease;
  color: #6b7280;
}

.link-quick-copy-btn:hover {
  background-color: var(--color-primary-100, #f8efe6);
  border-color: var(--color-primary-400, #c4884e);
  color: var(--color-primary-900, #38200a);
}

.link-quick-copy-btn.copied {
  background-color: #dcfce7 !important;
  border-color: #86efac !important;
  color: #15803d !important;
  font-weight: bold;
}

.copied-check {
  font-weight: bold;
  color: #15803d;
}
</style>
