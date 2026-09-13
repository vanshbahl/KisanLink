/**
 * Crops a farmer can name at onboarding.
 *
 * The first twelve mirror the backend's voice-parser alias table
 * (`app/services/gemini_listing.py: CROPS`) and reuse the produce artwork the sell flow
 * already ships; the rest are corridor staples that have no listing artwork yet. `aliases`
 * are what a farmer actually says (Hindi, Hinglish, English), lower-cased, and are what the
 * onboarding voice parser matches a transcript against.
 */
export interface CropOption {
  en: string
  hi: string
  image?: string
  aliases: readonly string[]
}

export const CROP_CATALOGUE: readonly CropOption[] = [
  { en: 'Tomato', hi: 'टमाटर', image: '/assets/produce/tomato.webp', aliases: ['tomato', 'tomatoes', 'tamatar', 'tamaatar', 'टमाटर'] },
  { en: 'Potato', hi: 'आलू', image: '/assets/produce/potato.webp', aliases: ['potato', 'potatoes', 'aloo', 'alu', 'aaloo', 'आलू'] },
  { en: 'Onion', hi: 'प्याज़', image: '/assets/produce/onion.webp', aliases: ['onion', 'onions', 'pyaz', 'pyaaz', 'pyaj', 'प्याज', 'प्याज़'] },
  { en: 'Spinach', hi: 'पालक', image: '/assets/produce/spinach.webp', aliases: ['spinach', 'palak', 'पालक'] },
  { en: 'Wheat', hi: 'गेहूं', image: '/assets/produce/wheat.webp', aliases: ['wheat', 'gehu', 'gehun', 'gehoon', 'गेहूं', 'गेहूँ', 'गेहु'] },
  { en: 'Carrot', hi: 'गाजर', image: '/assets/produce/carrot.webp', aliases: ['carrot', 'carrots', 'gajar', 'गाजर'] },
  { en: 'Capsicum', hi: 'शिमला मिर्च', image: '/assets/produce/capsicum.webp', aliases: ['capsicum', 'shimla mirch', 'शिमला मिर्च'] },
  { en: 'Cauliflower', hi: 'फूलगोभी', image: '/assets/produce/cauliflower.webp', aliases: ['cauliflower', 'gobi', 'gobhi', 'phool gobi', 'phool gobhi', 'फूलगोभी', 'गोभी'] },
  { en: 'Cucumber', hi: 'खीरा', image: '/assets/produce/cucumber.webp', aliases: ['cucumber', 'cucumbers', 'kheera', 'khira', 'खीरा'] },
  { en: 'Apple', hi: 'सेब', image: '/assets/produce/apple.webp', aliases: ['apple', 'apples', 'seb', 'सेब'] },
  { en: 'Rice', hi: 'चावल', image: '/assets/produce/rice.webp', aliases: ['rice', 'chawal', 'dhan', 'paddy', 'चावल', 'धान'] },
  { en: 'Mustard', hi: 'सरसों', image: '/assets/produce/mustard.webp', aliases: ['mustard', 'sarson', 'sarso', 'सरसों', 'सरसो'] },
  { en: 'Sugarcane', hi: 'गन्ना', aliases: ['sugarcane', 'sugar cane', 'ganna', 'गन्ना'] },
  { en: 'Maize', hi: 'मक्का', aliases: ['maize', 'corn', 'makka', 'makai', 'bhutta', 'मक्का', 'मकई', 'भुट्टा'] },
  { en: 'Bajra', hi: 'बाजरा', aliases: ['bajra', 'millet', 'pearl millet', 'बाजरा'] },
  { en: 'Chilli', hi: 'हरी मिर्च', aliases: ['chilli', 'chili', 'chillies', 'green chilli', 'mirch', 'hari mirch', 'मिर्च', 'हरी मिर्च'] },
  { en: 'Brinjal', hi: 'बैंगन', aliases: ['brinjal', 'eggplant', 'baingan', 'baigan', 'बैंगन', 'बैगन'] },
  { en: 'Okra', hi: 'भिंडी', aliases: ['okra', 'ladyfinger', 'lady finger', 'bhindi', 'भिंडी', 'भिण्डी'] },
  { en: 'Cabbage', hi: 'पत्ता गोभी', aliases: ['cabbage', 'patta gobi', 'patta gobhi', 'band gobi', 'पत्ता गोभी', 'बंद गोभी'] },
  { en: 'Peas', hi: 'मटर', aliases: ['peas', 'pea', 'matar', 'मटर'] },
  { en: 'Bottle gourd', hi: 'लौकी', aliases: ['bottle gourd', 'lauki', 'ghiya', 'लौकी', 'घिया'] },
  { en: 'Pumpkin', hi: 'कद्दू', aliases: ['pumpkin', 'kaddu', 'sitaphal', 'कद्दू'] },
  { en: 'Garlic', hi: 'लहसुन', aliases: ['garlic', 'lahsun', 'lehsun', 'लहसुन'] },
  { en: 'Ginger', hi: 'अदरक', aliases: ['ginger', 'adrak', 'अदरक'] },
  { en: 'Coriander', hi: 'धनिया', aliases: ['coriander', 'dhaniya', 'dhania', 'धनिया'] },
  { en: 'Mango', hi: 'आम', aliases: ['mango', 'mangoes', 'aam', 'आम'] },
  { en: 'Banana', hi: 'केला', aliases: ['banana', 'bananas', 'kela', 'केला'] },
  { en: 'Guava', hi: 'अमरूद', aliases: ['guava', 'amrood', 'amrud', 'अमरूद'] },
  { en: 'Gram', hi: 'चना', aliases: ['gram', 'chana', 'chickpea', 'चना'] },
  { en: 'Lentils', hi: 'दाल', aliases: ['lentil', 'lentils', 'dal', 'daal', 'moong', 'masoor', 'arhar', 'urad', 'दाल', 'मूंग', 'मसूर', 'अरहर', 'उड़द'] },
]

export const cropByName = (name: string) => {
  const needle = name.trim().toLowerCase()
  return CROP_CATALOGUE.find((crop) => crop.en.toLowerCase() === needle || crop.hi === name.trim() || crop.aliases.includes(needle))
}
