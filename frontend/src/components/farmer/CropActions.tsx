import { useState } from 'react'
import { Copy, IndianRupee, MoreHorizontal, Pause, PackageOpen, Play, Trash2, XCircle, Zap } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { Sheet, SheetAction } from './Sheet'
import { useFarmerText } from '../../i18n/farmer'
import { useToast } from '../../contexts/ToastContext'
import { apiClient } from '../../services/apiClient'
import { prototypeService } from '../../services/prototypeService'
import type { FarmerDeal } from '../../services/farmerDeal'
import type { FarmerListing } from '../../types'

/**
 * Everything a farmer can do to one crop: one visible verb, and a sheet holding the rest.
 *
 * Shared by the crop list and the crop page so the two can never drift — a farmer learns
 * "the three dots hold the other options" exactly once. The eight actions that used to sit
 * on every card (manage, edit, update quantity, pause, duplicate, mark unavailable, delete,
 * publish) all still exist; they are just no longer competing for attention on a list.
 */
export function CropActions({ item, deal, onChanged }: {
  item: FarmerListing
  deal: FarmerDeal | null
  onChanged: () => void
}) {
  const { f, pick } = useFarmerText()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<'price' | 'quantity' | null>(null)
  const [draftValue, setDraftValue] = useState('')
  const [busy, setBusy] = useState(false)

  const crop = pick(item.crop, item.cropHi)
  const rescue = Boolean(item.isUrgentRescue || item.rescueStatus === 'RESCUE_ACTIVE')
  const dealMatchesCrop = Boolean(deal && deal.cropEn.toLowerCase() === item.crop.toLowerCase() && deal.gainPerKg > 0)

  const run = async (action: () => Promise<unknown>, message: string) => {
    setBusy(true)
    try { await action(); showToast(message) }
    catch { showToast(f('somethingWrong')) }
    finally { setBusy(false); setSheetOpen(false); setEditing(null); onChanged() }
  }

  const patch = (values: Partial<FarmerListing>, message = f('cropUpdated')) =>
    run(() => prototypeService.patchListing(item.id, values), message)

  const commitEdit = () => {
    const value = Number(draftValue)
    if (!Number.isFinite(value) || value <= 0) { showToast(f('fillRequired')); return }
    if (editing === 'price') return patch({ pricePerKg: Math.round(value) })
    return patch({ remainingKg: Math.round(value), quantityKg: Math.round(value) + item.allocatedKg })
  }

  /**
   * Urgent rescue. The backend applies its own discount when the listing is a real record;
   * when it is not (created in this browser only) the same deterministic 25% cut is applied
   * locally so the flow still completes — unchanged from the previous produce detail page.
   */
  const sellItFast = () => run(async () => {
    let rescuePricePerKg: number
    try {
      const result = await apiClient.tagUrgentRescue(item.id)
      rescuePricePerKg = result.rescue_price_per_kg
    } catch {
      rescuePricePerKg = Math.round(item.pricePerKg * 0.75)
    }
    await prototypeService.patchListing(item.id, {
      isUrgentRescue: true,
      rescueDiscountPricePerKg: rescuePricePerKg,
      rescueStatus: 'RESCUE_ACTIVE',
    })
  }, f('fastSaleOn', { price: Math.round(item.pricePerKg * 0.75) }))

  const remove = () => {
    if (!window.confirm(f('deleteConfirm'))) return
    void run(async () => { await prototypeService.deleteListing(item.id); navigate('/farmer/fasal') }, f('cropUpdated'))
  }

  // One visible verb, chosen by what this crop actually needs next. `active` with no better
  // deal deliberately gets none: the crop is selling, and there is nothing to press.
  const primary = item.status === 'draft' || item.status === 'paused' || item.status === 'unavailable'
    ? (
      <button type="button" className="btn btn-primary f-crop-cta" disabled={busy} onClick={() => patch({ status: 'active' }, f('onSaleNow'))}>
        {item.status === 'draft' ? f('publishNow') : f('resumeSelling')}
      </button>
    )
    : item.status === 'active' && dealMatchesCrop
      ? <Link className="btn btn-primary f-crop-cta" to="/farmer/deal">{f('sellAtThisPrice')}</Link>
      : null

  return (
    <>
      <div className="f-crop-foot">
        {primary}
        <button type="button" className="f-crop-more" aria-label={f('cropOptions')} onClick={() => setSheetOpen(true)}>
          <MoreHorizontal size={22} />
        </button>
      </div>

      <Sheet open={sheetOpen} onClose={() => { setSheetOpen(false); setEditing(null) }} title={`${crop} — ${f('cropOptions')}`}>
        {editing ? (
          <div className="f-sheet-edit">
            <label className="f-field">
              <span>{editing === 'price' ? f('newPrice') : f('howMuchLeft')}</span>
              <input type="number" inputMode="numeric" min="1" autoFocus value={draftValue} onChange={(event) => setDraftValue(event.target.value)} />
            </label>
            <div className="f-sheet-edit-actions">
              <button type="button" className="btn btn-secondary btn-large" onClick={() => setEditing(null)}>{f('cancel')}</button>
              <button type="button" className="btn btn-primary btn-large" disabled={busy} onClick={commitEdit}>{f('save')}</button>
            </div>
          </div>
        ) : (
          <div className="f-sheet-actions">
            <SheetAction
              icon={<IndianRupee size={20} />}
              label={f('changePrice')}
              onClick={() => { setDraftValue(String(item.pricePerKg)); setEditing('price') }}
            />
            <SheetAction
              icon={<PackageOpen size={20} />}
              label={f('changeQuantity')}
              onClick={() => { setDraftValue(String(item.remainingKg)); setEditing('quantity') }}
            />
            {item.status === 'active' && !rescue && (
              <SheetAction icon={<Zap size={20} />} label={f('sellItFast')} hint={f('sellItFastHint')} onClick={sellItFast} />
            )}
            {item.status === 'active' && (
              <SheetAction icon={<Pause size={20} />} label={f('pauseSelling')} onClick={() => patch({ status: 'paused' })} />
            )}
            {(item.status === 'paused' || item.status === 'unavailable') && (
              <SheetAction icon={<Play size={20} />} label={f('resumeSelling')} onClick={() => patch({ status: 'active' }, f('onSaleNow'))} />
            )}
            <SheetAction
              icon={<Copy size={20} />}
              label={f('makeCopy')}
              onClick={() => run(async () => { await prototypeService.duplicateListing(item.id); navigate('/farmer/fasal') }, f('savedForLater'))}
            />
            {item.status !== 'unavailable' && (
              <SheetAction icon={<XCircle size={20} />} label={f('stopSelling')} onClick={() => patch({ status: 'unavailable' })} />
            )}
            <SheetAction icon={<Trash2 size={20} />} label={f('deleteCrop')} danger onClick={remove} />
          </div>
        )}
      </Sheet>
    </>
  )
}
