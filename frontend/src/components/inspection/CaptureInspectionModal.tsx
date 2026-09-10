import { useState } from 'react'
import { Check, ShieldAlert, Sparkles, X } from 'lucide-react'
import { EvidenceCapture, EvidenceCaptureError, type EvidencePreview } from './EvidenceCapture'
import { AiThinkingState } from '../ai/AiThinkingState'
import { usePrefersReducedMotion } from '../ai/useReducedMotion'
import { revealMs } from '../ai/aiTiming'
import { InspectionStatusBadge } from './InspectionStatusBadge'
import type { InspectionCaptureStatus } from '../../types'

export interface CaptureTarget {
  key: string
  /** e.g. "Crate 7 of 10" */
  title: string
  /** e.g. "Interior / middle section" */
  instruction?: string
  note?: string
  containerNumber?: number
}

type Phase = 'capture' | 'analyzing' | 'result' | 'upload_error'

const STAGES = ['Analyzing visible condition', 'Checking for visible quality concerns', 'Saving inspection evidence']

/**
 * Guides an operator (or farmer) through capturing one photo per target, one at a time -
 * "Crate 7 of 10" style. AI failure never blocks the sequence: a photo that can't be
 * analyzed is still saved as evidence (see inspectionService.submitCapture).
 */
export function CaptureInspectionModal({
  isOpen,
  onClose,
  title,
  targets,
  onSubmit,
  onComplete,
  /** Farmer declaration photos are evidence, not an independent verdict - hide the AI badge. */
  revealVerdict = true,
}: {
  isOpen: boolean
  onClose: () => void
  title: string
  targets: CaptureTarget[]
  onSubmit: (target: CaptureTarget, file: File) => Promise<{ status: InspectionCaptureStatus }>
  onComplete: () => void
  revealVerdict?: boolean
}) {
  const reduced = usePrefersReducedMotion()
  const [index, setIndex] = useState(0)
  const [preview, setPreview] = useState<EvidencePreview | null>(null)
  const [phase, setPhase] = useState<Phase>('capture')
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<InspectionCaptureStatus | null>(null)

  if (!isOpen) return null
  const target = targets[index]
  if (!target) return null
  const isLast = index === targets.length - 1

  const resetForNext = () => {
    if (preview) URL.revokeObjectURL(preview.previewUrl)
    setPreview(null)
    setPhase('capture')
    setResult(null)
    setError(null)
  }

  const handleAnalyze = async () => {
    if (!preview) return
    setPhase('analyzing')
    setError(null)
    const started = Date.now()
    try {
      const [outcome] = await Promise.all([
        onSubmit(target, preview.file),
        new Promise((resolve) => setTimeout(resolve, revealMs(reduced))),
      ])
      const elapsed = Date.now() - started
      if (elapsed < 200) await new Promise((r) => setTimeout(r, 200 - elapsed))
      setResult(outcome.status)
      setPhase('result')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed. Check your connection and try again.')
      setPhase('upload_error')
    }
  }

  const handleNext = () => {
    if (isLast) {
      resetForNext()
      onComplete()
      onClose()
    } else {
      setIndex((i) => i + 1)
      resetForNext()
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget && phase !== 'analyzing') onClose() }}>
      <section className="capture-modal-dialog" role="dialog" aria-modal="true">
        <header>
          <div>
            <h2>{title}</h2>
            {targets.length > 1 && <span className="capture-modal-step">{index + 1} of {targets.length}</span>}
          </div>
          <button className="icon-button" aria-label="Close" disabled={phase === 'analyzing'} onClick={onClose}><X size={19} /></button>
        </header>

        <div className="capture-modal-target">
          <strong>{target.title}</strong>
          {target.instruction && <p>Requested sample: <b>{target.instruction}</b></p>}
          {target.note && <p className="capture-modal-hint">{target.note}</p>}
        </div>

        {phase === 'capture' && (
          <>
            <EvidenceCapture
              preview={preview}
              onCapture={(p) => { setPreview(p); setError(null) }}
              onRemove={() => { if (preview) URL.revokeObjectURL(preview.previewUrl); setPreview(null) }}
              onError={setError}
            />
            {error && <EvidenceCaptureError message={error} />}
            <button type="button" className="btn btn-primary btn-full" disabled={!preview} onClick={handleAnalyze}>
              <Sparkles size={16} /> Analyze &amp; Save
            </button>
          </>
        )}

        {phase === 'analyzing' && (
          <div className="capture-modal-analyzing">
            {preview && <img src={preview.previewUrl} alt="Captured evidence" className="capture-modal-preview" />}
            <AiThinkingState stages={STAGES} brandLabel="AI-assisted inspection" thinkingLabel="Reviewing photo" />
          </div>
        )}

        {phase === 'result' && result && (
          <div className="capture-modal-result">
            {preview && <img src={preview.previewUrl} alt="Captured evidence" className="capture-modal-preview" />}
            <div className="capture-modal-result-row">
              <Check size={16} className="capture-modal-check" /> Photo captured
            </div>
            {revealVerdict ? (
              result === 'saved_ai_unavailable' ? (
                <div className="capture-modal-ai-unavailable">
                  <ShieldAlert size={16} /> Evidence saved · AI assessment unavailable
                </div>
              ) : (
                <div className="capture-modal-verdict">
                  AI-assisted inspection <InspectionStatusBadge status={result} />
                </div>
              )
            ) : (
              <p className="capture-modal-hint">Saved as declaration evidence.</p>
            )}
            <button type="button" className="btn btn-primary btn-full" onClick={handleNext}>
              {isLast ? 'Done' : 'Next photo'}
            </button>
          </div>
        )}

        {phase === 'upload_error' && (
          <div className="capture-modal-result">
            {preview && <img src={preview.previewUrl} alt="Captured evidence" className="capture-modal-preview" />}
            <EvidenceCaptureError message={error ?? 'Upload failed.'} />
            <div className="capture-modal-error-actions">
              <button type="button" className="btn btn-ghost" onClick={resetForNext}>Retake photo</button>
              <button type="button" className="btn btn-primary" onClick={handleAnalyze}>Try again</button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
