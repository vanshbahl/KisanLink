import { Check, Loader2, Mic, Square, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CROP_CATALOGUE } from '../../data/crops'
import { useFarmerText, type FarmerKey } from '../../i18n/farmer'
import { parseOnboardingAnswer, parseYesNo, type FarmSizeId, type OnboardingField } from '../../services/onboardingVoice'
import { createSpeechRecognition, speak, speechErrorMessage, speechLang, stopSpeaking, type SpeechRecognitionLike } from '../../services/speech'

/**
 * Voice-guided onboarding: one question at a time, full screen, nothing else.
 *
 * Not a conversation. A fixed queue of questions is read aloud (browser TTS), the
 * microphone opens, the answer is parsed by `parseOnboardingAnswer`, the matching form
 * field behind this screen is filled through `onFill`, and the next question follows. A
 * short acknowledgement precedes each next question; that is the whole "dialogue".
 *
 * Nothing here can trap the farmer: every phase has a way back to the typed form, an
 * unrecognised answer offers "speak again" or "skip", and a denied microphone shows the
 * same message the listing voice modal shows and hands the form back.
 */
export type VoiceQuestionId = OnboardingField | 'region'

export interface VoiceDraft {
  name: string
  village: string
  locality: string
  district: string
  state: string
  farmSize: FarmSizeId | ''
  crops: string[]
  /** District and state came from the splash location read and have not been edited. */
  regionDetected: boolean
}

export interface VoiceFill {
  name?: string
  village?: string
  locality?: string
  district?: string
  state?: string
  farmSize?: FarmSizeId
  crops?: string[]
  /** The farmer confirmed the detected district and state by voice. */
  regionConfirmed?: boolean
}

interface OnboardingVoiceModeProps {
  draft: VoiceDraft
  /** Which form step the microphone was tapped on; questions before it are not asked. */
  startStep: 1 | 2 | 3
  onFill: (fill: VoiceFill) => void
  onClose: () => void
  /** Every question answered; the form shows its confirmation. */
  onFinished: () => void
}

type Phase = 'speaking' | 'listening' | 'processing' | 'success' | 'retry' | 'error' | 'done'

const SUCCESS_HOLD_MS = 1100
const DONE_HOLD_MS = 700

const SIZE_KEY: Record<FarmSizeId, FarmerKey> = { under1: 'sizeUnder1', '1to3': 'size1to3', '3to5': 'size3to5', '5to10': 'size5to10', '10plus': 'size10plus' }

/** Ordered questions, skipping what is already filled; the mic always asks something. */
function buildQueue(draft: VoiceDraft, startStep: 1 | 2 | 3): VoiceQuestionId[] {
  const step1: VoiceQuestionId[] = []
  if (!draft.name) step1.push('name')
  if (!draft.village) step1.push('village')
  if (!draft.locality) step1.push('locality')
  if (draft.district && draft.state && draft.regionDetected) step1.push('region')
  else {
    if (!draft.district) step1.push('district')
    if (!draft.state) step1.push('state')
  }
  const queue: VoiceQuestionId[] = []
  if (startStep <= 1) queue.push(...step1)
  if (startStep <= 2 && !draft.farmSize) queue.push('farmSize')
  if (startStep <= 3 && !draft.crops.length) queue.push('crops')
  if (queue.length) return queue
  return startStep === 1 ? ['name', 'village', 'locality', 'district', 'state'] : startStep === 2 ? ['farmSize'] : ['crops']
}

export function OnboardingVoiceMode({ draft, startStep, onFill, onClose, onFinished }: OnboardingVoiceModeProps) {
  const { f, language } = useFarmerText()
  const [queue, setQueue] = useState<VoiceQuestionId[]>(() => buildQueue(draft, startStep))
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

  const current = queue[index]
  const total = queue.length

  const questionText = useCallback((id: VoiceQuestionId | undefined): { text: string; hint?: string } => {
    const live = draftRef.current
    switch (id) {
      case 'name': return { text: f('voiceQName') }
      case 'village': return { text: live.name ? f('voiceQVillage', { name: live.name.split(' ')[0] }) : f('voiceQVillageNoName') }
      case 'locality': return { text: f('voiceQLocality') }
      case 'region': return { text: f('voiceQRegion', { district: live.district, state: live.state }), hint: f('voiceQRegionHint') }
      case 'district': return { text: f('voiceQDistrict') }
      case 'state': return { text: f('voiceQState') }
      case 'farmSize': return { text: f('voiceQFarmSize'), hint: f('voiceQFarmSizeHint') }
      case 'crops': return { text: f('voiceQCrops'), hint: f('voiceQCropsHint') }
      default: return { text: f('voiceAllDone') }
    }
  }, [f])

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
    setPhase('done')
    setAck('')
    setTranscript('')
    void speak(f('voiceAllDone'), language).then(() => {
      if (run !== runRef.current) return
      window.setTimeout(() => { if (run === runRef.current) onFinished() }, DONE_HOLD_MS)
    })
  }, [f, language, onFinished])

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
    recognition.onend = () => {
      if (run !== runRef.current || failed) return
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
    const id = current

    if (id === 'region') {
      const yes = parseYesNo(text)
      if (run !== runRef.current) return
      if (yes) {
        onFill({ regionConfirmed: true })
        setRecognized(`${draftRef.current.district}, ${draftRef.current.state}`)
        setPhase('success')
        spokenAckRef.current = f('voiceAckOk')
        window.setTimeout(() => advance(run), SUCCESS_HOLD_MS)
      } else {
        // "No", or nothing clear: ask for both, which is always safe.
        spokenAckRef.current = f('voiceAckOk')
        advance(run, ['district', 'state'])
      }
      return
    }

    const result = await parseOnboardingAnswer(id as OnboardingField, text, language)
    if (run !== runRef.current) return
    if (!result.recognized) {
      setPhase('retry')
      setMessage(f('voiceNotUnderstood'))
      return
    }

    let label = ''
    if (id === 'name' && result.value) {
      onFill({ name: result.value })
      label = language === 'hi' ? (result.valueHi ?? result.value) : result.value
      const first = label.split(' ')[0]
      spokenAckRef.current = f('voiceAckHello', { name: first })
    } else if ((id === 'village' || id === 'locality' || id === 'district' || id === 'state') && result.value) {
      onFill({ [id]: result.value })
      label = result.value
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
    if (id !== 'name') {
      ackTurnRef.current += 1
      spokenAckRef.current = f(ackTurnRef.current % 2 ? 'voiceAckOk' : 'voiceAckGreat')
    }
    setRecognized(label)
    setPhase('success')
    window.setTimeout(() => advance(run), SUCCESS_HOLD_MS)
  }

  // Ask the current question: read it aloud, then open the microphone.
  useEffect(() => {
    if (!current) return
    runRef.current += 1
    const run = runRef.current
    const { text } = questionText(current)
    // The village question already greets by name, so it carries no separate "hello".
    const spokenAck = current === 'village' && spokenAckRef.current.startsWith(f('voiceAckHello', { name: '' }).trim()) ? '' : spokenAckRef.current
    setAck(spokenAck)
    spokenAckRef.current = ''
    setTranscript('')
    setRecognized('')
    setMessage('')
    setPhase('speaking')
    void speak(spokenAck ? `${spokenAck}। ${text}` : text, language).then(() => startListening(run))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, current])

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
    : phase === 'success' ? (spokenAckRef.current || f('voiceAckOk'))
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
