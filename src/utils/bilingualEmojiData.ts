import baseData from '@emoji-mart/data'
import emojisPt from '@/data/emojisPt.json'

export interface EmojiSkin {
  unified: string
  native: string
  [key: string]: unknown
}

export interface EmojiItem {
  id: string
  name: string
  keywords?: string[]
  skins?: EmojiSkin[]
  emoticons?: string[]
  version?: number
  search?: string
  [key: string]: unknown
}

export interface EmojiMartData {
  categories?: Array<{ id: string; emojis: string[] }>
  emojis: Record<string, EmojiItem>
  aliases?: Record<string, string>
  [key: string]: unknown
}

let cachedBilingualData: EmojiMartData | null = null

export function getBilingualEmojiData(): EmojiMartData {
  if (cachedBilingualData) {
    return cachedBilingualData
  }

  const rawData = baseData as unknown as EmojiMartData
  const baseEmojis = rawData.emojis || {}
  const mergedEmojis: Record<string, EmojiItem> = {}
  const ptDict = emojisPt as Record<string, string[]>

  for (const [id, emoji] of Object.entries(baseEmojis)) {
    const ptKeywords = ptDict[id]
    if (!ptKeywords || ptKeywords.length === 0) {
      mergedEmojis[id] = emoji
      continue
    }

    const baseKeywords = emoji.keywords || []
    const combinedSet = new Set<string>(baseKeywords)
    for (const kw of ptKeywords) {
      combinedSet.add(kw)
    }

    mergedEmojis[id] = {
      ...emoji,
      keywords: Array.from(combinedSet),
    }
  }

  cachedBilingualData = {
    ...rawData,
    emojis: mergedEmojis,
  }

  return cachedBilingualData
}
