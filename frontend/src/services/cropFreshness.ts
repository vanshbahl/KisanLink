import type { Category, FarmerListing } from '../types'
import { daysUntil, toLocalIso } from '../utils/dates'

/**
 * Crop freshness — the *recommended commercial selling window* for a harvested lot.
 *
 * This is deliberately not a spoilage or food-safety prediction. It answers one farmer
 * question — "कब तक बेच लूं?" — from the harvest date and a per-crop window, so that every
 * crop card, the crop page, the sell flow, orders and the Market Maker all say the same thing.
 *
 * Assumptions (prototype defaults, editable in `SELLING_WINDOWS` below):
 *
 *   - The window is measured in whole days from the harvest date. Day 0 is harvest day.
 *   - Windows are conservative ambient-storage figures for northern-India trade practice,
 *     chosen to give the right *relative* behaviour across categories: leafy greens are a
 *     matter of a day or two, tomatoes a few days, curable roots and bulbs weeks, grains and
 *     pulses months. They are not laboratory shelf-life values and are not presented as such.
 *   - Stages are fractions of the window, not fixed day counts, so a two-day spinach window
 *     and a ninety-day wheat window both move through FRESH → GOOD → SELL_SOON → URGENT.
 *
 * Which date is used, in order of preference:
 *
 *   1. `harvestDate` — every listing has one. The sell flow defaults it to today and lets the
 *      farmer change it under "और जानकारी"; voice listings carry the spoken date.
 *   2. `createdAt` — only if the harvest date is missing or unparseable. Listing time is not
 *      harvest time, so the result is flagged `approximate` and the UI says "लगभग".
 */
export type FreshnessStage = 'FRESH' | 'GOOD' | 'SELL_SOON' | 'URGENT' | 'WINDOW_OVER'

export interface SellingWindow {
  /** Total recommended selling window, in days from harvest (inclusive of harvest day). */
  days: number
  /** Human label for the assumption table; not shown to farmers. */
  note: string
}

/** Keyword → window. Matched case-insensitively against the listing crop name (en or hi). */
const CROP_WINDOWS: Array<{ match: string[]; window: SellingWindow }> = [
  { match: ['spinach', 'palak', 'पालक', 'methi', 'coriander', 'dhaniya', 'lettuce', 'leafy'], window: { days: 2, note: 'Leafy greens wilt within a day or two at ambient temperature.' } },
  { match: ['tomato', 'टमाटर'], window: { days: 5, note: 'Ripe tomatoes hold 4–6 days before softening.' } },
  { match: ['cucumber', 'खीरा', 'capsicum', 'शिमला', 'okra', 'bhindi', 'भिंडी', 'brinjal', 'baingan', 'बैंगन', 'cauliflower', 'गोभी', 'beans'], window: { days: 4, note: 'Tender vegetables; 3–5 day trade window.' } },
  { match: ['banana', 'केला', 'mango', 'आम', 'papaya', 'पपीता', 'grape', 'अंगूर'], window: { days: 5, note: 'Climacteric fruit; sold within a few days of harvest.' } },
  { match: ['apple', 'सेब', 'pomegranate', 'अनार', 'orange', 'kinnow', 'संतरा', 'guava', 'अमरूद'], window: { days: 10, note: 'Firmer fruit; roughly a week to ten days ambient.' } },
  { match: ['carrot', 'गाजर', 'radish', 'mooli', 'मूली', 'beet', 'चुकंदर'], window: { days: 8, note: 'Topped root vegetables keep about a week.' } },
  { match: ['potato', 'आलू', 'onion', 'प्याज़', 'प्याज', 'garlic', 'लहसुन', 'ginger', 'अदरक'], window: { days: 30, note: 'Cured tubers and bulbs sell comfortably for a month.' } },
  { match: ['wheat', 'गेहूं', 'गेहूँ', 'rice', 'चावल', 'basmati', 'paddy', 'धान', 'maize', 'makka', 'मक्का', 'bajra', 'बाजरा', 'jowar', 'mustard', 'सरसों', 'dal', 'दाल', 'chana', 'चना', 'moong', 'मूंग', 'urad', 'pulse', 'lentil', 'soy'], window: { days: 120, note: 'Dry grains, oilseeds and pulses; months, not days.' } },
]

