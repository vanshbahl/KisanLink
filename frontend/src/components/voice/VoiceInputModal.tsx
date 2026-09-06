import { useEffect, useRef, useState } from 'react'
import { AlertCircle, Check, Mic, MicOff, RefreshCw, Sparkles, X } from 'lucide-react'
import { useLanguage } from '../../contexts/LanguageContext'
import { useToast } from '../../contexts/ToastContext'
import { apiClient } from '../../services/apiClient'

// Minimal shim for the (non-standardized, Chrome/Edge-only) Web Speech API — no
// official TS lib types ship for it, and this project doesn't depend on one just
// for this optional feature.
interface SpeechRecognitionLike {
  continuous: boolean
  interimResults: boolean
  lang: string
  onstart: (() => void) | null
  onresult: ((event: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

interface VoiceParsedResult {
  crop_name: string
  crop_name_hi?: string
  category?: string
  quantity_kg: number
  price_per_kg: number
  harvest_date: string
}

interface VoiceInputModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (fields: {
    crop: string
    cropHi?: string
    quantityKg: number
    pricePerKg: number
    harvestDate: string
  }) => void
}

const samplePhrases = [
  { label: '500 kg Tomato 25 rs', text: '500 kg tomatoes at 25 rupees per kg' },
  { label: '500 किलो टमाटर 25 रुपये', text: 'मुझे 500 किलो टमाटर 25 रुपये किलो में बेचना है' },
  { label: '300 kg Potato 20 rs', text: '300 kg new potatoes 20 rs per kg' },
  { label: '200 किलो पालक 40 रुपये', text: '200 किलो ताज़ा पालक 40 रुपये प्रति किलो' },
]

/**
 * Optional voice-assisted entry point for the farmer listing form. Speaks -> deterministic
 * backend NLP parse -> pre-filled, still-editable fields -> `onConfirm` hands them back to
 * the caller's existing form state. Never publishes anything itself — the farmer always
 * reviews and confirms through the normal listing wizard. Falls back to a manual transcript
 * field whenever the Web Speech API is unavailable or permission is denied.
 */
export function VoiceInputModal({ isOpen, onClose, onConfirm }: VoiceInputModalProps) {
  const { language } = useLanguage()
  const { showToast } = useToast()

  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [parsing, setParsing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [parsedData, setParsedData] = useState<VoiceParsedResult | null>(null)

  const [editCrop, setEditCrop] = useState('')
  const [editQty, setEditQty] = useState<number>(0)
  const [editPrice, setEditPrice] = useState<number>(0)
  const [editDate, setEditDate] = useState<string>('')

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)

  useEffect(() => {
    if (!isOpen) resetState()
  }, [isOpen])

  useEffect(() => {
    const esc = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [onClose])

  const resetState = () => {
    setIsListening(false)
    setTranscript('')
    setParsing(false)
    setError(null)
    setParsedData(null)
    if (recognitionRef.current) {
      try { recognitionRef.current.stop() } catch { /* already stopped */ }
    }
  }

  if (!isOpen) return null

  const startListening = () => {
    setError(null)
    setParsedData(null)

    const SpeechRecognition = (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike }).SpeechRecognition
      || (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike }).webkitSpeechRecognition

    if (!SpeechRecognition) {
      setError(
        language === 'hi'
          ? 'आपका ब्राउज़र स्पीच रिकग्निशन का समर्थन नहीं करता है। कृपया नीचे बोलकर या लिखकर टाइप करें।'
          : 'Voice input is not supported in this browser. Please type your phrase below instead.'
      )
      return
    }

    try {
      const recognition = new SpeechRecognition()
      recognitionRef.current = recognition
      recognition.continuous = false
      recognition.interimResults = true
      recognition.lang = language === 'hi' ? 'hi-IN' : 'en-IN'

      recognition.onstart = () => setIsListening(true)
      recognition.onresult = (event) => {
        let currentTranscript = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript
        }
        setTranscript(currentTranscript)
      }
      recognition.onerror = (event) => {
        setIsListening(false)
        if (event.error === 'not-allowed') {
          setError(
            language === 'hi'
              ? 'माइक अनुमति अस्वीकृत। कृपया माइक अनुमति दें या नीचे टाइप करें।'
              : 'Microphone permission denied. Please allow mic access, or type your phrase below.'
          )
        } else {
          setError(
            language === 'hi'
              ? 'आवाज़ ठीक से नहीं पहचानी गई। कृपया दोबारा कोशिश करें या टाइप करें।'
              : 'Could not recognize speech clearly. Try again, or type your phrase below.'
          )
        }
      }
      recognition.onend = () => setIsListening(false)
      recognition.start()
    } catch {
      setIsListening(false)
      setError(language === 'hi' ? 'माइक्रोफ़ोन तक नहीं पहुंच सका।' : 'Could not access the microphone.')
    }
  }

