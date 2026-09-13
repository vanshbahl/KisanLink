import type { Language } from '../types'

/**
 * Browser speech, shared by every farmer voice surface.
 *
 * Recognition is the Web Speech API the listing voice modal has always used; the
 * constructor lookup, the locale per language and the human-readable error copy moved
 * here so the onboarding voice mode speaks the same dialect and fails with the same
 * messages. Synthesis is the browser's own `speechSynthesis`: no service, no keys, and
 * a no-op wherever it is missing, so a silent browser only loses the read-aloud.
 */
export interface SpeechRecognitionLike {
  continuous: boolean
  interimResults: boolean
  lang: string
  onstart: (() => void) | null
  onresult: ((event: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal?: boolean }> }) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike

/** The browser's recognizer, or null where the API does not exist (Firefox, most in-app browsers). */
export function createSpeechRecognition(): SpeechRecognitionLike | null {
  const scope = window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor }
  const Ctor = scope.SpeechRecognition || scope.webkitSpeechRecognition
  return Ctor ? new Ctor() : null
}

export const speechLang = (language: Language) => (language === 'hi' ? 'hi-IN' : 'en-IN')

/** Farmer-facing copy for a Web Speech error code. `aborted` is intentional and returns null. */
export function speechErrorMessage(code: string, language: Language): string | null {
  const hi = language === 'hi'
  switch (code) {
    case 'no-speech':
      return hi ? 'कोई आवाज़ नहीं सुनी गई। माइक दबाएं और दोबारा बोलें।' : 'No speech detected. Tap the microphone and try again.'
    case 'not-allowed':
      return hi ? 'माइक अनुमति अवरुद्ध है। ब्राउज़र सेटिंग्स में अनुमति दें और पुनः प्रयास करें।' : 'Microphone access is blocked. Allow microphone access in your browser and try again.'
    case 'audio-capture':
      return hi ? 'कोई माइक्रोफ़ोन नहीं मिला।' : 'No microphone was detected.'
    case 'network':
      return hi ? 'स्पीच सेवा उपलब्ध नहीं है। Arc/Dia/Brave के बजाय Google Chrome या Edge का उपयोग करें, या नीचे टाइप करें।' : 'Voice recognition service unreachable. If using Arc, Dia, or Brave, use Google Chrome or Edge, or type below.'
    case 'service-not-allowed':
      return hi ? 'इस ब्राउज़र में स्पीच सेवा की अनुमति नहीं है। कृपया नीचे टाइप करें।' : 'Speech recognition service is not permitted in this browser. You can type instead.'
    case 'language-not-supported':
      return hi ? 'यह भाषा ब्राउज़र स्पीच इंजन में समर्थित नहीं है।' : 'Selected language is not supported by your browser speech engine.'
    case 'aborted':
      return null
    default:
      return hi ? `आवाज़ ठीक से नहीं पहचानी गई (${code})। कृपया दोबारा बोलें या नीचे टाइप करें।` : `Could not recognize speech clearly (${code}). Try again, or type your phrase below.`
  }
}

export const unsupportedSpeechMessage = (language: Language) =>
  language === 'hi' ? 'आपके ब्राउज़र में आवाज़ इनपुट समर्थित नहीं है।' : 'Voice input is not supported in this browser.'

/** Longest a single read-aloud may hold the flow if the browser never reports `end`. */
const MAX_UTTERANCE_MS = 12000

export const canSpeak = () => typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined'

/**
 * Voices arrive asynchronously in Chrome (`getVoices()` is empty until `voiceschanged`),
 * which is why a naive `speak()` ends up on the default system voice reading Hindi in an
 * English accent. Wait for the list once, briefly, and cache it.
 */
let voicesPromise: Promise<SpeechSynthesisVoice[]> | null = null
export function loadVoices(timeoutMs = 1500): Promise<SpeechSynthesisVoice[]> {
  if (!canSpeak()) return Promise.resolve([])
  const synth = window.speechSynthesis
  const now = synth.getVoices()
  if (now.length) return Promise.resolve(now)
  if (voicesPromise) return voicesPromise
  voicesPromise = new Promise((resolve) => {
    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      window.clearTimeout(timer)
      synth.removeEventListener('voiceschanged', finish)
      const voices = synth.getVoices()
      if (!voices.length) voicesPromise = null
      resolve(voices)
    }
    const timer = window.setTimeout(finish, timeoutMs)
    synth.addEventListener('voiceschanged', finish)
  })
  return voicesPromise
}

