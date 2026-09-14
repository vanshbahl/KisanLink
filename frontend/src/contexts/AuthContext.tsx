import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { authService } from '../services/authService'
import type { Role, Session, User } from '../types'

interface AuthContextValue {
  session: Session | null
  user: User | null
  loginDemo: (role: Role) => Promise<Session>
  verifyOtp: (otp: string) => Promise<Session>
  logout: () => void
  switchRole: (role: Role) => Promise<Session>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => authService.getSession())

  const [, setProfileRevision] = useState(0)
  useEffect(() => {
    const sync = () => setProfileRevision(value => value + 1)
    window.addEventListener('kisanlink-state', sync)
    window.addEventListener('storage', sync)
    return () => { window.removeEventListener('kisanlink-state', sync); window.removeEventListener('storage', sync) }
  }, [])

  const value: AuthContextValue = {
    session,
    user: session ? authService.getCurrentUser() : null,
    async loginDemo(role) {
      const next = await authService.loginDemo(role)
      setSession(next)
      return next
    },
    async verifyOtp(otp) {
      const next = await authService.verifyOtp(otp)
      setSession(next)
      return next
    },
    logout() {
      authService.logout()
      setSession(null)
    },
    async switchRole(role) {
      const next = await authService.loginDemo(role)
      setSession(next)
      return next
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
