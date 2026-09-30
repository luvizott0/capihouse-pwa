import { describe, it, expect } from 'vitest'
import { parseRecapData } from '@/utils/recap'
import type { Post } from '@/types/models'

describe('parseRecapData', () => {
  const basePost = {
    id: 1,
    user_id: 2,
    content: '',
    likes_count: 0,
    comments_count: 0,
    created_at: '2026-09-30T12:00:00Z',
    user: {
      id: 2,
      name: 'Capivara Rogéria',
      username: 'capivara.rogeria',
      email: 'capivara@rogeria.com',
      avatar_url: null,
      banner_url: null,
      status: 'approved',
      role: 'admin',
      bio: null,
      birth: null,
    },
    media: [],
    feeling: null,
    hashtags: [],
    comments: [],
  } as unknown as Post

  it('correctly parses standard monthly recap post', () => {
    const post: Post = {
      ...basePost,
      content: `✨ Olá, @bento! O mês de Setembro chegou ao fim e eu preparei o seu Recap de Sentimentos! 🐾

📜 Sua jornada de sentimentos no mês:
😊 😊 😊 🌿 🌿 ☕ 🚀

🏆 Pódio dos sentimentos mais frequentes:
🥇 😊 Feliz — 10x
🥈 🌿 Zen — 7x
🥉 ☕ Aconchegado — 5x

Que o próximo mês seja ainda mais acolhedor na CapiHouse! 🌿🛋️`,
      mentions: [
        {
          id: 5,
          name: 'Bento Silva',
          username: 'bento',
          avatar_url: 'https://example.com/avatar.jpg',
        },
      ] as unknown as Post['mentions'],
    }

    const data = parseRecapData(post)
    expect(data.targetUser.name).toBe('Bento Silva')
    expect(data.targetUser.username).toBe('bento')
    expect(data.targetUser.avatar_url).toBe('https://example.com/avatar.jpg')
    expect(data.monthYear.month).toBe('SETEMBRO')
    expect(data.emojiJourney).toEqual(['😊', '😊', '😊', '🌿', '🌿', '☕', '🚀'])
    expect(data.podium).toHaveLength(3)
    expect(data.podium[0]).toEqual({
      medal: '🥇',
      emoji: '😊',
      name: 'Feliz',
      count: '10x',
    })
    expect(data.podium[1]).toEqual({
      medal: '🥈',
      emoji: '🌿',
      name: 'Zen',
      count: '7x',
    })
    expect(data.podium[2]).toEqual({
      medal: '🥉',
      emoji: '☕',
      name: 'Aconchegado',
      count: '5x',
    })
  })

  it('handles variations in dashes and spacing in podium lines', () => {
    const post: Post = {
      ...basePost,
      content: `O mês de Outubro chegou ao fim!
📜 Sua jornada de sentimentos no mês:
🎉 🍉 ❤️

🏆 Pódio dos sentimentos mais frequentes:
🥇 🎉 Festeiro - 5x
🥈 🍉 Com fome – 3x
🥉 ❤️ Apaixonado: 2x`,
    }

    const data = parseRecapData(post)
    expect(data.podium).toHaveLength(3)
    expect(data.podium[0]).toEqual({
      medal: '🥇',
      emoji: '🎉',
      name: 'Festeiro',
      count: '5x',
    })
    expect(data.podium[1]).toEqual({
      medal: '🥈',
      emoji: '🍉',
      name: 'Com fome',
      count: '3x',
    })
    expect(data.podium[2]).toEqual({
      medal: '🥉',
      emoji: '❤️',
      name: 'Apaixonado',
      count: '2x',
    })
  })

  it('handles podium items with only emoji or only name', () => {
    const post: Post = {
      ...basePost,
      content: `O mês de Maio chegou ao fim!
📜 Sua jornada de sentimentos no mês:
😊 🚀

🏆 Pódio dos sentimentos mais frequentes:
🥇 😊 — 8x
🥈 Empolgado — 4x`,
    }

    const data = parseRecapData(post)
    expect(data.podium).toHaveLength(2)
    expect(data.podium[0]).toEqual({
      medal: '🥇',
      emoji: '😊',
      name: undefined,
      count: '8x',
    })
    expect(data.podium[1]).toEqual({
      medal: '🥈',
      emoji: '',
      name: 'Empolgado',
      count: '4x',
    })
  })

  it('handles journey emojis without spaces using segmenter', () => {
    const post: Post = {
      ...basePost,
      content: `O mês de Abril chegou ao fim!
Sua jornada de sentimentos no mês:
😊🌿☕🚀
Pódio dos sentimentos mais frequentes:
🥇 😊 Feliz — 1x`,
    }

    const data = parseRecapData(post)
    expect(data.emojiJourney).toEqual(['😊', '🌿', '☕', '🚀'])
    expect(data.podium[0]?.name).toBe('Feliz')
  })
})
