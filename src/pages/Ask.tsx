import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Bot, Send, Square, Droplets, MapPin, Trash2, Cpu, BookOpen, RotateCcw, User, Phone, FilePlus2, BarChart3, Settings as Gear, ShieldCheck } from 'lucide-react';
import { go, useApp } from '../lib/app';
import { LocalAi, buildPrompt, cleanModelText, native, type AiStatus } from '../lib/ai';
import { answer, type Action } from '../lib/intents';
import { FIRST_AID } from '../lib/kb';
import { haversineKm, fmtKm } from '../lib/geo';
import type { Facility } from '../lib/data';
import { Topbar, useData } from '../components/ui';
import type { Lang } from '../lib/i18n';

interface Msg {
  id: string;
  role: 'user' | 'model';
  text: string;
  mode?: 'ai' | 'guide';
  sources?: string[];
  error?: boolean;
  /** checked answer from the offline answer bank (always present for model replies) */
  checked?: string;
  actions?: Action[];
  lang?: Lang;
}

const ACTION_BTN: Record<Action, { icon: typeof Bot; key: Parameters<ReturnType<typeof useApp>['t']>[0]; to?: string; href?: string; danger?: boolean }> = {
  care: { icon: MapPin, key: 'findCare', to: '/care?gps=1' },
  call108: { icon: Phone, key: 'call108', href: 'tel:108', danger: true },
  report: { icon: FilePlus2, key: 'tile_report', to: '/report' },
  learn: { icon: BookOpen, key: 'tile_learn', to: '/learn' },
  dashboard: { icon: BarChart3, key: 'tile_dash', to: '/dashboard' },
  settings: { icon: Gear, key: 'tile_settings', to: '/settings' },
};

const SUGGEST: Record<Lang, string[]> = {
  en: ['Dog bit me. What now?', 'Where can I get the anti-rabies vaccine?', 'Is a small scratch dangerous?', 'How do I protect my pet dog?', 'What is rabies?'],
  ta: ['நாய் கடித்தது. இப்போது என்ன செய்வது?', 'வெறிநாய்க்கடி தடுப்பூசி எங்கே கிடைக்கும்?', 'சிறிய கீறல் ஆபத்தா?', 'என் நாயை எப்படி பாதுகாப்பது?', 'வெறிநாய்க்கடி நோய் என்றால் என்ன?'],
  hi: ['कुत्ते ने काटा। अब क्या करूँ?', 'एंटी-रेबीज़ टीका कहाँ मिलेगा?', 'क्या छोटी खरोंच खतरनाक है?', 'अपने पालतू कुत्ते को कैसे बचाऊँ?', 'रेबीज़ क्या है?'],
};

