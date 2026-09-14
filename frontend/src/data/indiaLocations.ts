/**
 * Canonical Indian states, union territories and districts, for onboarding.
 *
 * Each entry is one compact string: `Canonical English|alias|alias...`. Aliases are the
 * spellings, scripts, old names and nicknames a farmer actually says ("Gurgaon", "Dilli",
 * "UP"); the first Devanagari alias doubles as the Hindi display name. Everything a state
 * or district is resolved against lives here, so a spoken answer never lands in the
 * profile as arbitrary text when a canonical name exists.
 *
 * Districts are listed for the states the demo corridor and the Hindi-speaking belt cover.
 * Elsewhere the list is empty on purpose: the cleaned spoken name is kept, editable, rather
 * than being guessed against a list this file does not carry.
 */
export interface PlaceOption {
  en: string
  hi?: string
  aliases: string[]
}

const DEVANAGARI = /[\u0900-\u097F]/

const parse = (row: string): PlaceOption => {
  const [en, ...aliases] = row.split('|').map((part) => part.trim()).filter(Boolean)
  return { en, hi: aliases.find((alias) => DEVANAGARI.test(alias)), aliases }
}

const STATE_ROWS = [
  'Andhra Pradesh|आंध्र प्रदेश|andhra|ap',
  'Arunachal Pradesh|अरुणाचल प्रदेश|arunachal',
  'Assam|असम|आसाम',
  'Bihar|बिहार',
  'Chhattisgarh|छत्तीसगढ़|chattisgarh|cg',
  'Goa|गोवा',
  'Gujarat|गुजरात',
  'Haryana|हरियाणा|हरयाणा|hariyana|hariyaana|haryaana',
  'Himachal Pradesh|हिमाचल प्रदेश|himachal|हिमाचल|hp',
  'Jharkhand|झारखंड|झारखण्ड',
  'Karnataka|कर्नाटक|karnatak',
  'Kerala|केरल|keral',
  'Madhya Pradesh|मध्य प्रदेश|mp|एमपी|madhyapradesh',
  'Maharashtra|महाराष्ट्र|maharastra',
  'Manipur|मणिपुर',
  'Meghalaya|मेघालय',
  'Mizoram|मिज़ोरम|मिजोरम',
  'Nagaland|नागालैंड',
  'Odisha|ओडिशा|orissa|उड़ीसा|उड़ीसा',
  'Punjab|पंजाब|panjab',
  'Rajasthan|राजस्थान|rajsthan',
  'Sikkim|सिक्किम',
  'Tamil Nadu|तमिलनाडु|tamilnadu|tn',
  'Telangana|तेलंगाना',
  'Tripura|त्रिपुरा',
  'Uttar Pradesh|उत्तर प्रदेश|up|यूपी|uttarpradesh|u p',
  'Uttarakhand|उत्तराखंड|उत्तराखण्ड|uttaranchal|uk',
  'West Bengal|पश्चिम बंगाल|bengal|बंगाल|wb',
  'Andaman and Nicobar Islands|अंडमान और निकोबार|andaman|अंडमान',
  'Chandigarh|चंडीगढ़|चण्डीगढ़',
  'Dadra and Nagar Haveli and Daman and Diu|दादरा और नगर हवेली और दमन और दीव|daman|diu|dadra',
  'Delhi|दिल्ली|dilli|new delhi|नई दिल्ली|nct delhi|delhi ncr|ncr|ncr delhi|nct',
  'Jammu and Kashmir|जम्मू और कश्मीर|जम्मू कश्मीर|jammu|kashmir|कश्मीर|j&k|jk',
  'Ladakh|लद्दाख|लेह',
  'Lakshadweep|लक्षद्वीप',
  'Puducherry|पुडुचेरी|pondicherry|पांडिचेरी',
]

