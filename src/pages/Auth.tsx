import { useEffect, useState, type FormEvent } from 'react';
import { Eye, EyeOff, ShieldCheck, Phone } from 'lucide-react';
import { go, useApp } from '../lib/app';
import { completeRegistration, lockSecondsLeft, login, startRegistration, type AuthError } from '../lib/auth';
import { LANG_NAMES, type Key, type Lang } from '../lib/i18n';
import { ErrorBox } from '../components/ui';

function LangSwitch() {
  const { settings, setSettings } = useApp();
  return (
    <div className="seg" role="group" aria-label="Language">
      {(Object.keys(LANG_NAMES) as Lang[]).map((l) => (
        <button key={l} aria-pressed={settings.lang === l} onClick={() => setSettings({ lang: l })}>
          {LANG_NAMES[l]}
        </button>
      ))}
    </div>
  );
}

function Brand() {
  const { t } = useApp();
  return (
    <div className="hero-auth">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div className="brand">
          <img className="logo" src="./icon-192.png" alt="" />
          <h1>{t('app')}</h1>
        </div>
      </div>
      <p className="muted">{t('tagline')}</p>
      <div>
        <LangSwitch />
      </div>
    </div>
  );
}

export function PasswordInput({ id, value, onChange, label, hint, auto }: { id: string; value: string; onChange: (v: string) => void; label: string; hint?: string; auto: string }) {
  const { t } = useApp();
  const [show, setShow] = useState(false);
  return (
    <label className="field" htmlFor={id}>
      {label}
      <div className="pw">
        <input id={id} className="input" type={show ? 'text' : 'password'} value={value} onChange={(e) => onChange(e.target.value)} autoComplete={auto} required />
        <button type="button" className="btn ghost sm" onClick={() => setShow((s) => !s)} aria-label={show ? t('hide') : t('show')} aria-pressed={show}>
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {hint && <span className="hint">{hint}</span>}
    </label>
  );
}

function MobileInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t } = useApp();
  return (
    <label className="field" htmlFor="mobile">
      {t('mobile')}
      <div style={{ position: 'relative' }}>
        <span className="muted" style={{ position: 'absolute', left: 14, top: 13 }}>
          +91
        </span>
        <input id="mobile" className="input" style={{ paddingLeft: 52 }} type="tel" inputMode="numeric" autoComplete="tel-national" maxLength={14} placeholder={t('mobileHint')} value={value} onChange={(e) => onChange(e.target.value)} required />
      </div>
    </label>
  );
}

export function Login() {
  const { t, setUser } = useApp();
  const [mobile, setMobile] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState<AuthError | null>(null);
  const [busy, setBusy] = useState(false);
  const [lock, setLock] = useState(lockSecondsLeft());

  useEffect(() => {
    if (lock <= 0) return;
    const id = setInterval(() => setLock(lockSecondsLeft()), 1000);
    return () => clearInterval(id);
  }, [lock]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const r = await login(mobile, pw);
    setBusy(false);
    if (r === 'wrongLogin' || r === 'locked') {
      setErr(r);
      setLock(lockSecondsLeft());
      return;
    }
    setUser(r);
    go('/');
  }

  return (
    <div className="app photo-page">
      <Brand />
      <form className="page" onSubmit={submit} noValidate style={{ paddingBottom: 32 }}>
        <h2>{t('login')}</h2>
        {err && <ErrorBox>{t(`err_${lock > 0 ? 'locked' : err}` as Key, { s: lock })}</ErrorBox>}
        <MobileInput value={mobile} onChange={setMobile} />
        <PasswordInput id="pw" label={t('password')} value={pw} onChange={setPw} auto="current-password" />
        <button className="btn primary big block" disabled={busy || lock > 0 || !mobile || !pw}>
          {t('login')}
        </button>
        <button type="button" className="btn ghost block" onClick={() => go('/register')}>
          {t('noAccount')}
        </button>
        <a className="btn danger block" href="tel:108">
          <Phone size={18} /> {t('emergency')}
        </a>
        <p className="tiny muted center">{t('localOnly')}</p>
      </form>
    </div>
  );
}

export function Register() {
  const { t, setUser } = useApp();
  const [mobile, setMobile] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [err, setErr] = useState<AuthError | null>(null);
  const [pending, setPending] = useState<{ mobile: string; code: string } | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  function submit(e: FormEvent) {
    e.preventDefault();
    const r = startRegistration(mobile, pw, pw2);
    if (typeof r === 'string') return setErr(r);
    setErr(null);
    setPending(r);
  }

  async function verify(e: FormEvent) {
    e.preventDefault();
    if (!pending) return;
    if (code.trim() !== pending.code) return setErr('codeWrong');
    setBusy(true);
    const r = await completeRegistration(pending.mobile, pw);
    setBusy(false);
    if (r === 'alreadyRegistered') return setErr(r);
    setUser(r);
    go('/settings?welcome=1');
  }

  return (
    <div className="app photo-page">
      <Brand />
      {!pending ? (
        <form className="page" onSubmit={submit} noValidate style={{ paddingBottom: 32 }}>
          <h2>{t('register')}</h2>
          {err && <ErrorBox>{t(`err_${err}` as Key)}</ErrorBox>}
          <MobileInput value={mobile} onChange={setMobile} />
          <PasswordInput id="pw" label={t('password')} hint={t('passwordHint')} value={pw} onChange={setPw} auto="new-password" />
          <PasswordInput id="pw2" label={t('confirmPassword')} value={pw2} onChange={setPw2} auto="new-password" />
          <button className="btn primary big block">{t('createAccount')}</button>
          <button type="button" className="btn ghost block" onClick={() => go('/login')}>
            {t('haveAccount')}
          </button>
          <p className="tiny muted center">{t('localOnly')}</p>
        </form>
      ) : (
        <form className="page" onSubmit={verify} noValidate style={{ paddingBottom: 32 }}>
          <h2 className="row">
            <ShieldCheck size={22} /> {t('verifyTitle')}
          </h2>
          <div className="card warn stack">
            <p className="small bold">{t('demoCode')}</p>
            <div className="code" aria-live="polite">
              {pending.code}
            </div>
          </div>
          {err && <ErrorBox>{t(`err_${err}` as Key)}</ErrorBox>}
          <label className="field" htmlFor="code">
            {t('enterCode')}
            <input id="code" className="input" inputMode="numeric" maxLength={6} autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
          </label>
          <button className="btn primary big block" disabled={busy || code.length !== 6}>
            {t('verify')}
          </button>
          <button
            type="button"
            className="btn ghost block"
            onClick={() => {
              setPending(null);
              setCode('');
              setErr(null);
            }}
          >
            {t('back')}
          </button>
        </form>
      )}
    </div>
  );
}
