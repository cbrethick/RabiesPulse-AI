// Offline answer bank: keyword → short answer in English, Tamil and Hindi.
// Works on the website and in the app, with or without the AI model.
// Safety rules for every answer: no diagnosis, no dose schedules, never "you are safe",
// always wash 15 min + see a doctor for any exposure. Facts follow WHO / NRCP / the
// supplied Tamil Nadu documents. Tamil/Hindi should be reviewed by a native speaker.
import type { Lang } from './i18n';

export type Action = 'care' | 'call108' | 'report' | 'learn' | 'settings' | 'dashboard';

export interface Intent {
  id: string;
  /** keywords incl. Tamil, Hindi and romanised (Tanglish/Hinglish) */
  kw: string[];
  /** extra weight for very specific topics */
  boost?: number;
  a: Record<Lang, string>;
  actions?: Action[];
}

const WASH: Record<Lang, string> = {
  en: 'Wash the wound with soap and running water for at least 15 minutes, then go to a doctor today.',
  ta: 'காயத்தை சோப்பு, ஓடும் தண்ணீரில் குறைந்தது 15 நிமிடம் கழுவுங்கள்; இன்றே மருத்துவரைப் பாருங்கள்.',
  hi: 'घाव को साबुन और बहते पानी से कम से कम 15 मिनट धोएँ, फिर आज ही डॉक्टर को दिखाएँ।',
};

