import { CROP_CATALOGUE, cropByName, type CropOption } from '../data/crops'
import { districtNamesOf, INDIA_STATE_NAMES, matchDistrict, matchState } from '../data/indiaLocations'
import type { Language } from '../types'
import { validFarmArea } from './farmerProfileValidation'
import { apiClient } from './apiClient'

/**
 * Speech -> onboarding field.
 *
 * Every completed answer goes to Gemini (`apiClient.parseOnboardingVoice`, the same service
 * the listing parser uses) with the field being asked, the language, the location already
 * known and the canonical candidates, so the profile stores what the farmer meant
 * ("Daulatabad") rather than what they said ("मेरा खेत पड़ता है जी दौलताबाद में"). What comes
 * back is then pinned to the canonical lists on this side (`matchState`, `matchDistrict`,
 * the crop catalogue), so a state or district only ever lands as a valid name, or as
 * Gemini's cleaned text marked not-confident for the farmer to correct.
 *
 * The deterministic parsers below are the fallback for when Gemini is unreachable; voice
 * mode must still work with no backend. "I don't know" is recognised locally before any
 * call, so a shrug is never stored as a value.
 */
export type OnboardingField = 'name' | 'village' | 'locality' | 'district' | 'state' | 'farmSize' | 'crops'

export type FarmSizeId = 'under1' | '1to3' | '3to5' | '5to10' | '10plus'

export interface FarmSizeOption {
  id: FarmSizeId
  /** Representative acreage written to `FarmerProfileData.farmSizeAcres`. */
  acres: number
  min: number
  max: number
}

export const FARM_SIZE_OPTIONS: readonly FarmSizeOption[] = [
  { id: 'under1', acres: 0.5, min: 0, max: 1 },
  { id: '1to3', acres: 2, min: 1, max: 3 },
  { id: '3to5', acres: 4, min: 3, max: 5 },
  { id: '5to10', acres: 7.5, min: 5, max: 10 },
  { id: '10plus', acres: 12, min: 10, max: Number.POSITIVE_INFINITY },
]

export function farmSizeBucket(acres: number): FarmSizeId {
  if (!Number.isFinite(acres) || acres < 1) return 'under1'
  if (acres < 3) return '1to3'
  if (acres < 5) return '3to5'
  if (acres < 10) return '5to10'
  return '10plus'
}

export const farmSizeAcresFor = (id: FarmSizeId) => FARM_SIZE_OPTIONS.find((option) => option.id === id)?.acres ?? 0

export interface ParsedAnswer {
  field: OnboardingField | 'confirm'
  /** True when something usable came out; false means "ask again or type it". */
  recognized: boolean
  /** Latin-script value for text fields. */
  value?: string
  /** Devanagari value when the answer was spoken in Hindi; used for the spoken acknowledgement. */
  valueHi?: string
  farmSize?: FarmSizeId
  farmSizeAcres?: number
  crops?: string[]
  /** The farmer said they do not know or want to skip; nothing is stored. */
  unknown?: boolean
  /** Answer to a yes/no confirmation. Null when unclear. */
  confirmed?: boolean | null
  /** False when a state/district could not be pinned to the canonical list and the cleaned text was kept. */
  confident?: boolean
  /** True when Gemini contributed to the value. */
  aiUsed: boolean
}

