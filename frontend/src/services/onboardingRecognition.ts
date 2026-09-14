import type { SpeechRecognitionLike } from './speech'

export const ONBOARDING_SILENCE_MS = 1800
export const ONBOARDING_LISTEN_LIMIT_MS = 30000
/** After asking the browser to finalise a pending interim result, how long to wait for it. */
export const ONBOARDING_FLUSH_MS = 1500

/** One answer may span several browser recognition sessions. Never submit interim text. */
export function listenForOnboardingAnswer(recognition: SpeechRecognitionLike, callbacks: {
  transcript: (text: string) => void
  answer: (text: string) => void
  error: (code: string) => void
}) {
  let cancelled = false
  let finalText = ''
  let sessionFinal = ''
  let interim = ''
  let restarts = 0
  let flushing = false
  let silence: ReturnType<typeof setTimeout> | undefined
  let restart: ReturnType<typeof setTimeout> | undefined
  const clear = () => { clearTimeout(silence); clearTimeout(restart); clearTimeout(limit) }
  const stop = () => {
    cancelled = true
    clear()
    recognition.onend = null
    recognition.onresult = null
    recognition.onerror = null
    try { recognition.abort() } catch { /* already ended */ }
  }
  const fail = (code: string) => { if (cancelled) return; stop(); callbacks.error(code) }
  const finish = () => {
    if (cancelled) return
    if (interim) {
      // Words still interim are never submitted. Ask the browser to finalise them once
      // (Chrome does so on stop) and let the next result or `end` decide.
      if (flushing) { fail('no-speech'); return }
      flushing = true
      clearTimeout(silence)
      silence = setTimeout(finish, ONBOARDING_FLUSH_MS)
      try { recognition.stop() } catch { fail('no-speech') }
      return
    }
    const text = [finalText, sessionFinal].filter(Boolean).join(' ').trim()
    if (!text) { fail('no-speech'); return }
    stop()
    callbacks.answer(text)
  }
  const limit = setTimeout(() => fail('no-speech'), ONBOARDING_LISTEN_LIMIT_MS)
  recognition.continuous = true
  recognition.interimResults = true
  recognition.onresult = event => {
    if (cancelled) return
    sessionFinal = ''; interim = ''
    for (let i = 0; i < event.results.length; i += 1) {
      const result = event.results[i]
      if (result.isFinal) sessionFinal += result[0].transcript + ' '
      else interim += result[0].transcript + ' '
    }
    sessionFinal = sessionFinal.trim(); interim = interim.trim()
    callbacks.transcript([finalText, sessionFinal, interim].filter(Boolean).join(' '))
    clearTimeout(silence)
    silence = setTimeout(finish, ONBOARDING_SILENCE_MS)
  }
  recognition.onerror = event => {
    if (event.error === 'no-speech') return // onend restarts; the overall deadline stays bounded.
    fail(event.error)
  }
  recognition.onend = () => {
    if (cancelled) return
    if (interim) { fail('no-speech'); return }
    finalText = [finalText, sessionFinal].filter(Boolean).join(' ')
    sessionFinal = ''
    if (flushing) { flushing = false; finish(); return }
    if (++restarts > 6) { fail('no-speech'); return }
    restart = setTimeout(() => {
      if (cancelled) return
      try { recognition.start() } catch { fail('audio-capture') }
    }, 100)
  }
  try { recognition.start() } catch { fail('audio-capture') }
  return { cancel: stop, finish }
}