const TXT: Record<Lang, Record<string, string>> = {
  en: { title: 'Ask RabiesPulse AI', on: 'On-device AI · works offline', guide: 'Offline guide answers', webNote: 'The AI model runs inside the Android app. Here, you get instant checked answers.', copying: 'Preparing AI (one time)…', loading: 'Loading AI on your phone…', thinking: 'Thinking…', ask: 'Ask about bites, rabies, vaccines…', retry: 'Retry AI', clear: 'Clear chat', fail: 'AI could not answer. Here is the guide:', missing: 'This build has no AI model inside. Using the guide.', unsupported: 'This phone cannot run the AI model. Using the guide.', lowRam: 'Not enough memory for AI. Using the guide.', disclaimer: 'AI can be wrong. It is not a doctor.', from: 'Based on', slow: 'Still working… the first answer can be slow.', checked: 'Checked answer' },
  ta: { title: 'RabiesPulse AI-யிடம் கேளுங்கள்', on: 'சாதனத்திலேயே AI · இணையம் தேவையில்லை', guide: 'ஆஃப்லைன் வழிகாட்டி பதில்கள்', webNote: 'AI மாதிரி Android செயலியில் இயங்கும். இங்கே வழிகாட்டியிலிருந்து பதில்கள்.', copying: 'AI தயாராகிறது (ஒரு முறை)…', loading: 'உங்கள் கைபேசியில் AI ஏற்றப்படுகிறது…', thinking: 'யோசிக்கிறது…', ask: 'கடி, வெறிநாய்க்கடி, தடுப்பூசி பற்றி கேளுங்கள்…', retry: 'AI மீண்டும்', clear: 'அரட்டையை அழி', fail: 'AI பதில் தர முடியவில்லை. வழிகாட்டி:', missing: 'இந்த பதிப்பில் AI மாதிரி இல்லை. வழிகாட்டி பயன்படுகிறது.', unsupported: 'இந்த கைபேசியில் AI இயங்காது. வழிகாட்டி பயன்படுகிறது.', lowRam: 'AI-க்கு நினைவகம் போதவில்லை. வழிகாட்டி பயன்படுகிறது.', disclaimer: 'AI தவறாக இருக்கலாம். இது மருத்துவர் அல்ல.', from: 'ஆதாரம்', slow: 'இன்னும் வேலை செய்கிறது… முதல் பதில் மெதுவாக இருக்கலாம்.', checked: 'சரிபார்க்கப்பட்ட பதில்' },
  hi: { title: 'RabiesPulse AI से पूछें', on: 'फ़ोन पर AI · बिना इंटरनेट', guide: 'ऑफ़लाइन गाइड जवाब', webNote: 'AI मॉडल Android ऐप में चलता है। यहाँ जवाब गाइड से आते हैं।', copying: 'AI तैयार हो रहा है (एक बार)…', loading: 'आपके फ़ोन पर AI लोड हो रहा है…', thinking: 'सोच रहा है…', ask: 'काटने, रेबीज़, टीके के बारे में पूछें…', retry: 'AI फिर से', clear: 'चैट साफ़ करें', fail: 'AI जवाब नहीं दे सका। गाइड:', missing: 'इस बिल्ड में AI मॉडल नहीं है। गाइड इस्तेमाल हो रहा है।', unsupported: 'यह फ़ोन AI नहीं चला सकता। गाइड इस्तेमाल हो रहा है।', lowRam: 'AI के लिए मेमोरी कम है। गाइड इस्तेमाल हो रहा है।', disclaimer: 'AI गलत हो सकता है। यह डॉक्टर नहीं है।', from: 'स्रोत', slow: 'अभी भी काम कर रहा है… पहला जवाब धीमा हो सकता है।', checked: 'जाँचा हुआ जवाब' },
};

const newId = () => Math.random().toString(36).slice(2, 10);

