import { demoUserIdByRole, demoUsers } from '../data/users'
import type { Role, Session, User } from '../types'
import { roleHome } from '../utils/routes'
import { prototypeService } from './prototypeService'

const SESSION_KEY = 'kisanlink_session'
const PENDING_KEY = 'kisanlink_pending_auth'
/** Set while a session that came through the OTP screen still owes the farmer onboarding. */
const OTP_LOGIN_KEY = 'kisanlink_otp_login'

export interface PendingAuth {
  phone: string
  role: Role
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
    // The farmer entry in `demoUsers` reads live from the onboarding profile (see data/users.ts).
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

    const matchingUser = Object.values(demoUsers).find((user) => user.phone === pending.phone && user.role === pending.role)
    const userId = matchingUser?.id ?? demoUserIdByRole[pending.role]
    const session: Session = { authenticated: true, role: demoUsers[userId].role, userId }
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    sessionStorage.removeItem(PENDING_KEY)
    if (session.role === 'farmer') prototypeService.setFarmerLoginPhone(pending.phone)
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
    if (this.getSession()?.role === 'farmer') prototypeService.resetFarmerOnboarding()
    localStorage.removeItem(SESSION_KEY)
    sessionStorage.removeItem(PENDING_KEY)
    sessionStorage.removeItem(OTP_LOGIN_KEY)
  },

  /** Called by the OTP screen just before verifying, so `postLoginPath` knows this was a real sign-in. */
  markOtpLogin(): void {
    try { sessionStorage.setItem(OTP_LOGIN_KEY, '1') } catch { /* private mode: onboarding is simply skipped */ }
  },

  clearOtpLogin(): void {
    sessionStorage.removeItem(OTP_LOGIN_KEY)
  },

  /**
   * Where a signed-in user lands. A farmer with no completed profile (every farmer after a
   * logout, since `logout` resets onboarding for repeat demos) goes through onboarding first;
   * every other role goes straight home. The OTP screen, the welcome page and the route
   * guards all use this, so they can never disagree.
   */
  postLoginPath(role: Role): string {
    if (role === 'farmer' && prototypeService.farmerNeedsOnboarding()) return '/farmer/onboarding'
    return roleHome(role)
  },
}