const DISTRICT_ROWS: Record<string, string[]> = {
  Delhi: [
    'Central Delhi|मध्य दिल्ली|central',
    'East Delhi|पूर्वी दिल्ली|east|purvi delhi',
    'New Delhi|नई दिल्ली|nayi dilli',
    'North Delhi|उत्तरी दिल्ली|north|uttari delhi',
    'North East Delhi|उत्तर पूर्वी दिल्ली|north east',
    'North West Delhi|उत्तर पश्चिमी दिल्ली|north west',
    'Shahdara|शाहदरा',
    'South Delhi|दक्षिणी दिल्ली|south|dakshini delhi',
    'South East Delhi|दक्षिण पूर्वी दिल्ली|south east',
    'South West Delhi|दक्षिण पश्चिमी दिल्ली|south west|dwarka|द्वारका|najafgarh|नजफगढ़',
    'West Delhi|पश्चिमी दिल्ली|west|paschimi delhi|pashchimi delhi',
  ],
  Haryana: [
    'Ambala|अंबाला|अम्बाला',
    'Bhiwani|भिवानी',
    'Charkhi Dadri|चरखी दादरी|dadri',
    'Faridabad|फरीदाबाद|फ़रीदाबाद',
    'Fatehabad|फतेहाबाद',
    'Gurugram|गुरुग्राम|gurgaon|गुड़गांव|गुडगांव|gudgaon',
    'Hisar|हिसार|hissar',
    'Jhajjar|झज्जर',
    'Jind|जींद|jeend',
    'Kaithal|कैथल',
    'Karnal|करनाल',
    'Kurukshetra|कुरुक्षेत्र',
    'Mahendragarh|महेंद्रगढ़|narnaul|नारनौल',
    'Nuh|नूंह|mewat|मेवात',
    'Palwal|पलवल',
    'Panchkula|पंचकुला|पंचकूला',
    'Panipat|पानीपत',
    'Rewari|रेवाड़ी',
    'Rohtak|रोहतक',
    'Sirsa|सिरसा',
    'Sonipat|सोनीपत|sonepat',
    'Yamunanagar|यमुनानगर|yamuna nagar',
  ],
  Punjab: [
    'Amritsar|अमृतसर', 'Barnala|बरनाला', 'Bathinda|बठिंडा|bhatinda', 'Faridkot|फरीदकोट', 'Fatehgarh Sahib|फतेहगढ़ साहिब',
    'Fazilka|फाजिल्का', 'Ferozepur|फिरोजपुर|firozpur', 'Gurdaspur|गुरदासपुर', 'Hoshiarpur|होशियारपुर', 'Jalandhar|जालंधर|jullundur',
    'Kapurthala|कपूरथला', 'Ludhiana|लुधियाना', 'Malerkotla|मलेरकोटला', 'Mansa|मानसा', 'Moga|मोगा',
    'Sri Muktsar Sahib|श्री मुक्तसर साहिब|muktsar', 'Pathankot|पठानकोट', 'Patiala|पटियाला', 'Rupnagar|रूपनगर|ropar',
    'Mohali|मोहाली|sas nagar|sahibzada ajit singh nagar', 'Sangrur|संगरूर', 'Shaheed Bhagat Singh Nagar|शहीद भगत सिंह नगर|nawanshahr|sbs nagar',
    'Tarn Taran|तरनतारन',
  ],
  'Uttar Pradesh': [
    'Agra|आगरा', 'Aligarh|अलीगढ़', 'Ambedkar Nagar|अंबेडकर नगर', 'Amethi|अमेठी', 'Amroha|अमरोहा', 'Auraiya|औरैया',
    'Ayodhya|अयोध्या|faizabad|फैजाबाद', 'Azamgarh|आजमगढ़', 'Baghpat|बागपत', 'Bahraich|बहराइच', 'Ballia|बलिया',
    'Balrampur|बलरामपुर', 'Banda|बांदा', 'Barabanki|बाराबंकी', 'Bareilly|बरेली', 'Basti|बस्ती',
    'Bhadohi|भदोही|sant ravidas nagar', 'Bijnor|बिजनौर', 'Budaun|बदायूं|badaun', 'Bulandshahr|बुलंदशहर', 'Chandauli|चंदौली',
    'Chitrakoot|चित्रकूट', 'Deoria|देवरिया', 'Etah|एटा', 'Etawah|इटावा', 'Farrukhabad|फर्रुखाबाद', 'Fatehpur|फतेहपुर',
    'Firozabad|फिरोजाबाद', 'Gautam Buddha Nagar|गौतम बुद्ध नगर|noida|नोएडा|greater noida', 'Ghaziabad|गाजियाबाद|ग़ाज़ियाबाद',
    'Ghazipur|गाजीपुर', 'Gonda|गोंडा', 'Gorakhpur|गोरखपुर', 'Hamirpur|हमीरपुर', 'Hapur|हापुड़', 'Hardoi|हरदोई', 'Hathras|हाथरस',
    'Jalaun|जालौन', 'Jaunpur|जौनपुर', 'Jhansi|झांसी', 'Kannauj|कन्नौज', 'Kanpur Dehat|कानपुर देहात', 'Kanpur Nagar|कानपुर नगर|kanpur|कानपुर',
    'Kasganj|कासगंज', 'Kaushambi|कौशांबी', 'Kushinagar|कुशीनगर', 'Lakhimpur Kheri|लखीमपुर खीरी|kheri|lakhimpur', 'Lalitpur|ललितपुर',
    'Lucknow|लखनऊ', 'Maharajganj|महाराजगंज', 'Mahoba|महोबा', 'Mainpuri|मैनपुरी', 'Mathura|मथुरा', 'Mau|मऊ', 'Meerut|मेरठ',
    'Mirzapur|मिर्जापुर', 'Moradabad|मुरादाबाद', 'Muzaffarnagar|मुजफ्फरनगर', 'Pilibhit|पीलीभीत', 'Pratapgarh|प्रतापगढ़',
    'Prayagraj|प्रयागराज|allahabad|इलाहाबाद', 'Raebareli|रायबरेली|rae bareli', 'Rampur|रामपुर', 'Saharanpur|सहारनपुर', 'Sambhal|संभल',
    'Sant Kabir Nagar|संत कबीर नगर', 'Shahjahanpur|शाहजहांपुर', 'Shamli|शामली', 'Shravasti|श्रावस्ती', 'Siddharthnagar|सिद्धार्थनगर',
    'Sitapur|सीतापुर', 'Sonbhadra|सोनभद्र', 'Sultanpur|सुल्तानपुर', 'Unnao|उन्नाव', 'Varanasi|वाराणसी|banaras|बनारस|kashi',
  ],
  Uttarakhand: [
    'Almora|अल्मोड़ा', 'Bageshwar|बागेश्वर', 'Chamoli|चमोली', 'Champawat|चंपावत', 'Dehradun|देहरादून', 'Haridwar|हरिद्वार',
    'Nainital|नैनीताल', 'Pauri Garhwal|पौड़ी गढ़वाल|pauri', 'Pithoragarh|पिथौरागढ़', 'Rudraprayag|रुद्रप्रयाग',
    'Tehri Garhwal|टिहरी गढ़वाल|tehri', 'Udham Singh Nagar|उधम सिंह नगर|rudrapur', 'Uttarkashi|उत्तरकाशी',
  ],
  Rajasthan: [
    'Ajmer|अजमेर', 'Alwar|अलवर', 'Banswara|बांसवाड़ा', 'Baran|बारां', 'Barmer|बाड़मेर', 'Bharatpur|भरतपुर', 'Bhilwara|भीलवाड़ा',
    'Bikaner|बीकानेर', 'Bundi|बूंदी', 'Chittorgarh|चित्तौड़गढ़', 'Churu|चूरू', 'Dausa|दौसा', 'Dholpur|धौलपुर', 'Dungarpur|डूंगरपुर',
    'Hanumangarh|हनुमानगढ़', 'Jaipur|जयपुर', 'Jaisalmer|जैसलमेर', 'Jalore|जालौर', 'Jhalawar|झालावाड़', 'Jhunjhunu|झुंझुनू',
    'Jodhpur|जोधपुर', 'Karauli|करौली', 'Kota|कोटा', 'Nagaur|नागौर', 'Pali|पाली', 'Pratapgarh|प्रतापगढ़', 'Rajsamand|राजसमंद',
    'Sawai Madhopur|सवाई माधोपुर', 'Sikar|सीकर', 'Sirohi|सिरोही', 'Sri Ganganagar|श्री गंगानगर|ganganagar', 'Tonk|टोंक', 'Udaipur|उदयपुर',
  ],
  'Madhya Pradesh': [
    'Agar Malwa|आगर मालवा', 'Alirajpur|अलीराजपुर', 'Anuppur|अनूपपुर', 'Ashoknagar|अशोकनगर', 'Balaghat|बालाघाट', 'Barwani|बड़वानी',
    'Betul|बैतूल', 'Bhind|भिंड', 'Bhopal|भोपाल', 'Burhanpur|बुरहानपुर', 'Chhatarpur|छतरपुर', 'Chhindwara|छिंदवाड़ा', 'Damoh|दमोह',
    'Datia|दतिया', 'Dewas|देवास', 'Dhar|धार', 'Dindori|डिंडोरी', 'Guna|गुना', 'Gwalior|ग्वालियर', 'Harda|हरदा',
    'Narmadapuram|नर्मदापुरम|hoshangabad|होशंगाबाद', 'Indore|इंदौर', 'Jabalpur|जबलपुर', 'Jhabua|झाबुआ', 'Katni|कटनी',
    'Khandwa|खंडवा', 'Khargone|खरगोन', 'Mandla|मंडला', 'Mandsaur|मंदसौर', 'Morena|मुरैना', 'Narsinghpur|नरसिंहपुर', 'Neemuch|नीमच',
    'Niwari|निवाड़ी', 'Panna|पन्ना', 'Raisen|रायसेन', 'Rajgarh|राजगढ़', 'Ratlam|रतलाम', 'Rewa|रीवा', 'Sagar|सागर', 'Satna|सतना',
    'Sehore|सीहोर', 'Seoni|सिवनी', 'Shahdol|शहडोल', 'Shajapur|शाजापुर', 'Sheopur|श्योपुर', 'Shivpuri|शिवपुरी', 'Sidhi|सीधी',
    'Singrauli|सिंगरौली', 'Tikamgarh|टीकमगढ़', 'Ujjain|उज्जैन', 'Umaria|उमरिया', 'Vidisha|विदिशा',
  ],
  Bihar: [
    'Araria|अररिया', 'Arwal|अरवल', 'Aurangabad|औरंगाबाद', 'Banka|बांका', 'Begusarai|बेगूसराय', 'Bhagalpur|भागलपुर', 'Bhojpur|भोजपुर|ara',
    'Buxar|बक्सर', 'Darbhanga|दरभंगा', 'East Champaran|पूर्वी चंपारण|motihari|मोतिहारी', 'Gaya|गया', 'Gopalganj|गोपालगंज', 'Jamui|जमुई',
    'Jehanabad|जहानाबाद', 'Kaimur|कैमूर|bhabua', 'Katihar|कटिहार', 'Khagaria|खगड़िया', 'Kishanganj|किशनगंज', 'Lakhisarai|लखीसराय',
    'Madhepura|मधेपुरा', 'Madhubani|मधुबनी', 'Munger|मुंगेर', 'Muzaffarpur|मुजफ्फरपुर', 'Nalanda|नालंदा', 'Nawada|नवादा', 'Patna|पटना',
    'Purnia|पूर्णिया|purnea', 'Rohtas|रोहतास|sasaram', 'Saharsa|सहरसा', 'Samastipur|समस्तीपुर', 'Saran|सारण|chhapra', 'Sheikhpura|शेखपुरा',
    'Sheohar|शिवहर', 'Sitamarhi|सीतामढ़ी', 'Siwan|सीवान', 'Supaul|सुपौल', 'Vaishali|वैशाली|hajipur', 'West Champaran|पश्चिमी चंपारण|bettiah|बेतिया',
  ],
  'Himachal Pradesh': [
    'Bilaspur|बिलासपुर', 'Chamba|चंबा', 'Hamirpur|हमीरपुर', 'Kangra|कांगड़ा', 'Kinnaur|किन्नौर', 'Kullu|कुल्लू',
    'Lahaul and Spiti|लाहौल और स्पीति|lahaul|spiti', 'Mandi|मंडी', 'Shimla|शिमला', 'Sirmaur|सिरमौर', 'Solan|सोलन', 'Una|ऊना',
  ],
  Jharkhand: [
    'Bokaro|बोकारो', 'Chatra|चतरा', 'Deoghar|देवघर', 'Dhanbad|धनबाद', 'Dumka|दुमका', 'East Singhbhum|पूर्वी सिंहभूम|jamshedpur|जमशेदपुर',
    'Garhwa|गढ़वा', 'Giridih|गिरिडीह', 'Godda|गोड्डा', 'Gumla|गुमला', 'Hazaribagh|हजारीबाग', 'Jamtara|जामताड़ा', 'Khunti|खूंटी',
    'Koderma|कोडरमा', 'Latehar|लातेहार', 'Lohardaga|लोहरदगा', 'Pakur|पाकुड़', 'Palamu|पलामू', 'Ramgarh|रामगढ़', 'Ranchi|रांची',
    'Sahibganj|साहिबगंज', 'Seraikela Kharsawan|सरायकेला खरसावां|seraikela', 'Simdega|सिमडेगा', 'West Singhbhum|पश्चिमी सिंहभूम|chaibasa',
  ],
  Chandigarh: ['Chandigarh|चंडीगढ़'],
}

