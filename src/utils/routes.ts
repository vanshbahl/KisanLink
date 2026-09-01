import type { Role } from '../types'

export const roleHome = (role: Role) => role === 'farmer' ? '/farmer' : role === 'consumer' ? '/consumer' : '/bulk'

export const roleLabel = (role: Role) => role === 'bulk' ? 'Bulk Buyer' : role.charAt(0).toUpperCase() + role.slice(1)
