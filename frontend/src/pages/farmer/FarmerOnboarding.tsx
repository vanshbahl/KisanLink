import { ArrowLeft, ArrowRight, Check, MapPin, Mic, Pencil, Plus, Search, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LanguageSwitcher } from '../../components/LanguageSwitcher'
import { Logo } from '../../components/Logo'
import { OnboardingVoiceMode, type VoiceDraft, type VoiceFill } from '../../components/voice/OnboardingVoiceMode'
import { useAuth } from '../../contexts/AuthContext'
import { CROP_CATALOGUE } from '../../data/crops'
import { matchDistrict, matchState, placeLabel } from '../../data/indiaLocations'
import { authService } from '../../services/authService'
import { useFarmerText, type FarmerKey } from '../../i18n/farmer'
import { getDetectedRegion } from '../../services/localeDiscovery'
import { FARM_SIZE_OPTIONS, farmSizeAcresFor, type FarmSizeId, type OnboardingField } from '../../services/onboardingVoice'
import { prototypeService } from '../../services/prototypeService'

/**
 * Farmer onboarding, straight after the OTP.
 *
 *   1. आप       — name and where the farm is (district and state prefilled from the splash)
 *   2. ज़मीन     — how much land, five big buttons
 *   3. फसल      — which crops, tap or search, then a one-screen confirmation
 *
 * Every step carries a microphone. Tapping it opens `OnboardingVoiceMode`, which asks the
 * remaining questions one at a time and writes its answers into this same form, so leaving
 * voice mode at any point lands the farmer back here with everything so far still filled
 * in and editable. Nothing on this screen is required except a name.
 *
 * On "Continue" the answers are written into the existing farmer profile
 * (`prototypeService.saveProfile`), not into a separate onboarding record.
 */
type Step = 1 | 2 | 3

const SIZE_KEY: Record<FarmSizeId, FarmerKey> = { under1: 'sizeUnder1', '1to3': 'size1to3', '3to5': 'size3to5', '5to10': 'size5to10', '10plus': 'size10plus' }

const blankDraft = (): VoiceDraft => {
  const region = getDetectedRegion()
  return {
    name: '', village: '', locality: '',
    district: region?.district ?? '', state: region?.state ?? '',
    farmSize: '', crops: [],
    stateDetected: Boolean(region?.state),
    districtDetected: Boolean(region?.district),
  }
}