export const INDIA_STATES: readonly PlaceOption[] = STATE_ROWS.map(parse)
export const INDIA_STATE_NAMES: readonly string[] = INDIA_STATES.map((state) => state.en)

const DISTRICTS: Record<string, PlaceOption[]> = Object.fromEntries(
  Object.entries(DISTRICT_ROWS).map(([state, rows]) => [state, rows.map(parse)]),
)

export const districtsOf = (state: string): readonly PlaceOption[] => DISTRICTS[state] ?? []
export const districtNamesOf = (state: string): readonly string[] => districtsOf(state).map((district) => district.en)

/** The Hindi name of a canonical state or district when the dataset carries one. */
export function placeLabel(language: 'hi' | 'en', name: string, state?: string): string {
  if (language !== 'hi' || !name) return name
  const pool = [...INDIA_STATES, ...(state ? districtsOf(state) : Object.values(DISTRICTS).flat())]
  return pool.find((place) => place.en === name)?.hi ?? name
}

// --- Matching ----------------------------------------------------------------
const normalize = (text: string) => text.toLowerCase().replace(/[^\p{L}\p{N}\s]+/gu, ' ').replace(/\s+/g, ' ').trim()
const compact = (text: string) => normalize(text).replace(/[^\p{L}\p{N}]/gu, '')

