import { useState } from 'react';
import { User, Languages, Palette, Type, Info, LogOut, Trash2, Phone, Lock } from 'lucide-react';
import { go, useApp, useRoute, type Accent, type TextSize, type Theme } from '../lib/app';
import { deleteAccount, logout } from '../lib/auth';
import { deleteAllReports } from '../lib/reports';
import { LANG_NAMES, type Lang } from '../lib/i18n';
import { telUrl } from '../lib/geo';
import { Topbar } from '../components/ui';

const ACCENTS: { a: Accent; c: string }[] = [
  { a: 'teal', c: '#0f766e' },
  { a: 'blue', c: '#1d4ed8' },
  { a: 'red', c: '#b91c1c' },
  { a: 'purple', c: '#6d28d9' },
];

export default function Settings() {
  const { t, settings, setSettings, user, setUser, profile, saveProfile } = useApp();
  const { params } = useRoute();
  const [name, setName] = useState(profile.name);
  const [emergency, setEmergency] = useState(profile.emergency);
  const [saved, setSaved] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const emTel = telUrl(profile.emergency);

  return (
    <div className="app">
      <Topbar title={t('tile_settings')} />
      <main className="page">
        {params.get('welcome') && <div className="ok">{t('welcome')}</div>}

        <section className="card stack">
          <h2 className="row">
            <User size={20} /> {t('profile')}
          </h2>
          <label className="field">
            {t('name')}
            <input className="input" value={name} maxLength={40} onChange={(e) => (setName(e.target.value), setSaved(false))} autoComplete="name" />
          </label>
          <label className="field">
            {t('mobile')}
            <input className="input" value={user ? `+91 ${user}` : ''} readOnly disabled />
          </label>
          <label className="field">
            {t('emergencyContact')}
            <input className="input" type="tel" inputMode="tel" value={emergency} maxLength={15} onChange={(e) => (setEmergency(e.target.value), setSaved(false))} />
          </label>
          <div className="row">
            <button
              className="btn primary grow"
              onClick={() => {
                saveProfile({ name: name.trim(), emergency: emergency.trim() });
                setSaved(true);
              }}
            >
              {saved ? t('savedOk') : t('save')}
            </button>
            {emTel && (
              <a className="btn grow" href={emTel}>
                <Phone size={18} /> {t('call')}
              </a>
            )}
          </div>
        </section>

        <section className="card stack">
          <h2 className="row">
            <Languages size={20} /> {t('language')}
          </h2>
          <div className="choices">
            {(Object.keys(LANG_NAMES) as Lang[]).map((l, i, a) => (
              <button key={l} className={`choice${a.length % 2 && i === a.length - 1 ? ' full' : ''}`} style={{ justifyContent: 'center', fontSize: '1.1rem' }} aria-pressed={settings.lang === l} onClick={() => setSettings({ lang: l })} lang={l}>
                {LANG_NAMES[l]}
              </button>
            ))}
          </div>
        </section>

        <section className="card stack">
          <h2 className="row">
            <Palette size={20} /> {t('look')}
          </h2>
          <span className="bold small">{t('theme')}</span>
          <div className="seg" role="group" aria-label={t('theme')} style={{ width: '100%' }}>
            {(['light', 'dark', 'contrast'] as Theme[]).map((th) => (
              <button key={th} className="grow" aria-pressed={settings.theme === th} onClick={() => setSettings({ theme: th })} style={{ justifyContent: 'center' }}>
                {t(`theme_${th}`)}
              </button>
            ))}
          </div>
          <span className="bold small">{t('colour')}</span>
          <div className="row" role="group" aria-label={t('colour')}>
            {ACCENTS.map(({ a, c }) => (
              <button key={a} className="swatch" style={{ background: c }} aria-pressed={settings.accent === a} aria-label={a} onClick={() => setSettings({ accent: a })} disabled={settings.theme === 'contrast'} />
            ))}
          </div>
          <span className="bold small row">
            <Type size={16} /> {t('textSize')}
          </span>
          <div className="seg" role="group" aria-label={t('textSize')} style={{ width: '100%' }}>
            {(['m', 'l', 'xl'] as TextSize[]).map((s, i) => (
              <button key={s} className="grow" aria-pressed={settings.text === s} onClick={() => setSettings({ text: s })} style={{ justifyContent: 'center', fontSize: `${1 + i * 0.15}rem` }}>
                A
              </button>
            ))}
          </div>
        </section>

        <button className="btn block" onClick={() => go('/about')}>
          <Info size={18} /> {t('about')}
        </button>

        <div className="row small muted">
          <Lock size={16} /> {t('privacy')}
        </div>

        <button
          className="btn block"
          onClick={async () => {
            await logout();
            setUser(null);
            go('/login');
          }}
        >
          <LogOut size={18} /> {t('logout')}
        </button>
        <button
          className={`btn block${confirmDel ? ' danger' : ''}`}
          onClick={async () => {
            if (!confirmDel) return setConfirmDel(true);
            if (user) {
              await deleteAllReports(user).catch(() => {});
              deleteAccount(user);
            }
            setUser(null);
            go('/login');
          }}
        >
          <Trash2 size={18} /> {confirmDel ? t('tapAgainAll') : t('deleteAll')}
        </button>
        <p className="tiny muted center">RabiesPulse AI v1.0 · {t('localOnly')}</p>
      </main>
    </div>
  );
}
