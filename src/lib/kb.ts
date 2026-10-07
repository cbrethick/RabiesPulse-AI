// Offline knowledge base for the AI assistant (and the fallback "guide" answers).
// Every chunk is short, factual and sourced. Retrieval is keyword-based so it works
// without any model; the on-device model only rephrases these facts.

export interface Chunk {
  id: string;
  title: string;
  text: string;
  source: string;
  /** extra search words, including Tamil and Hindi */
  kw: string;
}

export const FIRST_AID =
  'Wash the wound immediately with soap and running water for at least 15 minutes. Seek urgent medical assessment at a healthcare facility. Do not wait for symptoms or delay medical care while using this app.';

export const KB: Chunk[] = [
  {
    id: 'firstaid',
    title: 'Right after a bite or scratch',
    text: `${FIRST_AID} Do not put chilli, turmeric, oil, mud or other home remedies on the wound. Every animal bite or scratch that breaks the skin, and licks on broken skin, eyes or mouth, needs a doctor's check the same day.`,
    source: 'NRCP (MoHFW) wound-washing advice; WHO rabies fact sheet',
    kw: 'bite bitten scratch lick wound wash soap water first aid what do now dog cat monkey help கடி காயம் கழுவ சோப்பு முதலுதவி நாய் काटा घाव धोना साबुन प्राथमिक कुत्ता',
  },
  {
    id: 'emergency',
    title: 'Emergency',
    text: 'For heavy bleeding, a deep wound, or a bite on the face, head or neck, press the wound with a clean cloth and call 108 (emergency ambulance), or go to the nearest government hospital now.',
    source: 'Tamil Nadu 108 emergency service',
    kw: 'emergency bleeding blood deep face head neck ambulance 108 serious இரத்தம் அவசர முகம் ஆம்புலன்ஸ் खून आपातकाल चेहरा एम्बुलेंस',
  },
  {
    id: 'doctor',
    title: 'What the doctor decides',
    text: 'Only a doctor can assess the wound and decide the treatment. Treatment after exposure can include wound care, anti-rabies vaccine (ARV) and, for some wounds, rabies immunoglobulin. Do not wait for symptoms, and do not wait to see whether the animal gets sick. This app does not diagnose and does not give dose schedules.',
    source: 'WHO rabies fact sheet; NRCP',
    kw: 'doctor treatment vaccine injection dose schedule immunoglobulin rig arv pep how many days மருத்துவர் சிகிச்சை தடுப்பூசி ஊசி डॉक्टर इलाज टीका इंजेक्शन',
  },
  {
    id: 'where',
    title: 'Where to get anti-rabies vaccine in Chennai',
    text: "Tamil Nadu's State Action Plan for Rabies Elimination (Oct 2024) lists these Chennai anti-rabies clinics: Government Madras Medical College (Rajiv Gandhi Government General Hospital), Government Stanley Medical College Hospital, Government Kilpauk Medical College Hospital, and Government Medical College at Omandurar Government Estate; south of the city, Government Chengalpattu Medical College Hospital is also on the list. The same plan says anti-rabies vaccine is on the Essential Drug List, which mandates it in all government health facilities including PHCs. In 2025 the news reported that some Chennai UPHCs sent bite patients to bigger hospitals, so call first if you can. Use 'Find nearby care' in this app to navigate.",
    source: 'TN State Action Plan for Dog-Mediated Rabies Elimination by 2030 (Oct 2024); MedBound Times 18 Sep 2025',
    kw: 'where hospital clinic vaccine available near nearest chennai stanley kilpauk rajiv gandhi general hospital omandurar uphc phc government arv get எங்கே மருத்துவமனை தடுப்பூசி அருகில் சென்னை कहाँ अस्पताल टीका पास चेन्नई',
  },
  {
    id: 'what',
    title: 'What is rabies',
    text: 'Rabies is a virus that attacks the brain and nerves. Once symptoms start it is almost always fatal, but it is preventable with quick care after an exposure.',
    source: 'WHO rabies fact sheet',
    kw: 'what is rabies virus disease fatal symptoms brain வெறிநாய்க்கடி நோய் என்ன வைரஸ் रेबीज़ क्या है वायरस बीमारी',
  },
  {
    id: 'spread',
    title: 'How rabies spreads',
    text: 'Rabies spreads through the saliva of an infected animal, by bites, scratches, or licks on broken skin, eyes or mouth. In India most human cases come from dogs. Unvaccinated pets can also spread it.',
    source: 'WHO rabies fact sheet',
    kw: 'spread how catch saliva lick scratch pet cat dog monkey infected transmit பரவும் உமிழ்நீர் நக்கல் கீறல் फैलता लार चाटना खरोंच',
  },
  {
    id: 'scratch',
    title: 'Scratches and licks',
    text: 'A scratch that breaks the skin, or a lick on broken skin, eyes or mouth, can also pass rabies. Wash it for 15 minutes with soap and running water and see a doctor.',
    source: 'WHO rabies fact sheet',
    kw: 'scratch small minor lick nail claw broken skin dangerous safe கீறல் நக்கல் சிறிய खरोंच छोटा चाटना',
  },
  {
    id: 'dogs',
    title: 'Vaccinating dogs',
    text: 'Vaccinating dogs stops rabies at its source. Under the Animal Birth Control Rules 2023, local bodies sterilise and vaccinate street dogs. Greater Chennai Corporation runs Animal Birth Control (ABC) centres and pet clinics. Vaccinate pet dogs and cats as your vet advises.',
    source: 'Lok Sabha USQ 4870 (01-04-2025); GCC open data (ABC centres, pet clinics)',
    kw: 'pet dog vaccinate vaccination street stray abc sterilise sterilization corporation animal birth control vet கருத்தடை தெரு நாய் தடுப்பூசி வளர்ப்பு नसबंदी आवारा पालतू टीकाकरण',
  },
  {
    id: 'myths',
    title: 'Myths',
    text: 'Myths: only street dogs spread rabies (false: unvaccinated pets can too); a small scratch is harmless (false); chilli, turmeric or oil helps (false: use soap and water); you need 14 injections in the stomach (false: that is an old method, modern vaccine is given in the arm); wait and see if the dog gets sick (false: see a doctor now).',
    source: 'WHO; NRCP',
    kw: 'myth true false 14 injections stomach turmeric chilli home remedy wait 10 days தவறான நம்பிக்கை வயிறு 14 ஊசி மஞ்சள் मिथक पेट 14 इंजेक्शन हल्दी',
  },
  {
    id: 'stats',
    title: 'Dog bites in Tamil Nadu',
    text: 'Officially reported dog-bite cases in Tamil Nadu (state level): 364,435 in 2022, 441,796 in 2023 and 480,427 in 2024; suspected human rabies deaths: 2 (2022), 5 (2023), 2 (2024). There is no ward-level bite data for Chennai in this app.',
    source: 'Lok Sabha USQ 4870, Annexures I-II (IDSP/IHIP, 27-02-2025)',
    kw: 'how many cases statistics numbers data deaths tamil nadu 2024 bites count எத்தனை புள்ளிவிவரம் மரணம் कितने आंकड़े मौत',
  },
];

