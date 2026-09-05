import type { Language } from '../types'

// Kisan Intelligence — farmer-facing AI copy. Plain, non-technical language in both English and Hindi.
// Hindi strings are natural phrasing, not transliteration.
const copy = {
  en: {
    kisanIntelligence: 'Kisan Intelligence', aiAssisted: 'AI-assisted insight', combiningSignals: 'Combining farm signals',
    disclaimerShort: 'AI-assisted prototype insight · Based on nearby demand, prices and your current listings.',
    forecastDisclaimer: 'Prototype forecast based on simulated regional demand and mandi trends.',

    // Feature 1 — Farm Pulse
    bestOpportunityToday: 'Best opportunity today', analyseOpportunity: 'Analyse', dashboardSignal: 'Tomato demand looks stronger today',
    seeWhy: 'See why', hideWhy: 'Hide details', recommendedAction: 'Recommended action', potentialGain: 'Potential gain',
    listCrop: 'List {crop}', listingThisCrop: 'List this crop',
    stageDemand: 'Checking nearby buyer demand…', stageMandi: 'Comparing mandi prices…', stageProduce: 'Checking your available produce…', stagePrepare: 'Preparing recommendation…',
    opportunityHeadline: 'Your strongest opportunity today: {crop}.', opportunityBody: 'Nearby demand is {pct}% above this week’s average and buyers around Sonipat need approximately {tonnes} tonnes over the next 3 days.',
    factorBuyerDemand: 'Buyer demand', factorBuyerDemandValue: '{count} interested buyers nearby',
    factorMarketGap: 'Market gap', factorMarketGapValue: '₹{gap}/kg above mandi',
    factorSupplyGap: 'Supply gap', factorSupplyGapValue: '{tonnes} tonnes needed',
    factorPickup: 'Pickup capacity', factorPickupAvailable: 'Truck space available tomorrow', factorPickupLimited: 'Next pickup slot in a couple of days',

    // Confidence
    confidenceHigh: 'High confidence', confidenceMedium: 'Fair confidence', confidenceLow: 'Early signal',

    // Feature 2 — Market Intelligence
    insightsHeading: 'Kisan Intelligence', analyseMarket: 'Analyse market',
    stageBuyerDemand: 'Checking nearby buyer demand…', stageMandiTrend: 'Comparing mandi prices…', stageDemandChange: 'Reading this week’s demand change…', stageForecast: 'Preparing forecast…',
    marketHeadline: 'Prices for {crop} may remain strong for the next 3 days.', recommendedSellingRange: 'Recommended selling range', expectedDemandIncrease: 'Expected demand increase', nearbyUnmetDemand: 'Nearby unmet demand', confidenceLabel: 'Confidence',
    marketExplanation: 'Nearby bulk requirements are competing for limited {grade} {crop} supply. Current mandi arrivals are {supply}, while KisanLink buyer demand is {demand}.',
    demandHigh: 'High', demandModerate: 'Moderate', demandLow: 'Low', supplyHigh: 'heavy', supplyModerate: 'moderate', supplyLow: 'light',
    priceMomentum: 'Price momentum', momentumRising: 'Rising', momentumStable: 'Stable', momentumFalling: 'Softening',
    pickupCapacity: 'Pickup capacity', pickupAvailable: 'Available', pickupLimited: 'Limited',
    bestAction: 'Best action', bestActionCopy: 'List {min}–{max} kg before tomorrow afternoon.', listThisCropCta: 'List this crop',
    historicalLabel: 'Last 7 days', forecastLabel: 'Forecast',

    // Feature 3 — Smart Price Advisor
    analyseBestPrice: 'Check price', priceSignal: 'Check the best selling price', stagePriceDemand: 'Checking nearby demand…', stageSimilarListings: 'Comparing similar listings…', stageBuyerAcceptance: 'Estimating buyer acceptance…',
    priceAdvisorHeadline: '₹{price}/kg gives the best balance.', fastSale: 'Fast sale', lowerEarnings: 'Lower earnings', bestBalance: 'Recommended', bestBalanceHint: 'Best balance', higherEarnings: 'Higher earnings', lowerSaleProbability: 'Lower sale probability',
    estimatedSaleChance: 'Estimated sale chance', prototypeEstimate: 'Prototype estimate, not a guarantee', useThisPrice: 'Use ₹{price}/kg',

    // Feature 4 — Order Advisor
    whatShouldIPrepareFirst: 'Analyse orders', orderSignal: 'Which order should I prepare first?', stagePickupWindows: 'Checking pickup windows…', stageOrderValue: 'Comparing order value…', stageSharedRoutes: 'Checking shared routes…',
    prepareFirstHeadline: 'Prepare {buyer}’s {crop} order first.', why: 'Why', pickupArrives: 'Pickup arrives', quantityLabel: 'Quantity', payoutLabel: 'Payout', routeAdvantage: 'Route advantage',
    routeShared: 'Shares tomorrow’s pooled pickup', routeSolo: 'Standalone pickup for this order',
    priorityFirst: 'First', priorityNext: 'Next', priorityLater: 'Later', openOrder: 'Open order',

    // Feature 5 — Earnings Story
    explainMyEarnings: 'See why you earned more', earningsSignal: 'See why you earned more', simpleMonth: 'Your month in simple words', currentOpportunity: 'Current opportunity', demandStrongThreeDays: 'Demand may remain strong for the next 3 days.', stageReviewingOrders: 'Reviewing your orders…', stageComparingMandi: 'Comparing mandi equivalent…', stageBuildingStory: 'Preparing your earnings story…',
    earnedMoreHeadline: 'You earned {amount} more this month by selling directly through KisanLink instead of the local mandi.',
    bestPerformingCrop: 'Best performing crop', averageGain: 'Average gain', pendingPayment: 'Pending payment', pendingPaymentValue: 'expected within 2 days',
    earningsOpportunity: 'Opportunity', earningsOpportunityCopy: 'This week’s {crop} demand could add another {min}–{max} if you list {kg} kg.', seeCurrentDemand: 'See current demand',

    marketOutlook: 'Market outlook', tomorrowFavourable: 'Tomorrow looks favourable', demandStrengthening: 'Demand strengthening', priceOutlook: 'Price outlook', whatFound: 'What KisanLink found', buyerDemandLabel: 'Buyer demand', nearbySupply: 'Nearby supply', mandiArrivals: 'Mandi arrivals', stable: 'Stable', available: 'Available', recommendedActionTitle: 'Recommended action', todayLabel: 'Today',
    perKg: '/kg', kg: 'kg', tonnesUnit: 't',
  },
  hi: {
    kisanIntelligence: 'किसान इंटेलिजेंस', aiAssisted: 'AI की मदद से जानकारी', combiningSignals: 'खेत के संकेत जोड़े जा रहे हैं',
    disclaimerShort: 'AI की मदद से बना अनुमान · पास की मांग, कीमतों और आपकी मौजूदा लिस्टिंग पर आधारित।',
    forecastDisclaimer: 'यह अनुमान क्षेत्रीय मांग और मंडी रुझानों के अनुकरण पर आधारित है।',

    bestOpportunityToday: 'आज का सबसे अच्छा मौका', analyseOpportunity: 'जांचें', dashboardSignal: 'आज टमाटर की मांग मज़बूत दिख रही है',
    seeWhy: 'वजह देखें', hideWhy: 'वजह छुपाएं', recommendedAction: 'सुझाई गई कार्रवाई', potentialGain: 'संभावित फायदा',
    listCrop: '{crop} सूचीबद्ध करें', listingThisCrop: 'यह फसल सूचीबद्ध करें',
    stageDemand: 'पास के खरीदारों की मांग देखी जा रही है…', stageMandi: 'मंडी भाव की तुलना हो रही है…', stageProduce: 'आपकी उपलब्ध फसल देखी जा रही है…', stagePrepare: 'सुझाव तैयार किया जा रहा है…',
    opportunityHeadline: '{crop} आज आपका सबसे मज़बूत मौका है।', opportunityBody: 'पास की मांग इस हफ़्ते के औसत से {pct}% ज़्यादा है, और सोनीपत के आसपास खरीदारों को अगले 3 दिनों में करीब {tonnes} टन चाहिए।',
    factorBuyerDemand: 'खरीदारों की मांग', factorBuyerDemandValue: 'आसपास {count} रुचि रखने वाले खरीदार',
    factorMarketGap: 'बाज़ार का अंतर', factorMarketGapValue: 'मंडी से ₹{gap}/किलो ज़्यादा',
    factorSupplyGap: 'सप्लाई की कमी', factorSupplyGapValue: '{tonnes} टन चाहिए',
    factorPickup: 'पिकअप क्षमता', factorPickupAvailable: 'कल ट्रक की जगह उपलब्ध है', factorPickupLimited: 'अगला पिकअप कुछ दिनों बाद',

    confidenceHigh: 'भरोसा अधिक', confidenceMedium: 'ठीक-ठाक भरोसा', confidenceLow: 'शुरुआती संकेत',

    insightsHeading: 'किसान इंटेलिजेंस', analyseMarket: 'बाज़ार जांचें',
    stageBuyerDemand: 'पास के खरीदारों की मांग देखी जा रही है…', stageMandiTrend: 'मंडी भाव की तुलना हो रही है…', stageDemandChange: 'इस हफ़्ते का बदलाव देखा जा रहा है…', stageForecast: 'अनुमान तैयार किया जा रहा है…',
    marketHeadline: '{crop} की कीमत अगले 3 दिन मज़बूत रह सकती है।', recommendedSellingRange: 'सुझाई गई बिक्री कीमत', expectedDemandIncrease: 'मांग में संभावित बढ़त', nearbyUnmetDemand: 'पास की अधूरी मांग', confidenceLabel: 'भरोसा',
    marketExplanation: 'पास के कई थोक खरीदार सीमित {grade} {crop} सप्लाई के लिए होड़ में हैं। मंडी में आवक {supply} है, जबकि KisanLink पर खरीदारों की मांग {demand} है।',
    demandHigh: 'अधिक', demandModerate: 'सामान्य', demandLow: 'कम', supplyHigh: 'ज़्यादा', supplyModerate: 'सामान्य', supplyLow: 'कम',
    priceMomentum: 'कीमत का रुझान', momentumRising: 'बढ़ रहा है', momentumStable: 'स्थिर', momentumFalling: 'नरम पड़ रहा है',
    pickupCapacity: 'पिकअप क्षमता', pickupAvailable: 'उपलब्ध', pickupLimited: 'सीमित',
    bestAction: 'सबसे अच्छी कार्रवाई', bestActionCopy: 'कल दोपहर से पहले {min}–{max} किलो सूचीबद्ध करें।', listThisCropCta: 'यह फसल सूचीबद्ध करें',
    historicalLabel: 'पिछले 7 दिन', forecastLabel: 'अनुमान',

    analyseBestPrice: 'कीमत जांचें', priceSignal: 'बेचने की सही कीमत जांचें', stagePriceDemand: 'पास की मांग देखी जा रही है…', stageSimilarListings: 'मिलती-जुलती लिस्टिंग की तुलना हो रही है…', stageBuyerAcceptance: 'खरीदार की स्वीकृति का अनुमान लगाया जा रहा है…',
    priceAdvisorHeadline: '₹{price}/किलो सबसे अच्छा संतुलन देता है।', fastSale: 'तेज़ बिक्री', lowerEarnings: 'कम कमाई', bestBalance: 'सुझाया गया', bestBalanceHint: 'सबसे अच्छा संतुलन', higherEarnings: 'ज़्यादा कमाई', lowerSaleProbability: 'बिकने की संभावना कम',
    estimatedSaleChance: 'बिकने की अनुमानित संभावना', prototypeEstimate: 'यह प्रोटोटाइप अनुमान है, गारंटी नहीं', useThisPrice: '₹{price}/किलो इस्तेमाल करें',

    whatShouldIPrepareFirst: 'ऑर्डर जांचें', orderSignal: 'पहले कौन सा ऑर्डर तैयार करूं?', stagePickupWindows: 'पिकअप समय देखा जा रहा है…', stageOrderValue: 'ऑर्डर की कीमत की तुलना हो रही है…', stageSharedRoutes: 'साझा रूट देखे जा रहे हैं…',
    prepareFirstHeadline: '{buyer} का {crop} ऑर्डर पहले तैयार करें।', why: 'वजह', pickupArrives: 'पिकअप कब आएगा', quantityLabel: 'मात्रा', payoutLabel: 'भुगतान', routeAdvantage: 'रूट का फायदा',
    routeShared: 'कल के साझा पिकअप का हिस्सा', routeSolo: 'इस ऑर्डर के लिए अलग पिकअप',
    priorityFirst: 'पहले', priorityNext: 'अगला', priorityLater: 'बाद में', openOrder: 'ऑर्डर खोलें',

    explainMyEarnings: 'जानें आपने ज़्यादा क्यों कमाया', earningsSignal: 'जानें आपने ज़्यादा क्यों कमाया', simpleMonth: 'आपका महीना, आसान शब्दों में', currentOpportunity: 'मौजूदा अवसर', demandStrongThreeDays: 'अगले 3 दिनों तक मांग मज़बूत रह सकती है।', stageReviewingOrders: 'आपके ऑर्डर देखे जा रहे हैं…', stageComparingMandi: 'मंडी कीमत से तुलना हो रही है…', stageBuildingStory: 'आपकी कमाई की कहानी तैयार हो रही है…',
    earnedMoreHeadline: 'स्थानीय मंडी की तुलना में KisanLink से सीधे बेचकर आपने इस महीने {amount} ज़्यादा कमाए।',
    bestPerformingCrop: 'सबसे अच्छा प्रदर्शन करने वाली फसल', averageGain: 'औसत फायदा', pendingPayment: 'बाकी भुगतान', pendingPaymentValue: '2 दिनों में मिलने की उम्मीद',
    earningsOpportunity: 'मौका', earningsOpportunityCopy: 'इस हफ़्ते {kg} किलो {crop} सूचीबद्ध करने से {min}–{max} और मिल सकते हैं।', seeCurrentDemand: 'मौजूदा मांग देखें',

    marketOutlook: 'बाज़ार का अनुमान', tomorrowFavourable: 'कल बाज़ार अनुकूल दिख रहा है', demandStrengthening: 'मांग मज़बूत हो रही है', priceOutlook: 'कीमत का अनुमान', whatFound: 'KisanLink ने क्या पाया', buyerDemandLabel: 'खरीदारों की मांग', nearbySupply: 'पास की सप्लाई', mandiArrivals: 'मंडी की आवक', stable: 'स्थिर', available: 'उपलब्ध', recommendedActionTitle: 'सुझाई गई कार्रवाई', todayLabel: 'आज',
    perKg: '/किलो', kg: 'किलो', tonnesUnit: 'टन',
  },
} as const

export type FarmerAiKey = keyof typeof copy.en

export function aiText(language: Language, key: FarmerAiKey, values: Record<string, string | number> = {}) {
  return Object.entries(values).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, String(value)), copy[language][key] as string)
}
