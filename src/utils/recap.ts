import type { Post } from '@/types/models'

export interface PodiumItem {
  medal: string
  emoji: string
  name?: string
  count: string
}

export interface RecapData {
  targetUser: {
    id: number
    name: string
    username: string
    avatar_url: string | null
  }
  monthYear: {
    month: string
    year: string
    full: string
  }
  emojiJourney: string[]
  podium: PodiumItem[]
}

export function parseRecapData(post: Post): RecapData {
  // 1. Usuário homenageado
  let targetUser = {
    id: 0,
    name: 'Capivara Amiga',
    username: 'amigo',
    avatar_url: null as string | null,
  }

  if (post.mentions && post.mentions.length > 0 && post.mentions[0]) {
    const m = post.mentions[0]
    targetUser = {
      id: m.id,
      name: m.name || 'Capivara Amiga',
      username: m.username || 'amigo',
      avatar_url: m.avatar_url || null,
    }
  } else {
    const match = post.content?.match(/@([a-zA-Z0-9_-]+)/)
    if (match && match[1]) {
      targetUser.name = match[1]
      targetUser.username = match[1]
    }
  }

  // 2. Mês e Ano
  const content = post.content || ''
  const monthMatch = content.match(/O mês de ([^\s!]+) chegou ao fim/i)
  const hashtagMatch = content.match(/#([A-Za-z]+)(\d{4})/i)

  const month = monthMatch && monthMatch[1] ? monthMatch[1] : 'Mês'
  const year =
    hashtagMatch && hashtagMatch[2]
      ? hashtagMatch[2]
      : new Date(post.created_at).getFullYear().toString()

  // 3. Jornada de sentimentos
  const journeyMatch = content.match(/📜 Sua jornada de sentimentos no mês:\s*([\s\S]*?)\s*🏆 Pódio/i)
  const emojiJourney =
    journeyMatch && journeyMatch[1]
      ? journeyMatch[1].trim().split(/\s+/).filter(Boolean)
      : []

  // 4. Pódio
  const podium: PodiumItem[] = []
  const lines = content.split('\n')
  for (const line of lines) {
    const match = line.match(/(🥇|🥈|🥉)\s*(\S+)(?:\s+(.*?))?\s*—\s*(\d+x|\d+)/)
    if (match && match[1] && match[2] && match[4]) {
      podium.push({
        medal: match[1],
        emoji: match[2],
        name: match[3]?.trim() || undefined,
        count: match[4],
      })
    }
  }

  return {
    targetUser,
    monthYear: {
      month: month.toUpperCase(),
      year,
      full: `${month.toUpperCase()} ${year}`,
    },
    emojiJourney,
    podium,
  }
}
