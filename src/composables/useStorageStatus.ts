import { ref } from 'vue'
import { getStorageStatus } from '@/api/system'

// Estado compartilhado em nível de módulo para que diferentes componentes
// (ex: PostCreateModal e PostEditModal) compartilhem o status recente sem chamadas repetidas
const isStorageAvailable = ref<boolean>(true)
const isCheckingStorage = ref<boolean>(false)
const storageStatusMessage = ref<string>('')
const lastCheckedAt = ref<string | null>(null)

export function useStorageStatus() {
  async function checkStorageStatus(fresh = false): Promise<boolean> {
    isCheckingStorage.value = true
    try {
      const data = await getStorageStatus(fresh)
      isStorageAvailable.value = data.available
      storageStatusMessage.value = data.message || ''
      lastCheckedAt.value = data.checked_at
      return data.available
    } catch {
      // Se não conseguir checar ou houver falha de rede grave
      isStorageAvailable.value = false
      storageStatusMessage.value = 'Não foi possível verificar a conectividade do servidor de armazenamento.'
      return false
    } finally {
      isCheckingStorage.value = false
    }
  }

  return {
    isStorageAvailable,
    isCheckingStorage,
    storageStatusMessage,
    lastCheckedAt,
    checkStorageStatus,
  }
}
