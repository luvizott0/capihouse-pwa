import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useStorageStatus } from '../useStorageStatus'
import * as systemApi from '@/api/system'

describe('useStorageStatus', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('updates storage status when checkStorageStatus succeeds (online)', async () => {
    vi.spyOn(systemApi, 'getStorageStatus').mockResolvedValue({
      available: true,
      disk: 's3',
      message: 'Servidor operacional.',
      checked_at: '2026-09-29T20:00:00Z',
    })

    const { isStorageAvailable, isCheckingStorage, checkStorageStatus, storageStatusMessage } = useStorageStatus()

    const promise = checkStorageStatus(true)
    expect(isCheckingStorage.value).toBe(true)

    const result = await promise
    expect(result).toBe(true)
    expect(isStorageAvailable.value).toBe(true)
    expect(isCheckingStorage.value).toBe(false)
    expect(storageStatusMessage.value).toBe('Servidor operacional.')
  })

  it('updates storage status when checkStorageStatus reports offline', async () => {
    vi.spyOn(systemApi, 'getStorageStatus').mockResolvedValue({
      available: false,
      disk: 's3',
      message: 'NAS inacessível na rede.',
      checked_at: '2026-09-29T20:00:00Z',
    })

    const { isStorageAvailable, isCheckingStorage, checkStorageStatus, storageStatusMessage } = useStorageStatus()

    const result = await checkStorageStatus(true)
    expect(result).toBe(false)
    expect(isStorageAvailable.value).toBe(false)
    expect(isCheckingStorage.value).toBe(false)
    expect(storageStatusMessage.value).toBe('NAS inacessível na rede.')
  })

  it('handles network failure gracefully as offline', async () => {
    vi.spyOn(systemApi, 'getStorageStatus').mockRejectedValue(new Error('Network error'))

    const { isStorageAvailable, checkStorageStatus } = useStorageStatus()

    const result = await checkStorageStatus(true)
    expect(result).toBe(false)
    expect(isStorageAvailable.value).toBe(false)
  })
})
