// Short awareness cards. Facts follow WHO and India's National Rabies Control Programme (NRCP);
// dog-vaccination points also follow the supplied Lok Sabha answer (USQ 4870, 01-04-2025).
import type { Lang } from './i18n';

export type CardIcon = 'virus' | 'spread' | 'wash' | 'doctor' | 'dog';
export interface LearnCard {
  icon: CardIcon;
  title: string;
  points: string[];
}
export interface Myth {
  myth: string;
  fact: string;
}

export const CARDS: Record<Lang, LearnCard[]> = {
  en: [
    { icon: 'virus', title: 'What is rabies?', points: ['A virus that attacks the brain and nerves.', 'Once symptoms start, it is almost always fatal.', 'It is preventable with quick care after exposure.'] },
    { icon: 'spread', title: 'How it spreads', points: ['Through the saliva of an infected animal.', 'Bites, scratches, or licks on broken skin, eyes or mouth.', 'In India, dogs cause most human cases.'] },
    { icon: 'wash', title: 'Right after a bite', points: ['Wash with soap and running water for 15 minutes.', 'Go to a health facility the same day.', 'No chilli, turmeric, oil or home remedies.'] },
    { icon: 'doctor', title: 'Why see a doctor fast', points: ['A doctor checks the wound and decides the treatment.', 'Care works best when it starts early.', 'Don’t wait for symptoms or for the animal to fall sick.'] },
    { icon: 'dog', title: 'Vaccinate dogs', points: ['Vaccinating dogs stops rabies at its source.', 'Vaccinate pets as your vet advises.', 'GCC Animal Birth Control centres sterilise and vaccinate street dogs.'] },
  ],
  ta: [
    { icon: 'virus', title: 'வெறிநாய்க்கடி நோய் என்றால் என்ன?', points: ['மூளை மற்றும் நரம்புகளைத் தாக்கும் வைரஸ்.', 'அறிகுறிகள் தொடங்கிவிட்டால், பெரும்பாலும் உயிரிழப்பு.', 'உடனடி சிகிச்சையால் தடுக்க முடியும்.'] },
    { icon: 'spread', title: 'எப்படி பரவுகிறது', points: ['பாதிக்கப்பட்ட விலங்கின் உமிழ்நீர் மூலம்.', 'கடி, கீறல், அல்லது உடைந்த தோல், கண், வாயில் நக்கல்.', 'இந்தியாவில் பெரும்பாலான பாதிப்பு நாய்களால்.'] },
    { icon: 'wash', title: 'கடித்த உடனே', points: ['சோப்பு, ஓடும் தண்ணீரில் 15 நிமிடம் கழுவுங்கள்.', 'அன்றே சுகாதார நிலையத்திற்குச் செல்லுங்கள்.', 'மிளகாய், மஞ்சள், எண்ணெய், வீட்டு வைத்தியம் வேண்டாம்.'] },
    { icon: 'doctor', title: 'ஏன் உடனே மருத்துவர்?', points: ['மருத்துவர் காயத்தைப் பார்த்து சிகிச்சையை முடிவு செய்வார்.', 'சீக்கிரம் தொடங்கினால் சிகிச்சை சிறப்பாக வேலை செய்யும்.', 'அறிகுறி அல்லது விலங்கு நோய்வாய்ப்படும் வரை காத்திருக்க வேண்டாம்.'] },
    { icon: 'dog', title: 'நாய்களுக்கு தடுப்பூசி', points: ['நாய்களுக்கு தடுப்பூசி போடுவது நோயை மூலத்திலேயே தடுக்கும்.', 'கால்நடை மருத்துவர் சொல்படி வளர்ப்பு விலங்குகளுக்கு தடுப்பூசி.', 'GCC ABC மையங்கள் தெரு நாய்களுக்கு கருத்தடை, தடுப்பூசி செய்கின்றன.'] },
  ],
  hi: [
    { icon: 'virus', title: 'रेबीज़ क्या है?', points: ['एक वायरस जो दिमाग और नसों पर हमला करता है।', 'लक्षण शुरू होने के बाद यह लगभग हमेशा जानलेवा है।', 'समय पर इलाज से इसे रोका जा सकता है।'] },
    { icon: 'spread', title: 'कैसे फैलता है', points: ['संक्रमित जानवर की लार से।', 'काटने, खरोंच, या टूटी त्वचा, आँख, मुँह पर चाटने से।', 'भारत में ज़्यादातर मामले कुत्तों से होते हैं।'] },
    { icon: 'wash', title: 'काटने के तुरंत बाद', points: ['साबुन और बहते पानी से 15 मिनट धोएँ।', 'उसी दिन स्वास्थ्य केंद्र जाएँ।', 'मिर्च, हल्दी, तेल या घरेलू नुस्खे नहीं।'] },
    { icon: 'doctor', title: 'जल्दी डॉक्टर क्यों', points: ['डॉक्टर घाव देखकर इलाज तय करते हैं।', 'जल्दी शुरू करने पर इलाज सबसे अच्छा काम करता है।', 'लक्षणों या जानवर के बीमार होने का इंतज़ार न करें।'] },
    { icon: 'dog', title: 'कुत्तों का टीकाकरण', points: ['कुत्तों को टीका लगाना रेबीज़ को जड़ से रोकता है।', 'पालतू जानवरों को पशु डॉक्टर की सलाह से टीका लगवाएँ।', 'GCC ABC केंद्र आवारा कुत्तों की नसबंदी और टीकाकरण करते हैं।'] },
  ],
};

