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
  interface IntlSegment {
    segment: string
  }
  interface IntlSegmenterInstance {
    segment(input: string): Iterable<IntlSegment>
  }
  interface IntlWithSegmenter {
    Segmenter?: new (locale: string, options?: { granularity: string }) => IntlSegmenterInstance
  }

  const emojiRegex = /\p{Extended_Pictographic}/u
  const journeyMatch = content.match(/(?:📜\s*)?Sua jornada de sentimentos no mês:\s*([\s\S]*?)\s*(?:🏆\s*)?P[oó]dio/i)
  let emojiJourney: string[] = []
  const intlWithSeg = Intl as unknown as IntlWithSegmenter

  if (journeyMatch && journeyMatch[1]) {
    const rawJourney = journeyMatch[1].trim()
    if (intlWithSeg.Segmenter) {
      const segmenter = new intlWithSeg.Segmenter('en', { granularity: 'grapheme' })
      emojiJourney = Array.from(segmenter.segment(rawJourney))
        .map((s: IntlSegment) => String(s?.segment ?? '').trim())
        .filter((s: string) => s.length > 0 && emojiRegex.test(s))
    } else {
      emojiJourney = rawJourney.split(/\s+/).filter(Boolean)
    }
  }

  // 4. Pódio
  const podium: PodiumItem[] = []
  const lines = content.split('\n')
  for (const line of lines) {
    const trimmedLine = line.trim()
    const match = trimmedLine.match(/^(🥇|🥈|🥉|⭐|\d+[ºª°]?)\s*(.*?)\s*(?:[-—–:]|\s+—\s+)\s*(\d+\s*x?|\d+\s*vezes?)/i)
    if (match) {
      const medal = match[1] ?? ''
      const middle = (match[2] ?? '').trim()
      const count = match[3] ?? ''

      if (!medal || !count) continue

      let emoji = ''
      let name = ''

      if (intlWithSeg.Segmenter) {
        const segmenter = new intlWithSeg.Segmenter('en', { granularity: 'grapheme' })
        const segments: string[] = Array.from(segmenter.segment(middle)).map((s: IntlSegment) => String(s?.segment ?? ''))
        const firstSegment = segments[0] ?? ''
        if (firstSegment && emojiRegex.test(firstSegment)) {
          emoji = firstSegment
          name = segments.slice(1).join('').trim()
        } else {
          name = middle
        }
      } else {
        const spaceIdx = middle.indexOf(' ')
        if (spaceIdx > -1) {
          emoji = middle.substring(0, spaceIdx).trim()
          name = middle.substring(spaceIdx + 1).trim()
        } else if (emojiRegex.test(middle)) {
          emoji = middle
        } else {
          name = middle
        }
      }

      podium.push({
        medal,
        emoji,
        name: name || undefined,
        count,
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