export function FarmerOnboarding() {
  const { f, language } = useFarmerText()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>(1)
  const [draft, setDraft] = useState<VoiceDraft>(blankDraft)
  const [confirming, setConfirming] = useState(false)
  const [voiceOpen, setVoiceOpen] = useState(false)
  const [nameError, setNameError] = useState(false)
  const [cropQuery, setCropQuery] = useState('')
  const [customCrop, setCustomCrop] = useState('')
  const [saving, setSaving] = useState(false)
  // Review-screen editing: one field at a time, in place; crops reopen their own step.
  const [editing, setEditing] = useState<Exclude<OnboardingField, 'crops'> | null>(null)
  const [editValue, setEditValue] = useState('')
  const [voiceOnly, setVoiceOnly] = useState<OnboardingField | null>(null)
  const [returnToReview, setReturnToReview] = useState(false)

  useEffect(() => { window.scrollTo({ top: 0 }) }, [step, confirming])

  const update = <K extends keyof VoiceDraft>(key: K, value: VoiceDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }))

  // Typing over a detected value ends its "detected" status, so voice will not re-confirm it.
  const editRegion = (key: 'district' | 'state', value: string) =>
    setDraft((current) => ({ ...current, [key]: value, ...(key === 'state' ? { stateDetected: false } : { districtDetected: false }) }))

  const applyVoice = (fill: VoiceFill) => {
    setDraft((current) => {
      // A state that differs from the one the district was detected in invalidates that district.
      const stateChanged = fill.state !== undefined && fill.state !== current.state
      return {
        ...current,
        ...(fill.name !== undefined ? { name: fill.name } : {}),
        ...(fill.state !== undefined ? { state: fill.state, stateDetected: false } : {}),
        ...(stateChanged && current.districtDetected ? { district: '', districtDetected: false } : {}),
        ...(fill.district !== undefined ? { district: fill.district, districtDetected: false } : {}),
        ...(fill.village !== undefined ? { village: fill.village } : {}),
        ...(fill.locality !== undefined ? { locality: fill.locality } : {}),
        ...(fill.farmSize !== undefined ? { farmSize: fill.farmSize } : {}),
        ...(fill.crops !== undefined ? { crops: fill.crops } : {}),
        ...(fill.stateConfirmed ? { stateDetected: false } : {}),
        ...(fill.districtConfirmed ? { districtDetected: false } : {}),
      }
    })
    if (fill.name !== undefined) setNameError(false)
  }

  const toggleCrop = (name: string) =>
    setDraft((current) => ({ ...current, crops: current.crops.includes(name) ? current.crops.filter((item) => item !== name) : [...current.crops, name] }))

  const addCustomCrop = () => {
    const name = customCrop.trim()
    if (!name) return
    if (!draft.crops.includes(name)) update('crops', [...draft.crops, name])
    setCustomCrop('')
    setCropQuery('')
  }

  const visibleCrops = useMemo(() => {
    const needle = cropQuery.trim().toLowerCase()
    if (!needle) return CROP_CATALOGUE
    return CROP_CATALOGUE.filter((crop) => crop.en.toLowerCase().includes(needle) || crop.hi.includes(needle) || crop.aliases.some((alias) => alias.includes(needle)))
  }, [cropQuery])
  const customCrops = draft.crops.filter((name) => !CROP_CATALOGUE.some((crop) => crop.en === name))

  const next = () => {
    if (step === 1) {
      if (!draft.name.trim()) { setNameError(true); return }
      setStep(2)
    } else if (step === 2) {
      setStep(3)
    } else {
      setReturnToReview(false)
      setConfirming(true)
    }
  }

  /** Review row -> in-place editor. Crops reuse their own multi-select step instead. */
  const startEdit = (field: OnboardingField) => {
    if (field === 'crops') { setReturnToReview(true); setConfirming(false); setStep(3); return }
    setEditing(field)
    setEditValue(draft[field])
  }

  /** State and district are pinned to the canonical list when the typed text resolves to one (exact, alias or an unambiguous close spelling). */
  const commitEdit = () => {
    if (!editing) return
    let value = editValue.trim()
    if (editing === 'state') {
      const hit = matchState(value)
      if (hit) value = hit.value
      setDraft((current) => ({ ...current, state: value, stateDetected: false, ...(value !== current.state && current.districtDetected ? { district: '', districtDetected: false } : {}) }))
    } else if (editing === 'district') {
      const hit = matchDistrict(draft.state, value)
      setDraft((current) => ({ ...current, district: hit ? hit.value : value, districtDetected: false }))
    } else if (editing === 'farmSize') {
      setDraft((current) => ({ ...current, farmSize: (value || '') as FarmSizeId | '' }))
    } else {
      setDraft((current) => ({ ...current, [editing]: value }))
    }
    if (editing === 'name' && value) setNameError(false)
    setEditing(null)
  }

  const back = () => {
    if (confirming) setConfirming(false)
    else if (returnToReview) { setReturnToReview(false); setConfirming(true) }
    else if (step > 1) setStep((step - 1) as Step)
  }

  const finish = async () => {
    // Voice mode can skip the name; the profile cannot.
    if (!draft.name.trim()) { setConfirming(false); setStep(1); setNameError(true); return }
    setSaving(true)
    const profile = await prototypeService.getProfile()
    const pickup = [draft.locality.trim(), draft.village.trim()].filter(Boolean).join(', ')
    await prototypeService.saveProfile({
      ...profile,
      name: draft.name.trim(),
      phone: user?.phone ?? profile.phone,
      language,
      village: draft.village.trim(),
      locality: draft.locality.trim(),
      district: draft.district.trim(),
      state: draft.state.trim(),
      farmSizeAcres: draft.farmSize ? farmSizeAcresFor(draft.farmSize) : profile.farmSizeAcres,
      mainCrops: draft.crops.length ? draft.crops.join(', ') : profile.mainCrops,
      pickupLocation: pickup || profile.pickupLocation,
      onboardingComplete: true,
    })
    authService.clearOtpLogin()
    setSaving(false)
    navigate('/farmer', { replace: true })
  }

  const cropLabel = (name: string) => {
    const known = CROP_CATALOGUE.find((crop) => crop.en === name)
    return language === 'hi' ? (known?.hi ?? name) : name
  }
  const reviewRows: { field: OnboardingField; label: string; value: string }[] = [
    { field: 'name', label: f('fullName'), value: draft.name.trim() },
    { field: 'state', label: f('state'), value: placeLabel(language, draft.state.trim()) },
    { field: 'district', label: f('district'), value: placeLabel(language, draft.district.trim(), draft.state) },
    { field: 'village', label: f('village'), value: draft.village.trim() },
    { field: 'locality', label: f('locality'), value: draft.locality.trim() },
    { field: 'farmSize', label: f('land'), value: draft.farmSize ? f(SIZE_KEY[draft.farmSize]) : '' },
    { field: 'crops', label: f('crops'), value: draft.crops.map(cropLabel).join(', ') },
  ]
  const stepLabels: FarmerKey[] = ['onboardStepYou', 'onboardStepLand', 'onboardStepCrops']
  const shownStep = confirming ? 4 : step

  return (
    <main className="f-onboard">
      <header className="f-onboard-top">
        <Logo />
        <LanguageSwitcher compact />
      </header>

      <section className="f-page f-onboard-body">
        <div className="f-onboard-head">
          {(step > 1 || confirming) ? (
            <button type="button" className="back-link" onClick={back}><ArrowLeft size={18} />{f('back')}</button>
          ) : <span className="eyebrow">{f('onboardTitle')}</span>}
          <ol className="f-steps" aria-label={f('onboardTitle')}>
            {stepLabels.map((key, index) => (
              <li key={key} className={shownStep === index + 1 ? 'is-active' : shownStep > index + 1 ? 'is-done' : ''}>
                <span>{shownStep > index + 1 ? <Check size={14} /> : index + 1}</span>
                <small>{f(key)}</small>
              </li>
            ))}
          </ol>
        </div>

        {!confirming && (
          <button type="button" className="f-voice-cta" onClick={() => setVoiceOpen(true)}>
            <span className="f-voice-cta-icon"><Mic size={24} /></span>
            <span><strong>{f('onboardSpeak')}</strong><small>{f('onboardSpeakHint')}</small></span>
          </button>
        )}

        {!confirming && step === 1 && (
          <section className="f-step">
            <h1>{f('onboardAboutYou')}</h1>
            <label className={`f-field ${nameError ? 'is-error' : ''}`}>
              <span>{f('fullName')}</span>
              <input autoComplete="name" value={draft.name} onChange={(event) => { update('name', event.target.value); setNameError(false) }} />
              {nameError && <small className="f-field-error">{f('nameRequired')}</small>}
            </label>
            <div className="f-form-grid">
              <label className="f-field"><span>{f('village')}</span><input value={draft.village} onChange={(event) => update('village', event.target.value)} /></label>
              <label className="f-field"><span>{f('locality')}</span><input value={draft.locality} onChange={(event) => update('locality', event.target.value)} /></label>
              <label className="f-field"><span>{f('district')}</span><input value={draft.district} onChange={(event) => editRegion('district', event.target.value)} /></label>
              <label className="f-field"><span>{f('state')}</span><input value={draft.state} onChange={(event) => editRegion('state', event.target.value)} /></label>
            </div>
            {(draft.stateDetected || draft.districtDetected) && <p className="f-note f-onboard-detected"><MapPin size={16} />{f('detectedFromLocation')}</p>}
          </section>
        )}

        {!confirming && step === 2 && (
          <section className="f-step">
            <h1>{f('onboardFarmSize')}</h1>
            <div className="f-size-options" role="radiogroup" aria-label={f('onboardFarmSize')}>
              {FARM_SIZE_OPTIONS.map((option) => {
                const active = draft.farmSize === option.id
                return (
                  <button type="button" key={option.id} role="radio" aria-checked={active} className={active ? 'is-active' : ''} onClick={() => update('farmSize', option.id)}>
                    <strong>{f(SIZE_KEY[option.id])}</strong>
                    {active && <Check size={22} aria-hidden="true" />}
                  </button>
                )
              })}
            </div>
          </section>
        )}

        {!confirming && step === 3 && (
          <section className="f-step">
            <h1>{f('onboardCrops')}</h1>
            <p className="f-note">{f('onboardCropsHint')}{draft.crops.length > 0 && <> · <strong>{f('selectedCrops', { count: draft.crops.length })}</strong></>}</p>
            <label className="f-field f-onboard-search">
              <Search size={20} aria-hidden="true" />
              <input type="search" value={cropQuery} onChange={(event) => setCropQuery(event.target.value)} placeholder={f('searchCrop')} aria-label={f('searchCrop')} />
            </label>

            <div className="f-crop-picker f-onboard-crops">
              {visibleCrops.map((crop) => {
                const active = draft.crops.includes(crop.en)
                return (
                  <button type="button" key={crop.en} className={active ? 'is-active' : ''} aria-pressed={active} onClick={() => toggleCrop(crop.en)}>
                    {crop.image ? <img src={crop.image} alt="" /> : <span className="f-crop-initial" aria-hidden="true">{crop.hi.charAt(0)}</span>}
                    <strong>{language === 'hi' ? crop.hi : crop.en}</strong>
                    {active && <Check size={18} aria-hidden="true" />}
                  </button>
                )
              })}
              {customCrops.map((name) => (
                <button type="button" key={name} className="is-active" aria-pressed onClick={() => toggleCrop(name)}>
                  <span className="f-crop-initial" aria-hidden="true">{name.charAt(0)}</span>
                  <strong>{name}</strong>
                  <Check size={18} aria-hidden="true" />
                </button>
              ))}
            </div>
            {visibleCrops.length === 0 && <p className="f-note">{f('noCropMatch')}</p>}

            <div className="f-onboard-add">
              <label className="f-field">
                <span>{f('otherCrop')}</span>
                <input value={customCrop} onChange={(event) => setCustomCrop(event.target.value)} placeholder={f('otherCropName')} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addCustomCrop() } }} />
              </label>
              <button type="button" className="btn btn-secondary btn-large" onClick={addCustomCrop} disabled={!customCrop.trim()}><Plus size={18} />{f('addCrop')}</button>
            </div>
          </section>
        )}

        {confirming && (
          <section className="f-step f-onboard-confirm">
            <h1>{f('onboardDone')}</h1>
            <p className="f-note">{f('onboardDoneHint')}</p>
            <dl className="f-onboard-summary">
              {reviewRows.map((row) => {
                const isEditing = editing === row.field
                return (
                  <div key={row.field} className={isEditing ? 'is-editing' : ''}>
                    <dt>{row.label}</dt>
                    <dd>
                      {isEditing ? (
                        row.field === 'farmSize' ? (
                          <select autoFocus value={editValue} onChange={(event) => setEditValue(event.target.value)} onBlur={commitEdit} onKeyDown={(event) => { if (event.key === 'Enter') commitEdit(); if (event.key === 'Escape') setEditing(null) }} aria-label={row.label}>
                            <option value="">{f('notFilled')}</option>
                            {FARM_SIZE_OPTIONS.map((option) => <option key={option.id} value={option.id}>{f(SIZE_KEY[option.id])}</option>)}
                          </select>
                        ) : (
                          <input autoFocus value={editValue} onChange={(event) => setEditValue(event.target.value)} onBlur={commitEdit} onKeyDown={(event) => { if (event.key === 'Enter') commitEdit(); if (event.key === 'Escape') setEditing(null) }} aria-label={row.label} />
                        )
                      ) : (
                        <span className="f-review-value">{row.value || <em>{f('notFilled')}</em>}</span>
                      )}
                      <span className="f-review-actions">
                        {isEditing ? (
                          <button type="button" className="f-review-btn" aria-label={f('editCancel')} onMouseDown={(event) => event.preventDefault()} onClick={() => setEditing(null)}><X size={18} /></button>
                        ) : (
                          <>
                            <button type="button" className="f-review-btn" aria-label={f('speakField', { field: row.label })} onClick={() => { setVoiceOnly(row.field); setVoiceOpen(true) }}><Mic size={18} /></button>
                            <button type="button" className="f-review-btn" aria-label={f('editField', { field: row.label })} onClick={() => startEdit(row.field)}><Pencil size={18} /></button>
                          </>
                        )}
                      </span>
                    </dd>
                  </div>
                )
              })}
            </dl>
          </section>
        )}
      </section>

      <footer className="f-onboard-actions">
        {confirming ? (
          <button type="button" className="btn btn-primary btn-large btn-full" onClick={finish} disabled={saving}>
            {saving ? <><i className="spinner spinner-light" />{f('loading')}</> : <>{f('continueDashboard')}<ArrowRight size={19} /></>}
          </button>
        ) : (
          <button type="button" className="btn btn-primary btn-large btn-full" onClick={returnToReview && step === 3 ? () => { setReturnToReview(false); setConfirming(true) } : next}>
            {returnToReview && step === 3 ? <><Check size={19} />{f('done')}</> : <>{f('next')}<ArrowRight size={19} /></>}
          </button>
        )}
      </footer>

      {voiceOpen && (
        <OnboardingVoiceMode
          draft={draft}
          startStep={step}
          only={voiceOnly ?? undefined}
          onFill={applyVoice}
          onClose={() => { setVoiceOpen(false); setVoiceOnly(null) }}
          onFinished={() => { setVoiceOpen(false); setVoiceOnly(null); setStep(3); setConfirming(true) }}
        />
      )}
    </main>
  )
}