/**
 * Names of the natural-sounding voices the major engines ship for Indian languages, best
 * first. Google's cloud voices (desktop Chrome), Microsoft's neural voices (Edge, Windows)
 * and Apple's Lekha/Rishi (iOS, macOS) all read Hindi far better than a generic default.
 */
const PREFERRED_NAMES: Record<Language, string[]> = {
  hi: ['google हिन्दी', 'google hindi', 'swara', 'madhur', 'lekha', 'hemant', 'kalpana', 'google', 'natural', 'neural', 'online'],
  en: ['neerja', 'prabhat', 'google english (india)', 'rishi', 'veena', 'heera', 'ravi', 'google uk english female', 'google', 'natural', 'neural', 'online'],
}

const chosen = new Map<Language, SpeechSynthesisVoice | null>()

/** Best available voice for the language: right locale first, then a known good engine, then any voice in the language. */
export function pickVoice(voices: SpeechSynthesisVoice[], language: Language): SpeechSynthesisVoice | null {
  const wanted = speechLang(language).toLowerCase()
  const score = (voice: SpeechSynthesisVoice) => {
    const lang = voice.lang.replace('_', '-').toLowerCase()
    const name = voice.name.toLowerCase()
    let points = 0
    if (lang === wanted) points += 100
    else if (lang.startsWith(language)) points += 50
    else return -1
    const rank = PREFERRED_NAMES[language].findIndex((needle) => name.includes(needle))
    if (rank >= 0) points += 40 - rank * 2
    // Remote (cloud) voices in Chrome are the higher quality ones.
    if (!voice.localService) points += 5
    return points
  }
  const ranked = voices.map((voice) => ({ voice, points: score(voice) })).filter((entry) => entry.points >= 0).sort((a, b) => b.points - a.points)
  return ranked[0]?.voice ?? null
}

async function voiceFor(language: Language): Promise<SpeechSynthesisVoice | null> {
  if (chosen.has(language)) return chosen.get(language) ?? null
  const voice = pickVoice(await loadVoices(), language)
  if (voice) chosen.set(language, voice)
  return voice
}

/** Call early (on the mic tap) so the first question does not wait for the voice list. */
export function warmUpVoices() {
  void loadVoices()
}

/**
 * Read `text` aloud in the selected language and resolve when done. Resolves immediately
 * where synthesis is unavailable and never rejects: the question is on screen either way.
 */
let generation = 0

export function speak(text: string, language: Language): Promise<void> {
  if (!canSpeak() || !text.trim()) return Promise.resolve()
  const mine = ++generation
  return new Promise((resolve) => {
    let settled = false
    const finish = () => { if (settled) return; settled = true; window.clearTimeout(timer); resolve() }
    const timer = window.setTimeout(finish, MAX_UTTERANCE_MS)
    void voiceFor(language).then((voice) => {
      // A stopSpeaking() or a newer speak() while the voice list loaded wins.
      if (settled || mine !== generation) { finish(); return }
      try {
        const synth = window.speechSynthesis
        synth.cancel()
        const utterance = new SpeechSynthesisUtterance(text)
        utterance.lang = voice?.lang ?? speechLang(language)
        if (voice) utterance.voice = voice
        // Hindi reads clearer a touch slower; English at natural pace.
        utterance.rate = language === 'hi' ? 0.9 : 0.97
        utterance.pitch = 1
        utterance.onend = finish
        utterance.onerror = finish
        // Chrome drops an utterance queued in the same tick as cancel(); give it a beat.
        window.setTimeout(() => { if (!settled && mine === generation) synth.speak(utterance); else finish() }, 60)
      } catch {
        finish()
      }
    })
  })
}

export function stopSpeaking() {
  generation += 1
  try { if (canSpeak()) window.speechSynthesis.cancel() } catch { /* nothing to stop */ }
}
