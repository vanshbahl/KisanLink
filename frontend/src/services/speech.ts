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
 * Read `text` aloud in the selected language and resolve when done. Resolves immediately
 * where synthesis is unavailable and never rejects: the question is on screen either way.
 */
export function speak(text: string, language: Language): Promise<void> {
  if (!canSpeak() || !text.trim()) return Promise.resolve()
  return new Promise((resolve) => {
    let settled = false
    const finish = () => { if (settled) return; settled = true; window.clearTimeout(timer); resolve() }
    const timer = window.setTimeout(finish, MAX_UTTERANCE_MS)
    try {
      const synth = window.speechSynthesis
      synth.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      const lang = speechLang(language)
      utterance.lang = lang
      utterance.rate = 0.95
      const voice = synth.getVoices().find((item) => item.lang.replace('_', '-').toLowerCase() === lang.toLowerCase())
        ?? synth.getVoices().find((item) => item.lang.toLowerCase().startsWith(language))
      if (voice) utterance.voice = voice
      utterance.onend = finish
      utterance.onerror = finish
      synth.speak(utterance)
    } catch {
      finish()
    }
  })
}

export function stopSpeaking() {
  try { if (canSpeak()) window.speechSynthesis.cancel() } catch { /* nothing to stop */ }
}
