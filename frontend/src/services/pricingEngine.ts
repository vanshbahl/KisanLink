/**
 * KisanLink centralized pricing engine (TypeScript mirror of backend/app/services/pricing_engine.py).
 *
 * ONE set of rules for every price the product shows, derived from ONE anchor: the live
 * AGMARKNET mandi modal price (₹/kg). The anchor is never altered; only KisanLink's own demo /
 * platform values are derived around it.
 *
 *     Farmer side   :  mandi  <  kisanlinkNormal  <  marketMakerFarmer
 *     Consumer side :  marketMakerConsumer  <  kisanlinkNormalConsumer  <  localReference
 *
 * `kisanlinkNormalPerKg` is the single listing price the app already uses on both sides (the
 * farmer's ask on a normal listing; the per-kg price on a consumer card, before delivery). The
 * consumer's *delivered* comparison is `kisanlinkNormalConsumerPerKg` (normal price plus
 * un-pooled last-mile logistics), which is what a pooled Market Maker delivery beats.
 *
 * Both implementations are pinned to src/__tests__/fixtures/pricingLadder.vectors.json.
 */

// ---- Tunables (keep in sync with pricing_engine.py) -----------------------------------------
export const FARMER_NORMAL_UPLIFT_MIN = 0.08
export const FARMER_NORMAL_UPLIFT_SPAN = 0.04
export const FARMER_MM_UPLIFT_MIN = 0.04
export const FARMER_MM_UPLIFT_SPAN = 0.03
export const POOLED_PLATFORM_PCT = 0.02
export const POOLED_FREIGHT_FLOOR = 6
export const POOLED_FREIGHT_PCT = 0.06
export const UNPOOLED_LOGISTICS_FLOOR = 9
export const UNPOOLED_LOGISTICS_PCT = 0.12
export const LOCAL_REFERENCE_MULTIPLE = 1.55
export const MIN_GAP = 1
/** Existing normal-order platform share (deducted from the farmer's share at checkout). */
export const REGULAR_ORDER_PLATFORM_PCT = 0.03
/** Existing normal-order logistics share used by checkout (min ₹35 per basket). */
export const REGULAR_ORDER_LOGISTICS_PCT = 0.06
/** Rescue sale = 75% of the normal price (matches the backend distress base discount of 25%). */
export const RESCUE_DISCOUNT = 0.75

/** ₹/kg used ONLY when neither the backend nor a cached benchmark is available. source="seed". */
export const SEED_MANDI_PER_KG: Record<string, number> = {
  tomato: 24, potato: 21, onion: 18, spinach: 35, wheat: 31, carrot: 29, capsicum: 44, cauliflower: 28,
  cucumber: 22, apple: 95, rice: 62, mustard: 55, sugarcane: 3.5, maize: 20, bajra: 24, chilli: 40,
  brinjal: 22, okra: 30, cabbage: 14, peas: 45, 'bottle gourd': 12, pumpkin: 11, garlic: 110, ginger: 70,
  coriander: 50, mango: 60, banana: 22, guava: 35, gram: 62, lentils: 85,
}

export type PriceSource = 'agmarknet' | 'seed'
export type MatchLevel = 'market' | 'district' | 'state' | 'national' | 'seed'

/** What the backend returns for one crop's government benchmark (₹/kg, already normalized). */
export interface MandiBenchmark {
  cropKey: string
  commodity: string
  variety: string | null
  market: string | null
  district: string | null
  state: string | null
  modalPerKg: number
  minPerKg: number | null
  maxPerKg: number | null
  /** ISO yyyy-mm-dd arrival date of the record set; null for seed. */
  arrivalDate: string | null
  source: PriceSource
  matchLevel: MatchLevel
  recordCount: number
  stale: boolean
  fetchedAt: string
}

export interface PriceLadder {
  mandiPerKg: number
  kisanlinkNormalPerKg: number
  marketMakerFarmerPerKg: number
  marketMakerConsumerPerKg: number
  kisanlinkNormalConsumerPerKg: number
  localReferencePerKg: number
  farmerPremiumPerKg: number
  farmerPremiumPct: number
  normalOverMandiPerKg: number
  consumerSavingPerKg: number
  consumerSavingPct: number
  pooledPlatformFeePerKg: number
  pooledFreightAllowancePerKg: number
  unpooledLogisticsPerKg: number
}

