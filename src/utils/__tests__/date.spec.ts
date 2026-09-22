import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { relativeTime, formatDate, formatBirthDate } from '../date'

describe('date utils', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-22T15:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns agora mesmo for recent dates within 60s', () => {
    const date = new Date('2026-09-22T14:59:45Z').toISOString()
    expect(relativeTime(date)).toBe('agora mesmo')
  })

  it('returns agora mesmo for slight clock drift in future (<= 30s)', () => {
    const date = new Date('2026-09-22T15:00:15Z').toISOString()
    expect(relativeTime(date)).toBe('agora mesmo')
  })

  it('returns formatDate for dates significantly in future (> 30s)', () => {
    const futureDate = new Date('2026-09-22T18:00:00Z').toISOString()
    expect(relativeTime(futureDate)).toBe(formatDate(futureDate))
  })

  it('returns empty string for invalid dates', () => {
    expect(relativeTime('invalid-date')).toBe('')
  })

  it('formats minutes, hours and days correctly', () => {
    const fiveMinsAgo = new Date('2026-09-22T14:55:00Z').toISOString()
    expect(relativeTime(fiveMinsAgo)).toBe('há 5 min')

    const twoHoursAgo = new Date('2026-09-22T13:00:00Z').toISOString()
    expect(relativeTime(twoHoursAgo)).toBe('há 2 h')

    const threeDaysAgo = new Date('2026-09-19T15:00:00Z').toISOString()
    expect(relativeTime(threeDaysAgo)).toBe('há 3 d')
  })

  it('formatBirthDate parses YYYY-MM-DD correctly', () => {
    expect(formatBirthDate('1995-04-12')).toBe('12/04/1995')
    expect(formatBirthDate(null)).toBe('')
  })
})
