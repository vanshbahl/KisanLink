import { BadgeCheck } from 'lucide-react'

export function StatusBadge({ children, tone = 'green', verified = false }: { children: React.ReactNode; tone?: 'green' | 'amber' | 'neutral' | 'red'; verified?: boolean }) {
  return <span className={`status-badge status-${tone}`}>{verified && <BadgeCheck size={14} />}{children}</span>
}
