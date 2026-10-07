import { Siren, MapPin, BookOpen, FilePlus2, ClipboardList, Settings as Gear, Phone, Bot } from 'lucide-react';
import { go, useApp } from '../lib/app';
import { native } from '../lib/ai';

export default function Home() {
  const { t, profile } = useApp();
  const tiles = [
    { to: '/care', icon: MapPin, label: t('tile_care') },
    { to: '/learn', icon: BookOpen, label: t('tile_learn') },
    { to: '/report', icon: FilePlus2, label: t('tile_report') },
    { to: '/reports', icon: ClipboardList, label: t('tile_reports') },
    { to: '/settings', icon: Gear, label: t('tile_settings') },
  ];
  return (
    <div className="app photo-page">
      <header className="hero-auth">
        <div className="brand">
          <img className="logo" src="./icon-192.png" alt="" />
          <div>
            <h1>{t('app')}</h1>
            <p className="muted small">
              {t('hi')}
              {profile.name ? `, ${profile.name}` : ''} 👋
            </p>
          </div>
        </div>
      </header>
      <main className="page has-sos">
        <nav className="tiles" aria-label="Main">
          <button className="tile hero" onClick={() => go('/bite')}>
            <span className="ic">
              <Siren size={30} />
            </span>
            <span>
              {t('tile_bite')}
              <div className="sub">{t('tile_bite_sub')}</div>
            </span>
          </button>
          <button className="tile" style={{ gridColumn: '1 / -1', flexDirection: 'row', alignItems: 'center', minHeight: 76 }} onClick={() => go('/ask')}>
            <span className="ic">
              <Bot size={24} />
            </span>
            <span className="grow">{native ? t('tile_ask') : t('tile_ask_web')}</span>
          </button>
          {tiles.map(({ to, icon: Icon, label }) => (
            <button key={to} className="tile" onClick={() => go(to)}>
              <span className="ic">
                <Icon size={24} />
              </span>
              {label}
            </button>
          ))}
        </nav>
      </main>
      <div className="sos">
        <a className="btn danger big" href="tel:108">
          <Phone size={20} /> {t('emergency')}
        </a>
      </div>
    </div>
  );
}
