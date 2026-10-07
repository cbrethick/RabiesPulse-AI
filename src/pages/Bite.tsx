import { useState } from 'react';
import { Dog, Cat, Bug, Hand, Footprints, User, CircleDot, Clock, CalendarDays, History, Droplets, Droplet, Siren, Ban, CheckCircle2, MapPin, FilePlus2, RotateCcw, Phone, Stethoscope, Zap } from 'lucide-react';
import { go, useApp } from '../lib/app';
import { PhotoBanner, Topbar } from '../components/ui';
import type { Key } from '../lib/i18n';

type Answers = { what?: string; when?: string; where?: string; bleed?: string };
type Q = { id: keyof Answers; q: Key; opts: { v: string; k: Key; icon: typeof Dog }[] };

// Monkey has no lucide icon; a neutral icon keeps the button readable (text carries the meaning).
const QUESTIONS: Q[] = [
  {
    id: 'what',
    q: 'q_what',
    opts: [
      { v: 'dog', k: 'a_dog', icon: Dog },
      { v: 'cat', k: 'a_cat', icon: Cat },
      { v: 'monkey', k: 'a_monkey', icon: CircleDot },
      { v: 'other', k: 'a_other', icon: Bug },
      { v: 'scratch', k: 'a_scratch', icon: Zap },
    ],
  },
  {
    id: 'when',
    q: 'q_when',
    opts: [
      { v: 'now', k: 'a_now', icon: Clock },
      { v: 'today', k: 'a_today', icon: CalendarDays },
      { v: 'earlier', k: 'a_earlier', icon: History },
    ],
  },
  {
    id: 'where',
    q: 'q_where',
    opts: [
      { v: 'hand', k: 'a_hand', icon: Hand },
      { v: 'leg', k: 'a_leg', icon: Footprints },
      { v: 'face', k: 'a_face', icon: User },
      { v: 'other', k: 'a_otherpart', icon: CircleDot },
    ],
  },
  {
    id: 'bleed',
    q: 'q_bleed',
    opts: [
      { v: 'yes', k: 'yes', icon: Droplets },
      { v: 'no', k: 'no', icon: Droplet },
    ],
  },
];

export default function Bite() {
  const { t } = useApp();
  const [step, setStep] = useState(0);
  const [a, setA] = useState<Answers>({});

  if (step < QUESTIONS.length) {
    const Qn = QUESTIONS[step];
    return (
      <div className="app">
        <Topbar title={t('tile_bite')} />
        <main className="page has-sos">
          {step === 0 && <PhotoBanner src="./img/bite-street-dog.jpg" caption={t('tile_bite_sub')} />}
          {/* the key action is visible from the very first screen */}
          <div className="wash" style={{ padding: 14 }}>
            <h2 style={{ fontSize: '1.1rem' }}>
              <Droplets size={22} /> {t('washTitle')}
            </h2>
          </div>
          <div className="stack" style={{ gap: 6 }}>
            <div className="small muted">{t('step', { n: step + 1 })}</div>
            <div className="progress">
              <i style={{ width: `${((step + 1) / QUESTIONS.length) * 100}%` }} />
            </div>
          </div>
          <h2 style={{ fontSize: '1.4rem' }}>{t(Qn.q)}</h2>
          <div className="choices">
            {Qn.opts.map(({ v, k, icon: Icon }, i) => (
              <button
                key={v}
                className={`choice${Qn.opts.length % 2 && i === Qn.opts.length - 1 ? ' full' : ''}`}
                aria-pressed={a[Qn.id] === v}
                onClick={() => {
                  setA({ ...a, [Qn.id]: v });
                  setStep(step + 1);
                }}
              >
                <Icon size={26} color="var(--accent-ink)" />
                {t(k)}
              </button>
            ))}
          </div>
          {step > 0 && (
            <button className="btn ghost" onClick={() => setStep(step - 1)}>
              {t('back')}
            </button>
          )}
        </main>
        <div className="sos">
          <a className="btn danger big" href="tel:108">
            <Phone size={20} /> {t('emergency')}
          </a>
        </div>
      </div>
    );
  }

  // Guidance only — no diagnosis, no risk score, no treatment schedule.
  const extra: Key[] = [];
  if (a.bleed === 'yes') extra.push('g_bleed');
  if (a.where === 'face') extra.push('g_face');
  if (a.when === 'earlier') extra.push('g_earlier');
  if (a.what === 'scratch') extra.push('g_scratch');
  extra.push('g_any');

  return (
    <div className="app">
      <Topbar title={t('tile_bite')} />
      <main className="page has-sos">
        <PhotoBanner src="./img/wash-wound.jpg" caption={t('washTitle')} />
        <section className="wash" aria-labelledby="donow">
          <h2 id="donow">
            <Droplets size={26} /> {t('doNow')}
          </h2>
          <p>{t('washText')}</p>
        </section>

        {a.bleed === 'yes' && (
          <a className="btn danger big block" href="tel:108">
            <Siren size={22} /> {t('call108')}
          </a>
        )}

        <button className="btn primary big block" onClick={() => go('/care?gps=1')}>
          <MapPin size={22} /> {t('findCare')}
        </button>

        <div className="card stack">
          <ul className="ticks">
            {extra.map((k) => (
              <li key={k}>
                <CheckCircle2 size={20} color="var(--accent-ink)" /> {t(k)}
              </li>
            ))}
          </ul>
        </div>

        <div className="card stack">
          <h3 className="row">
            <Ban size={20} color="var(--danger)" /> {t('dont')}
          </h3>
          <ul className="ticks">
            <li>
              <Ban size={18} color="var(--danger)" /> {t('dont1')}
            </li>
            <li>
              <Ban size={18} color="var(--danger)" /> {t('dont2')}
            </li>
          </ul>
        </div>

        <div className="card stack">
          <h3 className="row">
            <Stethoscope size={20} /> {t('tellDoc')}
          </h3>
          <ul className="ticks">
            <li>
              <CheckCircle2 size={18} color="var(--accent-ink)" /> {t('tell1')}
            </li>
            <li>
              <CheckCircle2 size={18} color="var(--accent-ink)" /> {t('tell2')}
            </li>
          </ul>
        </div>

        <p className="small muted">{t('doctorDecides')}</p>

        <div className="row">
          <button className="btn grow" onClick={() => go(`/report?animal=${a.what === 'scratch' ? '' : a.what}&type=${a.what === 'scratch' ? 'scratch' : 'bite'}`)}>
            <FilePlus2 size={18} /> {t('reportThis')}
          </button>
          <button
            className="btn grow"
            onClick={() => {
              setA({});
              setStep(0);
            }}
          >
            <RotateCcw size={18} /> {t('restart')}
          </button>
        </div>
      </main>
      <div className="sos">
        <a className="btn danger big" href="tel:108">
          <Phone size={20} /> {t('emergency')}
        </a>
      </div>
    </div>
  );
}
