import { useEffect, useState } from 'react'
import {
  EvidenceCapture,
  type EvidencePreview,
} from '../../components/inspection/EvidenceCapture'
import { inspectionService } from '../../services/inspectionService'
import type { Delivery, DropoffCondition } from '../../types'

export function DropoffConditionCard({
  item,
  l,
  onSaved,
}: {
  item: Delivery
  l: (en: string, hi: string) => string
  onSaved: () => void
}) {
  const [existing, setExisting] = useState<DropoffCondition | undefined>(
    undefined,
  )
  const [sealed, setSealed] = useState(true)
  const [intact, setIntact] = useState(true)
  const [preview, setPreview] = useState<EvidencePreview | null>(null)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!item.lotCode) return
    inspectionService
      .getLotState(item.lotCode)
      .then((entry) => setExisting(entry?.dropoffCondition))
  }, [item.lotCode])

  if (!item.lotCode) return null

  const save = async () => {
    setSaving(true)
    try {
      const condition: DropoffCondition = {
        sealed,
        packagingIntact: intact,
        photoUrl: preview?.previewUrl,
        capturedAt: new Date().toISOString(),
        capturedBy: `${item.vehicleId ?? 'Operator'} (Logistics)`,
      }
      await inspectionService.recordDropoffCondition(item.lotCode!, condition)
      setExisting(condition)
      onSaved()
    } catch (error) {
      setPhotoError(
        error instanceof Error
          ? error.message
          : l(
              'Unable to save handoff condition',
              'हैंडओवर स्थिति सहेज नहीं पाए',
            ),
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="dropoff-condition-card">
      <h2 className="section-title">
        {l('Condition at handoff', 'हैंडओवर पर स्थिति')}
      </h2>
      {existing ? (
        <>
          <div className="dropoff-toggle-row">
            <span>{l('Load condition', 'लोड की स्थिति')}</span>
            <strong>
              {existing.sealed
                ? l('Good', 'ठीक')
                : l('Review needed', 'जांच ज़रूरी')}
            </strong>
          </div>
          <div className="dropoff-toggle-row">
            <span>{l('Packaging', 'पैकेजिंग')}</span>
            <strong>
              {existing.packagingIntact
                ? l('Intact', 'सुरक्षित')
                : l('Damaged', 'क्षतिग्रस्त')}
            </strong>
          </div>
          {existing.photoUrl && (
            <a href={existing.photoUrl} target="_blank" rel="noreferrer">
              <img
                className="dispatch-evidence"
                src={existing.photoUrl}
                alt={l('Handover evidence', 'हैंडओवर प्रमाण')}
              />
            </a>
          )}
          <div className="dropoff-toggle-row">
            <span>{l('Visual evidence', 'दृश्य प्रमाण')}</span>
            <strong>
              {existing.photoUrl
                ? l('Captured', 'लिया गया')
                : l('Not captured', 'नहीं लिया गया')}
            </strong>
          </div>
        </>
      ) : (
        <>
          <div className="dropoff-toggle-row">
            <span>{l('Load still sealed?', 'लोड अभी भी सील है?')}</span>
            <div className="chip-toggle">
              <button
                type="button"
                className={sealed ? 'active is-good' : ''}
                onClick={() => setSealed(true)}
              >
                {l('Yes', 'हां')}
              </button>
              <button
                type="button"
                className={!sealed ? 'active is-bad' : ''}
                onClick={() => setSealed(false)}
              >
                {l('No', 'नहीं')}
              </button>
            </div>
          </div>
          <div className="dropoff-toggle-row">
            <span>{l('Packaging intact?', 'पैकेजिंग सुरक्षित है?')}</span>
            <div className="chip-toggle">
              <button
                type="button"
                className={intact ? 'active is-good' : ''}
                onClick={() => setIntact(true)}
              >
                {l('Yes', 'हां')}
              </button>
              <button
                type="button"
                className={!intact ? 'active is-bad' : ''}
                onClick={() => setIntact(false)}
              >
                {l('No', 'नहीं')}
              </button>
            </div>
          </div>
          <EvidenceCapture
            compact
            preview={preview}
            onCapture={setPreview}
            onRemove={() => setPreview(null)}
            onError={setPhotoError}
          />
          {photoError && <small className="field-hint">{photoError}</small>}
          <button
            type="button"
            className="btn btn-primary btn-full"
            disabled={saving}
            onClick={save}
          >
            {saving
              ? l('Saving…', 'सहेज रहे हैं…')
              : l('Save handoff condition', 'हैंडओवर स्थिति सहेजें')}
          </button>
        </>
      )}
    </div>
  )
}
