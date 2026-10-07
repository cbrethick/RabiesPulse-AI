import { ExternalLink } from 'lucide-react';
import { useApp } from '../lib/app';
import type { Meta } from '../lib/data';
import { DataGate, Topbar, useData } from '../components/ui';
import { Sources } from './Dashboard';
import { SOURCES } from '../lib/content';

const LIMITS = [
  'Not a medical device. It does not diagnose rabies or prescribe treatment.',
  'The national NRCP clinic list (26 Mar 2026) has no Chennai entry. The ✓ badge marks only the 4 Chennai hospitals on Tamil Nadu’s official anti-rabies clinic list (State Action Plan, Oct 2024); one more is marked from a Sep 2025 news report.',
  'Tamil Nadu policy says anti-rabies vaccine should be in every govt facility, but in 2025 some Chennai UPHCs referred patients to big hospitals. Always call first.',
  'Vaccine stock and opening hours are not known, except “24×7” where GCC data states it.',
  'Distances are straight-line, not road distance or travel time.',
  'Dog-bite numbers are Tamil Nadu state totals. There is no ward-level bite or rabies data, so the dashboard shows access to care, not risk or outbreaks.',
  'Population is a WorldPop modelled estimate, not a census count.',
  'OpenStreetMap data can be incomplete or out of date.',
  'Login is local to this device (hashed password, demo verification code, no SMS). Fine for a prototype, not for real personal health data.',
  'Reports stay on this device and are never sent to GCC or any authority.',
];

export default function About() {
  const { t } = useApp();
  const meta = useData<Meta>('meta.json');
  return (
    <div className="app">
      <Topbar title={t('about')} />
      <main className="page">
        <section className="card stack">
          <div className="brand">
            <img className="logo" src="./icon-192.png" alt="" />
            <div>
              <h2>RabiesPulse AI</h2>
              <p className="small muted">{t('tagline')}</p>
            </div>
          </div>
          <p className="small">Chennai Rabies Awareness Hackathon prototype. Works offline with bundled data; maps need internet.</p>
        </section>
        <section className="card stack">
          <h2>{t('limitations')}</h2>
          <ul className="small stack" style={{ paddingLeft: 18, gap: 6, margin: 0 }}>
            {LIMITS.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </section>
        <DataGate q={meta}>{(m) => <Sources meta={m} />}</DataGate>
        <section className="card stack small">
          <h3>{t('sources')}</h3>
          {SOURCES.filter((s) => s.url).map((s) => (
            <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer">
              {s.name} <ExternalLink size={12} />
            </a>
          ))}
          <span className="muted">
            Map tiles &amp; facility data © OpenStreetMap contributors (ODbL). Ward boundaries: DataMeet / Transparent Chennai (CC BY-SA 2.5 IN). Population: WorldPop (CC BY 4.0).
          </span>
          <span className="muted">
            Android AI: bundled model Qwen3-0.6B (Apache-2.0, Qwen team). If Gemma is bundled instead: Gemma is provided under and subject to the Gemma Terms of Use found at{' '}
            <a href="https://ai.google.dev/gemma/terms" target="_blank" rel="noopener noreferrer">
              ai.google.dev/gemma/terms
            </a>{' '}
            (see also the Prohibited Use Policy). Runtime: LiteRT-LM (Apache-2.0). The model runs only on your phone.
          </span>
        </section>
      </main>
    </div>
  );
}