/** "I do not know", in the ways it is actually said. Checked before anything is stored or sent. */
const UNKNOWN_PHRASES = /(नहीं पता|नही पता|पता नहीं|पता नही|नहीं मालूम|नही मालूम|मालूम नहीं|मालूम नही|याद नहीं|छोड़ दो|छोड़ो|रहने दो|nahi pata|nahin pata|nai pata|pata nahi|pata nahin|nahi malum|nahi maloom|malum nahi|maloom nahi|yaad nahi|chhod do|chod do|rehne do|not sure|don'?t know|dont know|do not know|no idea|skip|leave it)/i
export const isUnknownAnswer = (text: string) => UNKNOWN_PHRASES.test(tidy(text))

const DEVANAGARI = /[ऀ-ॿ]/
const hasDevanagari = (text: string) => DEVANAGARI.test(text)

const titleCase = (text: string) => text.replace(/\S+/g, (word) => (DEVANAGARI.test(word) ? word : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()))

const tidy = (text: string) => text.replace(/[!?।"'“”‘’]+/g, ' ').replace(/\s+/g, ' ').trim()

/** Removes the sentence around an answer: "मेरा नाम X है" -> "X", "my name is X" -> "X". */
function stripWrapper(text: string, leading: RegExp[], trailing: RegExp[]): string {
  let out = tidy(text)
  for (const pattern of leading) out = out.replace(pattern, '').trim()
  for (const pattern of trailing) out = out.replace(pattern, '').trim()
  return out
}

const HI_TRAILING = [/\s+(है|हैं|हूँ|हूं|हूॅ|जी|साहब|sir|hai|hain|hoon|hu|ji)\s*$/i]

const NAME_LEADING = [
  /^(mera|meraa|hamara|hamaara|mere|hamare)\s+(pura\s+|poora\s+)?(naam|nam|name)\s+(hai\s+|to\s+)?/i,
  /^(मेरा|हमारा|मेरे|हमारे)\s+(पूरा\s+)?नाम\s+(है\s+|तो\s+)?/,
  /^(main|mai|mein|मैं|मै)\s+/i,
  /^(my name is|my name's|i am|i'm|this is|it's|it is|name is|name)\s+/i,
  /^(naam|name)\s*[:-]?\s*/i,
]

const PLACE_LEADING = [
  /^(mera|meraa|hamara|hamaara|mere|hamare|apna|apne)\s+/i,
  /^(मेरा|हमारा|मेरे|हमारे|अपना|अपने)\s+/,
  /^(khet|kheti|gaon|gaanv|gav|village|ilaka|ilaaka|mohalla|area|locality|zila|jila|district|rajya|state|pradesh)\s+/i,
  /^(खेत|खेती|गाँव|गांव|गाव|इलाका|इलाक़ा|मोहल्ला|ज़िला|जिला|राज्य|प्रदेश)\s+/,
  /^(ka\s+naam|ka\s+name|का\s+नाम)\s+/i,
  /^(hai|है)\s+/i,
  /^(in|at|near|from|the|it's|it is|is)\s+/i,
]
const PLACE_TRAILING = [
  /\s+(gaon|gaanv|gav|village|mein|me|main|men|se|ka|ki|ke|wala|wale|wali)\s*$/i,
  /\s+(गाँव|गांव|गाव|में|मे|से|का|की|के|वाला|वाले|वाली|नाम)\s*$/,
  /\s+(ilaka|ilaaka|mohalla|area|locality|zila|jila|district|rajya|state)\s*$/i,
  /\s+(इलाका|इलाक़ा|मोहल्ला|ज़िला|जिला|राज्य)\s*$/,
]

/** Strips place wrappers repeatedly: "मेरा गाँव खेड़ा है" needs two passes. */
function cleanPlace(text: string): string {
  let out = tidy(text)
  for (let pass = 0; pass < 3; pass += 1) {
    const before = out
    out = stripWrapper(out, PLACE_LEADING, [...HI_TRAILING, ...PLACE_TRAILING])
    if (out === before) break
  }
  return titleCase(out)
}

// --- Numbers ---------------------------------------------------------------
const NUMBER_WORDS: Record<string, number> = {
  'zero': 0, 'शून्य': 0, 'जीरो': 0,
  'आधा': 0.5, 'aadha': 0.5, 'adha': 0.5, 'half': 0.5,
  'एक': 1, 'ek': 1, 'one': 1,
  'डेढ़': 1.5, 'डेढ': 1.5, 'dedh': 1.5, 'derh': 1.5,
  'दो': 2, 'do': 2, 'two': 2,
  'ढाई': 2.5, 'dhai': 2.5, 'dhaai': 2.5,
  'तीन': 3, 'teen': 3, 'tin': 3, 'three': 3,
  'चार': 4, 'char': 4, 'chaar': 4, 'four': 4,
  'पांच': 5, 'पाँच': 5, 'panch': 5, 'paanch': 5, 'five': 5,
  'छह': 6, 'छः': 6, 'छे': 6, 'chhe': 6, 'che': 6, 'chha': 6, 'six': 6,
  'सात': 7, 'saat': 7, 'sat': 7, 'seven': 7,
  'आठ': 8, 'aath': 8, 'ath': 8, 'eight': 8,
  'नौ': 9, 'nau': 9, 'nine': 9,
  'दस': 10, 'das': 10, 'ten': 10,
  'ग्यारह': 11, 'gyarah': 11, 'eleven': 11,
  'बारह': 12, 'barah': 12, 'twelve': 12,
  'पंद्रह': 15, 'pandrah': 15, 'fifteen': 15,
  'बीस': 20, 'bees': 20, 'twenty': 20,
  'पच्चीस': 25, 'pachees': 25, 'twenty five': 25,
  'तीस': 30, 'tees': 30, 'thirty': 30,
  'चालीस': 40, 'chalis': 40, 'forty': 40,
  'पचास': 50, 'pachas': 50, 'fifty': 50,
  'सौ': 100, 'sau': 100, 'hundred': 100,
}

/** First number in the text, digits or words. "साढ़े तीन" and "साढ़े चार" read as x.5. */
function firstNumber(text: string): number | null {
  const lower = tidy(text).toLowerCase().replace(/(?<=\d),(?=\d{3}\b)/g, '')
  const digits = lower.replace(/[०-९]/g, digit => String(digit.charCodeAt(0) - 0x966)).match(/[+-]?(?:\d+(?:[.,]\d+)?|\.\d+)/)
  if (digits) {
    const value = Number(digits[0].replace(',', '.'))
    return /(?:hundred|सौ|sau)/.test(lower) ? value * 100 : value
  }
  const tokens = lower.split(/\s+/)
  for (let index = 0; index < tokens.length; index += 1) {
    const two = `${tokens[index]} ${tokens[index + 1] ?? ''}`.trim()
    if (two in NUMBER_WORDS) return NUMBER_WORDS[two]
    const value = NUMBER_WORDS[tokens[index]]
    if (value === undefined) continue
    const next = tokens[index + 1] ?? ''
    if (/^(hundred|सौ|sau)$/.test(next)) {
      const remainder = tokens.slice(index + 2).filter(token => token !== 'and')
      if (remainder.some(token => token in NUMBER_WORDS)) return null // Ask for digits instead of guessing composites.
      return value * 100
    }
    if (/^(point|decimal|दशमलव)$/.test(next)) {
      const decimal = NUMBER_WORDS[tokens[index + 2]]
      if (decimal === undefined || decimal < 0 || decimal > 9) return null
      return value + decimal / 10
    }
    if (next in NUMBER_WORDS) return null // e.g. "two three acres" is ambiguous.
    const previous = tokens[index - 1] ?? ''
    if (/^(साढ़े|साढे|sadhe|saadhe)$/.test(previous)) return value + 0.5
    if (/^(पौने|paune)$/.test(previous)) return value - 0.25
    if (/^(सवा|sava|sawa)$/.test(previous)) return value + 0.25
    return value
  }
  return null
}

/** Coarse conversion to acres. Bigha varies by region; a quarter acre is the common working value. */
function acresFrom(text: string, amount: number): number {
  const lower = text.toLowerCase()
  if (/(बीघा|bigha|beegha)/.test(lower)) return NaN // Regional unit: ask for acres/hectares instead of guessing.
  if (/(हेक्टेयर|hectare|hektar)/.test(lower)) return amount * 2.47
  if (/(कनाल|kanal)/.test(lower)) return amount * 0.125
  return amount
}

export function parseFarmArea(text: string): number | null {
  if (/(?:[-−]\s*\d|minus|negative|माइनस|ऋण|बीघा|bigha|beegha|square|sq\.?|गज|मीटर|foot|feet)/i.test(text)) return null
  if (/(thousand|million|billion|lakh|crore|हजार|हज़ार|लाख|करोड़)/i.test(text)) return null
  const numericText = text.replace(/[०-९]/g, digit => String(digit.charCodeAt(0) - 0x966))
  if ((numericText.match(/\d+(?:[.,]\d+)?/g) ?? []).length > 1) return null
  const amount = firstNumber(numericText)
  if (amount === null) return null
  const acres = acresFrom(text, amount)
  return validFarmArea(acres) ? acres : null
}

export function parseFarmSizeText(text: string): FarmSizeId | null {
  if (/(minus|negative|माइनस|ऋण|[-−]\s*\d|बीघा|bigha|beegha)/i.test(text)) return null
  const lower = tidy(text).toLowerCase()
  if (/(दस से (ज़्यादा|ज्यादा|ऊपर|अधिक)|das se (zyada|jyada|upar|adhik)|more than ten|over ten|ten plus|10\+|10 plus|10 se (zyada|jyada|upar))/.test(lower)) return '10plus'
  if (/(एक से कम|ek se kam|less than one|under one|under an acre|less than an acre|एक एकड़ से कम)/.test(lower)) return 'under1'
  let acres = parseFarmArea(lower)
  if (acres === null) return null
  if (/(से कम|se kam|less than|under)/.test(lower) && acres > 0) acres = Math.max(0, acres - 0.01)
  if (/(से (ज़्यादा|ज्यादा|ऊपर|अधिक)|se (zyada|jyada|upar|adhik)|more than|over|above)/.test(lower)) acres += 0.01
  return farmSizeBucket(acres)
}

// --- Crops -------------------------------------------------------------------
const latinAliasPattern = (alias: string) => new RegExp(`(^|[^a-z])${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=$|[^a-z])`, 'i')

/** Catalogue crops named in the text, in the order they were said. */
export function matchCrops(text: string): CropOption[] {
  const lower = tidy(text).toLowerCase()
  const hits: { crop: CropOption; at: number }[] = []
  for (const crop of CROP_CATALOGUE) {
    let at = -1
    for (const alias of crop.aliases) {
      const index = hasDevanagari(alias) ? lower.indexOf(alias) : lower.search(latinAliasPattern(alias))
      if (index >= 0 && (at === -1 || index < at)) at = index
    }
    if (at >= 0) hits.push({ crop, at })
  }
  return hits.sort((a, b) => a.at - b.at).map((hit) => hit.crop)
}

/** "हाँ" / "नहीं"; null when neither is clear, which the caller treats as "ask properly". */
export function parseYesNo(text: string): boolean | null {
  const lower = tidy(text).toLowerCase()
  const no = /(नहीं|नही|नहि|गलत|nahi|nahin|nope|\bno\b|wrong|galat|not)/.test(lower)
  const yes = /(हाँ|हां|हा\b|जी|सही|ठीक|बिल्कुल|haan|han\b|\bha\b|\bji\b|sahi|theek|thik|bilkul|yes|yeah|yep|correct|right)/.test(lower)
  if (yes && !no) return true
  if (no && !yes) return false
  return null
}

// --- Public entry point ------------------------------------------------------
export interface ParseContext {
  state?: string
  district?: string
  /** For `confirm`: the value the question asked about. */
  expected?: string
}

type GeminiField = 'name' | 'state' | 'district' | 'village' | 'locality' | 'farm_size' | 'crops' | 'confirm'
const GEMINI_FIELD: Record<OnboardingField | 'confirm', GeminiField> = {
  name: 'name', state: 'state', district: 'district', village: 'village', locality: 'locality', farmSize: 'farm_size', crops: 'crops', confirm: 'confirm',
}

const candidatesFor = (field: OnboardingField | 'confirm', context: ParseContext): readonly string[] => {
  if (field === 'state') return INDIA_STATE_NAMES
  if (field === 'district') return context.state ? districtNamesOf(context.state) : []
  if (field === 'crops') return CROP_CATALOGUE.map((crop) => crop.en)
  return []
}

const gemini = async (field: OnboardingField | 'confirm', transcript: string, language: Language, context: ParseContext) => {
  try {
    const result = await apiClient.parseOnboardingVoice(transcript, GEMINI_FIELD[field], language, {
      state: context.state || undefined,
      district: context.district || undefined,
      expected: context.expected || undefined,
      candidates: candidatesFor(field, context),
    })
    if (!result || typeof result !== 'object' || result.ai_used !== true) return null
    if ((result.value != null && typeof result.value !== 'string') ||
        (result.value_hi != null && typeof result.value_hi !== 'string') ||
        (result.crops != null && (!Array.isArray(result.crops) || result.crops.some(item => typeof item !== 'string'))) ||
        (result.farm_size_acres != null && !validFarmArea(result.farm_size_acres)) ||
        (result.unknown != null && typeof result.unknown !== 'boolean')) return null
    return result
  } catch {
    return null
  }
}

const cleanedPlace = (text: string) => {
  const cleaned = cleanPlace(text)
  return cleaned && !hasDevanagari(cleaned) ? titleCase(cleaned) : cleaned
}

/** Pin a state to the canonical list; falls back to the cleaned text, marked not confident. */
function resolveState(_candidate: string, fallbackText: string): Pick<ParsedAnswer, 'value' | 'confident'> {
  const hit = matchState(fallbackText)
  if (hit) return { value: hit.value, confident: hit.confident }
  return { confident: false }
}

function resolveDistrict(state: string | undefined, _candidate: string, fallbackText: string): Pick<ParsedAnswer, 'value' | 'confident'> {
  const hit = state ? matchDistrict(state, fallbackText) : null
  if (hit) return { value: hit.value, confident: hit.confident }
  return { confident: false }
}

/** A yes/no confirmation. Gemini reads it; the keyword table is the fallback. */
export async function parseConfirmation(transcript: string, language: Language, context: ParseContext): Promise<ParsedAnswer & { field: 'confirm' }> {
  const text = tidy(transcript)
  if (!text) return { field: 'confirm', recognized: false, confirmed: null, aiUsed: false }
  if (isUnknownAnswer(text)) return { field: 'confirm', recognized: true, unknown: true, confirmed: null, aiUsed: false }
  const ai = await gemini('confirm', text, language, context)
  if (ai && typeof ai.confirmed === 'boolean') {
    return { field: 'confirm', recognized: true, confirmed: ai.confirmed, value: ai.value ?? undefined, aiUsed: true }
  }
  const local = parseYesNo(text)
  return { field: 'confirm', recognized: local !== null, confirmed: local, aiUsed: false }
}

export async function parseOnboardingAnswer(field: OnboardingField, transcript: string, language: Language, context: ParseContext = {}): Promise<ParsedAnswer> {
  const text = tidy(transcript)
  if (!text) return { field, recognized: false, aiUsed: false }
  if (isUnknownAnswer(text)) return { field, recognized: true, unknown: true, aiUsed: false }

  if (/(?:\b(?:is|and|or|maybe|shayad|perhaps)|शायद|और|या)\s*$/i.test(text)) return { field, recognized: false, aiUsed: false }
  const ai = await gemini(field, text, language, context)
  if (ai?.confidence === 'low' || ai?.confidence === 'medium') return { field, recognized: false, aiUsed: true }
  if (ai?.unknown) return { field, recognized: true, unknown: true, aiUsed: true }

  switch (field) {
    case 'name': {
      const local = titleCase(stripWrapper(text, NAME_LEADING, HI_TRAILING))
      // Names keep the script the farmer supplied; AI must not translate identity.
      if (!/^[\p{L}\p{M} .’'-]{2,80}$/u.test(local)) return { field, recognized: false, aiUsed: false }
      return { field, recognized: Boolean(local), value: local, valueHi: hasDevanagari(local) ? local : undefined, aiUsed: false }
    }
    case 'state': {
      const resolved = resolveState(ai?.value ?? '', text)
      return { field, recognized: Boolean(resolved.value && resolved.confident), ...resolved, valueHi: ai?.value_hi ?? undefined, aiUsed: Boolean(ai?.value) }
    }
    case 'district': {
      const resolved = resolveDistrict(context.state, ai?.value ?? '', text)
      return { field, recognized: Boolean(resolved.value && resolved.confident), ...resolved, valueHi: ai?.value_hi ?? undefined, aiUsed: Boolean(ai?.value) }
    }
    case 'village':
    case 'locality': {
      if (ai?.value && /^[A-Za-z0-9 .,'’()-]{2,100}$/.test(ai.value)) return { field, recognized: true, value: titleCase(ai.value), valueHi: ai.value_hi ?? undefined, aiUsed: true }
      const local = cleanedPlace(text)
      return { field, recognized: Boolean(local) && !hasDevanagari(local), value: !hasDevanagari(local) ? local : undefined, aiUsed: false }
    }
    case 'farmSize': {
      // An AI guess cannot override an invalid or unparseable quantity.
      if (/(minus|negative|माइनस|ऋण|[-−]\s*\d|बीघा|bigha|beegha)/i.test(text)) return { field, recognized: false, aiUsed: false }
      const range = /(less than|under|over|more than|से कम|se kam|से ज़्यादा|से ज्यादा|se zyada|plus|\+)/i.test(text)
      const acres = range ? null : parseFarmArea(text)
      if (acres !== null) return { field, recognized: true, farmSize: farmSizeBucket(acres), farmSizeAcres: acres, aiUsed: false }
      const local = parseFarmSizeText(text)
      if (local) return { field, recognized: true, farmSize: local, aiUsed: false }
      return { field, recognized: false, aiUsed: false }
    }
    case 'crops': {
      const named = (ai?.crops ?? []).map((name) => cropByName(name)?.en ?? '').filter(Boolean)
      if (named.length && named.length === ai?.crops?.length) return { field, recognized: true, crops: [...new Set(named)], aiUsed: true }
      const local = matchCrops(text).map((crop) => crop.en)
      if (local.length) return { field, recognized: true, crops: local, aiUsed: false }
      return { field, recognized: false, aiUsed: false }
    }
  }
}
