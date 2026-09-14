import { useLanguage } from '../contexts/LanguageContext'
import type { Language } from '../types'

/**
 * Curated farmer vocabulary.
 *
 * Neither column is a translation of the other. Both are written as a farmer would say the
 * thing out loud, which is why some entries diverge in structure rather than word-for-word
 * ("Waiting for you" / "आपको मिलना है", not "Pending payout" / "बाकी भुगतान").
 *
 * Rules this file follows, and the reason each one exists:
 *
 *  - No register-shifted Sanskritised vocabulary. `सूचीकरण`, `परिमाण`, `क्रेता`, `विक्रेता`,
 *    `बाज़ारस्थल`, `अर्जन` and `विवाद` are all technically correct and none of them are how
 *    a farmer in Sonipat describes selling a crop.
 *  - Familiar borrowed words stay borrowed. `kg`, `OTP`, `Pickup`, `ड्राफ्ट` and `KisanLink`
 *    are more understandable than any Hindi equivalent, so they are not translated.
 *  - Verbs are contextual, never generic. There is no `manage` key: the sheet says
 *    `दाम बदलें` and `कितना माल है बदलें`, because "manage" tells a farmer nothing.
 *  - Nothing farmer-facing exposes the machinery. No break-even, liquidity, corridor,
 *    utilisation, confidence score or "Market Maker" — that vocabulary lives in the
 *    analyst-facing modules and in `marketMakerEngine.ts`, not here.
 */
