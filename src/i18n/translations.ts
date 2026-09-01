export const translations = {
  en: {
    home: 'Home', produce: 'Produce', sell: 'Sell', orders: 'Orders', profile: 'Profile',
    greeting: 'Namaste, Ramesh ji', location: 'Sonipat, Haryana',
    earningsMonth: 'Earnings this month', activeListings: 'Active listings', newOrders: 'New orders',
    sellProduce: 'Sell Produce', quickActions: 'Your farm, at a glance', myProduce: 'My Produce',
    earnings: 'Earnings', demandInsights: 'Demand Insights', priceInsight: 'Today’s price insight',
    localMarket: 'Local market price', directPotential: 'Direct selling potential',
    additional: 'Potential additional earnings', upcomingPickup: 'Upcoming pickup',
    needHelp: 'Need help?', helpCopy: 'Talk to our support team in Hindi or English.',
    callSupport: 'Call Support', farmerReceives: 'You keep more of every sale', viewDetails: 'View details',
    languageName: 'English', languageChanged: 'Language changed to English',
  },
  hi: {
    home: 'मुख्य', produce: 'फसल', sell: 'बेचें', orders: 'ऑर्डर', profile: 'प्रोफ़ाइल',
    greeting: 'नमस्ते, रमेश जी', location: 'सोनीपत, हरियाणा',
    earningsMonth: 'इस महीने की कमाई', activeListings: 'सक्रिय फसलें', newOrders: 'नए ऑर्डर',
    sellProduce: 'अपनी फसल बेचें', quickActions: 'आपके खेत की जानकारी', myProduce: 'मेरी फसल',
    earnings: 'कमाई', demandInsights: 'मांग की जानकारी', priceInsight: 'आज की कीमत',
    localMarket: 'स्थानीय मंडी भाव', directPotential: 'सीधी बिक्री की कीमत',
    additional: 'संभावित अतिरिक्त कमाई', upcomingPickup: 'अगली पिकअप',
    needHelp: 'मदद चाहिए?', helpCopy: 'हमारी सहायता टीम से हिन्दी या English में बात करें।',
    callSupport: 'सहायता के लिए कॉल करें', farmerReceives: 'हर बिक्री में आपको अधिक मिलता है', viewDetails: 'पूरी जानकारी',
    languageName: 'हिन्दी', languageChanged: 'भाषा हिन्दी में बदल दी गई',
  },
} as const

export type TranslationKey = keyof typeof translations.en