export const INTENTS: Intent[] = [
  {
    id: 'dog_bite',
    kw: ['dog', 'dogs', 'puppy', 'bit', 'bite', 'bitten', 'naai', 'nai', 'kadichidu', 'kadichu', 'kutta', 'kutte', 'kutte ne', 'நாய்', 'கடி', 'கடித்தது', 'கடிச்சுது', 'குட்டி', 'कुत्ता', 'कुत्ते', 'काटा', 'काट', 'पिल्ला'],
    a: {
      en: `Dog bite — do this now:\n• ${WASH.en}\n• Do not put chilli, turmeric or oil on it.\n• The doctor will decide on anti-rabies vaccine. Don't wait for the dog to get sick.`,
      ta: `நாய் கடி — இப்போதே:\n• ${WASH.ta}\n• மிளகாய், மஞ்சள், எண்ணெய் தடவ வேண்டாம்.\n• தடுப்பூசி பற்றி மருத்துவர் முடிவு செய்வார். நாய் நோய்வாய்ப்படும் வரை காத்திருக்க வேண்டாம்.`,
      hi: `कुत्ते ने काटा — अभी यह करें:\n• ${WASH.hi}\n• मिर्च, हल्दी या तेल न लगाएँ।\n• टीके का फ़ैसला डॉक्टर करेंगे। कुत्ते के बीमार होने का इंतज़ार न करें।`,
    },
    actions: ['care', 'call108', 'report'],
  },
  {
    id: 'cat_bite',
    kw: ['cat', 'cats', 'kitten', 'poonai', 'poonaiyum', 'billi', 'பூனை', 'बिल्ली'],
    boost: 2,
    a: {
      en: `Cat bite or scratch:\n• ${WASH.en}\n• Cats can also spread rabies, so get it checked even if it is small.`,
      ta: `பூனை கடி / கீறல்:\n• ${WASH.ta}\n• பூனைகளும் வெறிநாய்க்கடி நோயைப் பரப்பலாம்; சிறிய காயமானாலும் பரிசோதிக்கவும்.`,
      hi: `बिल्ली ने काटा / खरोंचा:\n• ${WASH.hi}\n• बिल्लियाँ भी रेबीज़ फैला सकती हैं, छोटा घाव हो तब भी जाँच कराएँ।`,
    },
    actions: ['care', 'report'],
  },
  {
    id: 'monkey_bite',
    kw: ['monkey', 'monkeys', 'kurangu', 'bandar', 'குரங்கு', 'बंदर'],
    boost: 2,
    a: {
      en: `Monkey bite:\n• ${WASH.en}\n• Monkey bites need a doctor's check for rabies and other infections.`,
      ta: `குரங்கு கடி:\n• ${WASH.ta}\n• குரங்கு கடிக்கு வெறிநாய்க்கடி மற்றும் பிற தொற்றுக்காக மருத்துவர் பரிசோதனை தேவை.`,
      hi: `बंदर ने काटा:\n• ${WASH.hi}\n• बंदर के काटने पर रेबीज़ और दूसरे संक्रमण के लिए डॉक्टर की जाँच ज़रूरी है।`,
    },
    actions: ['care', 'report'],
  },
  {
    id: 'rat_bite',
    kw: ['rat', 'rats', 'mouse', 'squirrel', 'eli', 'chooha', 'chuha', 'எலி', 'அணில்', 'चूहा', 'गिलहरी'],
    boost: 2,
    a: {
      en: `Rat or squirrel bite:\n• Wash it with soap and water for 15 minutes.\n• See a doctor — they will check the wound and decide what is needed.`,
      ta: `எலி / அணில் கடி:\n• சோப்பு, தண்ணீரில் 15 நிமிடம் கழுவுங்கள்.\n• மருத்துவரைப் பாருங்கள் — தேவையானதை அவர் முடிவு செய்வார்.`,
      hi: `चूहे या गिलहरी ने काटा:\n• साबुन-पानी से 15 मिनट धोएँ।\n• डॉक्टर को दिखाएँ — ज़रूरत वही तय करेंगे।`,
    },
    actions: ['care'],
  },
  {
    id: 'bat',
    kw: ['bat', 'bats', 'vavval', 'vauval', 'chamgadar', 'வௌவால்', 'வவ்வால்', 'चमगादड़'],
    boost: 2,
    a: {
      en: `Bat contact or bite:\n• Bat bites can be tiny but still risky.\n• ${WASH.en}`,
      ta: `வௌவால் தொடர்பு / கடி:\n• வௌவால் கடி மிகச் சிறியதாக இருந்தாலும் ஆபத்தானது.\n• ${WASH.ta}`,
      hi: `चमगादड़ का संपर्क या काटना:\n• चमगादड़ का काटना बहुत छोटा हो सकता है, फिर भी खतरनाक है।\n• ${WASH.hi}`,
    },
    actions: ['care'],
  },
  {
    id: 'livestock',
    kw: ['cow', 'buffalo', 'goat', 'horse', 'donkey', 'pig', 'jackal', 'fox', 'mongoose', 'maadu', 'aadu', 'gaay', 'bakri', 'சியால்', 'மாடு', 'ஆடு', 'நரி', 'கீரி', 'गाय', 'बकरी', 'सियार', 'लोमड़ी', 'नेवला'],
    boost: 2,
    a: {
      en: `Bite from cattle, goat, jackal, fox or mongoose:\n• Any mammal can carry rabies.\n• ${WASH.en}`,
      ta: `மாடு, ஆடு, நரி, கீரி போன்றவை கடித்தால்:\n• எந்த பாலூட்டியும் வெறிநாய்க்கடி நோயைப் பரப்பலாம்.\n• ${WASH.ta}`,
      hi: `गाय, बकरी, सियार, लोमड़ी या नेवले ने काटा:\n• कोई भी स्तनधारी रेबीज़ फैला सकता है।\n• ${WASH.hi}`,
    },
    actions: ['care'],
  },
  {
    id: 'scratch',
    kw: ['scratch', 'scratched', 'nail', 'claw', 'keeral', 'kirandi', 'khrosh', 'kharonch', 'கீறல்', 'கீறியது', 'நகம்', 'खरोंच', 'नाखून', 'पंजा'],
    boost: 1,
    a: {
      en: `Scratch:\n• A scratch that breaks the skin can pass rabies too.\n• ${WASH.en}`,
      ta: `கீறல்:\n• தோலை உடைக்கும் கீறலும் நோயைப் பரப்பலாம்.\n• ${WASH.ta}`,
      hi: `खरोंच:\n• त्वचा छिलने वाली खरोंच से भी रेबीज़ फैल सकता है।\n• ${WASH.hi}`,
    },
    actions: ['care'],
  },
  {
    id: 'lick',
    kw: ['lick', 'licked', 'saliva', 'nakki', 'nakkiyathu', 'chaata', 'laar', 'நக்கல்', 'நக்கியது', 'உமிழ்நீர்', 'चाटा', 'चाटना', 'लार'],
    boost: 1,
    a: {
      en: `Lick:\n• A lick on unbroken skin is not an exposure — wash with soap and water.\n• A lick on a cut, broken skin, eyes or mouth needs washing for 15 minutes and a doctor today.`,
      ta: `நக்கல்:\n• உடையாத தோலில் நக்கினால் சோப்பு, தண்ணீரால் கழுவினால் போதும்.\n• காயம், உடைந்த தோல், கண், வாயில் நக்கினால் 15 நிமிடம் கழுவி இன்றே மருத்துவரைப் பாருங்கள்.`,
      hi: `चाटना:\n• बिना कटी त्वचा पर चाटने से संपर्क नहीं माना जाता — साबुन-पानी से धो लें।\n• कटी त्वचा, आँख या मुँह पर चाटा हो तो 15 मिनट धोएँ और आज ही डॉक्टर को दिखाएँ।`,
    },
    actions: ['care'],
  },
  {
    id: 'bleeding',
    kw: ['bleeding', 'blood', 'deep', 'serious', 'emergency', 'ambulance', 'raththam', 'ratham', 'khoon', 'khun', 'இரத்தம்', 'ரத்தம்', 'அவசரம்', 'ஆம்புலன்ஸ்', 'खून', 'गहरा', 'आपातकाल', 'एम्बुलेंस'],
    boost: 3,
    a: {
      en: `Heavy bleeding or a deep wound:\n• Press firmly with a clean cloth.\n• Call 108 or go to the nearest government hospital now.\n• Wash the wound with soap and running water when bleeding is controlled.`,
      ta: `அதிக இரத்தம் / ஆழமான காயம்:\n• சுத்தமான துணியால் அழுத்திப் பிடியுங்கள்.\n• 108 அழைக்கவும் அல்லது அருகிலுள்ள அரசு மருத்துவமனைக்கு உடனே செல்லுங்கள்.\n• இரத்தம் குறைந்ததும் சோப்பு, ஓடும் தண்ணீரில் கழுவுங்கள்.`,
      hi: `ज़्यादा खून या गहरा घाव:\n• साफ़ कपड़े से ज़ोर से दबाएँ।\n• 108 पर कॉल करें या तुरंत नज़दीकी सरकारी अस्पताल जाएँ।\n• खून रुकने पर घाव को साबुन और बहते पानी से धोएँ।`,
    },
    actions: ['call108', 'care'],
  },
  {
    id: 'face',
    kw: ['face', 'head', 'neck', 'eye', 'lip', 'mugam', 'thalai', 'kan', 'chehra', 'sar', 'gardan', 'aankh', 'முகம்', 'தலை', 'கழுத்து', 'கண்', 'उद्गार', 'चेहरा', 'सिर', 'गर्दन', 'आँख', 'होंठ'],
    boost: 3,
    a: {
      en: `Bite on the face, head or neck:\n• This needs care right away — go now.\n• ${WASH.en}\n• Call 108 if bleeding is heavy.`,
      ta: `முகம், தலை, கழுத்தில் கடி:\n• உடனே சிகிச்சை தேவை — இப்போதே செல்லுங்கள்.\n• ${WASH.ta}\n• அதிக இரத்தம் என்றால் 108 அழைக்கவும்.`,
      hi: `चेहरे, सिर या गर्दन पर काटा:\n• तुरंत इलाज ज़रूरी है — अभी जाएँ।\n• ${WASH.hi}\n• ज़्यादा खून हो तो 108 पर कॉल करें।`,
    },
    actions: ['call108', 'care'],
  },
  {
    id: 'child',
    kw: ['child', 'children', 'kid', 'baby', 'son', 'daughter', 'boy', 'girl', 'kuzhandhai', 'paiyan', 'ponnu', 'baccha', 'bachcha', 'beta', 'beti', 'குழந்தை', 'மகன்', 'மகள்', 'பையன்', 'बच्चा', 'बच्ची', 'बेटा', 'बेटी'],
    boost: 2,
    a: {
      en: `Child bitten:\n• Children are often bitten on the face or head — check carefully.\n• ${WASH.en}\n• Children can't always say they were bitten or licked; if unsure, see a doctor.`,
      ta: `குழந்தைக்கு கடி:\n• குழந்தைகளுக்கு முகம், தலையில் கடி அதிகம் — கவனமாகப் பாருங்கள்.\n• ${WASH.ta}\n• குழந்தைகள் எப்போதும் சொல்ல மாட்டார்கள்; சந்தேகம் இருந்தால் மருத்துவரைப் பாருங்கள்.`,
      hi: `बच्चे को काटा:\n• बच्चों को अक्सर चेहरे या सिर पर काटते हैं — ध्यान से देखें।\n• ${WASH.hi}\n• बच्चे हमेशा बता नहीं पाते; शक हो तो डॉक्टर को दिखाएँ।`,
    },
    actions: ['care', 'call108'],
  },
  {
    id: 'pregnant',
    kw: ['pregnant', 'pregnancy', 'breastfeeding', 'karpam', 'garbh', 'garbhvati', 'கர்ப்பம்', 'கர்ப்பிணி', 'தாய்ப்பால்', 'गर्भवती', 'गर्भ', 'स्तनपान'],
    boost: 3,
    a: {
      en: `Pregnant or breastfeeding:\n• Do not skip care. ${WASH.en}\n• Tell the doctor you are pregnant or breastfeeding — they will decide the safe treatment.`,
      ta: `கர்ப்பிணி / தாய்ப்பால் கொடுப்பவர்:\n• சிகிச்சையைத் தவிர்க்க வேண்டாம். ${WASH.ta}\n• கர்ப்பம் பற்றி மருத்துவரிடம் சொல்லுங்கள் — பாதுகாப்பான சிகிச்சையை அவர் முடிவு செய்வார்.`,
      hi: `गर्भवती या स्तनपान कराने वाली:\n• इलाज न छोड़ें। ${WASH.hi}\n• डॉक्टर को बताएँ — सुरक्षित इलाज वही तय करेंगे।`,
    },
    actions: ['care'],
  },
  {
    id: 'wash_how',
    kw: ['wash', 'clean', 'soap', 'water', 'first', 'aid', 'kazhuvu', 'sopu', 'dhona', 'sabun', 'கழுவ', 'கழுவுவது', 'சோப்பு', 'தண்ணீர்', 'முதலுதவி', 'धोना', 'धोएँ', 'साबुन', 'पानी', 'प्राथमिक'],
    a: {
      en: `How to wash a bite:\n• Use soap and plenty of running tap water.\n• Keep washing for at least 15 minutes.\n• Then go to a health facility the same day.`,
      ta: `கடியை எப்படி கழுவுவது:\n• சோப்பும் நிறைய ஓடும் குழாய் நீரும் பயன்படுத்துங்கள்.\n• குறைந்தது 15 நிமிடம் கழுவுங்கள்.\n• அன்றே சுகாதார நிலையத்திற்குச் செல்லுங்கள்.`,
      hi: `काटे हुए घाव को कैसे धोएँ:\n• साबुन और खूब बहता नल का पानी लें।\n• कम से कम 15 मिनट तक धोते रहें।\n• फिर उसी दिन स्वास्थ्य केंद्र जाएँ।`,
    },
    actions: ['care'],
  },
  {
    id: 'remedies',
    kw: ['turmeric', 'chilli', 'chili', 'oil', 'lime', 'mud', 'home', 'remedy', 'herbal', 'manjal', 'milagai', 'ennai', 'haldi', 'mirch', 'tel', 'chuna', 'மஞ்சள்', 'மிளகாய்', 'எண்ணெய்', 'சுண்ணாம்பு', 'வீட்டு', 'வைத்தியம்', 'हल्दी', 'मिर्च', 'तेल', 'चूना', 'घरेलू', 'नुस्खा'],
    boost: 2,
    a: {
      en: `Home remedies:\n• Do NOT put chilli, turmeric, oil, lime, mud or herbs on a bite.\n• Only soap and running water, then a doctor.`,
      ta: `வீட்டு வைத்தியம்:\n• கடியில் மிளகாய், மஞ்சள், எண்ணெய், சுண்ணாம்பு, மண் போட வேண்டாம்.\n• சோப்பு, ஓடும் தண்ணீர் மட்டும்; பிறகு மருத்துவர்.`,
      hi: `घरेलू नुस्खे:\n• काटे घाव पर मिर्च, हल्दी, तेल, चूना, मिट्टी या जड़ी-बूटी न लगाएँ।\n• सिर्फ़ साबुन और बहता पानी, फिर डॉक्टर।`,
    },
    actions: ['care'],
  },
  {
    id: 'stitches',
    kw: ['stitch', 'stitches', 'suture', 'bandage', 'plaster', 'cover', 'tetanus', 'tt', 'thayal', 'kattu', 'tanka', 'patti', 'தையல்', 'கட்டு', 'டெட்டனஸ்', 'टांका', 'पट्टी', 'टिटनेस'],
    boost: 2,
    a: {
      en: `Stitches, bandage or tetanus:\n• Don't close or tightly cover the wound at home.\n• The doctor decides about stitches, tetanus shot and anti-rabies care.`,
      ta: `தையல், கட்டு, டெட்டனஸ்:\n• வீட்டில் காயத்தை மூட வேண்டாம், இறுக்கமாகக் கட்ட வேண்டாம்.\n• தையல், டெட்டனஸ், வெறிநாய்க்கடி சிகிச்சையை மருத்துவர் முடிவு செய்வார்.`,
      hi: `टांके, पट्टी या टिटनेस:\n• घर पर घाव बंद न करें, कसकर पट्टी न बाँधें।\n• टांके, टिटनेस और रेबीज़ इलाज का फ़ैसला डॉक्टर करेंगे।`,
    },
    actions: ['care'],
  },
  {
    id: 'where_vaccine',
    kw: ['where', 'hospital', 'clinic', 'vaccine', 'arv', 'injection', 'near', 'nearest', 'available', 'chennai', 'stanley', 'kilpauk', 'chengalpattu', 'chengalpet', 'srm', 'ktr', 'kattankulathur', 'tambaram', 'gh', 'rggh', 'omandurar', 'engey', 'enga', 'kahan', 'kaha', 'ஊசி', 'எங்கே', 'எங்க', 'மருத்துவமனை', 'தடுப்பூசி', 'அருகில்', 'कहाँ', 'अस्पताल', 'टीका', 'इंजेक्शन', 'पास'],
    a: {
      en: `Where to get anti-rabies vaccine in Chennai:\n• Tamil Nadu's list: Rajiv Gandhi Govt General Hospital, Govt Stanley Hospital, Govt Kilpauk Medical College Hospital, Govt Omandurar Medical College hospital; Chengalpattu Medical College Hospital for the Chengalpattu / Kattankulathur side.\n• TN policy: all govt hospitals and PHCs should have it — call first.\n• Tap "Find nearby care" for the nearest one and directions.`,
      ta: `சென்னையில் வெறிநாய்க்கடி தடுப்பூசி எங்கே:\n• தமிழ்நாடு பட்டியல்: ராஜீவ் காந்தி அரசு பொது மருத்துவமனை, அரசு ஸ்டான்லி, அரசு கீழ்ப்பாக்கம், ஓமந்தூரார் அரசு மருத்துவக் கல்லூரி மருத்துவமனை; செங்கல்பட்டு / காட்டாங்குளத்தூர் பக்கம் செங்கல்பட்டு மருத்துவக் கல்லூரி மருத்துவமனை.\n• TN கொள்கை: அனைத்து அரசு மருத்துவமனை, PHC-யிலும் இருக்க வேண்டும் — முதலில் அழைக்கவும்.\n• அருகிலுள்ளதற்கு "அருகிலுள்ள சிகிச்சை" தொடவும்.`,
      hi: `चेन्नई में एंटी-रेबीज़ टीका कहाँ:\n• तमिलनाडु सूची: राजीव गांधी सरकारी जनरल अस्पताल, सरकारी स्टैनली, सरकारी किलपॉक मेडिकल कॉलेज अस्पताल, ओमंदूरार सरकारी मेडिकल कॉलेज अस्पताल; चेंगलपट्टू / कट्टनकुलथुर की तरफ़ चेंगलपट्टू मेडिकल कॉलेज अस्पताल।\n• TN नीति: सभी सरकारी अस्पताल और PHC में होना चाहिए — पहले कॉल करें।\n• पास वाले के लिए "पास में इलाज" दबाएँ।`,
    },
    actions: ['care'],
  },
  {
    id: 'cost',
    kw: ['cost', 'price', 'free', 'money', 'charge', 'rupees', 'rs', 'vilai', 'kasu', 'paisa', 'kitna', 'muft', 'விலை', 'இலவசம்', 'பணம்', 'कीमत', 'मुफ़्त', 'पैसा', 'खर्च'],
    boost: 2,
    a: {
      en: `Cost:\n• We don't have verified price data.\n• Go to a government hospital or health centre and ask there. Don't delay care because of cost.`,
      ta: `செலவு:\n• சரிபார்க்கப்பட்ட விலை தகவல் எங்களிடம் இல்லை.\n• அரசு மருத்துவமனை / சுகாதார நிலையத்தில் கேளுங்கள். செலவுக்காக சிகிச்சையை தாமதிக்க வேண்டாம்.`,
      hi: `खर्च:\n• हमारे पास पक्की कीमत की जानकारी नहीं है।\n• सरकारी अस्पताल या स्वास्थ्य केंद्र में पूछें। खर्च की वजह से इलाज में देरी न करें।`,
    },
    actions: ['care'],
  },
  {
    id: 'schedule',
    kw: ['dose', 'doses', 'how many', 'schedule', 'days', 'course', 'immunoglobulin', 'rig', 'erig', 'times', 'ethana', 'evvalavu', 'kitne', 'खुराक', 'கோர்ஸ்', 'எத்தனை', 'நாள்', 'டோஸ்', 'कितने', 'दिन', 'डोज़', 'कोर्स'],
    boost: 2,
    a: {
      en: `Doses and schedule:\n• Only the doctor decides how many doses you need and when — it depends on the wound and your history.\n• Keep every appointment they give you.`,
      ta: `டோஸ் மற்றும் அட்டவணை:\n• எத்தனை டோஸ், எப்போது என்பதை மருத்துவர் மட்டுமே முடிவு செய்வார்.\n• அவர் சொல்லும் ஒவ்வொரு தேதியிலும் செல்லுங்கள்.`,
      hi: `खुराक और समय:\n• कितनी खुराक और कब — यह सिर्फ़ डॉक्टर तय करेंगे।\n• डॉक्टर की दी हर तारीख पर ज़रूर जाएँ।`,
    },
    actions: ['care'],
  },
  {
    id: 'missed',
    kw: ['missed', 'miss', 'forgot', 'late', 'skip', 'maranthu', 'vittuten', 'bhool', 'chhoot', 'மறந்து', 'தவறவிட்டேன்', 'தாமதம்', 'भूल', 'छूट', 'देर'],
    boost: 3,
    a: {
      en: `Missed a dose:\n• Go back to the same hospital as soon as possible.\n• Don't start again on your own — the doctor will tell you how to continue.`,
      ta: `டோஸ் தவறியது:\n• அதே மருத்துவமனைக்கு விரைவில் செல்லுங்கள்.\n• நீங்களாக மீண்டும் தொடங்க வேண்டாம் — எப்படி தொடர்வது என மருத்துவர் சொல்வார்.`,
      hi: `खुराक छूट गई:\n• जल्दी से उसी अस्पताल जाएँ।\n• खुद से दोबारा शुरू न करें — आगे कैसे करना है, डॉक्टर बताएँगे।`,
    },
    actions: ['care'],
  },
  {
    id: 'vaccinated_dog',
    kw: ['vaccinated', 'pet', 'own', 'my dog', 'house', 'home dog', 'veetu', 'paltu', 'vaccine certificate', 'வளர்ப்பு', 'வீட்டு நாய்', 'தடுப்பூசி போட்ட', 'पालतू', 'टीका लगा', 'घर का'],
    boost: 2,
    a: {
      en: `Bitten by a pet or vaccinated dog:\n• Still wash for 15 minutes and see a doctor.\n• Take the pet's vaccine record — the doctor uses it to decide treatment.`,
      ta: `வளர்ப்பு / தடுப்பூசி போட்ட நாய் கடித்தால்:\n• அப்போதும் 15 நிமிடம் கழுவி மருத்துவரைப் பாருங்கள்.\n• நாயின் தடுப்பூசி பதிவை எடுத்துச் செல்லுங்கள்.`,
      hi: `पालतू या टीका लगे कुत्ते ने काटा:\n• फिर भी 15 मिनट धोएँ और डॉक्टर को दिखाएँ।\n• पालतू का टीका रिकॉर्ड साथ ले जाएँ।`,
    },
    actions: ['care'],
  },
  {
    id: 'stray',
    kw: ['stray', 'street', 'road', 'theru', 'aawara', 'awara', 'sadak', 'தெரு', 'तெரு', 'आवारा', 'सड़क'],
    boost: 1,
    a: {
      en: `Stray dog bite:\n• ${WASH.en}\n• You can save a report in this app (it stays on your phone).\n• Greater Chennai Corporation runs Animal Birth Control centres that sterilise and vaccinate street dogs.`,
      ta: `தெரு நாய் கடி:\n• ${WASH.ta}\n• இந்த செயலியில் பதிவு செய்யலாம் (உங்கள் கைபேசியில் மட்டும்).\n• பெருநகர சென்னை மாநகராட்சி ABC மையங்கள் தெரு நாய்களுக்கு கருத்தடை, தடுப்பூசி செய்கின்றன.`,
      hi: `आवारा कुत्ते ने काटा:\n• ${WASH.hi}\n• इस ऐप में रिपोर्ट सेव कर सकते हैं (सिर्फ़ आपके फ़ोन में)।\n• ग्रेटर चेन्नई कॉर्पोरेशन के ABC केंद्र आवारा कुत्तों की नसबंदी और टीकाकरण करते हैं।`,
    },
    actions: ['care', 'report'],
  },
  {
    id: 'rabid_signs',
    kw: ['mad', 'rabid', 'strange', 'aggressive', 'foam', 'drooling', 'paralysis', 'veri', 'pagal', 'paagal', 'வெறி', 'வெறிநாய்', 'நுரை', 'पागल', 'झाग', 'अजीब'],
    boost: 2,
    a: {
      en: `A dog acting strangely (very aggressive, drooling, can't swallow, wobbly):\n• Stay away and keep children away. Don't try to catch it.\n• Tell the Greater Chennai Corporation or a government veterinary clinic.\n• If it bit or scratched anyone: wash 15 minutes and see a doctor now.`,
      ta: `விசித்திரமாக நடந்துகொள்ளும் நாய் (மிகக் கோபம், எச்சில் வடிதல், விழுங்க முடியாமை):\n• விலகி இருங்கள், குழந்தைகளை தூரம் வைத்திருங்கள். பிடிக்க முயல வேண்டாம்.\n• மாநகராட்சி அல்லது அரசு கால்நடை மருத்துவமனைக்குத் தெரிவியுங்கள்.\n• யாரையாவது கடித்திருந்தால்: 15 நிமிடம் கழுவி உடனே மருத்துவரைப் பாருங்கள்.`,
      hi: `अजीब बर्ताव करता कुत्ता (बहुत आक्रामक, लार टपकना, निगल न पाना):\n• दूर रहें, बच्चों को दूर रखें। पकड़ने की कोशिश न करें।\n• ग्रेटर चेन्नई कॉर्पोरेशन या सरकारी पशु क्लिनिक को बताएँ।\n• किसी को काटा हो तो: 15 मिनट धोएँ और तुरंत डॉक्टर को दिखाएँ।`,
    },
    actions: ['care', 'report'],
  },
  {
    id: 'symptoms',
    kw: ['symptom', 'symptoms', 'fever', 'headache', 'water', 'fear', 'hydrophobia', 'confusion', 'signs', 'arikuri', 'kaichal', 'lakshan', 'bukhar', 'அறிகுறி', 'காய்ச்சல்', 'தண்ணீர் பயம்', 'लक्षण', 'बुखार', 'पानी से डर'],
    boost: 2,
    a: {
      en: `Rabies symptoms:\n• Do not wait for symptoms — once they start, rabies is almost always fatal.\n• Any person with a recent bite and fever, tingling at the wound, fear of water or confusion needs emergency care: call 108.`,
      ta: `அறிகுறிகள்:\n• அறிகுறிகளுக்காக காத்திருக்க வேண்டாம் — தொடங்கிவிட்டால் பெரும்பாலும் உயிரிழப்பு.\n• சமீபத்திய கடியுடன் காய்ச்சல், காயத்தில் கூச்சம், தண்ணீர் பயம், குழப்பம் இருந்தால் — 108 அழைக்கவும்.`,
      hi: `रेबीज़ के लक्षण:\n• लक्षणों का इंतज़ार न करें — शुरू होने के बाद रेबीज़ लगभग हमेशा जानलेवा है।\n• हाल के काटने के बाद बुखार, घाव पर झनझनाहट, पानी से डर या भ्रम हो तो आपात इलाज: 108 पर कॉल करें।`,
    },
    actions: ['call108', 'care'],
  },
  {
    id: 'cure',
    kw: ['cure', 'curable', 'treatment', 'die', 'death', 'fatal', 'survive', 'gunam', 'ilaj', 'maran', 'theervu', 'குணம்', 'மரணம்', 'சிகிச்சை', 'தீர்வு', 'इलाज', 'मौत', 'ठीक'],
    a: {
      en: `Can rabies be cured?\n• Once symptoms start, it is almost always fatal.\n• But it is almost 100% preventable with quick wound washing and the right care from a doctor after exposure.`,
      ta: `வெறிநாய்க்கடி குணமாகுமா?\n• அறிகுறிகள் தொடங்கிவிட்டால் பெரும்பாலும் உயிரிழப்பு.\n• ஆனால் உடனே கழுவி, மருத்துவர் சிகிச்சை பெற்றால் கிட்டத்தட்ட முழுமையாகத் தடுக்கலாம்.`,
      hi: `क्या रेबीज़ ठीक हो सकता है?\n• लक्षण शुरू होने के बाद यह लगभग हमेशा जानलेवा है।\n• लेकिन जल्दी घाव धोने और डॉक्टर के सही इलाज से इसे लगभग पूरी तरह रोका जा सकता है।`,
    },
    actions: ['care', 'learn'],
  },
  {
    id: 'incubation',
    kw: ['how long', 'incubation', 'when', 'appear', 'months', 'weeks', 'eppo', 'evlo naal', 'kab tak', 'kitne din', 'எப்போது', 'எத்தனை நாள்', 'மாதம்', 'कब', 'कितने दिन', 'महीने'],
    boost: 1,
    a: {
      en: `How long before symptoms?\n• It varies from days to months, so there is no "safe" waiting time.\n• Get care now, even if the bite was days ago.`,
      ta: `அறிகுறிகள் எப்போது?\n• சில நாட்கள் முதல் மாதங்கள் வரை மாறும் — "பாதுகாப்பான" காத்திருப்பு இல்லை.\n• கடி சில நாட்களுக்கு முன்பு என்றாலும் இப்போதே சிகிச்சை பெறுங்கள்.`,
      hi: `लक्षण कब तक?\n• कुछ दिनों से महीनों तक — इसलिए इंतज़ार का कोई "सुरक्षित" समय नहीं।\n• काटना कुछ दिन पहले हुआ हो तब भी अभी इलाज लें।`,
    },
    actions: ['care'],
  },
  {
    id: 'old_bite',
    kw: ['yesterday', 'last week', 'ago', 'earlier', 'old', 'nethu', 'munnadi', 'kal', 'pehle', 'நேற்று', 'முன்பு', 'பழைய', 'கடந்த', 'कल', 'पहले', 'पुराना'],
    boost: 1,
    a: {
      en: `Bite from earlier (yesterday or days ago):\n• It is not too late to get checked — go today.\n• Wash the wound now if it's still open.`,
      ta: `முன்பு நடந்த கடி:\n• பரிசோதிக்க தாமதமில்லை — இன்றே செல்லுங்கள்.\n• காயம் திறந்திருந்தால் இப்போதே கழுவுங்கள்.`,
      hi: `पहले का काटना (कल या कुछ दिन पहले):\n• जाँच के लिए देर नहीं हुई — आज ही जाएँ।\n• घाव अभी खुला हो तो अभी धोएँ।`,
    },
    actions: ['care'],
  },
  {
    id: 'pet_vaccine',
    kw: ['vaccinate my', 'pet vaccine', 'puppy vaccine', 'vet', 'veterinary', 'kalnadai', 'pashu', 'jaanvar doctor', 'கால்நடை', 'நாய்க்கு தடுப்பூசி', 'पशु', 'पालतू टीका', 'वेट'],
    boost: 2,
    a: {
      en: `Protect your pet:\n• Get your dog or cat vaccinated against rabies as your vet advises, and keep the record.\n• GCC runs pet clinics in Chennai — see "Find nearby care" → Animal clinic.`,
      ta: `உங்கள் வளர்ப்பு விலங்கைப் பாதுகாக்க:\n• கால்நடை மருத்துவர் சொல்படி நாய்/பூனைக்கு வெறிநாய்க்கடி தடுப்பூசி போடுங்கள்; பதிவை வைத்திருங்கள்.\n• சென்னையில் GCC செல்லப்பிராணி மருத்துவமனைகள் உள்ளன — "அருகிலுள்ள சிகிச்சை" → விலங்கு மருத்துவமனை.`,
      hi: `अपने पालतू को बचाएँ:\n• पशु डॉक्टर की सलाह से कुत्ते/बिल्ली को रेबीज़ का टीका लगवाएँ और रिकॉर्ड रखें।\n• चेन्नई में GCC के पेट क्लिनिक हैं — "पास में इलाज" → पशु क्लिनिक।`,
    },
    actions: ['care'],
  },
  {
    id: 'abc',
    kw: ['abc', 'sterilise', 'sterilize', 'sterilisation', 'neuter', 'birth control', 'catch', 'karuththadai', 'nasbandi', 'கருத்தடை', 'नसबंदी'],
    boost: 2,
    a: {
      en: `Animal Birth Control (ABC):\n• Street dogs are sterilised, vaccinated and returned to their area (ABC Rules 2023).\n• Greater Chennai Corporation runs ABC centres — they are for dogs, not human treatment.`,
      ta: `விலங்கு கருத்தடை (ABC):\n• தெரு நாய்களுக்கு கருத்தடை, தடுப்பூசி செய்து அதே இடத்தில் விடுவர் (ABC விதிகள் 2023).\n• பெருநகர சென்னை மாநகராட்சி ABC மையங்கள் நாய்களுக்கு மட்டும் — மனித சிகிச்சைக்கு அல்ல.`,
      hi: `पशु जन्म नियंत्रण (ABC):\n• आवारा कुत्तों की नसबंदी और टीकाकरण कर उन्हें उसी इलाके में छोड़ा जाता है (ABC नियम 2023)।\n• ग्रेटर चेन्नई कॉर्पोरेशन के ABC केंद्र कुत्तों के लिए हैं, इंसानों के इलाज के लिए नहीं।`,
    },
    actions: ['care'],
  },
  {
    id: 'report',
    kw: ['report', 'complain', 'complaint', 'register', 'pugar', 'shikayat', 'புகார்', 'பதிவு', 'शिकायत', 'रिपोर्ट'],
    boost: 2,
    a: {
      en: `Report an incident:\n• Use "Report an incident" to save the animal, date, place and a photo.\n• It is saved on your phone only — it is not sent to the Corporation automatically.`,
      ta: `சம்பவத்தை பதிவு செய்ய:\n• "சம்பவத்தை பதிவு செய்" மூலம் விலங்கு, தேதி, இடம், புகைப்படம் சேமிக்கலாம்.\n• இது உங்கள் கைபேசியில் மட்டும் — மாநகராட்சிக்கு தானாக அனுப்பப்படாது.`,
      hi: `घटना दर्ज करें:\n• "घटना दर्ज करें" में जानवर, तारीख, जगह और फ़ोटो सेव करें।\n• यह सिर्फ़ आपके फ़ोन में रहता है — कॉर्पोरेशन को अपने-आप नहीं जाता।`,
    },
    actions: ['report'],
  },
  {
    id: 'myth_14',
    kw: ['14', 'fourteen', 'stomach', 'navel', 'vayiru', 'pet', 'naabhi', 'வயிறு', 'தொப்புள்', 'पेट', 'नाभि'],
    boost: 3,
    a: {
      en: `"14 injections in the stomach" is an old method.\n• Modern anti-rabies vaccines are given in the arm, in far fewer doses.\n• The doctor decides how many you need.`,
      ta: `"வயிற்றில் 14 ஊசி" என்பது பழைய முறை.\n• இப்போது தடுப்பூசி கையில், குறைவான டோஸ்களில் போடப்படுகிறது.\n• எத்தனை என்பதை மருத்துவர் முடிவு செய்வார்.`,
      hi: `"पेट में 14 इंजेक्शन" पुराना तरीका है।\n• आज के टीके बाँह में, बहुत कम खुराक में लगते हैं।\n• कितनी चाहिए, डॉक्टर तय करेंगे।`,
    },
    actions: ['learn'],
  },
  {
    id: 'myth_wait',
    kw: ['10 days', 'ten days', 'observe', 'watch the dog', 'wait', 'dog alive', 'kaathiru', 'intezaar', 'காத்திரு', 'பத்து நாள்', 'इंतज़ार', 'दस दिन'],
    boost: 2,
    a: {
      en: `Should I wait and watch the dog?\n• No. Don't wait to see if the dog gets sick or dies — see a doctor now.\n• Telling the doctor whether the dog stays healthy can help them, but care starts today.`,
      ta: `நாயைக் கவனித்துக் காத்திருக்கலாமா?\n• வேண்டாம். நாய் நோய்வாய்ப்படுமா என்று காத்திருக்காமல் இப்போதே மருத்துவரைப் பாருங்கள்.\n• நாய் நலமாக இருக்கிறதா என்பதை மருத்துவரிடம் சொல்லலாம்; ஆனால் சிகிச்சை இன்றே தொடங்கட்டும்.`,
      hi: `क्या कुत्ते को देखकर इंतज़ार करूँ?\n• नहीं। कुत्ते के बीमार होने या मरने का इंतज़ार न करें — अभी डॉक्टर को दिखाएँ।\n• कुत्ता ठीक है या नहीं, यह डॉक्टर को बताना मदद करता है, पर इलाज आज शुरू हो।`,
    },
    actions: ['care'],
  },
  {
    id: 'food_myth',
    kw: ['food', 'eat', 'diet', 'avoid', 'meat', 'egg', 'unavu', 'sappadu', 'khana', 'parhez', 'உணவு', 'சாப்பாடு', 'தவிர்', 'खाना', 'परहेज़'],
    boost: 1,
    a: {
      en: `Food after a bite:\n• There is no special diet for a dog bite.\n• Follow your doctor's advice and complete the treatment they give.`,
      ta: `கடிக்குப் பின் உணவு:\n• நாய் கடிக்கு தனி உணவுக் கட்டுப்பாடு இல்லை.\n• மருத்துவர் சொல்வதைப் பின்பற்றி சிகிச்சையை முடியுங்கள்.`,
      hi: `काटने के बाद खाना:\n• कुत्ते के काटने पर कोई खास परहेज़ नहीं है।\n• डॉक्टर की सलाह मानें और पूरा इलाज लें।`,
    },
  },
  {
    id: 'human_spread',
    kw: ['person', 'human', 'family', 'touch', 'spread to', 'contagious', 'manushan', 'insaan', 'parivar', 'மனிதர்', 'குடும்பம்', 'தொட்டால்', 'इंसान', 'परिवार', 'छूने'],
    boost: 1,
    a: {
      en: `Can it spread between people?\n• Normal contact (touching, sharing food, caring for someone) does not spread rabies.\n• Person-to-person spread is extremely rare.`,
      ta: `மனிதரிடமிருந்து பரவுமா?\n• தொடுதல், உணவு பகிர்தல், கவனித்தல் போன்ற சாதாரண தொடர்பால் பரவாது.\n• மனிதரிடம் இருந்து மனிதருக்கு பரவுவது மிக மிக அரிது.`,
      hi: `क्या यह इंसानों में फैलता है?\n• सामान्य संपर्क (छूना, खाना बाँटना, देखभाल) से रेबीज़ नहीं फैलता।\n• इंसान से इंसान में फैलना बहुत ही दुर्लभ है।`,
    },
  },
  {
    id: 'pre_exposure',
    kw: ['before', 'prevent', 'prevention', 'pre exposure', 'pre-exposure', 'advance', 'protect', 'thadu', 'bachav', 'roktham', 'முன்கூட்டியே', 'தடுப்பு', 'पहले से', 'बचाव', 'रोकथाम'],
    boost: 1,
    a: {
      en: `Preventing rabies:\n• Vaccinate pet dogs and cats; avoid touching unknown or sick animals.\n• Teach children to tell an adult about any bite, scratch or lick.\n• People with high risk (vets, dog handlers) can ask a doctor about vaccination before exposure.`,
      ta: `தடுப்பது எப்படி:\n• வளர்ப்பு நாய், பூனைக்கு தடுப்பூசி போடுங்கள்; தெரியாத, நோயுற்ற விலங்குகளைத் தொடாதீர்கள்.\n• கடி, கீறல், நக்கல் பற்றி பெரியவரிடம் சொல்ல குழந்தைகளுக்குக் கற்றுக்கொடுங்கள்.\n• கால்நடை மருத்துவர், நாய் பராமரிப்பாளர் போன்றோர் முன்கூட்டிய தடுப்பூசி பற்றி மருத்துவரிடம் கேட்கலாம்.`,
      hi: `रेबीज़ से बचाव:\n• पालतू कुत्ते-बिल्ली को टीका लगवाएँ; अनजान या बीमार जानवर को न छुएँ।\n• बच्चों को सिखाएँ कि काटने, खरोंच या चाटने पर बड़ों को बताएँ।\n• ज़्यादा जोखिम वाले लोग (पशु डॉक्टर, डॉग हैंडलर) पहले से टीके के बारे में डॉक्टर से पूछ सकते हैं।`,
    },
    actions: ['learn'],
  },
  {
    id: 'what_rabies',
    kw: ['rabies', 'what is', 'virus', 'disease', 'veri noi', 'verinaai', 'raibiz', 'rebies', 'வெறிநாய்க்கடி', 'ரேபிஸ்', 'நோய்', 'रेबीज़', 'रेबीज', 'बीमारी', 'वायरस'],
    a: {
      en: `What is rabies?\n• A virus that attacks the brain and nerves, spread by the saliva of infected animals (mostly dogs in India).\n• Almost always fatal once symptoms start, but preventable with quick care.`,
      ta: `வெறிநாய்க்கடி நோய் என்றால் என்ன?\n• மூளை, நரம்புகளைத் தாக்கும் வைரஸ்; பாதிக்கப்பட்ட விலங்கின் உமிழ்நீர் மூலம் பரவும் (இந்தியாவில் பெரும்பாலும் நாய்கள்).\n• அறிகுறி வந்தால் பெரும்பாலும் உயிரிழப்பு; உடனடி சிகிச்சையால் தடுக்கலாம்.`,
      hi: `रेबीज़ क्या है?\n• एक वायरस जो दिमाग और नसों पर हमला करता है, संक्रमित जानवर की लार से फैलता है (भारत में ज़्यादातर कुत्ते)।\n• लक्षण आने पर लगभग हमेशा जानलेवा, पर जल्दी इलाज से रोका जा सकता है।`,
    },
    actions: ['learn'],
  },
  {
    id: 'stats',
    kw: ['statistics', 'stats', 'cases', 'data', 'numbers', 'how many people', 'tamil nadu', 'count', 'deaths', 'kanakku', 'aankde', 'கணக்கு', 'புள்ளிவிவரம்', 'எண்ணிக்கை', 'आंकड़े', 'मामले', 'गिनती'],
    boost: 1,
    a: {
      en: `Tamil Nadu dog bites (official, state level):\n• 2022: 3,64,435 · 2023: 4,41,796 · 2024: 4,80,427\n• Suspected human rabies deaths: 2 (2022), 5 (2023), 2 (2024).\n• See the Chennai dashboard for more.`,
      ta: `தமிழ்நாடு நாய் கடிகள் (அதிகாரப்பூர்வ, மாநில அளவு):\n• 2022: 3,64,435 · 2023: 4,41,796 · 2024: 4,80,427\n• சந்தேகத்திற்குரிய மனித மரணங்கள்: 2 (2022), 5 (2023), 2 (2024).\n• மேலும் சென்னை டாஷ்போர்டில்.`,
      hi: `तमिलनाडु में कुत्ते के काटने (आधिकारिक, राज्य स्तर):\n• 2022: 3,64,435 · 2023: 4,41,796 · 2024: 4,80,427\n• संदिग्ध मानव रेबीज़ मौतें: 2 (2022), 5 (2023), 2 (2024)।\n• ज़्यादा जानकारी डैशबोर्ड में।`,
    },
    actions: ['dashboard'],
  },
  {
    id: 'call108',
    kw: ['108', 'call', 'phone', 'number', 'helpline', 'help', 'udhavi', 'madad', 'உதவி', 'அழை', 'எண்', 'मदद', 'हेल्पलाइन', 'नंबर'],
    a: {
      en: `Emergency help:\n• Call 108 (free ambulance in Tamil Nadu) for heavy bleeding, face/head bites or a very sick person.\n• For everything else, go to the nearest government hospital today.`,
      ta: `அவசர உதவி:\n• அதிக இரத்தம், முகம்/தலை கடி, மிக மோசமான நிலை என்றால் 108 அழைக்கவும்.\n• மற்றவற்றுக்கு இன்றே அருகிலுள்ள அரசு மருத்துவமனைக்குச் செல்லுங்கள்.`,
      hi: `आपात मदद:\n• ज़्यादा खून, चेहरे/सिर पर काटने या बहुत बीमार व्यक्ति के लिए 108 पर कॉल करें।\n• बाकी सब के लिए आज ही नज़दीकी सरकारी अस्पताल जाएँ।`,
    },
    actions: ['call108', 'care'],
  },
  {
    id: 'app_help',
    kw: ['language', 'tamil', 'hindi', 'english', 'dark', 'theme', 'colour', 'color', 'font', 'text size', 'settings', 'mozhi', 'bhasha', 'மொழி', 'தீம்', 'அமைப்பு', 'भाषा', 'थीम', 'सेटिंग'],
    boost: 1,
    a: {
      en: `App settings:\n• Open Settings to change language (English / தமிழ் / हिन्दी), theme (light / dark / high contrast), colour and text size.`,
      ta: `செயலி அமைப்புகள்:\n• மொழி, தீம், நிறம், எழுத்து அளவை மாற்ற "அமைப்புகள்" திறக்கவும்.`,
      hi: `ऐप सेटिंग:\n• भाषा, थीम, रंग और अक्षर आकार बदलने के लिए "सेटिंग्स" खोलें।`,
    },
    actions: ['settings'],
  },
  {
    id: 'greeting',
    kw: ['hi', 'hello', 'hey', 'vanakkam', 'namaste', 'namaskar', 'வணக்கம்', 'नमस्ते', 'नमस्कार', 'good morning'],
    a: {
      en: `Hello! Ask me about animal bites, rabies, vaccines or where to get care in Chennai.\nIf someone was just bitten: wash with soap and running water for 15 minutes and see a doctor today.`,
      ta: `வணக்கம்! விலங்கு கடி, வெறிநாய்க்கடி, தடுப்பூசி, சென்னையில் சிகிச்சை பற்றி கேளுங்கள்.\nஇப்போது கடிபட்டிருந்தால்: 15 நிமிடம் சோப்பு, ஓடும் தண்ணீரில் கழுவி இன்றே மருத்துவரைப் பாருங்கள்.`,
      hi: `नमस्ते! जानवर के काटने, रेबीज़, टीके या चेन्नई में इलाज के बारे में पूछें।\nअभी काटा है तो: 15 मिनट साबुन और बहते पानी से धोएँ और आज ही डॉक्टर को दिखाएँ।`,
    },
  },
  {
    id: 'thanks',
    kw: ['thanks', 'thank', 'ok', 'okay', 'nandri', 'dhanyavad', 'shukriya', 'நன்றி', 'धन्यवाद', 'शुक्रिया'],
    a: {
      en: `You're welcome. Stay safe — and remember: any bite needs washing for 15 minutes and a doctor's check.`,
      ta: `நன்றி. பாதுகாப்பாக இருங்கள் — எந்த கடிக்கும் 15 நிமிடம் கழுவி மருத்துவர் பரிசோதனை தேவை.`,
      hi: `आपका स्वागत है। सुरक्षित रहें — कोई भी काटना हो तो 15 मिनट धोएँ और डॉक्टर को दिखाएँ।`,
    },
  },
];