const copy = {
  en: {
    // --- Shell / navigation -------------------------------------------------
    navHome: 'Home', navFasal: 'My crops', navOrders: 'Orders', navPaisa: 'My money', navProfile: 'Profile',

    // --- Shared ------------------------------------------------------------
    perKg: '/kg', kg: 'kg', back: 'Back', next: 'Next', cancel: 'Cancel', close: 'Close',
    save: 'Save', change: 'Change', delete: 'Delete', confirm: 'Confirm', retry: 'Try again',
    loading: 'Loading…', today: 'Today', tomorrow: 'Tomorrow', yesterday: 'Yesterday',
    daysAgo: '{count} days ago', inDays: 'in {count} days', estimate: 'An estimate',
    callHelp: 'Need help? Call us', helpNumber: '1800 123 4567', somethingWrong: 'Something went wrong.',

    // --- Home --------------------------------------------------------------
    greeting: 'Namaste, {name} ji', todayHeading: 'What to do today', nothingToday: 'Nothing needs you right now.',
    nothingTodayHint: 'Your crops are listed and buyers can see them.',
    sellCrop: 'Sell a crop', myOrders: 'My orders', waitingForYou: 'Waiting for you',

    // --- Today's tasks -----------------------------------------------------
    taskNewOrder: 'New order · {qty} kg {crop}', taskNewOrderAction: 'Accept',
    taskPickupToday: 'Pickup today · {qty} kg {crop}', taskPickupTomorrow: 'Pickup tomorrow · {qty} kg {crop}',
    taskPaid: '{amount} has arrived', taskPaidHint: '{crop} · paid',
    taskReady: 'Keep {qty} kg {crop} ready', taskReadyAction: 'Mark ready',
    taskDeal: '{crop} can fetch {amount}/kg', taskDealHint: '{gain} more than the mandi',
    taskDriverHere: 'Driver has arrived · {crop}', taskDriverAction: 'Show OTP',

    // --- My crops ----------------------------------------------------------
    myCrops: 'My crops', sellNewCrop: 'Sell a new crop', speakInstead: 'Speak instead',
    noCrops: 'You have no crops listed yet.', noCropsHint: 'Add one and buyers nearby can see it.',
    kgLeft: '{qty} kg left', suggested: 'Suggested {price}', soldEarlier: 'Crops sold earlier',
    soldFor: 'Sold · {amount}', statusOnSale: 'On sale', statusDraft: 'Draft',
    statusPaused: 'Paused', statusSold: 'Sold', statusStopped: 'Not for sale',
    sellItFastOn: 'Selling fast', sellAtThisPrice: 'Sell at this price',
    publishNow: 'Sell', resumeSelling: 'Start selling again',

    // --- Crop sheet (progressive disclosure) -------------------------------
    cropOptions: 'What do you want to do?', changePrice: 'Change the price',
    changeQuantity: 'Change how much is left', sellItFast: 'Sell it fast',
    sellItFastHint: 'Drop the price so it sells before it spoils.',
    pauseSelling: 'Pause selling', stopSelling: 'Stop selling', makeCopy: 'Make a copy',
    deleteCrop: 'Delete this crop', deleteConfirm: 'Delete this crop? It cannot be brought back.',
    newPrice: 'New price per kg', howMuchLeft: 'How much is left (kg)',
    fastSaleOn: 'Now selling fast at {price}/kg', cropUpdated: 'Saved.',

    // --- Crop detail -------------------------------------------------------
    cropDetail: 'Crop details', left: 'Left', promised: 'Promised to buyers', mandiRate: 'Mandi rate',
    whatHappened: 'What happened', putOnSale: 'Put on sale', buyersLooked: '{views} buyers looked',
    buyersAsked: '{count} asked about it', orderCame: 'Order received · {qty} kg',
    quantityChanged: 'Quantity changed · {qty} kg left', helpedBy: 'Set up with help on call',

    // --- Sell flow ---------------------------------------------------------
    sellTitle: 'Sell a crop', stepCrop: 'Crop', stepQuantity: 'How much', stepPrice: 'Price',
    whatSelling: 'What are you selling?', speakIt: 'Say it out loud',
    speakItHint: 'Say "I have 250 kg tomatoes"', otherCrop: 'Another crop',
    otherCropName: 'Name of the crop', searchCrop: 'Find a crop',
    howMuch: 'How much do you have?', moreDetails: 'More details', moreDetailsHint: 'Not needed. Only if you want to add them',
    quality: 'Quality', harvestDate: 'Cut on', packing: 'Packing', howManyBoxes: 'How many boxes/sacks',
    weightEach: 'Weight of each (kg)', cropPhotos: 'Photos of the crop', photoNote: 'Photos are your record. The crop is checked again at pickup.',
    grownHow: 'How it was grown', anyNote: 'Anything to add',
    priceAndPickup: 'Price and pickup', findingPrice: 'Finding the right price for you…',
    youWillGet: 'You will get', moreThanMandi: '{amount} more than the mandi',
    priceFast: 'Sells fast', priceSuggested: 'Suggested', priceHigher: 'More money',
    priceOwn: 'Set my own price', howItMoves: 'How will it go?',
    priceAiReason: 'Based on today\'s mandi rate of ₹{mandi}/kg and buyers looking for {crop} nearby. Tap a price to use it.',
    priceAiReasonPlain: 'Based on today\'s mandi rate and nearby demand. Tap a price to use it.',
    kisanPickup: 'KisanLink picks it up', kisanPickupHint: 'Free from your farm',
    selfDelivery: 'I will take it myself', pickupDay: 'Pickup day', pickupTime: 'Pickup time',
    morning: 'Morning · 7–10 AM', afternoon: 'Afternoon · 1–4 PM', evening: 'Evening · 4–7 PM',
    sellNow: 'Sell', saveForLater: 'Save for later', savedForLater: 'Saved. Finish it from My crops.',
    onSaleNow: 'On sale. Buyers can see it now.', fillRequired: 'Please fill the crop, quantity and price.',
    conventional: 'Usual farming', organic: 'Organic', natural: 'Natural farming',
    crates: 'Crates', sacks: 'Sacks', baskets: 'Baskets', loose: 'Loose',

    // --- Better deal -------------------------------------------------------
    betterDeal: 'Better deal', betterDealFor: 'Better deal for {crop}',
    buyersWantIt: '{count} buyers want to buy right now', pickupReady: 'Pickup is available',
    yourKgInDeal: '{qty} kg of yours is in this deal',
    pickupNotReady: 'No vehicle yet. We will tell you', howPriceDecided: 'How was this price decided?',
    dealSold: 'Sold. The vehicle is on its way.', dealReady: 'Ready. Your crop can go.',
    dealForming: 'Almost ready.', dealBlocked: 'Wait. No vehicle yet.',
    dealMatched: '{qty} kg of yours is matched. Nothing to do, just wait for pickup.',
    dealSoldBody: '{qty} kg of yours is sold. Keep it ready for pickup.',
    dealFormingBody: 'More buyers are joining. We will tell you when it is ready.',
    dealBlockedBody: 'Buyers are ready. A vehicle is needed. We will tell you.',
    whyThisPrice: 'Why this price', mandiToday: 'Mandi rate today', mandiTodayHint: 'What the mandi pays for {crop}',
    buyersNearby: 'Buyers nearby', buyersNearbyHint: '{count} buyers are looking for {crop}',
    demandNearby: 'How much is wanted', demandNearbyHint: 'About {tonnes} tonnes needed near you',
    vehicleAvailable: 'Vehicle', vehicleAvailableHint: 'A vehicle is available for your farm',
    vehicleUnavailable: 'No vehicle is free right now', priceLastWeek: 'Price over the last week',
    priceNextDays: 'Next 3 days', priceRising: 'Price is going up', priceSteady: 'Price is steady',
    trendIndicative: 'Trend line is indicative; only today\'s point is the live mandi benchmark.',
    priceFalling: 'Price is easing', dealDisclaimer: 'This is an estimate from nearby demand and mandi rates, not a promise.',
    seeMyCrops: 'See my crops', seeMyOrder: 'See my order', giveMoreCrop: 'Give {qty} kg more',
    heldForDeal: '{qty} kg of your crop is held for this deal.', noDeal: 'No better deal is open right now.',
    noDealHint: 'We will tell you as soon as one opens for your crop.',

    // --- Behtar Sauda: the opportunities marketplace ---------------------------
    saudaTitle: 'Behtar Sauda', saudaPoweredBy: 'Powered by KisanLink Market Maker',
    saudaSubtitle: 'Better deals open for you right now',
    saudaTeaserCount: '{count} Behtar Sauda opportunities', saudaTeaserOne: '1 Behtar Sauda opportunity',
    saudaTeaserGain: 'Up to ₹{amount}/kg extra', saudaTeaserReady: '{count} ready to join',
    saudaTeaserHint: 'Buyers and trucks nearby are lining up for crops like yours',
    saudaTeaserCta: 'View opportunities',
    saudaNeeded: '{qty} kg needed', saudaEarn: 'You earn approx. {amount}',
    saudaVsNormal: '+{amount} vs normal sale', saudaSameAsNormal: 'Same as a normal sale, buyers already waiting',
    saudaBasedOnOwn: 'on {qty} kg of your crop', saudaBasedOnAll: 'if you supply all {qty} kg',
    saudaStatusReady: 'Ready', saudaStatusForming: 'Forming', saudaStatusDemand: 'High demand',
    saudaTruckNearby: 'Truck forming nearby', saudaTruckReadyShort: 'Truck ready',
    saudaYouGrow: 'You grow this', saudaNearYou: 'Near your farm',
    saudaFor: '{qty} kg {crop}', saudaReady: 'Better deal for {crop} is ready', saudaForming: 'A deal for {crop} is forming',
    saudaNormalPrice: 'Normal price', saudaDealPrice: 'Behtar Sauda',
    saudaGain: '+₹{amount}/kg', saudaExtra: 'About {amount} more on your {qty} kg',
    saudaView: 'View deal', saudaJoin: 'Join this deal', saudaListToJoin: 'List {crop} to join',
    saudaSellNormally: 'Sell normally instead',
    saudaJoinedToast: 'Joined. {crop} is now listed at {price}/kg.',
    saudaWhyHeading: 'Why this deal exists',
    saudaPooledSupply: 'Crop pooled nearby', saudaPooledSupplyHint: '{qty} kg from other farmers is already in this load',
    saudaPooledSupplyNone: 'Your crop would start the load',
    saudaTruck: 'Truck', saudaTruckReady: 'A vehicle is ready for this route', saudaTruckForming: 'A vehicle is being arranged',
    saudaDemand: 'Buyer demand', saudaDemandHint: '{count} buyers have already committed', saudaDemandNone: 'Buyers are still joining',
    saudaOffered: 'Offered price', saudaOfferedHint: '{deal}/kg against {normal}/kg for a normal listing',
    saudaNormalNote: 'A normal listing keeps your own price and sells to any buyer.',
    saudaGoesTo: 'Goes to {place}', saudaDelivery: 'Delivery {window}',
    saudaEmpty: 'No Behtar Sauda is open right now.', saudaEmptyHint: 'Sell normally. We will show deals here as buyers and trucks line up.',

    // --- Freshness (recommended selling window, not a safety claim) ----------
    freshFresh: 'Fresh', freshGood: 'Good', freshSellSoon: 'Sell soon', freshUrgent: 'Sell today', freshOver: 'Window over',
    freshDaysLeft: '{count} days left', freshOneDayLeft: '1 day left', freshSellToday: 'Best sold today',
    freshSellBy: 'Best sold by {date}', freshOverHint: 'Past the best selling window', freshApprox: 'approx.',
    freshHarvested: 'Cut {when}', freshWindowLabel: 'Selling window',
    freshRingLabel: '{crop}: {stage}, {left}',
    freshUrgentTask: 'Sell {crop} today', freshUrgentTaskHint: 'Its selling window ends today', freshUrgentTaskAction: 'Sell it fast',
    freshSoonTask: '{crop} · {count} days left to sell', freshSoonTaskOne: '{crop} · 1 day left to sell', freshSoonTaskHint: 'Check the better price before it gets late',

    // --- Home ---------------------------------------------------------------
    yourCrops: 'Your crops', seeAllCrops: 'See all', homeNoCrops: 'No crop on sale yet',
    homeNoCropsHint: 'Add one and buyers nearby can see it', addFirstCrop: 'Sell your first crop',
    homePickupLine: 'Pickup {when} · {qty} kg {crop}', homeOrdersLine: '{count} orders running',
    homeNoOrders: 'No orders running', seeOrders: 'See orders',

    // --- Market Maker (per crop) --------------------------------------------
    marketPrice: 'Best price', checkMarketPrice: 'Check the best price', checkMarketPriceHint: 'Buyers, mandi and pickup, in one look',
    marketFinding: 'Finding the right price for your crop…',
    marketStageBuyers: 'Checking buyers nearby…', marketStageMandi: 'Comparing the mandi rate…',
    marketStageFresh: 'Looking at how fresh it is…', marketStagePickup: 'Checking for a vehicle…',
    marketYouGet: 'You get', marketMandi: 'Mandi', marketBuyers: '{count} buyers ready',
    marketBuyersNone: 'Buyers are still joining', marketPickup: 'Vehicle available', marketPickupNone: 'No vehicle yet',
    marketExtraTotal: '{amount} more on your {qty} kg', marketSameAsMandi: 'Same as the mandi today',
    marketNoData: 'No better price is open for this crop yet.', marketNoDataHint: 'We will tell you as soon as one opens.',
    marketApplied: 'Price set to {price}/kg.', marketWhy: 'Why this price?',
    marketDisclaimer: 'An estimate from nearby demand and mandi rates, not a promise.',
    marketHeadlineGain: '{amount}/kg more, right now', marketHeadlineTruck: 'Our truck is ready',
    marketCoreMessage: 'You get {amount} more because buyers are already lined up and the truck is ready.',

    // --- AI overview (short, data-driven) -----------------------------------
    aiEyebrow: 'Kisan Intelligence',
    aiHomeQuestion: 'Which crop should I sell first today?', aiHomeAsk: 'Get the answer',
    aiHomeFresh: '{crop} is fresh and can fetch {price}/kg, {gain} above the mandi. {buyers} buyers are ready.',
    aiHomeSoon: '{crop} has {days} days of selling window left. {price}/kg is open now, {gain} above the mandi.',
    aiHomeSoonOne: '{crop} has one day of selling window left. {price}/kg is open now, {gain} above the mandi.',
    aiHomeUrgent: '{crop} should go today. Turn on fast selling so it moves before the window closes.',
    aiHomeQuiet: 'Prices are steady. Your crops are listed and buyers can see them.',
    aiCropFreshRising: '{crop} is fresh and the price is rising. Selling in the next {days} days should fetch the better rate.',
    aiCropFreshSteady: '{crop} is fresh. {buyers} buyers nearby want it and the price is steady, so this is a good time to sell.',
    aiCropSoon: '{crop} has {days} days left. Sell now at {price}/kg rather than waiting for the mandi to move.',
    aiCropSoonOne: '{crop} has one day left. Sell now at {price}/kg rather than waiting for the mandi to move.',
    aiCropUrgent: '{crop} is at the end of its window. Fast selling at a lower price beats not selling.',
    aiCropFalling: 'The {crop} price is easing. Selling now, while it is still fresh, is better than waiting.',
    aiDealWhy: '{count} buyers nearby have already committed, and a vehicle {vehicle}. {fresh}',
    aiDealWhyIntel: '{count} buyers nearby are looking for it, and a vehicle {vehicle}. {fresh}',
    aiDealVehicleYes: 'is ready for your farm', aiDealVehicleNo: 'is still being arranged',
    aiDealFreshOk: 'Your crop has {days} days of window, so the pickup fits.', aiDealFreshTight: 'Your crop should move within a day, so this deal fits well.',

    // --- Orders ------------------------------------------------------------
    ordersTitle: 'My orders', tabRunning: 'Running', tabDone: 'Done', tabCancelled: 'Cancelled',
    noOrders: 'No orders here yet.', buyer: 'Buyer', orderQty: '{qty} kg × {price}/kg',
    youGet: 'You get', accept: 'Accept', declineOrder: 'Say no', declineConfirm: 'Say no to this order?',
    markReady: 'It is ready', pickupInfo: 'Pickup details', showOtp: 'Show Pickup OTP',
    seePayment: 'See payment', orderSaved: 'Saved.',
    stNew: 'Waiting for you', stAccepted: 'You accepted', stPreparing: 'Getting ready',
    stPickupScheduled: 'Pickup fixed', stInTransit: 'Vehicle on the way', stDelivered: 'Delivered',
    stCancelled: 'Cancelled', paid: 'Money received', paymentPending: 'Money pending', paymentProcessing: 'Money on the way',
    otpTitle: 'Pickup OTP', otpHint: 'Tell this number to the driver when the crop is loaded.',
    otpNotYet: 'The OTP will show here when the driver is on the way.',
    driver: 'Driver', vehicle: 'Vehicle', pickupAddress: 'Pickup from', pickupWhen: 'When',
    orderProgress: 'Where it has reached', moneyBreakdown: 'Money details',
    totalPrice: 'Total price', transportCost: 'Transport cost', kisanlinkCost: 'KisanLink cost',
    mmPayoutNote: 'This is a better-deal order. The transport and KisanLink cost are paid by the buyers, so your price reaches you in full.',
    reportProblem: 'Report a problem', reportProblemHint: 'Tell us what went wrong and we will call you.',
    problemPlaceholder: 'For example: less quantity was taken, or the vehicle did not come',
    sendProblem: 'Send', problemSent: 'We have your complaint. Someone will call you.',
    rateBuyer: 'Rate this buyer', rateHint: 'How was this sale?', rateSent: 'Thank you.',
    rate1: 'Bad', rate3: 'Okay', rate5: 'Very good',

    // --- My money ----------------------------------------------------------
    paisaTitle: 'My money', youWillReceive: 'Waiting for you', nextPayment: 'Next: {crop} {amount} · within 2 working days',
    receivedTitle: 'Already received', nothingReceived: 'No money has come in yet.',
    earnedMoreThanMandi: 'You got {amount} more than the mandi', moreThanMandiHint: 'On everything you sold through KisanLink',
    whyMore: 'Why did I get more?', hideWhy: 'Hide',
    bestCrop: 'Best crop', averageExtra: 'Extra per kg', stillComing: 'Still coming',
    fullAccount: 'Full account', fullAccountHint: 'Every sale, in detail',
    gotPaid: 'Received', awaiting: 'Waiting',

    // --- Profile -----------------------------------------------------------
    profileTitle: 'My profile', aboutYou: 'About you', yourName: 'Your name', yourPhone: 'Phone number',
    appLanguage: 'Language', farmInfo: 'About the farm', farmName: 'Farm name', village: 'Village',
    district: 'District', state: 'State', farmSize: 'How big is the farm (acres)',
    mainCrops: 'Crops you grow', pickupAddressLabel: 'Where the vehicle comes',
    moneyGoesTo: 'Where your money arrives', payoutMethod: 'Paid into', accountNumber: 'Account number',
    upi: 'UPI', bankAccount: 'Bank account', checksDone: 'Checks done',
    farmerVerified: 'You are verified', farmVerified: 'Farm is verified', idVerified: 'ID: {status}',
    saveChanges: 'Save', profileSaved: 'Saved.', demoHeading: 'Demo',
    switchRole: 'See another role', logOut: 'Log out',
    locality: 'Area or locality',

    // --- Onboarding (after OTP) ---------------------------------------------
    onboardTitle: 'Set up your account', onboardStepYou: 'You', onboardStepLand: 'Land', onboardStepCrops: 'Crops',
    onboardAboutYou: 'Tell us about yourself', onboardSpeak: 'Fill by speaking', onboardSpeakHint: 'We ask one question at a time',
    fullName: 'Full name', detectedFromLocation: 'Filled from your location. Change it if it is wrong.',
    onboardFarmSize: 'How much land do you farm?',
    sizeUnder1: 'Less than 1 acre', size1to3: '1 to 3 acres', size3to5: '3 to 5 acres', size5to10: '5 to 10 acres', size10plus: 'More than 10 acres',
    onboardCrops: 'Which crops do you sell?', onboardCropsHint: 'Pick all that apply', addCrop: 'Add', selectedCrops: '{count} chosen',
    noCropMatch: 'No crop found. Add it below.',
    onboardDone: 'All set!', onboardDoneHint: 'Check once and go to your dashboard.', continueDashboard: 'Continue to dashboard',
    nameRequired: 'Please tell us your name', notFilled: 'Not filled', land: 'Land', crops: 'Crops', place: 'Place',
    editField: 'Edit {field}', speakField: 'Say {field}', done: 'Done', editCancel: 'Cancel',

    // --- Voice onboarding ----------------------------------------------------
    voiceQName: 'What is your full name?',
    voiceQVillage: 'Which village is your farm in?',
    voiceQLocality: 'Which area or locality is the farm in?',
    voiceQConfirmState: 'Is your state {state}?', voiceQConfirmDistrict: 'Is your district {district}?', voiceQConfirmHint: 'Say yes or no',
    voiceQDistrict: 'Which district?', voiceQState: 'Which state?',
    voiceQFarmSize: 'How much land do you farm?', voiceQFarmSizeHint: 'For example: about four acres',
    voiceQCrops: 'Which crops do you sell?', voiceQCropsHint: 'For example: tomato, onion and spinach',
    voiceAllDone: 'Wonderful, that is everything.',
    voiceAckOk: 'Okay', voiceAckGreat: 'Very good', voiceAckHello: 'Hello {name}', voiceAckUnknown: 'No problem, you can fill it later',
    voiceSpeaking: 'Listen', voiceListening: 'Listening', voiceProcessing: 'Understanding', voiceTapToSpeak: 'Tap and speak',
    voiceHeard: 'You said', voiceNotUnderstood: 'Could not understand. Please say it again.', voiceNothingHeard: 'Did not hear anything.',
    voiceSpeakAgain: 'Speak again', voiceTypeInstead: 'Type instead', voiceSkip: 'Skip', voiceExit: 'Fill by typing',
    voiceQuestionOf: '{current} of {total}', voiceUnavailable: 'Voice is not available here. You can type everything instead.',
  },

  hi: {
    // --- Shell / navigation -------------------------------------------------
    navHome: 'मुख्य', navFasal: 'मेरी फसल', navOrders: 'ऑर्डर', navPaisa: 'मेरा पैसा', navProfile: 'प्रोफ़ाइल',

    // --- Shared ------------------------------------------------------------
    perKg: '/किलो', kg: 'किलो', back: 'वापस', next: 'आगे', cancel: 'रहने दें', close: 'बंद करें',
    save: 'सहेजें', change: 'बदलें', delete: 'हटाएं', confirm: 'हां, पक्का', retry: 'फिर कोशिश करें',
    loading: 'खुल रहा है…', today: 'आज', tomorrow: 'कल', yesterday: 'कल',
    daysAgo: '{count} दिन पहले', inDays: '{count} दिन में', estimate: 'अनुमान है',
    callHelp: 'मदद चाहिए? कॉल करें', helpNumber: '1800 123 4567', somethingWrong: 'कुछ गड़बड़ हुई।',

    // --- Home --------------------------------------------------------------
    greeting: 'नमस्ते, {name} जी', todayHeading: 'आज क्या करना है', nothingToday: 'अभी कुछ ज़रूरी नहीं है।',
    nothingTodayHint: 'आपकी फसल बिक्री पर है और खरीदार उसे देख रहे हैं।',
    sellCrop: 'फसल बेचें', myOrders: 'मेरे ऑर्डर', waitingForYou: 'आपको मिलना है',

    // --- Today's tasks -----------------------------------------------------
    taskNewOrder: 'नया ऑर्डर · {qty} किलो {crop}', taskNewOrderAction: 'स्वीकार करें',
    taskPickupToday: 'आज पिकअप · {qty} किलो {crop}', taskPickupTomorrow: 'कल पिकअप · {qty} किलो {crop}',
    taskPaid: '{amount} आ गए', taskPaidHint: '{crop} · पैसा मिला',
    taskReady: '{qty} किलो {crop} तैयार रखें', taskReadyAction: 'तैयार है',
    taskDeal: '{crop} का {amount}/किलो मिल सकता है', taskDealHint: 'मंडी से {gain} ज़्यादा',
    taskDriverHere: 'ड्राइवर आ गया · {crop}', taskDriverAction: 'OTP दिखाएं',

    // --- My crops ----------------------------------------------------------
    myCrops: 'मेरी फसल', sellNewCrop: 'नई फसल बेचें', speakInstead: 'बोलकर बताएं',
    noCrops: 'अभी आपकी कोई फसल बिक्री पर नहीं है।', noCropsHint: 'फसल डालें, पास के खरीदार उसे देख पाएंगे।',
    kgLeft: '{qty} किलो बाकी', suggested: 'सुझाव {price}', soldEarlier: 'पहले बिकी फसल',
    soldFor: 'बिक गई · {amount}', statusOnSale: 'बिक्री पर', statusDraft: 'ड्राफ्ट',
    statusPaused: 'रुकी हुई', statusSold: 'बिक गई', statusStopped: 'बिक्री बंद',
    sellItFastOn: 'जल्दी बिक्री चालू', sellAtThisPrice: 'इस दाम पर बेचें',
    publishNow: 'बेचें', resumeSelling: 'फिर से चालू करें',

    // --- Crop sheet (progressive disclosure) -------------------------------
    cropOptions: 'क्या करना है?', changePrice: 'दाम बदलें',
    changeQuantity: 'कितना माल बचा है, बदलें', sellItFast: 'जल्दी बेचें',
    sellItFastHint: 'दाम थोड़ा कम करें ताकि खराब होने से पहले बिक जाए।',
    pauseSelling: 'बिक्री रोकें', stopSelling: 'बिक्री बंद करें', makeCopy: 'कॉपी बनाएं',
    deleteCrop: 'यह फसल हटाएं', deleteConfirm: 'यह फसल हटा दें? फिर वापस नहीं आएगी।',
    newPrice: 'नया दाम प्रति किलो', howMuchLeft: 'कितना माल बाकी है (किलो)',
    fastSaleOn: 'अब {price}/किलो पर जल्दी बिक्री चालू है', cropUpdated: 'हो गया।',

    // --- Crop detail -------------------------------------------------------
    cropDetail: 'फसल की जानकारी', left: 'बाकी', promised: 'खरीदारों को दी', mandiRate: 'मंडी भाव',
    whatHappened: 'क्या-क्या हुआ', putOnSale: 'बिक्री पर लगाई', buyersLooked: '{views} खरीदारों ने देखा',
    buyersAsked: '{count} ने पूछा', orderCame: 'ऑर्डर आया · {qty} किलो',
    quantityChanged: 'माल बदला · {qty} किलो बाकी', helpedBy: 'कॉल पर मदद से डाली गई',

    // --- Sell flow ---------------------------------------------------------
    sellTitle: 'फसल बेचें', stepCrop: 'फसल', stepQuantity: 'कितना माल', stepPrice: 'दाम',
    whatSelling: 'क्या बेचना है?', speakIt: 'बोलकर बताएं',
    speakItHint: 'बोलें: "मेरे पास 250 किलो टमाटर है"', otherCrop: 'और फसल',
    otherCropName: 'फसल का नाम', searchCrop: 'फसल ढूंढें',
    howMuch: 'कितना माल है?', moreDetails: 'और जानकारी', moreDetailsHint: 'ज़रूरी नहीं, मन हो तो भरें',
    quality: 'माल कैसा है', harvestDate: 'कब काटी', packing: 'पैकिंग', howManyBoxes: 'कितने क्रेट/बोरी',
    weightEach: 'एक का वज़न (किलो)', cropPhotos: 'फसल की फ़ोटो', photoNote: 'ये फ़ोटो आपका रिकॉर्ड हैं। पिकअप पर माल दोबारा देखा जाएगा।',
    grownHow: 'खेती कैसे की', anyNote: 'कुछ और बताना है',
    priceAndPickup: 'दाम और पिकअप', findingPrice: 'आपके लिए सही दाम ढूंढ रहे हैं…',
    youWillGet: 'आपको मिलेगा', moreThanMandi: 'मंडी से {amount} ज़्यादा',
    priceFast: 'जल्दी बिकेगा', priceSuggested: 'सुझाया दाम', priceHigher: 'ज़्यादा पैसा',
    priceOwn: 'अपना दाम डालें', howItMoves: 'माल कैसे जाएगा?',
    priceAiReason: 'आज के मंडी भाव ₹{mandi}/किलो और पास में {crop} ढूंढ रहे खरीदारों के हिसाब से। दाम चुनने के लिए दबाएं।',
    priceAiReasonPlain: 'आज के मंडी भाव और पास की मांग के हिसाब से। दाम चुनने के लिए दबाएं।',
    kisanPickup: 'KisanLink ले जाएगा', kisanPickupHint: 'आपके खेत से, मुफ़्त',
    selfDelivery: 'मैं खुद पहुंचाऊंगा', pickupDay: 'पिकअप किस दिन', pickupTime: 'पिकअप का समय',
    morning: 'सुबह · 7–10 बजे', afternoon: 'दोपहर · 1–4 बजे', evening: 'शाम · 4–7 बजे',
    sellNow: 'बेचें', saveForLater: 'बाद के लिए रखें', savedForLater: 'रख लिया। मेरी फसल से पूरा करें।',
    onSaleNow: 'बिक्री पर लग गई। खरीदार अब देख सकते हैं।', fillRequired: 'फसल, कितना माल और दाम भरें।',
    conventional: 'आम खेती', organic: 'जैविक', natural: 'प्राकृतिक खेती',
    crates: 'क्रेट', sacks: 'बोरी', baskets: 'टोकरी', loose: 'खुला',

    // --- Better deal -------------------------------------------------------
    betterDeal: 'बेहतर सौदा', betterDealFor: '{crop} का बेहतर सौदा',
    buyersWantIt: '{count} खरीदार अभी खरीदना चाहते हैं', pickupReady: 'Pickup उपलब्ध है',
    yourKgInDeal: 'आपकी {qty} किलो इसमें शामिल है',
    pickupNotReady: 'अभी गाड़ी नहीं है, हम आपको बताएंगे',
    howPriceDecided: 'यह दाम कैसे तय हुआ?',
    dealSold: 'बिक गया। गाड़ी आ रही है।', dealReady: 'तैयार है। फसल जा सकती है।',
    dealForming: 'लगभग तैयार है।', dealBlocked: 'रुकें। अभी गाड़ी नहीं है।',
    dealMatched: 'आपकी {qty} किलो का सौदा हो गया। कुछ नहीं करना, बस पिकअप का इंतज़ार करें।',
    dealSoldBody: 'आपकी {qty} किलो बिक गई। पिकअप के लिए तैयार रखें।',
    dealFormingBody: 'और खरीदार जुड़ रहे हैं। तैयार होते ही हम बताएंगे।',
    dealBlockedBody: 'खरीदार तैयार हैं। गाड़ी चाहिए। हम आपको बताएंगे।',
    whyThisPrice: 'दाम क्यों इतना', mandiToday: 'आज का मंडी भाव', mandiTodayHint: 'मंडी में {crop} का यही भाव है',
    buyersNearby: 'पास के खरीदार', buyersNearbyHint: '{count} खरीदार {crop} ढूंढ रहे हैं',
    demandNearby: 'कितना माल चाहिए', demandNearbyHint: 'आपके पास करीब {tonnes} टन की ज़रूरत है',
    vehicleAvailable: 'गाड़ी', vehicleAvailableHint: 'आपके खेत के लिए गाड़ी उपलब्ध है',
    vehicleUnavailable: 'अभी कोई गाड़ी खाली नहीं है', priceLastWeek: 'पिछले हफ़्ते का भाव',
    priceNextDays: 'अगले 3 दिन', priceRising: 'भाव बढ़ रहा है', priceSteady: 'भाव टिका हुआ है',
    trendIndicative: 'रुझान रेखा सांकेतिक है; केवल आज का बिंदु लाइव मंडी भाव है।',
    priceFalling: 'भाव थोड़ा नरम है', dealDisclaimer: 'यह पास की मांग और मंडी भाव से लगाया अनुमान है, पक्का वादा नहीं।',
    seeMyCrops: 'मेरी फसल देखें', seeMyOrder: 'मेरा ऑर्डर देखें', giveMoreCrop: '{qty} किलो और दें',
    heldForDeal: 'आपकी {qty} किलो फसल इस सौदे के लिए रखी है।', noDeal: 'अभी कोई बेहतर सौदा खुला नहीं है।',
    noDealHint: 'आपकी फसल के लिए सौदा खुलते ही हम बता देंगे।',

    // --- Behtar Sauda: the opportunities marketplace ---------------------------
    saudaTitle: 'बेहतर सौदा', saudaPoweredBy: 'KisanLink Market Maker से',
    saudaSubtitle: 'अभी आपके लिए खुले बेहतर सौदे',
    saudaTeaserCount: '{count} बेहतर सौदे खुले हैं', saudaTeaserOne: '1 बेहतर सौदा खुला है',
    saudaTeaserGain: '₹{amount}/किलो तक ज़्यादा', saudaTeaserReady: '{count} अभी जुड़ने को तैयार',
    saudaTeaserHint: 'पास के खरीदार और गाड़ियां आपकी जैसी फसल के लिए तैयार हो रही हैं',
    saudaTeaserCta: 'सौदे देखें',
    saudaNeeded: '{qty} किलो चाहिए', saudaEarn: 'आपको लगभग {amount} मिलेंगे',
    saudaVsNormal: 'सामान्य बिक्री से {amount} ज़्यादा', saudaSameAsNormal: 'सामान्य दाम जितना, पर खरीदार पहले से तैयार',
    saudaBasedOnOwn: 'आपकी {qty} किलो फसल पर', saudaBasedOnAll: 'अगर आप पूरे {qty} किलो दें',
    saudaStatusReady: 'तैयार', saudaStatusForming: 'बन रहा है', saudaStatusDemand: 'ज़्यादा मांग',
    saudaTruckNearby: 'पास में ट्रक भर रहा है', saudaTruckReadyShort: 'ट्रक तैयार',
    saudaYouGrow: 'आप यह उगाते हैं', saudaNearYou: 'आपके खेत के पास',
    saudaFor: '{qty} किलो {crop}', saudaReady: '{crop} का बेहतर सौदा तैयार है', saudaForming: '{crop} का सौदा बन रहा है',
    saudaNormalPrice: 'सामान्य दाम', saudaDealPrice: 'बेहतर सौदा',
    saudaGain: '+₹{amount}/किलो', saudaExtra: 'आपके {qty} किलो पर लगभग {amount} ज़्यादा',
    saudaView: 'सौदा देखें', saudaJoin: 'इस सौदे में जुड़ें', saudaListToJoin: 'जुड़ने के लिए {crop} लिस्ट करें',
    saudaSellNormally: 'सामान्य तरीके से बेचें',
    saudaJoinedToast: 'जुड़ गए। {crop} अब {price}/किलो पर लिस्ट है।',
    saudaWhyHeading: 'यह सौदा क्यों बना',
    saudaPooledSupply: 'पास की फसल जमा', saudaPooledSupplyHint: 'दूसरे किसानों की {qty} किलो इस लोड में पहले से है',
    saudaPooledSupplyNone: 'आपकी फसल से यह लोड शुरू होगा',
    saudaTruck: 'ट्रक', saudaTruckReady: 'इस रास्ते के लिए गाड़ी तैयार है', saudaTruckForming: 'गाड़ी लगाई जा रही है',
    saudaDemand: 'खरीदारों की मांग', saudaDemandHint: '{count} खरीदार पहले ही हामी भर चुके हैं', saudaDemandNone: 'खरीदार अभी जुड़ रहे हैं',
    saudaOffered: 'दिया जा रहा दाम', saudaOfferedHint: 'सामान्य लिस्टिंग के {normal}/किलो के मुकाबले {deal}/किलो',
    saudaNormalNote: 'सामान्य लिस्टिंग में आपका अपना दाम रहता है और कोई भी खरीदार खरीद सकता है।',
    saudaGoesTo: '{place} जाएगा', saudaDelivery: 'डिलीवरी {window}',
    saudaEmpty: 'अभी कोई बेहतर सौदा खुला नहीं है।', saudaEmptyHint: 'सामान्य तरीके से बेचें। खरीदार और गाड़ी जुटते ही सौदे यहां दिखेंगे।',

    // --- Freshness ----------------------------------------------------------
    freshFresh: 'ताज़ा', freshGood: 'ठीक है', freshSellSoon: 'जल्दी बेचें', freshUrgent: 'आज बेचें', freshOver: 'समय निकल गया',
    freshDaysLeft: '{count} दिन बाकी', freshOneDayLeft: '1 दिन बाकी', freshSellToday: 'आज बेचना बेहतर है',
    freshSellBy: '{date} तक बेचना बेहतर है', freshOverHint: 'बेचने का सही समय निकल गया', freshApprox: 'लगभग',
    freshHarvested: '{when} काटी', freshWindowLabel: 'बेचने का समय',
    freshRingLabel: '{crop}: {stage}, {left}',
    freshUrgentTask: '{crop} आज बेच दें', freshUrgentTaskHint: 'बेचने का समय आज खत्म हो रहा है', freshUrgentTaskAction: 'जल्दी बेचें',
    freshSoonTask: '{crop} · बेचने के {count} दिन बाकी', freshSoonTaskOne: '{crop} · बेचने का 1 दिन बाकी', freshSoonTaskHint: 'देर होने से पहले बेहतर दाम देख लें',

    // --- Home ---------------------------------------------------------------
    yourCrops: 'आपकी फसल', seeAllCrops: 'सब देखें', homeNoCrops: 'अभी कोई फसल बिक्री पर नहीं',
    homeNoCropsHint: 'फसल डालें, पास के खरीदार देख पाएंगे', addFirstCrop: 'पहली फसल बेचें',
    homePickupLine: 'पिकअप {when} · {qty} किलो {crop}', homeOrdersLine: '{count} ऑर्डर चल रहे हैं',
    homeNoOrders: 'कोई ऑर्डर चालू नहीं', seeOrders: 'ऑर्डर देखें',

    // --- Market Maker (per crop) --------------------------------------------
    marketPrice: 'सही दाम', checkMarketPrice: 'सही दाम देखें', checkMarketPriceHint: 'खरीदार, मंडी और गाड़ी, एक नज़र में',
    marketFinding: 'आपकी फसल के लिए सही दाम ढूंढ रहे हैं…',
    marketStageBuyers: 'पास के खरीदार देख रहे हैं…', marketStageMandi: 'मंडी भाव से मिला रहे हैं…',
    marketStageFresh: 'फसल कितनी ताज़ा है, देख रहे हैं…', marketStagePickup: 'गाड़ी है या नहीं, देख रहे हैं…',
    marketYouGet: 'आपको मिलेगा', marketMandi: 'मंडी', marketBuyers: '{count} खरीदार तैयार',
    marketBuyersNone: 'खरीदार अभी जुड़ रहे हैं', marketPickup: 'गाड़ी उपलब्ध', marketPickupNone: 'अभी गाड़ी नहीं',
    marketExtraTotal: 'आपके {qty} किलो पर {amount} ज़्यादा', marketSameAsMandi: 'आज मंडी जितना ही',
    marketNoData: 'इस फसल के लिए अभी कोई बेहतर दाम खुला नहीं है।', marketNoDataHint: 'खुलते ही हम बता देंगे।',
    marketApplied: 'दाम {price}/किलो कर दिया।', marketWhy: 'यह दाम क्यों?',
    marketDisclaimer: 'पास की मांग और मंडी भाव से लगाया अनुमान, पक्का वादा नहीं।',
    marketHeadlineGain: 'अभी {amount}/किलो ज़्यादा', marketHeadlineTruck: 'हमारा ट्रक तैयार है',
    marketCoreMessage: 'आपको {amount} ज़्यादा मिल रहा है क्योंकि खरीदार पहले से तैयार हैं और ट्रक भी तैयार है।',

    // --- AI overview --------------------------------------------------------
    aiEyebrow: 'किसान इंटेलिजेंस',
    aiHomeQuestion: 'आज मुझे कौन-सी फसल पहले बेचनी चाहिए?', aiHomeAsk: 'जवाब पाएं',
    aiHomeFresh: '{crop} अभी ताज़ा है और {price}/किलो मिल सकता है, मंडी से {gain} ज़्यादा। {buyers} खरीदार तैयार हैं।',
    aiHomeSoon: '{crop} बेचने के {days} दिन बाकी हैं। अभी {price}/किलो खुला है, मंडी से {gain} ज़्यादा।',
    aiHomeSoonOne: '{crop} बेचने का बस 1 दिन बाकी है। अभी {price}/किलो खुला है, मंडी से {gain} ज़्यादा।',
    aiHomeUrgent: '{crop} आज ही बेच दें। जल्दी बिक्री चालू करें ताकि समय निकलने से पहले बिक जाए।',
    aiHomeQuiet: 'भाव टिका हुआ है। आपकी फसल बिक्री पर है और खरीदार देख रहे हैं।',
    aiCropFreshRising: '{crop} अभी ताज़ा है और भाव चढ़ रहा है। अगले {days} दिनों में बेचने पर बेहतर दाम मिलने की संभावना है।',
    aiCropFreshSteady: '{crop} अभी ताज़ा है। पास के {buyers} खरीदार चाहते हैं और भाव टिका है, बेचने का अच्छा समय है।',
    aiCropSoon: '{crop} के {days} दिन बाकी हैं। मंडी के चढ़ने का इंतज़ार करने से बेहतर है अभी {price}/किलो पर बेच दें।',
    aiCropSoonOne: '{crop} का बस 1 दिन बाकी है। मंडी के चढ़ने का इंतज़ार करने से बेहतर है अभी {price}/किलो पर बेच दें।',
    aiCropUrgent: '{crop} का समय खत्म होने को है। थोड़े कम दाम पर जल्दी बेचना, न बिकने से बेहतर है।',
    aiCropFalling: '{crop} का भाव नरम हो रहा है। ताज़ा रहते अभी बेचना, इंतज़ार से बेहतर है।',
    aiDealWhy: 'पास के {count} खरीदार पहले ही हामी भर चुके हैं, और गाड़ी {vehicle}। {fresh}',
    aiDealWhyIntel: 'पास के {count} खरीदार इसे ढूंढ रहे हैं, और गाड़ी {vehicle}। {fresh}',
    aiDealVehicleYes: 'आपके खेत के लिए तैयार है', aiDealVehicleNo: 'अभी लगाई जा रही है',
    aiDealFreshOk: 'आपकी फसल के {days} दिन बाकी हैं, तो पिकअप ठीक बैठता है।', aiDealFreshTight: 'आपकी फसल एक दिन में निकलनी चाहिए, तो यह सौदा सही बैठता है।',

    // --- Orders ------------------------------------------------------------
    ordersTitle: 'मेरे ऑर्डर', tabRunning: 'चालू', tabDone: 'पूरे हुए', tabCancelled: 'रद्द',
    noOrders: 'यहां अभी कोई ऑर्डर नहीं है।', buyer: 'खरीदार', orderQty: '{qty} किलो × {price}/किलो',
    youGet: 'आपको मिलेगा', accept: 'स्वीकार करें', declineOrder: 'मना करें', declineConfirm: 'इस ऑर्डर से मना कर दें?',
    markReady: 'तैयार है', pickupInfo: 'पिकअप की जानकारी', showOtp: 'Pickup OTP दिखाएं',
    seePayment: 'पेमेंट देखें', orderSaved: 'हो गया।',
    stNew: 'आपका जवाब चाहिए', stAccepted: 'आपने स्वीकार किया', stPreparing: 'तैयारी चल रही है',
    stPickupScheduled: 'पिकअप तय है', stInTransit: 'गाड़ी रास्ते में', stDelivered: 'पहुंच गया',
    stCancelled: 'रद्द', paid: 'पैसा मिल गया', paymentPending: 'पैसा बाकी', paymentProcessing: 'पैसा रास्ते में',
    otpTitle: 'Pickup OTP', otpHint: 'माल गाड़ी में चढ़ जाए, तब यह नंबर ड्राइवर को बताएं।',
    otpNotYet: 'ड्राइवर चलने पर OTP यहीं दिख जाएगा।',
    driver: 'ड्राइवर', vehicle: 'गाड़ी', pickupAddress: 'कहां से', pickupWhen: 'कब',
    orderProgress: 'कहां तक पहुंचा', moneyBreakdown: 'पैसे का हिसाब',
    totalPrice: 'कुल दाम', transportCost: 'गाड़ी का खर्च', kisanlinkCost: 'KisanLink का खर्च',
    mmPayoutNote: 'यह बेहतर सौदे का ऑर्डर है। गाड़ी और KisanLink का खर्च खरीदार देते हैं, इसलिए आपका पूरा दाम आपको मिलता है।',
    reportProblem: 'समस्या बताएं', reportProblemHint: 'क्या गड़बड़ हुई बताएं, हम आपको कॉल करेंगे।',
    problemPlaceholder: 'जैसे: माल कम तौला गया, या गाड़ी नहीं आई',
    sendProblem: 'भेजें', problemSent: 'आपकी बात दर्ज हो गई। कोई आपको कॉल करेगा।',
    rateBuyer: 'खरीदार को रेटिंग दें', rateHint: 'यह सौदा कैसा रहा?', rateSent: 'धन्यवाद।',
    rate1: 'खराब', rate3: 'ठीक', rate5: 'बहुत अच्छा',

    // --- My money ----------------------------------------------------------
    paisaTitle: 'मेरा पैसा', youWillReceive: 'आपको मिलना है', nextPayment: 'अगला: {crop} {amount} · 2 काम के दिनों में',
    receivedTitle: 'मिल चुका', nothingReceived: 'अभी कोई पैसा नहीं आया है।',
    earnedMoreThanMandi: 'मंडी से {amount} ज़्यादा मिला', moreThanMandiHint: 'KisanLink से बेची पूरी फसल पर',
    whyMore: 'ज़्यादा क्यों मिला?', hideWhy: 'छुपाएं',
    bestCrop: 'सबसे अच्छी फसल', averageExtra: 'हर किलो पर ज़्यादा', stillComing: 'अभी आना बाकी',
    fullAccount: 'पूरा हिसाब', fullAccountHint: 'हर बिक्री का ब्योरा',
    gotPaid: 'मिल गया', awaiting: 'बाकी',

    // --- Profile -----------------------------------------------------------
    profileTitle: 'मेरी प्रोफ़ाइल', aboutYou: 'आपके बारे में', yourName: 'आपका नाम', yourPhone: 'फ़ोन नंबर',
    appLanguage: 'भाषा', farmInfo: 'खेत के बारे में', farmName: 'खेत का नाम', village: 'गांव',
    district: 'ज़िला', state: 'राज्य', farmSize: 'खेत कितना बड़ा (एकड़)',
    mainCrops: 'कौन सी फसल उगाते हैं', pickupAddressLabel: 'गाड़ी कहां आएगी',
    moneyGoesTo: 'पैसा कहां आए', payoutMethod: 'पैसा किसमें', accountNumber: 'खाता नंबर',
    upi: 'UPI', bankAccount: 'बैंक खाता', checksDone: 'जांच पूरी',
    farmerVerified: 'आप सत्यापित हैं', farmVerified: 'खेत सत्यापित है', idVerified: 'पहचान: {status}',
    saveChanges: 'सहेजें', profileSaved: 'सहेज लिया।', demoHeading: 'डेमो',
    switchRole: 'दूसरी भूमिका देखें', logOut: 'लॉग आउट',
    locality: 'इलाका या मोहल्ला',

    // --- Onboarding (after OTP) ---------------------------------------------
    onboardTitle: 'अपना खाता बनाएं', onboardStepYou: 'आप', onboardStepLand: 'ज़मीन', onboardStepCrops: 'फसल',
    onboardAboutYou: 'अपने बारे में बताएं', onboardSpeak: 'बोलकर भरें', onboardSpeakHint: 'हम एक-एक सवाल पूछेंगे',
    fullName: 'पूरा नाम', detectedFromLocation: 'आपकी लोकेशन से भरा गया। गलत हो तो बदल दें।',
    onboardFarmSize: 'आपके पास कितनी ज़मीन है?',
    sizeUnder1: '1 एकड़ से कम', size1to3: '1 से 3 एकड़', size3to5: '3 से 5 एकड़', size5to10: '5 से 10 एकड़', size10plus: '10 एकड़ से ज़्यादा',
    onboardCrops: 'आप कौन सी फसलें बेचते हैं?', onboardCropsHint: 'जितनी हों, सब चुनें', addCrop: 'जोड़ें', selectedCrops: '{count} चुनी',
    noCropMatch: 'यह फसल नहीं मिली। नीचे जोड़ें।',
    onboardDone: 'सब तैयार है!', onboardDoneHint: 'एक बार देख लें और अपने डैशबोर्ड पर चलें।', continueDashboard: 'डैशबोर्ड पर चलें',
    nameRequired: 'कृपया अपना नाम बताएं', notFilled: 'नहीं भरा', land: 'ज़मीन', crops: 'फसल', place: 'जगह',
    editField: '{field} बदलें', speakField: '{field} बोलें', done: 'हो गया', editCancel: 'रद्द करें',

    // --- Voice onboarding ----------------------------------------------------
    voiceQName: 'आपका पूरा नाम क्या है?',
    voiceQVillage: 'आपका गाँव कौन सा है?',
    voiceQLocality: 'खेत किस इलाके या मोहल्ले में है?',
    voiceQConfirmState: 'क्या आपका राज्य {state} है?', voiceQConfirmDistrict: 'क्या आपका ज़िला {district} है?', voiceQConfirmHint: 'हाँ या नहीं बोलें',
    voiceQDistrict: 'आपका ज़िला कौन सा है?', voiceQState: 'आपका राज्य कौन सा है?',
    voiceQFarmSize: 'आपके पास कितनी ज़मीन है?', voiceQFarmSizeHint: 'जैसे: करीब चार एकड़',
    voiceQCrops: 'आप कौन सी फसलें बेचते हैं?', voiceQCropsHint: 'जैसे: टमाटर, प्याज़ और पालक',
    voiceAllDone: 'बहुत बढ़िया, सब भर गया।',
    voiceAckOk: 'ठीक है', voiceAckGreat: 'बहुत बढ़िया', voiceAckHello: 'नमस्ते {name}', voiceAckUnknown: 'कोई बात नहीं, बाद में भर लेना',
    voiceSpeaking: 'सुनिए', voiceListening: 'सुन रहा हूँ', voiceProcessing: 'समझ रहा हूँ', voiceTapToSpeak: 'दबाएं और बोलें',
    voiceHeard: 'आपने कहा', voiceNotUnderstood: 'समझ नहीं आया। फिर से बोलें।', voiceNothingHeard: 'कुछ सुनाई नहीं दिया।',
    voiceSpeakAgain: 'फिर से बोलें', voiceTypeInstead: 'टाइप करें', voiceSkip: 'छोड़ें', voiceExit: 'टाइप करके भरें',
    voiceQuestionOf: '{total} में से {current}', voiceUnavailable: 'यहां आवाज़ काम नहीं कर रही। आप सब कुछ टाइप कर सकते हैं।',
  },
} as const

