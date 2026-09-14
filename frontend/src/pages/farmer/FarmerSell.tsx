import { useEffect, useState } from 'react'
import { ArrowLeft, Check, ChevronDown, Mic, Minus, Phone, Plus, Sparkles, Sprout, Truck } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { EvidenceCapture, EvidenceCaptureError, type EvidencePreview } from '../../components/inspection/EvidenceCapture'
import { BehtarSaudaTeaser } from '../../components/farmer/BehtarSauda'
import { FreshnessRing } from '../../components/farmer/FreshnessRing'
import { VoiceInputModal } from '../../components/voice/VoiceInputModal'
import { useToast } from '../../contexts/ToastContext'
import { useFarmerText, money, relativeDay } from '../../i18n/farmer'
import { fetchLivePriceOptions, type PriceOption } from '../../services/farmerAiService'
import { cropIntelFor, cropKeys } from '../../services/farmerDeal'
import { inspectionService, type LotContext } from '../../services/inspectionService'
import { prototypeService } from '../../services/prototypeService'
import { mandiBenchmarkService } from '../../services/mandiBenchmarkService'
import { listingPricesFrom, sourceMeta } from '../../services/pricingEngine'
import { MandiSourceNote } from '../../components/MandiSourceNote'
import { localDay, daysUntil } from '../../utils/dates'
import { takeVoiceDraft } from './voiceDraft'
import type { FarmerListing, ListingStatus, PackagingType } from '../../types'

/**
 * Selling, in three steps instead of five plus a parallel "assisted" form.
 *
 *   1. क्या बेचना है?   — pick a crop, or say it out loud
 *   2. कितना माल है?    — one big number, everything else collapsed
 *   3. दाम और पिकअप     — a price we suggest, and when the vehicle comes
 *
 * What changed, and why:
 *
 *  - Only the fields the save actually requires (crop, quantity, price, harvest date,
 *    available-from) are on the path, and all five have working defaults. Grade, packaging,
 *    container count, unit weight, photos, farming method and notes still exist and still
 *    reach `saveListing` / `inspectionService` — they sit under "और जानकारी", because a
 *    farmer selling 250 kg of tomatoes should not have to answer "unit weight per container"
 *    before naming a price.
 *  - The price is fetched, awaited and shown with an honest message. The previous flow ran
 *    a 3.6-second staged animation over it; the call itself usually resolves in well under
 *    a second, and pretending otherwise wastes the farmer's time.
 *  - "Assisted mode" was a second, near-duplicate form. The thing it actually provided — a
 *    number to call — is now on every step, and `?assisted=1` still tags the listing so the
 *    call-centre badge keeps appearing wherever it did before.
 */
// No price lives here. The default ask, the mandi anchor and the local-market reference for
// every crop come from the centralized pricing engine over the live AGMARKNET benchmark
// (`pricesFor`), so this wizard, the crop cards and the Market Maker always quote one ladder:
// the suggested ask is the engine's normal price, and a Market Maker price is only ever above it.
//
// The Market Maker is *not* part of these three steps. "बेहतर सौदा" is its own screen
// (/farmer/sauda); this page only carries a compact teaser below the actions, and a `deal`
// query param when the farmer arrived from a deal, so the saved listing is tagged with it.
const CROPS = [
  { en: 'Fresh Tomatoes', hi: 'टमाटर', image: '/assets/produce/tomato.webp', visual: 'tomato' as const, category: 'Vegetables' as const },
  { en: 'New Potatoes', hi: 'आलू', image: '/assets/produce/potato.webp', visual: 'potato' as const, category: 'Staples' as const },
  { en: 'Red Onion', hi: 'प्याज़', image: '/assets/produce/onion.webp', visual: 'onion' as const, category: 'Vegetables' as const },
  { en: 'Baby Spinach', hi: 'बेबी पालक', image: '/assets/produce/spinach.webp', visual: 'leafy' as const, category: 'Vegetables' as const },
  { en: 'Sharbati Wheat', hi: 'गेहूं', image: '/assets/produce/wheat.webp', visual: 'grain' as const, category: 'Grains' as const },
  { en: 'Sweet Carrots', hi: 'गाजर', image: '/assets/produce/carrot.webp', visual: 'root' as const, category: 'Vegetables' as const },
]