export const FALLBACK: Record<Lang, string> = {
  en: `I'm not sure I understood. Try words like "dog bite", "scratch", "vaccine", "bleeding" or "hospital".\nIf anyone was bitten or scratched: ${WASH.en}`,
  ta: `புரியவில்லை. "நாய் கடி", "கீறல்", "தடுப்பூசி", "இரத்தம்", "மருத்துவமனை" போன்ற வார்த்தைகளை முயலவும்.\nகடி அல்லது கீறல் என்றால்: ${WASH.ta}`,
  hi: `समझ नहीं आया। "कुत्ते ने काटा", "खरोंच", "टीका", "खून", "अस्पताल" जैसे शब्द आज़माएँ।\nअगर काटा या खरोंचा है: ${WASH.hi}`,
};

const norm = (s: string) => ` ${s.toLowerCase().normalize('NFC').replace(/[^\p{L}\p{M}\p{N}]+/gu, ' ').trim()} `;

/** Score each intent by keyword hits (whole words, multi-word phrases, and Tamil/Hindi stems). */
export function matchIntents(text: string, max = 2): Intent[] {
  const q = norm(text);
  const words = q.trim().split(' ').filter(Boolean);
  const scored = INTENTS.map((it) => {
    let s = 0;
    for (const k of it.kw) {
      const kk = norm(k).trim();
      if (!kk) continue;
      if (kk.includes(' ')) {
        if (q.includes(` ${kk} `)) s += 3;
      } else if (words.includes(kk)) s += 2;
      // stems: கடி → கடித்தது, काट → काटा (non-Latin only, to avoid "pet" ⊂ "petrol")
      else if (/[^\x00-\x7F]/.test(kk) && kk.length >= 2 && words.some((w) => w.startsWith(kk))) s += 1.5;
    }
    return { it, s: s ? s + (it.boost || 0) : 0 };
  })
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s);
  if (!scored.length) return [];
  const top = scored[0].s;
  // keep the best match and any close second (e.g. "cat scratch on my child's face")
  return scored.filter((x, i) => i === 0 || x.s >= top * 0.6).slice(0, max).map((x) => x.it);
}

/** Full offline answer in the user's language, with merged action buttons. */
export function answer(text: string, lang: Lang): { text: string; actions: Action[]; ids: string[] } {
  const hits = matchIntents(text);
  if (!hits.length) return { text: FALLBACK[lang], actions: ['care', 'learn'], ids: [] };
  const actions = [...new Set(hits.flatMap((h) => h.actions || []))];
  return { text: hits.map((h) => h.a[lang]).join('\n\n'), actions, ids: hits.map((h) => h.id) };
}
