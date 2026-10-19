import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { openExternalUrl } from '@/utils/externalLinks'

export const useExternalLinkStore = defineStore('externalLink', () => {
  const isOpen = ref(false)
  const url = ref('')
  const isCopied = ref(false)

  const domain = computed(() => {
    if (!url.value) return ''
    try {
      const parsed = new URL(url.value)
      return parsed.hostname
    } catch {
      return url.value
    }
  })

  function open(rawUrl: string) {
    if (!rawUrl) return
    const trimmed = rawUrl.trim()
    const normalized =
      trimmed.startsWith('http://') || trimmed.startsWith('https://')
        ? trimmed
        : `https://${trimmed}`

    url.value = normalized
    isCopied.value = false
    isOpen.value = true
  }

  function close() {
    isOpen.value = false
    isCopied.value = false
  }

  async function copy(): Promise<boolean> {
    if (!url.value) return false
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url.value)
      } else if (typeof document !== 'undefined') {
        const textArea = document.createElement('textarea')
        textArea.value = url.value
        textArea.style.position = 'fixed'
        textArea.style.opacity = '0'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
      }
      isCopied.value = true
      setTimeout(() => {
        isCopied.value = false
      }, 2500)
      return true
    } catch (err) {
      console.warn('Erro ao copiar link:', err)
      return false
    }
  }

  function confirmOpen() {
    if (!url.value) return
    openExternalUrl(url.value)
    close()
  }

  return {
    isOpen,
    url,
    domain,
    isCopied,
    open,
    close,
    copy,
    confirmOpen,
  }
})