  const stopListening = () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop() } catch { /* already stopped */ }
    }
    setIsListening(false)
  }

  const handleParse = async (textToParse?: string) => {
    const text = (textToParse ?? transcript).trim()
    if (!text) {
      showToast(language === 'hi' ? 'कृपया पहले कुछ बोलें या वाक्य लिखें।' : 'Please speak or type a phrase first.')
      return
    }

    setParsing(true)
    setError(null)
    try {
      const res = await apiClient.parseVoiceListing(text, language)
      setParsedData(res)
      setEditCrop(res.crop_name)
      setEditQty(res.quantity_kg)
      setEditPrice(res.price_per_kg)
      setEditDate(res.harvest_date || new Date().toISOString().slice(0, 10))
    } catch (err) {
      const msg = err instanceof Error ? err.message : (language === 'hi' ? 'फ़ील्ड नहीं निकाल सके। कृपया मैन्युअल रूप से भरें।' : 'Could not parse listing details. Please fill the form manually.')
      setError(msg)
    } finally {
      setParsing(false)
    }
  }

  const handleApply = () => {
    if (!editCrop.trim() || editQty <= 0 || editPrice <= 0) {
      showToast(language === 'hi' ? 'कृपया सभी फ़ील्ड सही भरें।' : 'Please complete all fields before applying.')
      return
    }
    onConfirm({
      crop: editCrop.trim(),
      cropHi: parsedData?.crop_name_hi || editCrop,
      quantityKg: editQty,
      pricePerKg: editPrice,
      harvestDate: editDate || new Date().toISOString().slice(0, 10),
    })
    showToast(language === 'hi' ? 'फ़ॉर्म में भर दिया गया — जांच लें।' : 'Applied to the form — review before publishing.')
    onClose()
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="voice-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="voice-modal-title">
        <header>
          <h2 id="voice-modal-title"><Sparkles size={18} />{language === 'hi' ? 'बोलकर फसल लिस्ट करें' : 'Fill with voice'}</h2>
          <button className="icon-button" aria-label={language === 'hi' ? 'बंद करें' : 'Close'} onClick={onClose}><X size={19} /></button>
        </header>

        <p className="voice-modal-hint">
          {language === 'hi'
            ? 'माइक दबाएं और फसल, मात्रा और दाम बोलें — जैसे "500 किलो टमाटर 25 रुपये किलो"'
            : 'Tap the mic and say your crop, quantity, and price — e.g. "500 kg tomatoes at 25 rupees per kg"'}
        </p>

        <div className={`voice-mic-row${isListening ? ' is-listening' : ''}`}>
          <button type="button" className={`voice-mic-btn${isListening ? ' listening' : ''}`} onClick={isListening ? stopListening : startListening} aria-label={isListening ? 'Stop listening' : 'Start listening'}>
            {isListening ? <MicOff size={28} /> : <Mic size={28} />}
          </button>
          <small>{isListening ? (language === 'hi' ? 'सुन रहा है... बोलिए' : 'Listening… speak now') : (language === 'hi' ? 'बोलने के लिए दबाएं' : 'Tap to start speaking')}</small>
        </div>

        <label className="field full">
          <span>{language === 'hi' ? 'आवाज़ से प्राप्त टेक्स्ट (या टाइप करें)' : 'Spoken transcript (or type it)'}</span>
          <textarea
            rows={2}
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder={language === 'hi' ? 'उदाहरण: मुझे 500 किलो टमाटर 25 रुपये किलो में बेचना है' : 'e.g. I have 500 kg tomatoes at 25 rupees per kg'}
          />
        </label>

        <div className="voice-sample-row">
          <small>{language === 'hi' ? 'उदाहरण आज़माएं:' : 'Try a sample:'}</small>
          {samplePhrases.map((sample) => (
            <button key={sample.label} type="button" className="voice-sample-chip" onClick={() => { setTranscript(sample.text); handleParse(sample.text) }}>
              {sample.label}
            </button>
          ))}
        </div>

        <button type="button" className="btn btn-primary btn-full" onClick={() => handleParse()} disabled={parsing || !transcript.trim()}>
          {parsing ? <><RefreshCw size={16} className="spin" />{language === 'hi' ? 'पार्स हो रहा है…' : 'Parsing…'}</> : <><Sparkles size={16} />{language === 'hi' ? 'फ़ील्ड निकालें' : 'Parse details'}</>}
        </button>

        {error && (
          <div className="voice-error-note">
            <AlertCircle size={17} />
            <span>{error} {language === 'hi' ? 'आप हमेशा फ़ॉर्म मैन्युअल रूप से भर सकते हैं।' : 'You can always continue filling the form manually.'}</span>
          </div>
        )}

        {parsedData && (
          <div className="voice-parsed-result">
            <strong><Check size={16} />{language === 'hi' ? 'निकाली गई जानकारी (जांचें/बदलें)' : 'Extracted fields — review & edit'}</strong>
            <div className="voice-parsed-fields">
              <label>{language === 'hi' ? 'फसल' : 'Crop'}<input type="text" value={editCrop} onChange={(e) => setEditCrop(e.target.value)} /></label>
              <label>{language === 'hi' ? 'मात्रा (kg)' : 'Quantity (kg)'}<input type="number" min="1" value={editQty} onChange={(e) => setEditQty(Number(e.target.value))} /></label>
              <label>{language === 'hi' ? 'कीमत (₹/kg)' : 'Price (₹/kg)'}<input type="number" min="1" value={editPrice} onChange={(e) => setEditPrice(Number(e.target.value))} /></label>
              <label>{language === 'hi' ? 'कटाई तारीख' : 'Harvest date'}<input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} /></label>
            </div>
            <button type="button" className="btn btn-primary" onClick={handleApply}>
              <Check size={16} />{language === 'hi' ? 'फ़ॉर्म में भरें' : 'Apply to form'}
            </button>
          </div>
        )}
      </section>
    </div>
  )
}
