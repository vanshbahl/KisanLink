import { useEffect, useRef, useState } from 'react'
import { AlertCircle, Check, Mic, MicOff, RefreshCw, Sparkles, X } from 'lucide-react'
import { useLanguage } from '../../contexts/LanguageContext'
import { useToast } from '../../contexts/ToastContext'
import { apiClient } from '../../services/apiClient'
import { localDay } from '../../utils/dates'

interface SpeechRecognitionLike {
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

interface VoiceParsedResult {
  crop_name?: string | null
  crop_name_hi?: string
  category?: string
  quantity_kg?: number | null
  unit?: 'kg' | 'quintal' | 'tonne' | string
  price_per_kg?: number | null
  pickup_location?: string | null
  availability_date?: string | null
  harvest_date?: string | null
  pickup_date?: string | null
  pickup_window?: string | null
  fulfillment?: 'pickup' | 'self_delivery' | string | null
  notes?: string | null
  confidence_score?: number
  missing_fields?: string[]
  ai_used?: boolean
  warning?: string | null
}

interface VoiceInputModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (fields: {
    crop: string
    cropHi?: string
    quantityKg: number
    pricePerKg: number
    unit?: 'kg' | 'quintal' | 'tonne'
    harvestDate: string
    availableFrom?: string
    pickupDate?: string
    pickupWindow?: string
    fulfillment?: 'pickup' | 'self_delivery'
    farm?: string
    notes?: string
  }) => void
}

const samplePhrases = [
  { label: '725 kg Tomato ₹2 (18 Sep)', text: 'Mujhe 725 kilo tamatar ₹2 per kilo mein bechne hain aur ise mere khet se 18 September ko uthana' },
  { label: '500 kg Aloo ₹20 (Farm)', text: 'mere paas 500 kilo aloo hai 20 rupaye kilo buyer kal farm se le ja sakta hai' },
  { label: '300 kg Onion ₹28 (Sonipat)', text: '300 kg onion 28 rs kg pickup Sonipat se 20 September' },
  { label: '5 quintal Gehun ₹24 (Mon)', text: 'mere paas 5 quintal gehun hai 2400 rupaye quintal agle Monday pickup kar lena' },
]

/**
 * Voice-assisted entry point for the farmer listing wizard.
 * Speaks -> automatically transcribes -> auto-parses into structured fields -> editable review.
 * One contextual control handles speaking, listening, and typed parsing seamlessly.
 */