/** Levenshtein edit distance; the strings here are short place names. */
function editDistance(a: string, b: string): number {
  const rows = a.length + 1
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i < rows; i += 1) {
    const current = [i]
    for (let j = 1; j <= b.length; j += 1) {
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
    previous = current
  }
  return previous[b.length]
}

/** 0 (nothing shared) to 1 (identical), on the letters only: "Haryna" vs "haryana" is 0.86. */
export function similarity(a: string, b: string): number {
  const left = compact(a); const right = compact(b)
  if (!left || !right) return 0
  if (left === right) return 1
  return 1 - editDistance(left, right) / Math.max(left.length, right.length)
}

export interface PlaceMatch { value: string; confident: boolean }

const FUZZY_ACCEPT = 0.8
const FUZZY_MARGIN = 0.1

/**
 * Resolve spoken text to one canonical place, or null.
 *
 * Exact name or alias first, then a whole alias appearing inside the text ("dilli ncr"),
 * then a cautious fuzzy pass: the best candidate must be clearly similar and clearly ahead
 * of the runner-up, otherwise nothing is returned and the caller keeps the cleaned text.
 */
export function matchPlace(text: string, options: readonly PlaceOption[]): PlaceMatch | null {
  const norm = normalize(text)
  if (!norm) return null
  const names = (option: PlaceOption) => [option.en, ...option.aliases].map(normalize)

  const exact = options.find((option) => names(option).includes(norm))
  if (exact) return { value: exact.en, confident: true }

  const tokens = norm.split(' ')
  const contained = options.filter((option) => names(option).some((alias) =>
    alias.length > 2 || DEVANAGARI.test(alias) ? norm.includes(alias) : tokens.includes(alias)))
  if (contained.length === 1) return { value: contained[0].en, confident: true }
  if (contained.length > 1) {
    // "north west delhi" also contains "west delhi" and "north delhi": prefer the longest alias hit.
    const longest = contained
      .map((option) => ({ option, length: Math.max(...names(option).filter((alias) => norm.includes(alias)).map((alias) => alias.length)) }))
      .sort((a, b) => b.length - a.length)
    const winnerAliases = names(longest[0].option).filter(alias => norm.includes(alias))
    if (longest[0].length > longest[1].length && contained.every(option => names(option).some(alias => winnerAliases.some(winner => winner.includes(alias))))) return { value: longest[0].option.en, confident: true }
    return null
  }

  const scored = options
    .map((option) => ({ option, score: Math.max(...names(option).map((alias) => similarity(norm, alias))) }))
    .sort((a, b) => b.score - a.score)
  const [best, second] = scored
  if (best && best.score >= FUZZY_ACCEPT && (!second || best.score - second.score >= FUZZY_MARGIN)) {
    return { value: best.option.en, confident: best.score >= 0.9 }
  }
  return null
}

export const matchState = (text: string) => matchPlace(text, INDIA_STATES)

/** Only matches when the state's districts are listed; otherwise the caller keeps the cleaned name. */
export const matchDistrict = (state: string, text: string) => {
  const options = districtsOf(state)
  return options.length ? matchPlace(text, options) : null
}
