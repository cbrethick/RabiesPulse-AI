import { useEffect, useState, type ReactNode } from 'react';
import { ArrowLeft, Home, AlertCircle, ShieldCheck, Newspaper } from 'lucide-react';
import { go, goBack, useApp } from '../lib/app';
import { load, type Cat, type Facility } from '../lib/data';
import type { Key } from '../lib/i18n';

export function Topbar({ title, home = true, right }: { title: string; home?: boolean; right?: ReactNode }) {
  const { t } = useApp();
  return (
    <header className="topbar">
      <button className="iconbtn" onClick={goBack} aria-label={t('back')}>
        <ArrowLeft size={24} />
      </button>
      <h1>{title}</h1>
      {right}
      {home && (
        <button className="iconbtn" onClick={() => go('/')} aria-label={t('home')}>
          <Home size={22} />
        </button>
      )}
    </header>
  );
}

export const Spinner = ({ label }: { label?: string }) => (
  <div className="empty" role="status">
    <div className="spinner" />
    {label}
  </div>
);

export const ErrorBox = ({ children }: { children: ReactNode }) => (
  <div className="error" role="alert">
    <AlertCircle size={20} style={{ flex: 'none' }} />
    <div>{children}</div>
  </div>
);

export const CAT_VAR: Record<Cat, string> = {
  gcc: '--c-govt',
  govh: '--c-govt',
  hospital: '--c-hosp',
  clinic: '--c-clinic',
  vet: '--c-vet',
  abc: '--c-abc',
};
export const catKey = (c: Cat) => `cat_${c}` as Key;
export const cssVar = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

export function CatBadge({ cat }: { cat: Cat }) {
  const { t } = useApp();
  return (
    <span className="badge">
      <i className="dot" style={{ background: `var(${CAT_VAR[cat]})` }} />
      {t(catKey(cat))}
    </span>
  );
}

/** Load a bundled JSON file with loading / error / retry states. */
export function useData<T>(file: string) {
  const [state, setState] = useState<{ data?: T; error?: string; loading: boolean }>({ loading: true });
  const [n, setN] = useState(0);
  useEffect(() => {
    let alive = true;
    setState({ loading: true });
    load<T>(file)
      .then((data) => alive && setState({ data, loading: false }))
      .catch((e) => alive && setState({ error: String(e), loading: false }));
    return () => {
      alive = false;
    };
  }, [file, n]);
  return { ...state, retry: () => setN((x) => x + 1) };
}

export function DataGate<T>({ q, children }: { q: ReturnType<typeof useData<T>>; children: (d: T) => ReactNode }) {
  const { t } = useApp();
  if (q.loading) return <Spinner label={t('loading')} />;
  if (q.error || !q.data)
    return (
      <div className="stack">
        <ErrorBox>{t('loadError')}</ErrorBox>
        <button className="btn" onClick={q.retry}>
          {t('retry')}
        </button>
      </div>
    );
  return <>{children(q.data)}</>;
}

/** Re-render when theme/accent changes so canvas colours (Leaflet) follow the theme. */
export function useThemeKey() {
  const { settings } = useApp();
  return `${settings.theme}-${settings.accent}`;
}

/** Only facilities with a documented listing get this badge (official list or news report). */
export function ArvBadge({ f }: { f: Facility }) {
  const { t } = useApp();
  if (!f.arv) return null;
  return f.arv.status === 'official' ? (
    <span className="badge arv">
      <ShieldCheck size={13} /> ✓ {t('cat_arv')}
    </span>
  ) : (
    <span className="badge arv news">
      <Newspaper size={13} /> {t('arvNews')}
    </span>
  );
}

/** A visible photo with a short caption (used on the Bite and Awareness pages). */
export const PhotoBanner = ({ src, caption }: { src: string; caption: string }) => (
  <figure className="photo-banner" style={{ margin: 0 }}>
    <img src={src} alt={caption} loading="lazy" />
    <figcaption>{caption}</figcaption>
  </figure>
);
