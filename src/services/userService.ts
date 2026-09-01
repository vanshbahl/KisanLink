import { demoUsers } from '../data/users'
import type { User } from '../types'

export const userService = {
  async getUser(id: string): Promise<User | null> {
    await new Promise((resolve) => window.setTimeout(resolve, 180))
    return demoUsers[id] ?? null
  },
}
