import type { Language } from '../types'

/**
 * Pre-login language discovery.
 *
 * Runs once on the splash screen, before the phone number is asked for. It reads a coarse
 * device position (no precise GPS, nothing displayed), maps it to an Indian state with a
 * bounding-box table, and infers the state's primary language. Everything happens on the
 * client; there is no backend or geocoding call, so the splash stays fast and works offline.
 *
 * Every failure path (permission denied, no geolocation API, a slow fix, an unknown region)
 * resolves to Hindi. The demo runs in Delhi, so Hindi is also what a correct detection
 * yields there.
 */
/** The 22 Scheduled Languages of India (Eighth Schedule) plus English. */
export type DiscoveryLanguage =
  | 'hi' | 'en' | 'ta' | 'te' | 'bn' | 'mr' | 'gu' | 'kn' | 'ml' | 'pa' | 'as' | 'or' | 'ur'
  | 'mai' | 'sat' | 'ks' | 'ne' | 'sd' | 'kok' | 'doi' | 'mni' | 'brx' | 'sa'

export const FUNCTIONAL_LANGUAGES: readonly Language[] = ['hi', 'en']
export const isFunctionalLanguage = (code: DiscoveryLanguage): code is Language => (FUNCTIONAL_LANGUAGES as readonly string[]).includes(code)

export const FALLBACK_LANGUAGE: Language = 'hi'

export interface LanguageOption {
  code: DiscoveryLanguage
  /** Name in its own script; this is the label the user sees. */
  native: string
  /** Latin name, shown small so the list can also be scanned by a helper. */
  latin: string
}

export const LANGUAGE_OPTIONS: readonly LanguageOption[] = [
  { code: 'hi', native: 'हिन्दी', latin: 'Hindi' },
  { code: 'en', native: 'English', latin: 'English' },
  { code: 'ta', native: 'தமிழ்', latin: 'Tamil' },
  { code: 'te', native: 'తెలుగు', latin: 'Telugu' },
  { code: 'bn', native: 'বাংলা', latin: 'Bengali' },
  { code: 'mr', native: 'मराठी', latin: 'Marathi' },
  { code: 'gu', native: 'ગુજરાતી', latin: 'Gujarati' },
  { code: 'kn', native: 'ಕನ್ನಡ', latin: 'Kannada' },
  { code: 'ml', native: 'മലയാളം', latin: 'Malayalam' },
  { code: 'pa', native: 'ਪੰਜਾਬੀ', latin: 'Punjabi' },
  { code: 'as', native: 'অসমীয়া', latin: 'Assamese' },
  { code: 'or', native: 'ଓଡ଼ିଆ', latin: 'Odia' },
  { code: 'ur', native: 'اردو', latin: 'Urdu' },
  { code: 'mai', native: 'मैथिली', latin: 'Maithili' },
  { code: 'sat', native: 'ᱥᱟᱱᱛᱟᱲᱤ', latin: 'Santali' },
  { code: 'ks', native: 'کٲشُر', latin: 'Kashmiri' },
  { code: 'ne', native: 'नेपाली', latin: 'Nepali' },
  { code: 'sd', native: 'سنڌي', latin: 'Sindhi' },
  { code: 'kok', native: 'कोंकणी', latin: 'Konkani' },
  { code: 'doi', native: 'डोगरी', latin: 'Dogri' },
  { code: 'mni', native: 'ꯃꯩꯇꯩꯂꯣꯟ', latin: 'Manipuri' },
  { code: 'brx', native: 'बड़ो', latin: 'Bodo' },
  { code: 'sa', native: 'संस्कृतम्', latin: 'Sanskrit' },
]

/** "Choose your language", written in each language so the header reads natively. */
export const CHOOSE_LANGUAGE_HEADING: Record<DiscoveryLanguage, string> = {
  hi: 'अपनी भाषा चुनें',
  en: 'Choose your language',
  ta: 'உங்கள் மொழியைத் தேர்ந்தெடுக்கவும்',
  te: 'మీ భాషను ఎంచుకోండి',
  bn: 'আপনার ভাষা বেছে নিন',
  mr: 'तुमची भाषा निवडा',
  gu: 'તમારી ભાષા પસંદ કરો',
  kn: 'ನಿಮ್ಮ ಭಾಷೆಯನ್ನು ಆರಿಸಿ',
  ml: 'നിങ്ങളുടെ ഭാഷ തിരഞ്ഞെടുക്കുക',
  pa: 'ਆਪਣੀ ਭਾਸ਼ਾ ਚੁਣੋ',
  as: 'আপোনাৰ ভাষা বাছক',
  or: 'ଆପଣଙ୍କ ଭାଷା ବାଛନ୍ତୁ',
  ur: 'اپنی زبان منتخب کریں',
  mai: 'अपन भाषा चुनू',
  sat: 'ᱟᱢᱟᱜ ᱯᱟᱹᱨᱥᱤ ᱵᱟᱪᱷᱟᱣ ᱢᱮ',
  ks: 'پننؠ زبان ژارِو',
  ne: 'आफ्नो भाषा छान्नुहोस्',
  sd: 'پنهنجي ٻولي چونڊيو',
  kok: 'तुमची भास निवडात',
  doi: 'अपनी भाशा चुनो',
  mni: 'ꯅꯍꯥꯛꯀꯤ ꯂꯣꯟ ꯈꯟꯕꯤꯌꯨ',
  brx: 'नोंथांनि राव सायख',
  sa: 'स्वभाषां चिनोतु',
}

