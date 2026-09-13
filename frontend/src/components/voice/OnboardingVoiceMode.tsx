import { Check, Loader2, Mic, Square, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CROP_CATALOGUE } from '../../data/crops'
import { placeLabel } from '../../data/indiaLocations'
import { useFarmerText, type FarmerKey } from '../../i18n/farmer'
import { parseConfirmation, parseOnboardingAnswer, type FarmSizeId, type OnboardingField } from '../../services/onboardingVoice'
import { createSpeechRecognition, speak, speechErrorMessage, speechLang, stopSpeaking, warmUpVoices, type SpeechRecognitionLike } from '../../services/speech'

/**
 * Voice-guided onboarding: one question at a time, full screen, nothing else.
 *
 * Not a conversation. A fixed queue of questions is read aloud (browser TTS, best
 * available Hindi/English voice), the microphone opens, the answer goes through Gemini
 * (`parseOnboardingAnswer`) so meaning rather than wording is kept, the matching form
 * field behind this screen is filled through `onFill`, and the next question follows. A
 * short acknowledgement precedes each next question; that is the whole "dialogue".
 *
 * Location is asked state first, then district. Where the splash already detected one,
 * the question is a confirmation ("क्या आपका राज्य दिल्ली है?") and only a "no" opens the
 * full question. "I don't know" skips a field rather than storing a shrug.
 *
 * Nothing here can trap the farmer: every phase has a way back to the typed form, an
 * unrecognised answer offers "speak again" or "skip", and a denied microphone shows the
 * same message the listing voice modal shows and hands the form back.
 */
export type VoiceQuestionId = OnboardingField | 'confirmState' | 'confirmDistrict'

export interface VoiceDraft {
  name: string
  village: string
  locality: string
  district: string
  state: string
  farmSize: FarmSizeId | ''
  crops: string[]
  /** State came from the splash location read and has been neither edited nor confirmed. */
  stateDetected: boolean
  /** Same for the district. */
  districtDetected: boolean
}

export interface VoiceFill {
  name?: string
  village?: string
  locality?: string
  district?: string
  state?: string
  farmSize?: FarmSizeId
  crops?: string[]
  /** The farmer confirmed the detected state / district by voice. */
  stateConfirmed?: boolean
  districtConfirmed?: boolean
}

interface OnboardingVoiceModeProps {
  draft: VoiceDraft
  /** Which form step the microphone was tapped on; questions before it are not asked. */
  startStep: 1 | 2 | 3
  /** Re-ask exactly this one field (review-screen edit); no confirmations, no closing line. */
  only?: OnboardingField
  onFill: (fill: VoiceFill) => void
  onClose: () => void
  /** Every question answered; the form shows its confirmation. */
  onFinished: () => void
}

type Phase = 'speaking' | 'listening' | 'processing' | 'success' | 'retry' | 'error' | 'done'

const SUCCESS_HOLD_MS = 1100
const DONE_HOLD_MS = 700

const SIZE_KEY: Record<FarmSizeId, FarmerKey> = { under1: 'sizeUnder1', '1to3': 'size1to3', '3to5': 'size3to5', '5to10': 'size5to10', '10plus': 'size10plus' }

/**
 * Ordered questions, skipping what is already filled; the mic always asks something.
 * State comes before district so a district can be matched against the right list.
 * Detected values become confirmation questions; `resolveQuestion` re-checks at ask time,
 * because a "no" to the state changes what the district question should be.
 */
function buildQueue(draft: VoiceDraft, startStep: 1 | 2 | 3): VoiceQuestionId[] {
  const step1: VoiceQuestionId[] = []
  if (!draft.name) step1.push('name')
  if (draft.state && draft.stateDetected) step1.push('confirmState')
  else if (!draft.state) step1.push('state')
  if (draft.district && draft.districtDetected) step1.push('confirmDistrict')
  else if (!draft.district) step1.push('district')
  if (!draft.village) step1.push('village')
  if (!draft.locality) step1.push('locality')
  const queue: VoiceQuestionId[] = []
  if (startStep <= 1) queue.push(...step1)
  if (startStep <= 2 && !draft.farmSize) queue.push('farmSize')
  if (startStep <= 3 && !draft.crops.length) queue.push('crops')
  if (queue.length) return queue
  return startStep === 1 ? ['name', 'state', 'district', 'village', 'locality'] : startStep === 2 ? ['farmSize'] : ['crops']
}

