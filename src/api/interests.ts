import client from './client'
import type { Interest } from '@/types/models'

export const getInterests = () => client.get<Interest[]>('/interests')
export const syncInterests = (interests: (string | number)[]) => client.post('/profile/interests', { interests })