interface StateRegion {
  state: string
  language: DiscoveryLanguage
  /** [south, north, west, east] in degrees. Coarse on purpose. */
  box: [number, number, number, number]
}

/**
 * Ordered so that small regions enclosed by larger neighbours (Delhi inside Haryana's box,
 * Chandigarh inside Punjab's) are matched first. Boxes overlap at the borders; that is
 * acceptable for picking a language, which the user confirms on the next screen anyway.
 */
const STATE_REGIONS: readonly StateRegion[] = [
  { state: 'Delhi', language: 'hi', box: [28.40, 28.88, 76.84, 77.35] },
  { state: 'Chandigarh', language: 'pa', box: [30.66, 30.80, 76.70, 76.86] },
  { state: 'Goa', language: 'mr', box: [14.88, 15.80, 73.65, 74.35] },
  { state: 'Kerala', language: 'ml', box: [8.25, 12.80, 74.85, 77.40] },
  { state: 'Tamil Nadu', language: 'ta', box: [8.05, 13.60, 76.20, 80.35] },
  { state: 'Karnataka', language: 'kn', box: [11.55, 18.45, 74.05, 78.60] },
  { state: 'Telangana', language: 'te', box: [15.80, 19.95, 77.20, 81.35] },
  { state: 'Andhra Pradesh', language: 'te', box: [12.60, 19.15, 76.75, 84.80] },
  { state: 'Punjab', language: 'pa', box: [29.53, 32.55, 73.85, 76.95] },
  { state: 'Haryana', language: 'hi', box: [27.65, 30.95, 74.45, 77.60] },
  { state: 'Himachal Pradesh', language: 'hi', box: [30.35, 33.25, 75.55, 79.05] },
  { state: 'Uttarakhand', language: 'hi', box: [28.70, 31.45, 77.55, 81.05] },
  { state: 'Gujarat', language: 'gu', box: [20.10, 24.75, 68.15, 74.50] },
  { state: 'Maharashtra', language: 'mr', box: [15.60, 22.05, 72.60, 80.90] },
  { state: 'Chhattisgarh', language: 'hi', box: [17.75, 24.10, 80.25, 84.40] },
  { state: 'Odisha', language: 'or', box: [17.80, 22.60, 81.35, 87.55] },
  { state: 'Jharkhand', language: 'hi', box: [21.95, 25.35, 83.30, 87.95] },
  { state: 'West Bengal', language: 'bn', box: [21.50, 27.25, 85.80, 89.90] },
  { state: 'Assam', language: 'as', box: [24.10, 28.20, 89.70, 96.05] },
  { state: 'Bihar', language: 'hi', box: [24.30, 27.55, 83.30, 88.30] },
  { state: 'Uttar Pradesh', language: 'hi', box: [23.85, 30.40, 77.05, 84.65] },
  { state: 'Madhya Pradesh', language: 'hi', box: [21.05, 26.90, 74.00, 82.85] },
  { state: 'Rajasthan', language: 'hi', box: [23.05, 30.20, 69.45, 78.30] },
  { state: 'Jammu and Kashmir', language: 'ur', box: [32.25, 35.00, 73.75, 77.60] },
]

export interface LocaleDiscovery {
  language: DiscoveryLanguage
  /** Set only when the position resolved to a known state. */
  state?: string
  source: 'location' | 'fallback'
}

export function regionForCoordinates(lat: number, lng: number): Pick<StateRegion, 'state' | 'language'> | null {
  const hit = STATE_REGIONS.find(({ box: [south, north, west, east] }) => lat >= south && lat <= north && lng >= west && lng <= east)
  return hit ? { state: hit.state, language: hit.language } : null
}

const FALLBACK: LocaleDiscovery = { language: FALLBACK_LANGUAGE, source: 'fallback' }

/**
 * Resolve the local language from a coarse device position. Never rejects and never takes
 * longer than `timeoutMs`; anything that goes wrong is the Hindi fallback.
 */
export function discoverLocale(timeoutMs = 3500): Promise<LocaleDiscovery> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return Promise.resolve(FALLBACK)

  return new Promise((resolve) => {
    let settled = false
    const finish = (result: LocaleDiscovery) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve(result)
    }
    const timer = setTimeout(() => finish(FALLBACK), timeoutMs)

    try {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          const region = regionForCoordinates(coords.latitude, coords.longitude)
          finish(region ? { ...region, source: 'location' } : FALLBACK)
        },
        () => finish(FALLBACK),
        { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 10 * 60 * 1000 },
      )
    } catch {
      finish(FALLBACK)
    }
  })
}