export type FarmerKey = keyof typeof copy.en

export function farmerText(language: Language, key: FarmerKey, values: Record<string, string | number> = {}) {
  const text = copy[language][key] as string
  return Object.entries(values).reduce((out, [name, value]) => out.replaceAll(`{${name}}`, String(value)), text)
}

/**
 * Crop names the prototype knows in both scripts. Records normally carry both sides, but a
 * listing that round-tripped through the backend, a voice draft or an older snapshot can end
 * up with the same script on both sides ("बेबी पालक" as `crop`), which then leaks Hindi into
 * an English screen. This table lets `cropName` recover the right script for those.
 */
const CROP_NAMES: [en: string, hi: string][] = [
  ['Baby Spinach', 'बेबी पालक'], ['Spinach', 'पालक'],
  ['Fresh Tomatoes', 'ताज़े टमाटर'], ['Tomatoes', 'टमाटर'], ['Tomato', 'टमाटर'],
  ['New Potatoes', 'नए आलू'], ['Potatoes', 'आलू'], ['Potato', 'आलू'],
  ['Red Onion', 'लाल प्याज़'], ['Red Onions', 'लाल प्याज़'], ['Onion', 'प्याज़'],
  ['Sharbati Wheat', 'शरबती गेहूं'], ['Wheat', 'गेहूं'],
  ['Sweet Carrots', 'मीठी गाजर'], ['Carrots', 'गाजर'], ['Carrot', 'गाजर'],
  ['Green Capsicum', 'हरी शिमला मिर्च'], ['Capsicum', 'शिमला मिर्च'],
  ['Crisp Cucumbers', 'कुरकुरे खीरे'], ['Cucumbers', 'खीरा'], ['Cucumber', 'खीरा'],
  ['Snow Cauliflower', 'सफेद फूलगोभी'], ['Cauliflower', 'फूलगोभी'],
  ['Basmati Rice', 'बासमती चावल'], ['Rice', 'चावल'],
  ['Himachali Apples', 'हिमाचली सेब'], ['Apples', 'सेब'], ['Apple', 'सेब'],
  ['Yellow Mustard', 'पीली सरसों'], ['Mustard', 'सरसों'],
]
const DEVANAGARI = /[\u0900-\u097F]/
const inScript = (language: Language, value: string) => (language === 'hi' ? DEVANAGARI.test(value) : !DEVANAGARI.test(value))

