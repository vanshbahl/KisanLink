import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { listenForOnboardingAnswer } from '../services/onboardingRecognition'
import { createSpeechRecognition, speechErrorMessage, type SpeechRecognitionLike } from '../services/speech'
function recognizer(): SpeechRecognitionLike {
  return { continuous: false, interimResults: false, lang: 'en-IN', onstart: null, onresult: null, onerror: null, onend: null, start: vi.fn(), stop: vi.fn(), abort: vi.fn() }
}
function result(recognition: SpeechRecognitionLike, text: string, final = true) {
  recognition.onresult?.({ resultIndex: 0, results: [Object.assign([{ transcript: text }], { isFinal: final })] })
}
beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())
describe('onboarding recognition lifecycle', () => {
  it('waits 1.8 seconds and combines speech across browser restarts', () => {
    const recognition = recognizer(), answer = vi.fn(), error = vi.fn()
    listenForOnboardingAnswer(recognition, { answer, error, transcript: vi.fn() })
    result(recognition, 'Sunita')
    vi.advanceTimersByTime(400)
    recognition.onend?.()
    vi.advanceTimersByTime(100)
    expect(recognition.start).toHaveBeenCalledTimes(2)
    result(recognition, 'Devi')
    vi.advanceTimersByTime(1799)
    expect(answer).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(answer).toHaveBeenCalledExactlyOnceWith('Sunita Devi')
    expect(error).not.toHaveBeenCalled()
  })
  it('does not save interim-only or trailing partial results', () => {
    const recognition = recognizer(), answer = vi.fn(), error = vi.fn()
    listenForOnboardingAnswer(recognition, { answer, error, transcript: vi.fn() })
    result(recognition, 'my name', false)
    vi.advanceTimersByTime(1800)
    expect(recognition.stop).toHaveBeenCalledTimes(1)
    expect(answer).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1500)
    expect(answer).not.toHaveBeenCalled()
    expect(error).toHaveBeenCalledWith('no-speech')
  })
  it('submits an interim result once the browser finalises it after stop', () => {
    const recognition = recognizer(), answer = vi.fn(), error = vi.fn()
    const listener = listenForOnboardingAnswer(recognition, { answer, error, transcript: vi.fn() })
    result(recognition, 'Sunita Devi', false)
    listener.finish()
    expect(recognition.stop).toHaveBeenCalledTimes(1)
    expect(answer).not.toHaveBeenCalled()
    result(recognition, 'Sunita Devi', true)
    recognition.onend?.()
    expect(answer).toHaveBeenCalledExactlyOnceWith('Sunita Devi')
    vi.advanceTimersByTime(30000)
    expect(answer).toHaveBeenCalledTimes(1)
    expect(error).not.toHaveBeenCalled()
  })
  it('times out a silent session after 30 seconds', () => {
    const recognition = recognizer(), error = vi.fn()
    listenForOnboardingAnswer(recognition, { answer: vi.fn(), error, transcript: vi.fn() })
    vi.advanceTimersByTime(30000)
    expect(error).toHaveBeenCalledExactlyOnceWith('no-speech')
  })
  it.each(['not-allowed', 'audio-capture', 'network', 'service-not-allowed'])('handles %s without a restart', code => {
    const recognition = recognizer(), error = vi.fn(), answer = vi.fn()
    listenForOnboardingAnswer(recognition, { answer, error, transcript: vi.fn() })
    recognition.onerror?.({ error: code })
    vi.advanceTimersByTime(30000)
    expect(error).toHaveBeenCalledExactlyOnceWith(code)
    expect(answer).not.toHaveBeenCalled()
    expect(recognition.start).toHaveBeenCalledTimes(1)
    expect(speechErrorMessage(code, 'hi')).toBeTruthy()
  })
  it('cancels pending answers and restarts on exit', () => {
    const recognition = recognizer(), answer = vi.fn(), error = vi.fn()
    const listener = listenForOnboardingAnswer(recognition, { answer, error, transcript: vi.fn() })
    result(recognition, 'Sunita'); recognition.onend?.(); listener.cancel()
    vi.advanceTimersByTime(30000)
    expect(answer).not.toHaveBeenCalled(); expect(error).not.toHaveBeenCalled()
    expect(recognition.start).toHaveBeenCalledTimes(1)
  })
  it('returns null for unsupported speech APIs', () => expect(createSpeechRecognition()).toBeNull())
})
