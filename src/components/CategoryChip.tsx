import type { Category } from '../types'

export function CategoryChip({ name, emoji, active, onClick }: { name: Category | 'All'; emoji: string; active: boolean; onClick: () => void }) {
  return <button className={`category-chip ${active ? 'active' : ''}`} onClick={onClick}><span>{emoji}</span>{name}</button>
}