export const MYTHS: Record<Lang, Myth[]> = {
  en: [
    { myth: 'Only street dogs spread rabies.', fact: 'Unvaccinated pets and other mammals can too.' },
    { myth: 'A small scratch is harmless.', fact: 'Scratches and licks on broken skin also need a doctor.' },
    { myth: 'Chilli, turmeric or oil helps the wound.', fact: 'Use soap and water, then see a doctor.' },
    { myth: 'You need 14 injections in the stomach.', fact: 'That is an old method. Modern vaccines are given in the arm.' },
    { myth: 'Wait and see if the dog gets sick.', fact: 'Don’t wait. See a doctor now — the doctor decides.' },
  ],
  ta: [
    { myth: 'தெரு நாய்கள் மட்டுமே பரப்பும்.', fact: 'தடுப்பூசி போடாத வளர்ப்பு விலங்குகளும் பரப்பலாம்.' },
    { myth: 'சிறிய கீறல் ஆபத்தில்லை.', fact: 'உடைந்த தோலில் கீறல், நக்கலுக்கும் மருத்துவர் தேவை.' },
    { myth: 'மிளகாய், மஞ்சள், எண்ணெய் காயத்திற்கு நல்லது.', fact: 'சோப்பு, தண்ணீரால் கழுவி மருத்துவரைப் பாருங்கள்.' },
    { myth: 'வயிற்றில் 14 ஊசிகள் தேவை.', fact: 'அது பழைய முறை. இப்போது கையில் தடுப்பூசி போடப்படுகிறது.' },
    { myth: 'நாய் நோய்வாய்ப்படுமா என்று பாருங்கள்.', fact: 'காத்திருக்க வேண்டாம். இப்போதே மருத்துவரைப் பாருங்கள்.' },
  ],
  hi: [
    { myth: 'केवल आवारा कुत्ते रेबीज़ फैलाते हैं।', fact: 'बिना टीके वाले पालतू जानवर भी फैला सकते हैं।' },
    { myth: 'छोटी खरोंच से कुछ नहीं होता।', fact: 'टूटी त्वचा पर खरोंच या चाटने पर भी डॉक्टर ज़रूरी है।' },
    { myth: 'मिर्च, हल्दी या तेल घाव में मदद करते हैं।', fact: 'साबुन-पानी से धोएँ, फिर डॉक्टर को दिखाएँ।' },
    { myth: 'पेट में 14 इंजेक्शन लगते हैं।', fact: 'यह पुराना तरीका है। आधुनिक टीके बाँह में लगते हैं।' },
    { myth: 'रुकें और देखें कि कुत्ता बीमार होता है या नहीं।', fact: 'इंतज़ार न करें। अभी डॉक्टर को दिखाएँ।' },
  ],
};

export const SOURCES = [
  { name: 'WHO — Rabies fact sheet', url: 'https://www.who.int/news-room/fact-sheets/detail/rabies' },
  { name: 'NRCP — Rabies Free India (MoHFW)', url: 'https://rabiesfreeindia.mohfw.gov.in/' },
  { name: 'Tamil Nadu State Action Plan for Dog-Mediated Rabies Elimination by 2030 (Oct 2024)', url: 'https://rabiesfreeindia.mohfw.gov.in/resources/uploads/PageContentPdf/174419151310.pdf' },
  { name: 'Chennai dog-bite victims redirected for ARV — MedBound Times, 18 Sep 2025', url: 'https://www.medboundtimes.com/medicine/chennai-rabies-vaccine-delays-dog-bite-patients' },
  { name: 'Lok Sabha USQ 4870, 01-04-2025 (supplied PDF)', url: '' },
  { name: 'Greater Chennai Corporation open data — ABC centres, vet clinics (supplied KML)', url: '' },
];