export default function Ask() {
  const { t, settings, user, origin } = useApp();
  const L = TXT[settings.lang];
  const key = `rp_chat_${user}`;
  const [msgs, setMsgs] = useState<Msg[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(key) || '[]');
    } catch {
      return [];
    }
  });
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<AiStatus>({ state: native ? 'idle' : 'web', progress: 0 });
  const [busyId, setBusyId] = useState<string | null>(null);
  const [slow, setSlow] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const fac = useData<Facility[]>('facilities.json');

  // chat history stays on this device
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(msgs.slice(-40)));
    } catch {
      /* storage full: history just won't persist */
    }
  }, [msgs, key]);
  // braces matter: newer browsers return a Promise from scrollIntoView, and React must not get it as a cleanup
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [msgs]);

  // native: listen for status + streamed tokens, and start loading the model
  useEffect(() => {
    if (!native) return;
    const subs: Promise<{ remove: () => Promise<void> }>[] = [
      LocalAi.addListener('aiStatus', setStatus),
      LocalAi.addListener('aiToken', ({ id, text }) => setMsgs((m) => m.map((x) => (x.id === id ? { ...x, text: x.text + text } : x)))),
      LocalAi.addListener('aiDone', ({ id }) => setBusyId((b) => (b === id ? null : b))),
      LocalAi.addListener('aiError', ({ id, error }) => {
        setMsgs((m) => m.map((x) => (x.id === id ? { ...x, error: error !== 'cancelled', text: x.text || (error === 'cancelled' ? '…' : '') } : x)));
        setBusyId((b) => (b === id ? null : b));
      }),
    ];
    LocalAi.init().then(setStatus).catch(() => setStatus({ state: 'error', progress: 0, error: 'bridge' }));
    return () => subs.forEach((p) => p.then((h) => h.remove()));
  }, []);

  useEffect(() => {
    if (!busyId) return setSlow(false);
    const id = setTimeout(() => setSlow(true), 12000);
    return () => clearTimeout(id);
  }, [busyId]);

  const nearestArv = useMemo(() => {
    if (!origin || !fac.data) return null;
    return fac.data
      .filter((f) => f.arv?.status === 'official')
      .map((f) => ({ f, km: haversineKm(origin, f) }))
      .sort((a, b) => a.km - b.km)[0];
  }, [origin, fac.data]);

  async function ask(q: string) {
    q = q.trim();
    if (!q || busyId) return;
    setInput('');
    const extra = nearestArv ? `Nearest listed anti-rabies clinic: ${nearestArv.f.name}, about ${fmtKm(nearestArv.km)} away (straight line).` : undefined;
    // reply in the language the question was typed in (Tamil / Hindi script), else the app language
    const qLang: Lang = /[\u0B80-\u0BFF]/.test(q) ? 'ta' : /[\u0900-\u097F]/.test(q) ? 'hi' : settings.lang;
    const { system, chunks } = buildPrompt(q, qLang, extra);
    const bank = answer(q, qLang);
    const u: Msg = { id: newId(), role: 'user', text: q };
    const a: Msg = { id: newId(), role: 'model', text: '', sources: [...new Set(chunks.map((c) => c.source))], checked: bank.text, actions: bank.actions, lang: qLang };

    // Small models (Qwen3 0.6B) write broken Tamil/Hindi (seen in emulator tests), so for those
    // languages we answer from the checked bank. Gemma handles all three languages.
    const aiCanAnswer = status.state === 'ready' && (qLang === 'en' || /gemma/i.test(status.model || ''));
    if (!aiCanAnswer) {
      // the checked offline answer, instantly, in the user's language
      setMsgs((m) => [...m, u, { ...a, mode: 'guide', text: bank.text, checked: undefined }]);
      return;
    }
    setMsgs((m) => [...m, u, { ...a, mode: 'ai' }]);
    setBusyId(a.id);
    const history = msgs
      .filter((m) => !m.error && m.mode !== 'guide' && m.text)
      .slice(-4)
      .map((m) => ({ role: m.role, text: m.text.slice(0, 600) }));
    try {
      await LocalAi.generate({ id: a.id, prompt: q, system, history });
    } catch {
      setMsgs((m) => m.map((x) => (x.id === a.id ? { ...x, error: true } : x)));
      setBusyId(null);
    }
  }

  const submit = (e: FormEvent) => {
    e.preventDefault();
    ask(input);
  };

  const s = status.state;
  const banner =
    s === 'ready' ? null : s === 'web' ? L.webNote : s === 'copying' ? `${L.copying} ${Math.round(status.progress * 100)}%` : s === 'loading' || s === 'idle' ? L.loading : s === 'missing' ? L.missing : s === 'unsupported' ? L.unsupported : status.error === 'lowMemory' ? L.lowRam : `${L.fail.split('.')[0]}.`;

  return (
    <div className="app">
      <Topbar
        title={L.title}
        right={
          msgs.length > 0 && (
            <button className="iconbtn" onClick={() => setMsgs([])} aria-label={L.clear} title={L.clear}>
              <Trash2 size={20} />
            </button>
          )
        }
      />
      <main className="page" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 150px)' }}>
        {/* official first-aid stays visible whatever the model does */}
        <div className="wash" style={{ padding: 14 }}>
          <h2 style={{ fontSize: '1rem' }}>
            <Droplets size={20} /> {t('washTitle')}
          </h2>
          <p style={{ fontSize: '0.88rem' }}>{settings.lang === 'en' ? FIRST_AID : t('washText')}</p>
        </div>

        <div className="row small">
          <span className="badge">
            {s === 'ready' ? <Cpu size={13} /> : <BookOpen size={13} />} {s === 'ready' ? `${L.on}` : L.guide}
          </span>
          {s === 'ready' && status.model && <span className="tiny muted">{status.model}</span>}
        </div>
        {banner && (
          <div className="card flat stack small" role="status">
            <div className="row">
              {(s === 'copying' || s === 'loading' || s === 'idle') && <div className="spinner" style={{ width: 18, height: 18 }} />}
              <span className="grow">{banner}</span>
              {s === 'error' && (
                <button className="btn sm" onClick={() => LocalAi.init().then(setStatus)}>
                  <RotateCcw size={14} /> {L.retry}
                </button>
              )}
            </div>
            {s === 'copying' && (
              <div className="progress">
                <i style={{ width: `${status.progress * 100}%` }} />
              </div>
            )}
          </div>
        )}

        {msgs.length === 0 && (
          <div className="stack">
            <div className="empty" style={{ padding: 12 }}>
              <Bot size={40} color="var(--accent-ink)" />
            </div>
            <div className="stack" style={{ gap: 8 }}>
              {SUGGEST[settings.lang].map((q) => (
                <button key={q} className="btn" style={{ justifyContent: 'flex-start', whiteSpace: 'normal', textAlign: 'left' }} onClick={() => ask(q)}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="stack" aria-live="polite">
          {msgs.map((m) =>
            m.role === 'user' ? (
              <div key={m.id} className="row" style={{ justifyContent: 'flex-end', flexWrap: 'nowrap', alignItems: 'flex-start' }}>
                <div className="card accent" style={{ padding: '10px 14px', maxWidth: '85%', borderRadius: '16px 16px 4px 16px' }}>
                  {m.text}
                </div>
                <User size={18} style={{ marginTop: 10 }} />
              </div>
            ) : (
              <div key={m.id} className="row" style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}>
                <Bot size={20} color="var(--accent-ink)" style={{ marginTop: 10 }} />
                <div className="card stack" style={{ padding: '10px 14px', maxWidth: '88%', borderRadius: '16px 16px 16px 4px', gap: 8 }}>
                  {cleanModelText(m.text) ? (
                    <div style={{ whiteSpace: 'pre-wrap' }}>{cleanModelText(m.text)}</div>
                  ) : (
                    busyId === m.id && (
                      <div className="row muted small">
                        <div className="spinner" style={{ width: 16, height: 16 }} /> {slow ? L.slow : L.thinking}
                      </div>
                    )
                  )}
                  {m.error && m.checked && (
                    <div className="small">
                      <b>{L.fail}</b>
                      <div style={{ whiteSpace: 'pre-wrap', marginTop: 6 }}>{m.checked}</div>
                    </div>
                  )}
                  {busyId !== m.id && (
                    <>
                      {m.mode === 'ai' && m.checked && !m.error && (
                        // the small model is weaker in Tamil/Hindi, so the checked answer opens by default there
                        <details className="small" open={m.lang !== undefined && m.lang !== 'en'}>
                          <summary className="row" style={{ minHeight: 32 }}>
                            <ShieldCheck size={14} color="var(--accent-ink)" /> {L.checked}
                          </summary>
                          <div style={{ whiteSpace: 'pre-wrap' }}>{m.checked}</div>
                        </details>
                      )}
                      <div className="row" style={{ gap: 6 }}>
                        <span className="badge">{m.mode === 'ai' ? <Cpu size={12} /> : <BookOpen size={12} />} {m.mode === 'ai' ? 'AI' : L.guide}</span>
                        {(m.actions?.length ? m.actions : (['care'] as Action[])).map((ac) => {
                          const b = ACTION_BTN[ac];
                          const Icon = b.icon;
                          return b.href ? (
                            <a key={ac} className={`btn sm${b.danger ? ' danger' : ''}`} href={b.href}>
                              <Icon size={14} /> {t(b.key)}
                            </a>
                          ) : (
                            <button key={ac} className="btn sm" onClick={() => go(b.to!)}>
                              <Icon size={14} /> {t(b.key)}
                            </button>
                          );
                        })}
                      </div>
                      {m.mode === 'ai' && m.sources && <div className="tiny muted">{L.from}: {m.sources.join(' · ')}</div>}
                    </>
                  )}
                </div>
              </div>
            ),
          )}
          <div ref={endRef} />
        </div>
        <p className="tiny muted center">{L.disclaimer} {t('doctorDecides')}</p>
      </main>

      <form onSubmit={submit} className="sos chatbar">
        <input className="input grow" value={input} onChange={(e) => setInput(e.target.value)} placeholder={L.ask} aria-label={L.ask} maxLength={300} enterKeyHint="send" />
        {busyId ? (
          <button type="button" className="btn danger" onClick={() => LocalAi.cancel()} aria-label="Stop">
            <Square size={18} />
          </button>
        ) : (
          <button className="btn primary" disabled={!input.trim()} aria-label="Send">
            <Send size={18} />
          </button>
        )}
      </form>
    </div>
  );
}