/** Fallback per category when no crop keyword matches. */
const CATEGORY_WINDOWS: Record<Category, SellingWindow> = {
  Vegetables: { days: 4, note: 'Unlisted vegetable — assumed tender.' },
  Fruits: { days: 6, note: 'Unlisted fruit.' },
  Staples: { days: 21, note: 'Unlisted staple — assumed storable.' },
  Grains: { days: 120, note: 'Unlisted grain or pulse.' },
}

/**
 * Stage boundaries as a fraction of the window *remaining*. Ordered from freshest.
 * The last two days override the fraction: one day left is always SELL_SOON and the final
 * day is always URGENT, so a two-day crop still walks through both before its window closes.
 */
const STAGE_BY_REMAINING: Array<{ stage: FreshnessStage; minFraction: number }> = [
  { stage: 'FRESH', minFraction: 0.6 },
  { stage: 'GOOD', minFraction: 0.35 },
  { stage: 'SELL_SOON', minFraction: 0.15 },
  { stage: 'URGENT', minFraction: 0 },
]

export interface Freshness {
  stage: FreshnessStage
  /** 0–100, share of the selling window still ahead. */
  percent: number
  /** Whole days of the window still ahead (0 on the last day; negative once over). */
  daysLeft: number
  /** Days since harvest (0 on harvest day). */
  daysSinceHarvest: number
  /** Total window for this crop. */
  windowDays: number
  /** yyyy-mm-dd of the last recommended selling day. */
  sellBy: string
  /** True when the window had to be measured from `createdAt` instead of a harvest date. */
  approximate: boolean
}

export function sellingWindowFor(crop: string, category?: Category): SellingWindow {
  const name = crop.toLowerCase()
  const hit = CROP_WINDOWS.find((entry) => entry.match.some((keyword) => name.includes(keyword)))
  if (hit) return hit.window
  return category ? CATEGORY_WINDOWS[category] : CATEGORY_WINDOWS.Vegetables
}

const validDay = (value?: string) => Boolean(value && Number.isFinite(new Date(`${value}T00:00:00`).getTime()))

export function assessFreshness(listing: Pick<FarmerListing, 'crop' | 'harvestDate' | 'createdAt'> & { category?: Category }): Freshness {
  const window = sellingWindowFor(listing.crop, listing.category)
  const approximate = !validDay(listing.harvestDate)
  const anchor = approximate ? (validDay(listing.createdAt) ? listing.createdAt : toLocalIso(new Date())) : listing.harvestDate

  // A harvest date in the future (pre-harvest listing) counts as harvest day.
  const daysSinceHarvest = Math.max(0, -daysUntil(anchor))
  const lastDay = window.days - 1
  const daysLeft = lastDay - daysSinceHarvest
  const fraction = window.days <= 1 ? (daysLeft >= 0 ? 1 : 0) : Math.max(0, daysLeft) / lastDay

  let stage: FreshnessStage
  if (daysLeft < 0) stage = 'WINDOW_OVER'
  else if (daysLeft === 0) stage = 'URGENT'
  else if (daysLeft === 1) stage = 'SELL_SOON'
  else stage = STAGE_BY_REMAINING.find((entry) => fraction >= entry.minFraction)?.stage ?? 'URGENT'

  const sellByDate = new Date(`${anchor}T00:00:00`)
  sellByDate.setDate(sellByDate.getDate() + lastDay)

  return {
    stage,
    percent: Math.round(Math.min(1, Math.max(0, fraction)) * 100),
    daysLeft,
    daysSinceHarvest,
    windowDays: window.days,
    sellBy: toLocalIso(sellByDate),
    approximate,
  }
}

/** True for stages where the farmer should be nudged toward "जल्दी बेचें". */
export const isUrgentFreshness = (freshness: Freshness) => freshness.stage === 'URGENT' || freshness.stage === 'WINDOW_OVER'

/** Order for sorting lists: most urgent first. */
export const FRESHNESS_URGENCY: Record<FreshnessStage, number> = { WINDOW_OVER: 4, URGENT: 3, SELL_SOON: 2, GOOD: 1, FRESH: 0 }

/** Exposed for the assumptions table in docs/tests. */
export const SELLING_WINDOWS = { crops: CROP_WINDOWS, categories: CATEGORY_WINDOWS }