const norm = (s: string) => s.toLowerCase().normalize('NFC');
// question words carry no topic ("what", "என்ன", "क्या"...)
const STOP = new Set('what how is are the a an do does i my me to of in for can it is this that which when why who should will be get நான் என் என்ன எப்படி எங்கே ஏன் இது ஒரு क्या कैसे कहाँ है हैं मैं मेरा मुझे को का की के में से अब'.split(' '));
const tokens = (s: string) => norm(s).split(/[^\p{L}\p{M}\p{N}]+/u).filter((w) => w.length > 1 && !STOP.has(w));

/** Keyword overlap with stem-style prefix matching (helps Tamil/Hindi suffixes: கடி → கடித்தது). */
export function retrieve(question: string, k = 3): Chunk[] {
  const q = tokens(question);
  const scored = KB.map((c) => {
    const kw = new Set(tokens(c.kw));
    const body = new Set(tokens(`${c.title} ${c.text}`));
    let score = 0;
    for (const w of q) {
      if (kw.has(w)) score += 3;
      else if (body.has(w)) score += 1;
      else if (w.length >= 3 && [...kw].some((x) => x.length >= 2 && (w.startsWith(x) || x.startsWith(w)))) score += 2;
    }
    return { c, score };
  }).sort((a, b) => b.score - a.score);
  const hits = scored.filter((s) => s.score > 0).slice(0, k).map((s) => s.c);
  // always include first aid when nothing matches, so the answer is never empty
  return hits.length ? hits : [KB[0]];
}
