/**
 * The one place the frontend learns what a kilo fetches at the mandi.
 *
 * Live AGMARKNET benchmarks come from our own backend (`GET /api/v1/intelligence/mandi`), which
 * holds the data.gov.in key, normalizes ₹/quintal to ₹/kg and picks the nearest relevant
 * market. This module caches the answer (memory + sessionStorage), derives the centralized
 * price ladder for each crop, and hands both out synchronously so every screen — farmer,
 * consumer, bulk, logistics, Market Maker, AI cards — reads the same numbers.
 *
 * Fallback order when the backend cannot be reached: the cached snapshot from this session ->
 * the seeded demo benchmark (labelled `source: 'seed'`). Nothing here is ever presented as
 * government data unless `source === 'agmarknet'`.
 */
import {
  commodityKey,
  derivePriceLadder,
  seedBenchmark,
  SEED_MANDI_PER_KG,
  type MandiBenchmark,
  type PriceLadder,
} from './pricingEngine'

const API_BASE = '/api/v1'
const STORAGE_KEY = 'kisanlink_mandi_v1'
const CACHE_TTL_MS = 30 * 60 * 1000
const REFRESH_MS = 30 * 60 * 1000
/** Crops the demo actually lists; primed first so the first screen already has live data. */
export const CORE_CROPS = ['tomato', 'potato', 'onion', 'spinach', 'wheat', 'carrot', 'capsicum', 'cauliflower', 'cucumber', 'apple', 'rice', 'mustard']

export interface CropPricing {
  benchmark: MandiBenchmark
  ladder: PriceLadder
}

interface Snapshot {
  fetchedAt: string
  liveAvailable: boolean
  state: string
  district: string
  items: Record<string, MandiBenchmark>
}

interface BackendBenchmark {
  crop_key: string; commodity: string; variety: string | null; market: string | null; district: string | null; state: string | null
  modal_per_kg: number; min_per_kg: number | null; max_per_kg: number | null; arrival_date: string | null
  source: 'agmarknet' | 'seed'; match_level: MandiBenchmark['matchLevel']; record_count: number; stale: boolean; fetched_at: string
}
interface BackendBatch { fetched_at: string; state: string; district: string; live_available: boolean; items: Record<string, { benchmark: BackendBenchmark }> }

const fromBackend = (b: BackendBenchmark): MandiBenchmark => ({
  cropKey: b.crop_key, commodity: b.commodity, variety: b.variety, market: b.market, district: b.district, state: b.state,
  modalPerKg: b.modal_per_kg, minPerKg: b.min_per_kg, maxPerKg: b.max_per_kg, arrivalDate: b.arrival_date,
  source: b.source, matchLevel: b.match_level, recordCount: b.record_count, stale: b.stale, fetchedAt: b.fetched_at,
})

let snapshot: Snapshot | null = null
let primed: Promise<void> | null = null
let refreshTimer: number | null = null
const listeners = new Set<() => void>()

const storage = () => {
  try { return typeof sessionStorage === 'undefined' ? null : sessionStorage } catch { return null }
}

function readStored(): Snapshot | null {
  try {
    const raw = storage()?.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Snapshot
    if (!parsed?.items || Date.now() - new Date(parsed.fetchedAt).getTime() > CACHE_TTL_MS) return null
    return parsed
  } catch { return null }
}

function writeStored(value: Snapshot) {
  try { storage()?.setItem(STORAGE_KEY, JSON.stringify(value)) } catch { /* private mode etc. */ }
}

function announce() {
  listeners.forEach((listener) => listener())
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('kisanlink-state'))
}

async function fetchBatch(crops: string[], timeoutMs: number): Promise<Snapshot | null> {
  if (typeof fetch === 'undefined') return null
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(`${API_BASE}/intelligence/mandi?crops=${encodeURIComponent(crops.join(','))}`, { signal: controller.signal, headers: { Accept: 'application/json' } })
    if (!response.ok) return null
    const data = await response.json() as BackendBatch
    const items: Record<string, MandiBenchmark> = {}
    for (const [name, item] of Object.entries(data.items ?? {})) {
      const key = commodityKey(name) ?? item.benchmark.crop_key
      items[key] = fromBackend(item.benchmark)
    }
    return { fetchedAt: data.fetched_at, liveAvailable: data.live_available, state: data.state, district: data.district, items }
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

function merge(next: Snapshot | null) {
  if (!next) return false
  snapshot = snapshot ? { ...next, items: { ...snapshot.items, ...next.items } } : next
  writeStored(snapshot)
  return true
}

export const mandiBenchmarkService = {
  /**
   * Load benchmarks before the first screen renders. Resolves within `timeoutMs` no matter
   * what; a slow or absent backend simply means seed values until the background refresh lands.
   */
  prime(timeoutMs = 3500): Promise<void> {
    if (primed) return primed
    snapshot = readStored()
    primed = (async () => {
      if (!snapshot) {
        if (merge(await fetchBatch(CORE_CROPS, timeoutMs))) announce()
      }
      // The long tail of the crop catalogue loads after first paint.
      void fetchBatch(Object.keys(SEED_MANDI_PER_KG).filter((key) => !CORE_CROPS.includes(key)), 15000).then((rest) => { if (merge(rest)) announce() })
      if (typeof window !== 'undefined' && refreshTimer === null) {
        refreshTimer = window.setInterval(() => { void this.refresh() }, REFRESH_MS)
      }
    })()
    return primed
  },

  async refresh() {
    if (merge(await fetchBatch(Object.keys(SEED_MANDI_PER_KG), 15000))) announce()
  },

  /** Live benchmark for a crop when we have one; otherwise the labelled seed row. */
  benchmarkFor(cropName: string): MandiBenchmark | null {
    const key = commodityKey(cropName)
    if (!key) return null
    return snapshot?.items[key] ?? seedBenchmark(cropName)
  },

  /** Benchmark + centralized ladder. Null only for crops KisanLink does not price at all. */
  pricingFor(cropName: string): CropPricing | null {
    const benchmark = this.benchmarkFor(cropName)
    if (!benchmark) return null
    return { benchmark, ladder: derivePriceLadder(benchmark.modalPerKg, benchmark.cropKey) }
  },

  /** True once at least one crop carries a live government benchmark. */
  get liveAvailable() { return Boolean(snapshot?.liveAvailable) },
  get fetchedAt() { return snapshot?.fetchedAt ?? null },
  get region() { return snapshot ? { state: snapshot.state, district: snapshot.district } : null },

  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => { listeners.delete(listener) }
  },

  /** Tests only: install a snapshot without touching the network. */
  __setSnapshot(value: Snapshot | null) {
    snapshot = value
    primed = value ? Promise.resolve() : null
  },
}

/** "Updated 14 Sep" style label for a benchmark date; null when there is none. */
export function benchmarkDateLabel(benchmark: Pick<MandiBenchmark, 'arrivalDate'> | null | undefined, locale: 'en' | 'hi' = 'en'): string | null {
  if (!benchmark?.arrivalDate) return null
  const date = new Date(`${benchmark.arrivalDate}T00:00:00`)
  if (!Number.isFinite(date.getTime())) return null
  return date.toLocaleDateString(locale === 'hi' ? 'hi-IN' : 'en-IN', { day: 'numeric', month: 'short' })
}
