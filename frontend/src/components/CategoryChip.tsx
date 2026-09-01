import type { Category } from '../types'
import { Sparkles } from 'lucide-react'

export function CategoryChip({ name, imageSrc, active, onClick }: { name: Category | 'All'; imageSrc?: string; active: boolean; onClick: () => void }) {
  return <button className={`category-chip ${active ? 'active' : ''}`} onClick={onClick}>{imageSrc ? <img src={imageSrc} alt="" /> : <Sparkles size={16} />}{name}</button>
}
