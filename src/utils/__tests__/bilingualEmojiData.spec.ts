import { describe, it, expect } from 'vitest'
import { getBilingualEmojiData } from '../bilingualEmojiData'

describe('bilingualEmojiData', () => {
  it('loads and caches bilingual emoji data correctly', () => {
    const data1 = getBilingualEmojiData()
    const data2 = getBilingualEmojiData()

    expect(data1).toBe(data2)
    expect(data1.emojis).toBeDefined()
  })

  it('contains both English and Portuguese keywords for heart emoji', () => {
    const data = getBilingualEmojiData()
    const heart = data.emojis['heart']

    expect(heart).toBeDefined()
    if (!heart) return
    const keywords = heart.keywords || []

    // English keywords
    expect(keywords).toContain('love')

    // Portuguese keywords
    expect(keywords).toContain('coração')
    expect(keywords).toContain('coracao')
    expect(keywords).toContain('amor')
  })

  it('contains both English and Portuguese keywords for feeling and animal emojis', () => {
    const data = getBilingualEmojiData()

    // Smile / Happy
    const smile = data.emojis['smile']
    expect(smile).toBeDefined()
    if (!smile) return
    expect(smile.keywords).toContain('happy')
    expect(smile.keywords).toContain('sorriso')
    expect(smile.keywords).toContain('feliz')

    // Dog / Cachorro
    const dog = data.emojis['dog']
    expect(dog).toBeDefined()
    if (!dog) return
    expect(dog.id).toBe('dog')
    expect(dog.keywords).toContain('puppy')
    expect(dog.keywords).toContain('cachorro')

    // Fire / Fogo
    const fire = data.emojis['fire']
    expect(fire).toBeDefined()
    if (!fire) return
    expect(fire.id).toBe('fire')
    expect(fire.keywords).toContain('flame')
    expect(fire.keywords).toContain('fogo')
  })
})