export function VoiceInputModal({ isOpen, onClose, onConfirm }: VoiceInputModalProps) {
  const { language } = useLanguage()
  const { showToast } = useToast()

  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [parsing, setParsing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [parsedData, setParsedData] = useState<VoiceParsedResult | null>(null)

  // Editable review fields
  const [editCrop, setEditCrop] = useState('')
  const [editQty, setEditQty] = useState<number>(0)
  const [editUnit, setEditUnit] = useState<'kg' | 'quintal' | 'tonne'>('kg')
  const [editPrice, setEditPrice] = useState<number>(0)
  const [editDate, setEditDate] = useState<string>('')
  const [editLocation, setEditLocation] = useState('')
  const [editWindow, setEditWindow] = useState('Morning · 7–10 AM')
  const [editFulfillment, setEditFulfillment] = useState<'pickup' | 'self_delivery'>('pickup')
  const [editNotes, setEditNotes] = useState('')

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const latestTranscriptRef = useRef('')
  const hasErrorRef = useRef(false)

  useEffect(() => {
    if (!isOpen) resetState()
  }, [isOpen])

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort() } catch { /* ignore */ }
      }
    }
  }, [])

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
    latestTranscriptRef.current = ''
    hasErrorRef.current = false
    if (recognitionRef.current) {
      try { recognitionRef.current.stop() } catch { /* already stopped */ }
    }
  }

  if (!isOpen) return null

  const startListening = () => {
    setError(null)
    setParsedData(null)
    hasErrorRef.current = false
    latestTranscriptRef.current = ''

    const SpeechRecognition =
      (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike }).webkitSpeechRecognition

    if (!SpeechRecognition) {
      console.warn('[VoiceRecognition] SpeechRecognition is not supported in this browser.')
      setError(
        language === 'hi'
          ? 'आपके ब्राउज़र में आवाज़ इनपुट समर्थित नहीं है। आप नीचे लिस्टिंग टाइप कर सकते हैं।'
          : 'Voice input is not supported in this browser. You can type the listing instead.'
      )
      return
    }

    try {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort() } catch { /* ignore */ }
      }

      const recognition = new SpeechRecognition()
      recognitionRef.current = recognition
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = language === 'hi' ? 'hi-IN' : 'en-IN'

      recognition.onstart = () => {
        console.log('[VoiceRecognition] onstart: listening started (lang:', recognition.lang, ')')
        setIsListening(true)
      }

      recognition.onresult = (event) => {
        let final = ''
        let interim = ''
        for (let i = 0; i < event.results.length; i++) {
          const res = event.results[i]
          if (res.isFinal) {
            final += res[0].transcript + ' '
          } else {
            interim += res[0].transcript
          }
        }
        const fullTranscript = `${final}${interim}`.trim()
        latestTranscriptRef.current = fullTranscript
        setTranscript(fullTranscript)
        setError(null)
        console.log('[VoiceRecognition] onresult transcript:', fullTranscript)
      }

      recognition.onerror = (event) => {
        console.error('[VoiceRecognition] onerror code:', event.error)
        hasErrorRef.current = true
        setIsListening(false)

        switch (event.error) {
          case 'no-speech':
            setError(
              language === 'hi'
                ? 'कोई आवाज़ नहीं सुनी गई। माइक दबाएं और दोबारा बोलें।'
                : 'No speech detected. Tap the microphone and try again.'
            )
            break
          case 'not-allowed':
            setError(
              language === 'hi'
                ? 'माइक अनुमति अवरुद्ध है। ब्राउज़र सेटिंग्स में अनुमति दें और पुनः प्रयास करें।'
                : 'Microphone access is blocked. Allow microphone access in your browser and try again.'
            )
            break
          case 'audio-capture':
            setError(
              language === 'hi'
                ? 'कोई माइक्रोफ़ोन नहीं मिला।'
                : 'No microphone was detected.'
            )
            break
          case 'network':
            setError(
              language === 'hi'
                ? 'स्पीच सेवा उपलब्ध नहीं है। Arc/Dia/Brave के बजाय Google Chrome या Edge का उपयोग करें, या नीचे टाइप करें।'
                : 'Voice recognition service unreachable. If using Arc, Dia, or Brave, use Google Chrome or Edge, or type below.'
            )
            break
          case 'service-not-allowed':
            setError(
              language === 'hi'
                ? 'इस ब्राउज़र में स्पीच सेवा की अनुमति नहीं है। कृपया नीचे टाइप करें।'
                : 'Speech recognition service is not permitted in this browser. You can type instead.'
            )
            break
          case 'language-not-supported':
            setError(
              language === 'hi'
                ? 'यह भाषा ब्राउज़र स्पीच इंजन में समर्थित नहीं है।'
                : 'Selected language is not supported by your browser speech engine.'
            )
            break
          case 'aborted':
            // Intentional cancellation — no error message needed
            break
          default:
            setError(
              language === 'hi'
                ? `आवाज़ ठीक से नहीं पहचानी गई (${event.error})। कृपया दोबारा बोलें या नीचे टाइप करें।`
                : `Could not recognize speech clearly (${event.error}). Try again, or type your phrase below.`
            )
            break
        }
      }

      recognition.onend = () => {
        console.log('[VoiceRecognition] onend: recognition ended')
        setIsListening(false)
        const finalToParse = latestTranscriptRef.current.trim()
        if (finalToParse && !hasErrorRef.current) {
          console.log('[VoiceRecognition] Auto-parsing transcript after speech completion:', finalToParse)
          void handleParse(finalToParse)
        }
      }

      recognition.start()
    } catch (err) {
      console.error('[VoiceRecognition] start exception:', err)
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
      setEditCrop(res.crop_name || '')
      setEditQty(res.quantity_kg || 0)
      if (res.unit === 'quintal' || res.unit === 'tonne' || res.unit === 'kg') {
        setEditUnit(res.unit)
      } else {
        setEditUnit('kg')
      }
      setEditPrice(res.price_per_kg || 0)
      setEditDate(res.pickup_date || res.availability_date || res.harvest_date || '')
      setEditLocation(res.pickup_location || 'Green Field Farm')
      if (res.pickup_window) {
        setEditWindow(res.pickup_window)
      }
      if (res.fulfillment === 'self_delivery' || res.fulfillment === 'pickup') {
        setEditFulfillment(res.fulfillment)
      }
      setEditNotes(res.notes || '')
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
      unit: editUnit,
      pricePerKg: editPrice,
      harvestDate: editDate || localDay(),
      availableFrom: editDate || undefined,
      pickupDate: editDate || undefined,
      pickupWindow: editWindow,
      fulfillment: editFulfillment,
      farm: editLocation || 'Green Field Farm',
      notes: editNotes,
    })
    showToast(language === 'hi' ? 'फ़ॉर्म में भर दिया गया — जांच लें।' : 'Applied to the form — review before publishing.')
    onClose()
  }

  const handlePrimaryAction = () => {
    if (isListening) {
      stopListening()
    } else if (!transcript.trim()) {
      startListening()
    } else {
      handleParse(transcript)
    }
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
            ? 'बोलें फसल, मात्रा, दाम और पिकअप तारीख — जैसे "725 किलो टमाटर 2 रुपये किलो, 18 सितंबर को खेत से उठाना"'
            : 'Say your crop, quantity, price, and pickup date — e.g. "725 kg tomatoes at 2 rupees per kg, pickup from farm on 18 September"'}
        </p>

        {/* Unified Primary Control */}
        <div className="voice-control-row">
          <button
            type="button"
            className={`voice-primary-cta${isListening ? ' listening' : ''}`}
            onClick={handlePrimaryAction}
            disabled={parsing}
            aria-label={
              isListening
                ? (language === 'hi' ? 'बोलना बंद करें' : 'Stop listening')
                : !transcript.trim()
                ? (language === 'hi' ? 'बोलना शुरू करें' : 'Start speaking')
                : (language === 'hi' ? 'पार्स करें' : 'Parse typed listing')
            }
          >
            {isListening ? (
              <>
                <MicOff size={20} />
                <span>{language === 'hi' ? 'सुन रहा है... (रोकने के लिए दबाएं)' : 'Listening… speak now (tap to finish)'}</span>
              </>
            ) : parsing ? (
              <>
                <RefreshCw size={20} className="spin" />
                <span>{language === 'hi' ? 'जानकारी समझी जा रही है…' : 'Understanding listing…'}</span>
              </>
            ) : !transcript.trim() ? (
              <>
                <Mic size={20} />
                <span>{language === 'hi' ? 'बोलकर लिस्ट करें' : 'Speak listing'}</span>
              </>
            ) : (
              <>
                <Sparkles size={20} />
                <span>{language === 'hi' ? 'लिखी जानकारी निकालें' : 'Parse typed listing'}</span>
              </>
            )}
          </button>
        </div>

        <label className="field full">
          <div className="field-head-row">
            <span>{language === 'hi' ? 'आवाज़ से प्राप्त टेक्स्ट (या टाइप करें)' : 'Spoken transcript (or type it)'}</span>
            {Boolean(transcript && !isListening && !parsing) && (
              <button
                type="button"
                className="voice-re-mic-btn"
                onClick={startListening}
                title={language === 'hi' ? 'दोबारा बोलें' : 'Speak again'}
              >
                <Mic size={13} /> {language === 'hi' ? 'दोबारा बोलें' : 'Speak again'}
              </button>
            )}
          </div>
          <textarea
            rows={2}
            value={transcript}
            onChange={(e) => {
              setTranscript(e.target.value)
              latestTranscriptRef.current = e.target.value
              if (error) setError(null)
            }}
            placeholder={language === 'hi' ? 'उदाहरण: 725 किलो टमाटर 2 रुपये किलो, 18 सितंबर को खेत से उठाना' : 'e.g. 725 kg tomatoes at 2 rupees per kg, pickup from farm on 18 September'}
          />
        </label>

        <div className="voice-sample-row">
          <small>{language === 'hi' ? 'उदाहरण आज़माएं:' : 'Try a sample:'}</small>
          {samplePhrases.map((sample) => (
            <button
              key={sample.label}
              type="button"
              className="voice-sample-chip"
              onClick={() => {
                setTranscript(sample.text)
                latestTranscriptRef.current = sample.text
                if (error) setError(null)
                handleParse(sample.text)
              }}
            >
              {sample.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="voice-error-note">
            <AlertCircle size={17} />
            <span>{error} {language === 'hi' ? 'आप हमेशा फ़ॉर्म मैन्युअल रूप से भर सकते हैं।' : 'You can always continue filling the form manually.'}</span>
          </div>
        )}

        {parsedData && (
          <div className="voice-parsed-result">
            <strong><Check size={16} />{language === 'hi' ? 'निकाली गई जानकारी (जांचें/बदलें)' : 'Extracted fields — review & edit'}</strong>
            <div className="voice-ai-meta">
              <span>
                {!parsedData.missing_fields?.length
                  ? (language === 'hi' ? '✓ सभी जानकारी मिल गई' : '✓ All details extracted')
                  : (language === 'hi' ? '⚠ कुछ जानकारी की समीक्षा करें' : '⚠ Some details need review')}
              </span>
              <small>
                {parsedData.ai_used
                  ? (language === 'hi' ? 'Gemini द्वारा समझा गया' : 'Understood by Gemini')
                  : (language === 'hi' ? 'स्मार्ट पार्सर' : 'Smart Parser')}
              </small>
            </div>
            {parsedData.warning && <p className="voice-fallback-warning">{parsedData.warning}</p>}
            {!!parsedData.missing_fields?.length && <p className="voice-missing-note">{language === 'hi' ? 'कृपया भरें' : 'Please complete'}: {parsedData.missing_fields.join(', ')}</p>}
            <div className="voice-parsed-fields">
              <label>{language === 'hi' ? 'फसल' : 'Crop'}<input type="text" value={editCrop} onChange={(e) => setEditCrop(e.target.value)} /></label>
              <label>
                {language === 'hi' ? 'मात्रा' : 'Quantity'}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 6 }}>
                  <input type="number" min="1" value={editQty} onChange={(e) => setEditQty(Number(e.target.value))} />
                  <select value={editUnit} onChange={(e) => setEditUnit(e.target.value as 'kg' | 'quintal' | 'tonne')}>
                    <option value="kg">kg</option>
                    <option value="quintal">quintal</option>
                    <option value="tonne">tonne</option>
                  </select>
                </div>
              </label>
              <label>{language === 'hi' ? 'कीमत (₹/kg)' : 'Price (₹/kg)'}<input type="number" min="1" value={editPrice} onChange={(e) => setEditPrice(Number(e.target.value))} /></label>
              <label>{language === 'hi' ? 'पिकअप तारीख' : 'Pickup date'}<input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} /></label>
              <label>{language === 'hi' ? 'पिकअप स्थान / फार्म' : 'Pickup location / farm'}<input type="text" value={editLocation} onChange={(e) => setEditLocation(e.target.value)} placeholder={language === 'hi' ? 'जैसे Green Field Farm' : 'e.g. Green Field Farm'} /></label>
              <label>
                {language === 'hi' ? 'पिकअप समय' : 'Pickup window'}
                <select value={editWindow} onChange={(e) => setEditWindow(e.target.value)}>
                  <option value="Morning · 7–10 AM">{language === 'hi' ? 'सुबह · 7–10 AM' : 'Morning · 7–10 AM'}</option>
                  <option value="Afternoon · 1–4 PM">{language === 'hi' ? 'दोपहर · 1–4 PM' : 'Afternoon · 1–4 PM'}</option>
                  <option value="Evening · 4–7 PM">{language === 'hi' ? 'शाम · 4–7 PM' : 'Evening · 4–7 PM'}</option>
                </select>
              </label>
              <label>
                {language === 'hi' ? 'पिकअप का प्रकार' : 'Fulfillment'}
                <select value={editFulfillment} onChange={(e) => setEditFulfillment(e.target.value as 'pickup' | 'self_delivery')}>
                  <option value="pickup">{language === 'hi' ? 'खेत से पिकअप (Kisan Pickup)' : 'Pickup from farm'}</option>
                  <option value="self_delivery">{language === 'hi' ? 'स्वयं डिलीवरी (Self Delivery)' : 'Self delivery to mandi'}</option>
                </select>
              </label>
              <label>{language === 'hi' ? 'नोट्स' : 'Notes'}<input type="text" value={editNotes} onChange={(e) => setEditNotes(e.target.value)} placeholder={language === 'hi' ? 'अतिरिक्त जानकारी...' : 'Additional instructions...'} /></label>
            </div>
            <button type="button" className="btn btn-primary btn-full" onClick={handleApply}>
              <Check size={16} />{language === 'hi' ? 'फ़ॉर्म में भरें' : 'Apply to form'}
            </button>
          </div>
        )}
      </section>
    </div>
  )
}
