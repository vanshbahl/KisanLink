import { useRef } from 'react'
import { AlertTriangle, Camera, RotateCcw, Trash2, Upload } from 'lucide-react'

const MAX_BYTES = 10 * 1024 * 1024
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp']

export interface EvidencePreview {
  file: File
  previewUrl: string
}

/**
 * One photo-evidence capture control, reused everywhere a checkpoint needs a picture:
 * farmer lot photos, logistics sample captures, dropoff condition, warehouse receipt.
 *
 * `capture="environment"` opens the rear camera directly on a phone; the same `<input
 * type="file">` still works as a normal file picker on a laptop, so nothing extra is
 * needed for demo/desktop use.
 */
export function EvidenceCapture({
  preview,
  onCapture,
  onRemove,
  onError,
  disabled,
  compact,
}: {
  preview: EvidencePreview | null
  onCapture: (preview: EvidencePreview) => void
  onRemove: () => void
  onError: (message: string) => void
  disabled?: boolean
  compact?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (file: File | undefined) => {
    if (!file) return
    if (!ACCEPTED.includes(file.type)) {
      onError('Unsupported format. Use a JPEG, PNG, or WebP photo.')
      return
    }
    if (file.size > MAX_BYTES) {
      onError('Image is too large (max 10 MB). Try again with a smaller photo.')
      return
    }
    if (file.size === 0) {
      onError('That image looks empty or unreadable. Please retake it.')
      return
    }
    const previewUrl = URL.createObjectURL(file)
    onCapture({ file, previewUrl })
  }

  if (preview) {
    return (
      <div className={`evidence-capture evidence-capture-filled${compact ? ' compact' : ''}`}>
        <img src={preview.previewUrl} alt="Captured evidence" />
        <div className="evidence-capture-actions">
          <button type="button" className="btn btn-ghost btn-sm" disabled={disabled} onClick={() => inputRef.current?.click()}>
            <RotateCcw size={14} /> Retake
          </button>
          <button type="button" className="btn btn-ghost btn-sm evidence-remove" disabled={disabled} onClick={onRemove}>
            <Trash2 size={14} /> Remove
          </button>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          hidden
          onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = '' }}
        />
      </div>
    )
  }

  return (
    <div className={`evidence-capture evidence-capture-empty${compact ? ' compact' : ''}`}>
      <button type="button" className="btn btn-primary btn-full" disabled={disabled} onClick={() => inputRef.current?.click()}>
        <Camera size={16} /> Open Camera
      </button>
      <label className="evidence-upload-fallback">
        <Upload size={13} /> or choose a file
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          hidden
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </label>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        hidden
        onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = '' }}
      />
    </div>
  )
}

export function EvidenceCaptureError({ message }: { message: string }) {
  return (
    <p className="evidence-error-note">
      <AlertTriangle size={14} /> {message}
    </p>
  )
}