/**
 * A crop name in the selected language, never a mix. Prefers the matching side of the record,
 * falls back to the other side when that one is in the right script, then to the table above.
 */
export function cropName(language: Language, en: string, hi?: string): string {
  const preferred = language === 'hi' ? (hi || en) : en
  const other = language === 'hi' ? en : hi
  if (!preferred) return other ?? ''
  if (inScript(language, preferred)) return preferred
  if (other && inScript(language, other)) return other
  const needle = preferred.trim().toLowerCase()
  const row = CROP_NAMES.find(([e, h]) => (language === 'hi' ? e.toLowerCase() === needle : h === preferred.trim()))
  return row ? (language === 'hi' ? row[1] : row[0]) : preferred
}

/** The single accessor every farmer screen uses. `f` is the curated dictionary above. */
export function useFarmerText() {
  const { language, setLanguage } = useLanguage()
  const f = (key: FarmerKey, values?: Record<string, string | number>) => farmerText(language, key, values)
  /** Picks the right side of an already-bilingual data field (crop names, farm names). */
  const pick = (en: string, hi?: string) => cropName(language, en, hi)
  return { language, setLanguage, f, pick }
}

/** ₹ formatting is identical in both languages — Indian digit grouping, no decimals. */
export const money = (value: number) => `₹${Math.round(value).toLocaleString('en-IN')}`