/** Half-up rounding, identical to the Python implementation (JS Math.round is half-up for positives). */
export function roundMoney(value: number, decimals = 0): number {
  const factor = 10 ** decimals
  return Math.floor(value * factor + 0.5) / factor
}

/** Deterministic [0, 1) from a string — FNV-1a 32-bit, identical in the Python engine. */
export function stableUnit(key: string): number {
  let h = 0x811c9dc5
  for (const ch of key.toLowerCase().trim()) {
    h ^= ch.codePointAt(0)!
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h / 0x100000000
}

export function derivePriceLadder(mandiPerKg: number, seedKey = ''): PriceLadder {
  if (!Number.isFinite(mandiPerKg) || mandiPerKg <= 0) throw new Error('mandiPerKg must be a positive finite number')

  const mandi = roundMoney(mandiPerKg, 2)
  const j1 = stableUnit(`${seedKey}|normal`)
  const j2 = stableUnit(`${seedKey}|mm`)

  const normal = Math.max(Math.ceil(mandi) + MIN_GAP, roundMoney(mandi * (1 + FARMER_NORMAL_UPLIFT_MIN + FARMER_NORMAL_UPLIFT_SPAN * j1)))
  const mmFarmer = Math.max(normal + MIN_GAP, roundMoney(normal * (1 + FARMER_MM_UPLIFT_MIN + FARMER_MM_UPLIFT_SPAN * j2)))

  const pooledFee = roundMoney(mmFarmer * POOLED_PLATFORM_PCT, 2)
  const pooledFreight = roundMoney(Math.max(POOLED_FREIGHT_FLOOR, mmFarmer * POOLED_FREIGHT_PCT), 2)
  const mmConsumer = roundMoney(mmFarmer + pooledFee + pooledFreight, 2)

  const unpooled = roundMoney(Math.max(UNPOOLED_LOGISTICS_FLOOR, normal * UNPOOLED_LOGISTICS_PCT), 2)
  const normalConsumer = Math.max(roundMoney(normal + unpooled), Math.ceil(mmConsumer) + MIN_GAP)

  const localReference = Math.max(roundMoney(mandi * LOCAL_REFERENCE_MULTIPLE), normalConsumer + 2 * MIN_GAP)

  return {
    mandiPerKg: mandi,
    kisanlinkNormalPerKg: normal,
    marketMakerFarmerPerKg: mmFarmer,
    marketMakerConsumerPerKg: mmConsumer,
    kisanlinkNormalConsumerPerKg: normalConsumer,
    localReferencePerKg: localReference,
    farmerPremiumPerKg: roundMoney(mmFarmer - mandi, 2),
    farmerPremiumPct: roundMoney(((mmFarmer - mandi) / mandi) * 100, 1),
    normalOverMandiPerKg: roundMoney(normal - mandi, 2),
    consumerSavingPerKg: roundMoney(localReference - mmConsumer, 2),
    consumerSavingPct: roundMoney(((localReference - mmConsumer) / localReference) * 100, 1),
    pooledPlatformFeePerKg: pooledFee,
    pooledFreightAllowancePerKg: pooledFreight,
    unpooledLogisticsPerKg: unpooled,
  }
}

/** Local-market reference when only a listing price is known (legacy rows without a benchmark). */
export function localReferenceFromNormal(normalPerKg: number): number {
  const approxMandi = normalPerKg / (1 + FARMER_NORMAL_UPLIFT_MIN + FARMER_NORMAL_UPLIFT_SPAN / 2)
  return derivePriceLadder(Math.max(1, approxMandi)).localReferencePerKg
}

export const rescuePrice = (normalPerKg: number) => roundMoney(normalPerKg * RESCUE_DISCOUNT)

/** How a regular (un-pooled) consumer price splits, for "where your money goes" disclosures. */
export function regularPriceSplit(pricePerKg: number) {
  const platform = roundMoney(pricePerKg * REGULAR_ORDER_PLATFORM_PCT)
  const logistics = roundMoney(pricePerKg * REGULAR_ORDER_LOGISTICS_PCT)
  return { farmer: Math.max(0, pricePerKg - platform), platform, logistics }
}

export interface FarmerPriceOption {
  id: 'fast' | 'balanced' | 'high'
  price: number
  labelKey: string
  hintKey: string
  saleChancePct: number
}

/** Price advisor anchors: normal (fast), Market Maker (balanced), stretch (high). */
export function farmerPriceOptions(ladder: PriceLadder, grade = 'Grade A', demandIndex = 65): FarmerPriceOption[] {
  const fast = ladder.kisanlinkNormalPerKg
  const balanced = ladder.marketMakerFarmerPerKg
  const high = Math.max(balanced + MIN_GAP, roundMoney(balanced * 1.06))
  const gradeBonus = grade === 'Grade A+' ? 4 : 0
  const chance = (price: number) => Math.max(30, Math.min(97, roundMoney(84 - (price - balanced) * 6 + (demandIndex - 70) * 0.3 + gradeBonus)))
  return [
    { id: 'fast', price: fast, labelKey: 'fastSale', hintKey: 'lowerEarnings', saleChancePct: Math.min(97, chance(fast) + 6) },
    { id: 'balanced', price: balanced, labelKey: 'bestBalance', hintKey: 'bestBalanceHint', saleChancePct: chance(balanced) },
    { id: 'high', price: high, labelKey: 'higherEarnings', hintKey: 'lowerSaleProbability', saleChancePct: chance(high) },
  ]
}

/**
 * Deterministic 7-day trend + 3-day projection whose LAST historical point is the live
 * benchmark. The daily AGMARKNET resource carries no history, so this is an indicative demo
 * shape and is labelled as such wherever it is charted.
 */
export function indicativeSeries(mandiPerKg: number) {
  const hist = [0.93, 0.95, 0.96, 0.98, 0.97, 0.99, 1.0]
  const fc = [1.01, 1.02, 1.02]
  return { historical: hist.map((f) => roundMoney(mandiPerKg * f, 1)), forecast: fc.map((f) => roundMoney(mandiPerKg * f, 1)) }
}

export interface FarmerAiContext {
  mandiPrice: number
  kisanlinkNormalPrice: number
  marketMakerFarmerPrice: number
  difference: number
  percentagePremium: number
  source: PriceSource
  date: string | null
  market: string | null
}

export interface ConsumerAiContext {
  marketMakerConsumerPrice: number
  kisanlinkNormalPrice: number
  localMarketReference: number
  savings: number
  percentageSavings: number
}

/** Numbers any insight/AI layer must reason from. Text may embellish; these are authoritative. */
export function farmerAiContext(ladder: PriceLadder, benchmark?: Pick<MandiBenchmark, 'source' | 'arrivalDate' | 'market'> | null): FarmerAiContext {
  return {
    mandiPrice: ladder.mandiPerKg,
    kisanlinkNormalPrice: ladder.kisanlinkNormalPerKg,
    marketMakerFarmerPrice: ladder.marketMakerFarmerPerKg,
    difference: ladder.farmerPremiumPerKg,
    percentagePremium: ladder.farmerPremiumPct,
    source: benchmark?.source ?? 'seed',
    date: benchmark?.arrivalDate ?? null,
    market: benchmark?.market ?? null,
  }
}

export function consumerAiContext(ladder: PriceLadder): ConsumerAiContext {
  return {
    marketMakerConsumerPrice: ladder.marketMakerConsumerPerKg,
    kisanlinkNormalPrice: ladder.kisanlinkNormalConsumerPerKg,
    localMarketReference: ladder.localReferencePerKg,
    savings: ladder.consumerSavingPerKg,
    percentageSavings: ladder.consumerSavingPct,
  }
}

/** Empty when the ladder is sound; otherwise the broken rule names. */
export function checkInvariants(ladder: PriceLadder): string[] {
  const problems: string[] = []
  if (!(ladder.mandiPerKg < ladder.kisanlinkNormalPerKg)) problems.push('mandi < normal')
  if (!(ladder.kisanlinkNormalPerKg + MIN_GAP <= ladder.marketMakerFarmerPerKg)) problems.push('normal + 1 <= marketMakerFarmer')
  if (!(ladder.marketMakerFarmerPerKg < ladder.marketMakerConsumerPerKg)) problems.push('marketMakerFarmer < marketMakerConsumer')
  if (!(ladder.marketMakerConsumerPerKg + MIN_GAP <= ladder.kisanlinkNormalConsumerPerKg)) problems.push('marketMakerConsumer + 1 <= normalConsumer')
  if (!(ladder.kisanlinkNormalConsumerPerKg + MIN_GAP <= ladder.localReferencePerKg)) problems.push('normalConsumer + 1 <= localReference')
  return problems
}

/* ==========================================================================================
 * Commodity normalization (mirror of agmarknet_service.normalize_commodity, key only)
 * ======================================================================================= */

const ALIASES: Record<string, string> = {
  tomatoes: 'tomato', tamatar: 'tomato', 'टमाटर': 'tomato',
  potatoes: 'potato', aloo: 'potato', alu: 'potato', 'आलू': 'potato',
  onions: 'onion', pyaz: 'onion', pyaaz: 'onion', 'प्याज़': 'onion', 'प्याज': 'onion',
  palak: 'spinach', 'पालक': 'spinach',
  gehu: 'wheat', gehun: 'wheat', 'गेहूं': 'wheat', 'गेहूँ': 'wheat',
  carrots: 'carrot', gajar: 'carrot', 'गाजर': 'carrot',
  'shimla mirch': 'capsicum', 'शिमला मिर्च': 'capsicum',
  gobi: 'cauliflower', gobhi: 'cauliflower', 'phool gobi': 'cauliflower', 'फूलगोभी': 'cauliflower',
  cucumbers: 'cucumber', kheera: 'cucumber', khira: 'cucumber', 'खीरा': 'cucumber', cucumbar: 'cucumber',
  apples: 'apple', seb: 'apple', 'सेब': 'apple',
  chawal: 'rice', paddy: 'rice', dhan: 'rice', 'चावल': 'rice',
  sarson: 'mustard', sarso: 'mustard', 'सरसों': 'mustard',
  ganna: 'sugarcane', 'गन्ना': 'sugarcane', corn: 'maize', makka: 'maize', 'मक्का': 'maize',
  millet: 'bajra', 'बाजरा': 'bajra', chili: 'chilli', chillies: 'chilli', 'green chilli': 'chilli', mirch: 'chilli', 'हरी मिर्च': 'chilli',
  eggplant: 'brinjal', baingan: 'brinjal', 'बैंगन': 'brinjal', ladyfinger: 'okra', 'lady finger': 'okra', bhindi: 'okra', 'भिंडी': 'okra',
  'patta gobi': 'cabbage', 'पत्ता गोभी': 'cabbage', pea: 'peas', matar: 'peas', 'मटर': 'peas',
  lauki: 'bottle gourd', ghiya: 'bottle gourd', 'लौकी': 'bottle gourd', kaddu: 'pumpkin', 'कद्दू': 'pumpkin',
  lahsun: 'garlic', 'लहसुन': 'garlic', adrak: 'ginger', 'अदरक': 'ginger', dhaniya: 'coriander', dhania: 'coriander', 'धनिया': 'coriander',
  mangoes: 'mango', aam: 'mango', 'आम': 'mango', bananas: 'banana', kela: 'banana', 'केला': 'banana', amrood: 'guava', 'अमरूद': 'guava',
  chana: 'gram', chickpea: 'gram', 'चना': 'gram', lentil: 'lentils', dal: 'lentils', daal: 'lentils', 'दाल': 'lentils',
}
const DESCRIPTORS = new Set(['fresh', 'new', 'baby', 'sweet', 'green', 'snow', 'crisp', 'yellow', 'red', 'organic', 'sharbati', 'basmati', 'himachali', 'desi', 'hybrid', 'grade', 'a', 'a+', 'premium'])

/** 'Fresh Tomatoes' -> 'tomato'; null when the crop is not one KisanLink prices. */
export function commodityKey(name: string): string | null {
  const words = (name ?? '').toLowerCase().replace(/[()\-_/,]/g, ' ').split(/\s+/).filter(Boolean)
  if (!words.length) return null
  const known = (candidate: string) => {
    const key = ALIASES[candidate] ?? candidate
    return key in SEED_MANDI_PER_KG ? key : null
  }
  for (let i = 0; i < words.length; i += 1) {
    const hit = known(words.slice(i).join(' '))
    if (hit) return hit
  }
  const stripped = words.filter((w) => !DESCRIPTORS.has(w))
  for (const w of [...stripped, ...words]) {
    const hit = known(w) ?? known(w.endsWith('s') ? w.slice(0, -1) : w)
    if (hit) return hit
  }
  return null
}

/** The seed benchmark for a crop, labelled as such. Null for crops KisanLink does not price. */
export function seedBenchmark(cropName: string): MandiBenchmark | null {
  const key = commodityKey(cropName)
  if (!key) return null
  return {
    cropKey: key, commodity: key, variety: null, market: null, district: null, state: null,
    modalPerKg: SEED_MANDI_PER_KG[key], minPerKg: null, maxPerKg: null, arrivalDate: null,
    source: 'seed', matchLevel: 'seed', recordCount: 0, stale: true, fetchedAt: new Date(0).toISOString(),
  }
}

/* ==========================================================================================
 * Shapes the prototype state stores — every seeded/derived price field comes through here.
 * ======================================================================================= */

/** Provenance kept next to a derived price so stale / fallback data is always distinguishable. */
export type PriceSourceMeta = Pick<MandiBenchmark, 'source' | 'matchLevel' | 'market' | 'district' | 'state' | 'arrivalDate' | 'minPerKg' | 'maxPerKg' | 'stale' | 'variety'>

export const sourceMeta = (benchmark: MandiBenchmark): PriceSourceMeta => ({
  source: benchmark.source, matchLevel: benchmark.matchLevel, market: benchmark.market, district: benchmark.district,
  state: benchmark.state, arrivalDate: benchmark.arrivalDate, minPerKg: benchmark.minPerKg, maxPerKg: benchmark.maxPerKg,
  stale: benchmark.stale, variety: benchmark.variety,
})

/** Market Maker board / crop-segment price fields for a ladder. */
export const boardPricesFrom = (ladder: PriceLadder) => ({
  farmerFloorPerKg: ladder.marketMakerFarmerPerKg,
  mandiPricePerKg: ladder.mandiPerKg,
  buyerCeilingPerKg: ladder.marketMakerConsumerPerKg,
  buyerCurrentPerKg: ladder.localReferencePerKg,
})

/** Listing price fields for a ladder (normal ask, mandi anchor, local-market reference). */
export const listingPricesFrom = (ladder: PriceLadder) => ({
  pricePerKg: ladder.kisanlinkNormalPerKg,
  mandiPricePerKg: ladder.mandiPerKg,
  retailPricePerKg: ladder.localReferencePerKg,
})

const seedLadder = (cropName: string): PriceLadder => {
  const benchmark = seedBenchmark(cropName)
  if (!benchmark) throw new Error(`No seed benchmark for "${cropName}"`)
  return derivePriceLadder(benchmark.modalPerKg, benchmark.cropKey)
}

/** Seed-time board prices; superseded by the live ladder when `prototypeService` reads state. */
export const seedBoardPrices = (cropName: string) => boardPricesFrom(seedLadder(cropName))
/** Seed-time listing prices; superseded by the live ladder when `prototypeService` reads state. */
export const seedListingPrices = (cropName: string) => listingPricesFrom(seedLadder(cropName))
/** Seed-time mandi anchor, for historical rows such as earnings. */
export const seedMandiPerKg = (cropName: string) => seedLadder(cropName).mandiPerKg

/** "28.5" / "28.75" / "31" — a per-kg figure shown as published, never rounded to the rupee. */
export const perKgText = (value: number) => (Number.isInteger(value) ? String(value) : String(roundMoney(value, 2)))
