import { en } from './en'
import { hi } from './hi'

export const translations = { en, hi }
export type TranslationKey = keyof typeof en

export const roleKey = { farmer: 'farmer', consumer: 'consumer', bulk: 'bulkBuyer', logistics: 'logisticsOperator' } as const
export const categoryKey = { All: 'all', Vegetables: 'vegetables', Fruits: 'fruits', Grains: 'grains', Staples: 'staples' } as const
export const freshnessKey: Record<string, TranslationKey> = {
  'Harvested today': 'freshToday', 'Harvested yesterday': 'freshYesterday', 'Harvested 2 days ago': 'freshTwoDays',
  'Milled this week': 'milledWeek', 'New season crop': 'newSeason', 'Packed yesterday': 'packedYesterday',
  'Cleaned this week': 'cleanedWeek', 'Harvested 4h ago': 'freshFourHours',
}

export function productKey(id: string): TranslationKey {
  return `product_${id}` as TranslationKey
}
