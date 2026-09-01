import { demoUserIdByRole, demoUsers } from '../data/users'
import type { Role, Session, User } from '../types'

const SESSION_KEY = 'kisanlink_session'
const PENDING_KEY = 'kisanlink_pending_auth'

export interface PendingAuth {
  phone: string
  role: Role
  mode: 'login' | 'signup'
}

const delay = (ms = 300) => new Promise((resolve) => window.setTimeout(resolve, ms))

export const authService = {
  getSession(): Session | null {
    try {
      const stored = localStorage.getItem(SESSION_KEY)
      return stored ? (JSON.parse(stored) as Session) : null
    } catch {
      localStorage.removeItem(SESSION_KEY)
      return null
    }
  },

  getCurrentUser(): User | null {
    const session = this.getSession()
    return session ? demoUsers[session.userId] ?? null : null
  },

  async requestOtp(pending: PendingAuth): Promise<void> {
    await delay(450)
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(pending))
  },

  getPendingAuth(): PendingAuth | null {
    try {
      const stored = sessionStorage.getItem(PENDING_KEY)
      return stored ? (JSON.parse(stored) as PendingAuth) : null
    } catch {
      return null
    }
  },

  async verifyOtp(otp: string): Promise<Session> {
    await delay(400)
    if (otp !== '123456') throw new Error('Please enter the demo OTP 123456')
    const pending = this.getPendingAuth()
    if (!pending) throw new Error('Your verification request expired. Please try again.')

    const matchingUser = Object.values(demoUsers).find((user) => user.phone === pending.phone)
    const userId = matchingUser?.id ?? demoUserIdByRole[pending.role]
    const session: Session = { authenticated: true, role: demoUsers[userId].role, userId }
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    sessionStorage.removeItem(PENDING_KEY)
    return session
  },

  async loginDemo(role: Role): Promise<Session> {
    await delay(240)
    const userId = demoUserIdByRole[role]
    const session: Session = { authenticated: true, role, userId }
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    return session
  },

  logout(): void {
    localStorage.removeItem(SESSION_KEY)
    sessionStorage.removeItem(PENDING_KEY)
  },
}