/** Engine prices for a crop name; a crop KisanLink cannot benchmark keeps whatever the form holds. */
function pricesFor(cropName: string) {
  const pricing = mandiBenchmarkService.pricingFor(cropName)
  if (!pricing) return null
  return { ...listingPricesFrom(pricing.ladder), mandiSource: sourceMeta(pricing.benchmark) }
}

const QUANTITY_CHIPS = [50, 100, 250, 500, 1000]
const PACKAGING: { value: PackagingType; key: 'crates' | 'sacks' | 'baskets' | 'loose' }[] = [
  { value: 'CRATE', key: 'crates' }, { value: 'SACK', key: 'sacks' },
  { value: 'BASKET', key: 'baskets' }, { value: 'LOOSE', key: 'loose' },
]

/** Same shape the backend's generator produces; used only when a listing never round-trips. */
function clientLotCode(cropName: string): string {
  const letters = cropName.replace(/[^A-Za-z]/g, '').toUpperCase()
  const prefix = (letters.slice(0, 3) || 'LOT').padEnd(3, 'X')
  return `KL-${prefix}-${Math.floor(1000 + Math.random() * 9000)}`
}

function blankListing(crop?: string, dealId?: string): FarmerListing {
  // A deal names its crop the board's way ("Tomatoes"), so fall back to a crop-key match.
  const match = CROPS.find((item) => item.en === crop)
    ?? (crop ? CROPS.find((item) => cropKeys(item.en).some((key) => cropKeys(crop).includes(key))) : undefined)
    ?? CROPS[0]
  return {
    id: `listing_${Date.now()}`,
    crop: match.en, cropHi: match.hi, category: match.category,
    imageSrc: match.image, visual: match.visual,
    quantityKg: 100, remainingKg: 100, allocatedKg: 0, unit: 'kg', grade: 'Grade A',
    harvestDate: localDay(0), availableFrom: localDay(0), farmingMethod: '', notes: '',
    ...(pricesFor(match.en) ?? { pricePerKg: 1, mandiPricePerKg: 0, retailPricePerKg: 0 }),
    farmerId: 'farmer_001', farm: 'Green Field Farm',
    pickupDate: localDay(1), pickupWindow: 'Morning · 7–10 AM', fulfillment: 'pickup',
    status: 'draft', assisted: false, views: 0, inquiries: 0, createdAt: localDay(0),
    marketMakerId: dealId,
  }
}

