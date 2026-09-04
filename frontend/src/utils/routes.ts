import type { Role } from '../types'

export const roleHome = (role: Role) => role === 'farmer' ? '/farmer' : role === 'consumer' ? '/consumer' : role === 'bulk' ? '/bulk' : '/logistics'