/** A confirmation only makes sense while the detected value is still in the form. */
function resolveQuestion(id: VoiceQuestionId, draft: VoiceDraft): VoiceQuestionId {
  if (id === 'confirmState') return draft.state && draft.stateDetected ? id : 'state'
  if (id === 'confirmDistrict') return draft.district && draft.districtDetected ? id : 'district'
  return id
}

export function OnboardingVoiceMode({ draft, startStep, only, onFill, onClose, onFinished }: OnboardingVoiceModeProps) {
  const { f, language } = useFarmerText()
  const [queue, setQueue] = useState<VoiceQuestionId[]>(() => (only ? [only] : buildQueue(draft, startStep)))
  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState<Phase>('speaking')
  const [transcript, setTranscript] = useState('')
  const [recognized, setRecognized] = useState('')
  const [ack, setAck] = useState('')
  const [message, setMessage] = useState('')

  // Everything async checks this before touching state, so an exit or a skip mid-answer
  // cannot resurrect a stale question.
  const runRef = useRef(0)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const draftRef = useRef(draft)
  draftRef.current = draft
  const spokenAckRef = useRef('')
  const ackTurnRef = useRef(0)

  // Resolved once per index, when the question is asked. Deriving it live from the draft
  // would flip "confirm district" into "district" the moment the confirmation is applied.
  const askedRef = useRef<VoiceQuestionId | undefined>(undefined)
  const [current, setCurrent] = useState<VoiceQuestionId | undefined>(() => (queue[0] ? resolveQuestion(queue[0], draft) : undefined))
  const total = queue.length

  const questionText = useCallback((id: VoiceQuestionId | undefined): { text: string; hint?: string } => {
    const live = draftRef.current
    switch (id) {
      case 'name': return { text: f('voiceQName') }
      case 'confirmState': return { text: f('voiceQConfirmState', { state: placeLabel(language, live.state) }), hint: f('voiceQConfirmHint') }
      case 'state': return { text: f('voiceQState') }
      case 'confirmDistrict': return { text: f('voiceQConfirmDistrict', { district: placeLabel(language, live.district, live.state) }), hint: f('voiceQConfirmHint') }
      case 'district': return { text: f('voiceQDistrict') }
      case 'village': return { text: f('voiceQVillage') }
      case 'locality': return { text: f('voiceQLocality') }
      case 'farmSize': return { text: f('voiceQFarmSize'), hint: f('voiceQFarmSizeHint') }
      case 'crops': return { text: f('voiceQCrops'), hint: f('voiceQCropsHint') }
      default: return { text: f('voiceAllDone') }
    }
  }, [f, language])

  const stopRecognition = useCallback(() => {
    const recognition = recognitionRef.current
    recognitionRef.current = null
    if (recognition) { try { recognition.abort() } catch { /* already stopped */ } }
  }, [])

  const close = useCallback(() => {
    runRef.current += 1
    stopRecognition()
    stopSpeaking()
    onClose()
  }, [onClose, stopRecognition])
  const closeRef = useRef(close)
  closeRef.current = close

  // Mount-only: an inline `onClose` from the parent must not re-run this and cut a question off.
  useEffect(() => {
    warmUpVoices()
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') closeRef.current() }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', escape)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', escape)
      runRef.current += 1
      stopRecognition()
      stopSpeaking()
    }
  }, [stopRecognition])

  const finish = useCallback((run: number) => {
    // A single-field edit returns to the review screen straight away.
    if (only) { onFinished(); return }
    setPhase('done')
    setAck('')
    setTranscript('')
    void speak(f('voiceAllDone'), language).then(() => {
      if (run !== runRef.current) return
      window.setTimeout(() => { if (run === runRef.current) onFinished() }, DONE_HOLD_MS)
    })
  }, [f, language, onFinished, only])

  const advance = useCallback((run: number, extra: VoiceQuestionId[] = []) => {
    if (run !== runRef.current) return
    const nextQueue = extra.length ? [...queue.slice(0, index + 1), ...extra, ...queue.slice(index + 1)] : queue
    if (extra.length) setQueue(nextQueue)
    if (index + 1 < nextQueue.length) setIndex(index + 1)
    else finish(run)
  }, [finish, index, queue])

  const startListening = useCallback((run: number) => {
    if (run !== runRef.current) return
    stopRecognition()
    const recognition = createSpeechRecognition()
    if (!recognition) {
      setPhase('error')
      setMessage(f('voiceUnavailable'))
      return
    }
    recognitionRef.current = recognition
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = speechLang(language)
    let heard = ''
    let failed = false

    recognition.onstart = () => { if (run === runRef.current) setPhase('listening') }
    recognition.onresult = (event) => {
      let final = ''
      let interim = ''
      for (let i = 0; i < event.results.length; i += 1) {
        const result = event.results[i]
        if (result.isFinal) final += `${result[0].transcript} `
        else interim += result[0].transcript
      }
      heard = `${final}${interim}`.trim()
      if (run === runRef.current) setTranscript(heard)
    }
    recognition.onerror = (event) => {
      if (run !== runRef.current) return
      failed = true
      if (event.error === 'no-speech') {
        setPhase('retry')
        setMessage(f('voiceNothingHeard'))
        return
      }
      const copy = speechErrorMessage(event.error, language)
      if (!copy) return
      setPhase('error')
      setMessage(copy)
    }
    let handled = false
    recognition.onend = () => {
      if (run !== runRef.current || failed || handled) return
      handled = true
      const text = heard.trim()
      if (!text) {
        setPhase('retry')
        setMessage(f('voiceNothingHeard'))
        return
      }
      void answer(run, text)
    }
    try {
      recognition.start()
    } catch {
      setPhase('error')
      setMessage(speechErrorMessage('audio-capture', language) ?? f('voiceUnavailable'))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f, language, current, index])

  const answer = async (run: number, text: string) => {
    setPhase('processing')
    setMessage('')
    const id = askedRef.current
    if (!id) return
    const live = draftRef.current
    const nextAck = () => {
      ackTurnRef.current += 1
      return f(ackTurnRef.current % 2 ? 'voiceAckOk' : 'voiceAckGreat')
    }
    const succeed = (label: string, ack: string, extra: VoiceQuestionId[] = []) => {
      spokenAckRef.current = ack
      setRecognized(label)
      setPhase('success')
      window.setTimeout(() => advance(run, extra), SUCCESS_HOLD_MS)
    }

    // Yes/no on a detected state or district. "No", "don't know" or anything unclear opens
    // the full question; a wrong guess must never be kept just because it was pre-filled.
    if (id === 'confirmState' || id === 'confirmDistrict') {
      const key = id === 'confirmState' ? 'state' : 'district'
      const expected = live[key]
      const result = await parseConfirmation(text, language, { state: live.state, district: live.district, expected })
      if (run !== runRef.current) return
      if (result.confirmed === true) {
        onFill(id === 'confirmState' ? { stateConfirmed: true } : { districtConfirmed: true })
        succeed(placeLabel(language, expected, key === 'district' ? live.state : undefined), f('voiceAckOk'))
        return
      }
      if (result.confirmed === false && result.value) {
        // "No, it is Haryana": the corrected value came with the answer, so use it.
        const parsed = await parseOnboardingAnswer(key, result.value, language, { state: live.state, district: live.district })
        if (run !== runRef.current) return
        if (parsed.recognized && parsed.value && !parsed.unknown) {
          onFill({ [key]: parsed.value })
          succeed(placeLabel(language, parsed.value, key === 'district' ? live.state : undefined), nextAck())
          return
        }
      }
      spokenAckRef.current = f('voiceAckOk')
      advance(run, [key])
      return
    }

    const result = await parseOnboardingAnswer(id as OnboardingField, text, language, { state: live.state, district: live.district })
    if (run !== runRef.current) return
    if (result.unknown) {
      succeed(f('voiceAckUnknown'), '')
      return
    }
    if (!result.recognized) {
      setPhase('retry')
      setMessage(f('voiceNotUnderstood'))
      return
    }

    let label = ''
    let ack = ''
    if (id === 'name' && result.value) {
      onFill({ name: result.value })
      label = language === 'hi' ? (result.valueHi ?? result.value) : result.value
      // The one and only greeting: spoken once, shown once, before whatever question is next.
      ack = f('voiceAckHello', { name: label.split(' ')[0] })
    } else if ((id === 'state' || id === 'district') && result.value) {
      onFill({ [id]: result.value })
      label = placeLabel(language, result.value, id === 'district' ? live.state : undefined)
      if (label === result.value && result.valueHi && language === 'hi') label = result.valueHi
    } else if ((id === 'village' || id === 'locality') && result.value) {
      onFill({ [id]: result.value })
      label = language === 'hi' ? (result.valueHi ?? result.value) : result.value
    } else if (id === 'farmSize' && result.farmSize) {
      onFill({ farmSize: result.farmSize })
      label = f(SIZE_KEY[result.farmSize])
    } else if (id === 'crops' && result.crops?.length) {
      onFill({ crops: result.crops })
      label = result.crops.map((name) => {
        const known = CROP_CATALOGUE.find((crop) => crop.en === name)
        return language === 'hi' ? (known?.hi ?? name) : name
      }).join(', ')
    }
    succeed(label, ack || nextAck())
  }

  // Ask the current question: read it aloud, then open the microphone.
  useEffect(() => {
    const id = queue[index] ? resolveQuestion(queue[index], draftRef.current) : undefined
    askedRef.current = id
    setCurrent(id)
    if (!id) return
    runRef.current += 1
    const run = runRef.current
    const { text } = questionText(id)
    const spokenAck = spokenAckRef.current
    setAck(spokenAck)
    spokenAckRef.current = ''
    setTranscript('')
    setRecognized('')
    setMessage('')
    setPhase('speaking')
    void speak(spokenAck ? `${spokenAck}। ${text}` : text, language).then(() => startListening(run))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index])

  const retry = () => {
    runRef.current += 1
    setTranscript('')
    setMessage('')
    startListening(runRef.current)
  }

  const skip = () => {
    runRef.current += 1
    stopRecognition()
    stopSpeaking()
    spokenAckRef.current = ''
    advance(runRef.current)
  }

  const onMicTap = () => {
    if (phase === 'speaking') {
      // Skip the read-aloud and answer straight away.
      stopSpeaking()
      runRef.current += 1
      startListening(runRef.current)
    } else if (phase === 'listening') {
      try { recognitionRef.current?.stop() } catch { /* already stopped */ }
    } else if (phase === 'retry' || phase === 'error') {
      retry()
    }
  }

  const { text: question, hint } = questionText(phase === 'done' ? undefined : current)
  const status = phase === 'speaking' ? f('voiceSpeaking')
    : phase === 'listening' ? f('voiceListening')
    : phase === 'processing' ? f('voiceProcessing')
    : phase === 'success' ? f('voiceAckOk')
    : phase === 'done' ? f('voiceAllDone')
    : f('voiceTapToSpeak')

  return createPortal(
    <div className={`f-voice-screen is-${phase}`} role="dialog" aria-modal="true" aria-label={f('onboardSpeak')} lang={language}>
      <header className="f-voice-top">
        <button type="button" className="f-voice-exit" onClick={close}><X size={20} />{f('voiceExit')}</button>
        {phase !== 'done' && <span className="f-voice-count">{f('voiceQuestionOf', { current: Math.min(index + 1, total), total })}</span>}
      </header>

      <main className="f-voice-body">
        {ack && phase !== 'done' && <p className="f-voice-ack">{ack}</p>}
        <h1 className="f-voice-question" key={`${index}-${phase === 'done'}`}>{question}</h1>
        {hint && phase !== 'success' && phase !== 'done' && <p className="f-voice-hint">{hint}</p>}
        {phase === 'success' && recognized && (
          <p className="f-voice-value"><Check size={26} aria-hidden="true" />{recognized}</p>
        )}
      </main>

      <footer className="f-voice-bottom">
        {phase !== 'done' && (
          <p className={`f-voice-transcript ${phase === 'processing' || phase === 'success' ? 'is-soft' : ''}`} aria-live="polite">
            {transcript ? <><small>{f('voiceHeard')}</small>{transcript}</> : <span className="f-voice-transcript-empty">{phase === 'listening' ? '…' : ' '}</span>}
          </p>
        )}
        {(phase === 'retry' || phase === 'error') && <p className="f-voice-message" role="status">{message}</p>}

        <button
          type="button"
          className={`f-voice-mic is-${phase}`}
          onClick={onMicTap}
          disabled={phase === 'processing' || phase === 'success' || phase === 'done'}
          aria-label={phase === 'listening' ? f('close') : f('voiceTapToSpeak')}
        >
          {phase === 'processing' ? <Loader2 size={44} className="spin" aria-hidden="true" />
            : phase === 'success' || phase === 'done' ? <Check size={44} aria-hidden="true" />
            : phase === 'listening' ? <Square size={30} fill="currentColor" aria-hidden="true" />
            : <Mic size={44} aria-hidden="true" />}
        </button>
        <p className="f-voice-status" aria-live="polite">{status}</p>

        {(phase === 'retry' || phase === 'error') && (
          <div className="f-voice-actions">
            {phase === 'retry' && <button type="button" className="btn btn-primary btn-large" onClick={retry}><Mic size={18} />{f('voiceSpeakAgain')}</button>}
            <button type="button" className="btn btn-secondary btn-large" onClick={skip}>{f('voiceSkip')}</button>
            <button type="button" className="btn btn-secondary btn-large" onClick={close}>{f('voiceTypeInstead')}</button>
          </div>
        )}
      </footer>
    </div>,
    document.body,
  )
}
