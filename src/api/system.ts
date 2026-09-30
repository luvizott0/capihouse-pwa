import apiClient from './client'

export interface StorageStatusResponse {
  available: boolean
  disk: string
  message: string
  checked_at: string
}

export async function getStorageStatus(fresh = false): Promise<StorageStatusResponse> {
  const { data } = await apiClient.get<StorageStatusResponse>('/system/storage-status', {
    params: fresh ? { fresh: 1 } : undefined,
  })
  return data
}