/**
 * Pickup windows are stored as English data ("Evening · 6–7 PM") because logistics, bulk and
 * consumer all read the same records. On a Hindi farmer screen that is the one place raw
 * system data used to surface untranslated, so the fixed vocabulary is swapped here.
 * Times themselves stay as digits — those read identically in both languages.
 */
export function timeWindow(language: Language, window: string): string {
  if (language !== 'hi' || !window) return window
  return window
    .replace(/Morning/i, 'सुबह')
    .replace(/Afternoon/i, 'दोपहर')
    .replace(/Evening/i, 'शाम')
    .replace(/Night/i, 'रात')
    .replace(/\s?(AM|PM)/gi, ' बजे')
}

/** A day expressed the way a farmer reads it, not as a date string. */
export function relativeDay(language: Language, isoDate: string, daysFromToday: number): string {
  if (daysFromToday === 0) return farmerText(language, 'today')
  if (daysFromToday === 1) return farmerText(language, 'tomorrow')
  if (daysFromToday === -1) return farmerText(language, 'yesterday')
  if (daysFromToday < 0) return farmerText(language, 'daysAgo', { count: Math.abs(daysFromToday) })
  if (daysFromToday <= 7) return farmerText(language, 'inDays', { count: daysFromToday })
  const date = new Date(`${isoDate}T00:00:00`)
  if (!Number.isFinite(date.getTime())) return isoDate
  return date.toLocaleDateString(language === 'hi' ? 'hi-IN' : 'en-IN', { day: 'numeric', month: 'short' })
}