export function FarmerSell() {
  const { f, language, pick } = useFarmerText()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const editId = params.get('edit')
  const assisted = params.get('assisted') === '1'

  const [step, setStep] = useState(1)
  const [form, setForm] = useState<FarmerListing>(() => blankListing(params.get('crop') ?? undefined, params.get('deal') ?? undefined))
  const [customCrop, setCustomCrop] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [voiceOpen, setVoiceOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [photos, setPhotos] = useState<EvidencePreview[]>([])
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [priceOptions, setPriceOptions] = useState<PriceOption[] | null>(null)
  const [priceLoading, setPriceLoading] = useState(false)

  const update = <K extends keyof FarmerListing>(key: K, value: FarmerListing[K]) =>
    setForm((current) => ({ ...current, [key]: value }))

  const applyDraft = (fields: NonNullable<ReturnType<typeof takeVoiceDraft>>) => {
    const match = CROPS.find((item) =>
      item.en.toLowerCase().includes(fields.crop.toLowerCase())
      || fields.crop.toLowerCase().includes(item.hi)
      || fields.crop.toLowerCase().includes(item.en.replace(/^(Fresh|New|Sweet|Baby|Red|Sharbati) /, '').toLowerCase()))
    setForm((current) => ({
      ...current,
      crop: match?.en ?? fields.crop,
      cropHi: match?.hi ?? fields.cropHi ?? fields.crop,
      imageSrc: match?.image ?? current.imageSrc,
      visual: match?.visual ?? current.visual,
      category: match?.category ?? current.category,
      quantityKg: fields.quantityKg, remainingKg: fields.quantityKg,
      unit: fields.unit ?? current.unit,
      pricePerKg: fields.pricePerKg || pricesFor(match?.en ?? fields.crop)?.pricePerKg || current.pricePerKg,
      priceLocked: Boolean(fields.pricePerKg),
      mandiPricePerKg: pricesFor(match?.en ?? fields.crop)?.mandiPricePerKg ?? current.mandiPricePerKg,
      retailPricePerKg: pricesFor(match?.en ?? fields.crop)?.retailPricePerKg ?? current.retailPricePerKg,
      mandiSource: pricesFor(match?.en ?? fields.crop)?.mandiSource ?? current.mandiSource,
      harvestDate: fields.harvestDate || current.harvestDate,
      availableFrom: fields.availableFrom ?? fields.harvestDate ?? current.availableFrom,
      pickupDate: fields.pickupDate ?? current.pickupDate,
      pickupWindow: fields.pickupWindow ?? current.pickupWindow,
      fulfillment: fields.fulfillment ?? current.fulfillment,
      farm: fields.farm || current.farm,
      notes: fields.notes || current.notes,
    }))
    setCustomCrop(!match)
    // A spoken sentence already carries crop, quantity and price — go straight to review.
    setStep(3)
  }

  // Each step starts at the top. Without this, step 3 inherits the scroll offset of the
  // "आगे" button that opened it, and the auto-running price card lifts out of view.
  useEffect(() => { window.scrollTo({ top: 0 }) }, [step])

  // Voice handed off from "मेरी फसल", or an existing crop being edited.
  useEffect(() => {
    if (params.get('voice') === '1') {
      const draft = takeVoiceDraft()
      if (draft) applyDraft(draft)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!editId) return
    void prototypeService.getListing(editId).then((item) => {
      if (!item) return
      setForm(item)
      setCustomCrop(!CROPS.some((crop) => crop.en === item.crop))
    })
  }, [editId])

  /**
   * Real work, awaited, with an honest message. `fetchLivePriceOptions` calls the pricing
   * API and falls back to the deterministic local table — either way the farmer waits only
   * as long as it actually takes.
   */
  useEffect(() => {
    if (step !== 3 || priceOptions) return
    let active = true
    setPriceLoading(true)
    void fetchLivePriceOptions(form)
      .then((options) => { if (active) setPriceOptions(options) })
      .catch(() => { if (active) setPriceOptions(null) })
      .finally(() => { if (active) setPriceLoading(false) })
    return () => { active = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  const chooseCrop = (crop: typeof CROPS[number]) => {
    setCustomCrop(false)
    setPriceOptions(null)
    setForm((current) => ({
      ...current,
      crop: crop.en, cropHi: crop.hi, imageSrc: crop.image, visual: crop.visual,
      category: crop.category,
      ...(pricesFor(crop.en) ?? {}),
      priceLocked: false,
    }))
  }

  const valid = form.crop.trim() && form.quantityKg > 0 && form.pricePerKg > 0 && form.harvestDate && form.availableFrom

  const save = async (status: ListingStatus) => {
    if (!valid) { showToast(f('fillRequired')); return }
    setSaving(true)
    const lotCode = form.lotCode ?? clientLotCode(form.crop)
    const next: FarmerListing = {
      ...form, status, lotCode,
      remainingKg: form.quantityKg - form.allocatedKg,
      assisted: assisted || form.assisted,
    }
    await prototypeService.saveListing(next)

    // Declaration evidence, not a quality verdict — the independent sample inspection still
    // happens at pickup. Unchanged from the previous flow.
    if (photos.length) {
      const lot: LotContext = {
        lotCode: next.lotCode!, cropName: next.crop, quantityKg: next.quantityKg,
        cropListingId: next.cropListingId, packagingType: next.packagingType,
        containerCount: next.containerCount, unitWeightKg: next.unitWeightKg,
      }
      const uploaded: string[] = []
      for (const photo of photos) {
        try {
          const capture = await inspectionService.submitCapture({ lot, checkpoint: 'FARMER_GATE', file: photo.file, capturedBy: 'Farmer' })
          uploaded.push(capture.imageUrl)
        } catch { /* evidence capture reports its own failures */ }
      }
      if (uploaded.length) { next.overviewPhotos = uploaded; await prototypeService.saveListing(next) }
    }

    setSaving(false)
    showToast(status === 'draft' ? f('savedForLater') : f('onSaleNow'))
    navigate(status === 'draft' ? '/farmer/fasal' : `/farmer/fasal/${next.id}`)
  }

  const cropLabel = pick(form.crop, form.cropHi)
  const total = form.quantityKg * form.pricePerKg
  const gain = form.quantityKg * Math.max(0, form.pricePerKg - form.mandiPricePerKg)
  const intel = cropIntelFor(form.crop)

  return (
    <div className="page f-page f-sell">
      <header className="f-sell-head">
        <button type="button" className="back-link" onClick={() => (step === 1 ? navigate('/farmer/fasal') : setStep(step - 1))}>
          <ArrowLeft size={18} />{f('back')}
        </button>
        <ol className="f-steps" aria-label={f('sellTitle')}>
          {([f('stepCrop'), f('stepQuantity'), f('stepPrice')]).map((label, index) => (
            <li key={label} className={step === index + 1 ? 'is-active' : step > index + 1 ? 'is-done' : ''}>
              <span>{step > index + 1 ? <Check size={14} /> : index + 1}</span>
              <small>{label}</small>
            </li>
          ))}
        </ol>
      </header>

      {step === 1 && (
        <section className="f-step">
          <h1>{f('whatSelling')}</h1>

          <button type="button" className="f-voice-cta" onClick={() => setVoiceOpen(true)}>
            <span className="f-voice-cta-icon"><Mic size={24} /></span>
            <span><strong>{f('speakIt')}</strong><small>{f('speakItHint')}</small></span>
          </button>

          <div className="f-crop-picker">
            {CROPS.map((crop) => (
              <button
                key={crop.en}
                type="button"
                className={!customCrop && form.crop === crop.en ? 'is-active' : ''}
                onClick={() => chooseCrop(crop)}
              >
                <img src={crop.image} alt="" />
                <strong>{language === 'hi' ? crop.hi : crop.en}</strong>
                {!customCrop && form.crop === crop.en && <Check size={18} aria-hidden="true" />}
              </button>
            ))}
            <button type="button" className={customCrop ? 'is-active' : ''} onClick={() => { setCustomCrop(true); update('crop', '') }}>
              <span className="f-crop-other"><Plus size={28} /></span>
              <strong>{f('otherCrop')}</strong>
            </button>
          </div>

          {customCrop && (
            <label className="f-field">
              <span>{f('otherCropName')}</span>
              <input autoFocus value={form.crop} onChange={(event) => { const name = event.target.value; const prices = pricesFor(name); setForm((current) => ({ ...current, crop: name, cropHi: name, ...(prices ?? {}), priceLocked: prices ? false : current.priceLocked })) }} />
            </label>
          )}
        </section>
      )}

      {step === 2 && (
        <section className="f-step">
          <h1>{f('howMuch')}</h1>

          <div className="f-qty">
            <button type="button" aria-label="−50" onClick={() => update('quantityKg', Math.max(1, form.quantityKg - 50))}><Minus size={26} /></button>
            <div className="f-qty-value">
              <input
                type="number"
                inputMode="numeric"
                min="1"
                value={form.quantityKg}
                onChange={(event) => update('quantityKg', Math.max(0, Number(event.target.value)))}
                aria-label={f('howMuch')}
              />
              <select value={form.unit} onChange={(event) => update('unit', event.target.value as FarmerListing['unit'])} aria-label={f('howMuch')}>
                <option value="kg">{f('kg')}</option>
                <option value="quintal">quintal</option>
                <option value="tonne">tonne</option>
              </select>
            </div>
            <button type="button" aria-label="+50" onClick={() => update('quantityKg', form.quantityKg + 50)}><Plus size={26} /></button>
          </div>

          <div className="f-chips">
            {QUANTITY_CHIPS.map((value) => (
              <button key={value} type="button" className={form.quantityKg === value ? 'is-active' : ''} onClick={() => update('quantityKg', value)}>
                {value} {f('kg')}
              </button>
            ))}
          </div>

          <button type="button" className="f-disclose" aria-expanded={moreOpen} onClick={() => setMoreOpen(!moreOpen)}>
            <span>{f('moreDetails')}<small>{f('moreDetailsHint')}</small></span>
            <ChevronDown size={20} className={moreOpen ? 'is-open' : ''} aria-hidden="true" />
          </button>

          {moreOpen && (
            <div className="f-more">
              <label className="f-field">
                <span>{f('quality')}</span>
                <select value={form.grade} onChange={(event) => update('grade', event.target.value as FarmerListing['grade'])}>
                  <option value="Grade A">Grade A</option>
                  <option value="Grade A+">Grade A+</option>
                </select>
              </label>
              <label className="f-field">
                <span>{f('harvestDate')}</span>
                <input type="date" value={form.harvestDate} onChange={(event) => { update('harvestDate', event.target.value); update('availableFrom', event.target.value) }} />
              </label>
              <label className="f-field">
                <span>{f('grownHow')}</span>
                <select value={form.farmingMethod} onChange={(event) => update('farmingMethod', event.target.value)}>
                  <option value="">-</option>
                  <option value="Conventional">{f('conventional')}</option>
                  <option value="Organic">{f('organic')}</option>
                  <option value="Natural farming">{f('natural')}</option>
                </select>
              </label>

              <div className="f-field">
                <span>{f('packing')}</span>
                <div className="f-chips">
                  {PACKAGING.map((option) => (
                    <button key={option.value} type="button" className={form.packagingType === option.value ? 'is-active' : ''} onClick={() => update('packagingType', option.value)}>
                      {f(option.key)}
                    </button>
                  ))}
                </div>
              </div>

              {form.packagingType && form.packagingType !== 'LOOSE' && (
                <>
                  <label className="f-field">
                    <span>{f('howManyBoxes')}</span>
                    <input type="number" inputMode="numeric" min="1" value={form.containerCount ?? ''} onChange={(event) => update('containerCount', Number(event.target.value))} />
                  </label>
                  <label className="f-field">
                    <span>{f('weightEach')}</span>
                    <input type="number" inputMode="numeric" min="1" value={form.unitWeightKg ?? ''} onChange={(event) => update('unitWeightKg', Number(event.target.value))} />
                  </label>
                </>
              )}

              <div className="f-field">
                <span>{f('cropPhotos')}</span>
                <div className="f-photo-row">
                  {photos.map((photo, index) => (
                    <div className="evidence-capture evidence-capture-filled compact" key={photo.previewUrl} style={{ width: 116 }}>
                      <img src={photo.previewUrl} alt="" />
                      <div className="evidence-capture-actions">
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm evidence-remove"
                          onClick={() => setPhotos((current) => { URL.revokeObjectURL(current[index].previewUrl); return current.filter((_, i) => i !== index) })}
                        >✕</button>
                      </div>
                    </div>
                  ))}
                  {photos.length < 2 && (
                    <div style={{ width: 132 }}>
                      <EvidenceCapture
                        preview={null}
                        compact
                        onCapture={(preview) => { setPhotos((current) => [...current, preview]); setPhotoError(null) }}
                        onRemove={() => {}}
                        onError={setPhotoError}
                      />
                    </div>
                  )}
                </div>
                {photoError && <EvidenceCaptureError message={photoError} />}
                <small className="f-note">{f('photoNote')}</small>
              </div>

              <label className="f-field">
                <span>{f('anyNote')}</span>
                <textarea rows={2} value={form.notes} onChange={(event) => update('notes', event.target.value)} />
              </label>
            </div>
          )}
        </section>
      )}

      {step === 3 && (
        <section className="f-step">
          <h1>{f('priceAndPickup')}</h1>

          <div className="f-price-hero">
            <span>{f('youWillGet')}</span>
            <strong>₹{form.pricePerKg}<small>{f('perKg')}</small></strong>
            {gain > 0 && <b>{f('moreThanMandi', { amount: money(gain) })}</b>}
            <p>{cropLabel} · {form.quantityKg} {f('kg')} · <em>{money(total)}</em></p>
          </div>

          {/* The selling window is set by the harvest date, so the date sits right beside the
              ring: a farmer who cut the crop three days ago corrects it here and watches the
              window shrink, instead of finding the field under "और जानकारी". */}
          <div className="f-sell-fresh">
            <FreshnessRing listing={form} size="card" />
            <label className="f-field is-compact">
              <span>{f('harvestDate')}</span>
              <input type="date" max={localDay(0)} value={form.harvestDate} onChange={(event) => { update('harvestDate', event.target.value); update('availableFrom', event.target.value) }} />
            </label>
          </div>

          {/* Kisan Intelligence's price suggestion: three anchors from the pricing engine, one
              line of reasoning, tap to use. This is the only pricing help inside the normal
              flow; the Market Maker lives on its own Behtar Sauda screen. */}
          <div className="f-price-ai">
            <div className="f-price-ai-head">
              <span className="f-price-ai-icon" aria-hidden="true"><Sparkles size={15} /></span>
              <small>{f('aiEyebrow')}</small>
            </div>
            {priceLoading ? (
              <p className="f-price-loading" role="status"><span className="spinner" />{f('findingPrice')}</p>
            ) : priceOptions ? (
              <>
                <div className="f-price-options" role="group" aria-label={f('aiEyebrow')}>
                  {priceOptions.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      className={form.pricePerKg === option.price ? 'is-active' : ''}
                      onClick={() => setForm((current) => ({ ...current, pricePerKg: option.price, priceLocked: true }))}
                    >
                      <strong>₹{option.price}</strong>
                      <small>{option.id === 'fast' ? f('priceFast') : option.id === 'balanced' ? f('priceSuggested') : f('priceHigher')}</small>
                    </button>
                  ))}
                </div>
                <p className="f-note f-price-ai-reason">
                  {intel ? f('priceAiReason', { mandi: intel.mandi, crop: cropLabel }) : f('priceAiReasonPlain')}
                </p>
              </>
            ) : null}
          </div>

          <label className="f-field">
            <span>{f('priceOwn')}</span>
            <div className="f-price-input">
              <b>₹</b>
              <input type="number" inputMode="numeric" min="1" value={form.pricePerKg} onChange={(event) => setForm((current) => ({ ...current, pricePerKg: Number(event.target.value), priceLocked: true }))} />
              <small>{f('perKg')}</small>
            </div>
          </label>

          {intel && (
            <p className="f-note f-price-note">
              {f('mandiTodayHint', { crop: cropLabel })}: ₹{intel.mandi}{f('perKg')}. {f('dealDisclaimer')}
              <MandiSourceNote source={form.mandiSource ?? intel.benchmark} />
            </p>
          )}

          <h2 className="f-section-heading">{f('howItMoves')}</h2>
          <div className="f-choice">
            <button type="button" className={form.fulfillment === 'pickup' ? 'is-active' : ''} onClick={() => update('fulfillment', 'pickup')}>
              <Truck size={24} />
              <strong>{f('kisanPickup')}</strong>
              <small>{f('kisanPickupHint')}</small>
            </button>
            <button type="button" className={form.fulfillment === 'self_delivery' ? 'is-active' : ''} onClick={() => update('fulfillment', 'self_delivery')}>
              <Sprout size={24} />
              <strong>{f('selfDelivery')}</strong>
            </button>
          </div>

          {form.fulfillment === 'pickup' && (
            <div className="f-pickup-when">
              <label className="f-field">
                <span>{f('pickupDay')}</span>
                <input type="date" value={form.pickupDate} onChange={(event) => update('pickupDate', event.target.value)} />
                <small className="f-note">{relativeDay(language, form.pickupDate, daysUntil(form.pickupDate))}</small>
              </label>
              <div className="f-field">
                <span>{f('pickupTime')}</span>
                <div className="f-chips">
                  {(['Morning · 7–10 AM', 'Afternoon · 1–4 PM', 'Evening · 4–7 PM'] as const).map((window, index) => (
                    <button key={window} type="button" className={form.pickupWindow === window ? 'is-active' : ''} onClick={() => update('pickupWindow', window)}>
                      {index === 0 ? f('morning') : index === 1 ? f('afternoon') : f('evening')}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      <div className="f-sell-actions">
        {step < 3 ? (
          <button type="button" className="btn btn-primary btn-large btn-full" onClick={() => setStep(step + 1)} disabled={!form.crop.trim()}>
            {f('next')}
          </button>
        ) : (
          <button type="button" className="btn btn-primary btn-large btn-full" disabled={saving || !valid} onClick={() => save('active')}>
            {saving ? f('loading') : f('sellNow')}
          </button>
        )}
        <button type="button" className="btn btn-ghost btn-large btn-full" disabled={saving} onClick={() => save('draft')}>
          {f('saveForLater')}
        </button>
      </div>

      {/* Behtar Sauda lives on its own screen. This is only a pointer to it, below the
          actions so the crop -> quantity -> price flow above is never interrupted. */}
      <BehtarSaudaTeaser />

      <a className="f-help" href="tel:18001234567">
        <Phone size={19} />
        <span>{f('callHelp')}<small>{f('helpNumber')}</small></span>
      </a>

      <VoiceInputModal
        isOpen={voiceOpen}
        onClose={() => setVoiceOpen(false)}
        onConfirm={(fields) => { applyDraft(fields); setVoiceOpen(false) }}
      />
    </div>
  )
}
