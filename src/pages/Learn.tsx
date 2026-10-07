import { Biohazard, Dog, Droplets, Stethoscope, Syringe, ExternalLink, MapPin, XCircle, CheckCircle2 } from 'lucide-react';
import { go, useApp } from '../lib/app';
import { CARDS, MYTHS, SOURCES, type CardIcon } from '../lib/content';
import { PhotoBanner, Topbar } from '../components/ui';

const ICONS: Record<CardIcon, typeof Dog> = { virus: Biohazard, spread: Dog, wash: Droplets, doctor: Stethoscope, dog: Syringe };

export default function Learn() {
  const { t, settings } = useApp();
  return (
    <div className="app">
      <Topbar title={t('tile_learn')} />
      <main className="page">
        <PhotoBanner src="./img/bite-bg.jpg" caption={t('tile_learn')} />
        {CARDS[settings.lang].map((c) => {
          const Icon = ICONS[c.icon];
          return (
            <section key={c.icon} className="card learn-card">
              <span className="ic">
                <Icon size={24} />
              </span>
              <div className="grow">
                <h2>{c.title}</h2>
                <ul>
                  {c.points.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
                {c.icon === 'wash' && (
                  <button className="btn primary sm" style={{ marginTop: 10 }} onClick={() => go('/care')}>
                    <MapPin size={16} /> {t('findCare')}
                  </button>
                )}
                {c.icon === 'dog' && (
                  <div className="row" style={{ marginTop: 10 }}>
                    <button className="btn sm" onClick={() => go('/care?cat=abc')}>
                      <MapPin size={16} /> {t('cat_abc')}
                    </button>
                    <button className="btn sm" onClick={() => go('/care?cat=vet')}>
                      <MapPin size={16} /> {t('cat_vet')}
                    </button>
                  </div>
                )}
              </div>
            </section>
          );
        })}

        <h2>{t('myths')}</h2>
        {MYTHS[settings.lang].map((m) => (
          <div key={m.myth} className="card myth">
            <div className="row" style={{ alignItems: 'flex-start' }}>
              <XCircle size={20} color="var(--danger)" style={{ flex: 'none' }} />
              <span>
                <span className="m">{t('myth')}:</span> {m.myth}
              </span>
            </div>
            <div className="row" style={{ alignItems: 'flex-start' }}>
              <CheckCircle2 size={20} color="var(--accent-ink)" style={{ flex: 'none' }} />
              <span>
                <span className="f">{t('fact')}:</span> {m.fact}
              </span>
            </div>
          </div>
        ))}

        <details className="card">
          <summary>{t('sources')}</summary>
          <ul className="small stack" style={{ paddingLeft: 18, gap: 6 }}>
            {SOURCES.map((s) => (
              <li key={s.name}>
                {s.url ? (
                  <a href={s.url} target="_blank" rel="noopener noreferrer">
                    {s.name} <ExternalLink size={12} />
                  </a>
                ) : (
                  s.name
                )}
              </li>
            ))}
          </ul>
        </details>
      </main>
    </div>
  );
}
