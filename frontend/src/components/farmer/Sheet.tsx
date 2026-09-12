import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { useFarmerText } from '../../i18n/farmer'

/**
 * Bottom sheet — the farmer module's one progressive-disclosure surface.
 *
 * Everything that used to sit permanently on a card (eight listing actions, an OTP, a price
 * explanation, a dispute form) opens here instead, so the screen behind it keeps to one
 * decision. On desktop the same component centres itself rather than becoming a second
 * pattern to learn.
 *
 * Scroll on the page behind is locked while open, otherwise a phone scrolls the page under
 * the sheet as soon as the sheet's own content reaches its end.
 */
export function Sheet({ open, onClose, title, children, footer }: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
}) {
  const { f } = useFarmerText()

  useEffect(() => {
    if (!open) return
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', escape)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', escape)
    }
  }, [open, onClose])

  if (!open) return null

  // Portalled to <body> so the sheet is never trapped inside a page-level stacking context —
  // the fixed bottom navigation would otherwise draw over its lower edge, hiding exactly the
  // part that holds the OTP digits and the confirm button.
  return createPortal(
    <div className="f-sheet-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="f-sheet" role="dialog" aria-modal="true" aria-label={title}>
        <header className="f-sheet-head">
          <h2>{title}</h2>
          <button type="button" className="icon-button" onClick={onClose} aria-label={f('close')}><X size={20} /></button>
        </header>
        <div className="f-sheet-body">{children}</div>
        {footer && <div className="f-sheet-foot">{footer}</div>}
      </section>
    </div>,
    document.body,
  )
}

/** A full-width row inside a sheet: icon, label, optional explanation. */
export function SheetAction({ icon, label, hint, onClick, danger = false }: {
  icon: ReactNode
  label: string
  hint?: string
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button type="button" className={`f-sheet-action${danger ? ' is-danger' : ''}`} onClick={onClick}>
      <span className="f-sheet-action-icon">{icon}</span>
      <span className="f-sheet-action-copy">
        <strong>{label}</strong>
        {hint && <small>{hint}</small>}
      </span>
    </button>
  )
}
