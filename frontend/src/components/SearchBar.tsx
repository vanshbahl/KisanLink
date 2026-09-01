import { Search, SlidersHorizontal } from 'lucide-react'

export function SearchBar({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <label className="search-bar">
      <Search size={20} />
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder="Search vegetables, fruits, grains..." aria-label="Search produce" />
      <button type="button" aria-label="Search filters"><SlidersHorizontal size={18} /></button>
    </label>
  )
}
