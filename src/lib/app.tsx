import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { translate, type Key, type Lang } from './i18n';
import { watchPosition, type GeoErr, type LatLon } from './geo';

export type Theme = 'light' | 'dark' | 'contrast';
export type Accent = 'teal' | 'blue' | 'red' | 'purple';
export type TextSize = 'm' | 'l' | 'xl';

export interface Settings {
  lang: Lang;
  theme: Theme;
  accent: Accent;
  text: TextSize;
}

export interface Profile {
  name: string;
  emergency: string;
}

/** Where the user is "searching from". Kept in memory only — never stored. */
export interface Origin extends LatLon {
  source: 'gps' | 'manual';
  label?: string;
  accuracy?: number;
}

export type GpsStatus = 'off' | 'locating' | 'live' | 'error';

const SETTINGS_KEY = 'rp_settings';
const DEFAULTS: Settings = { lang: 'en', theme: 'light', accent: 'teal', text: 'm' };

function readJSON<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? { ...fallback, ...JSON.parse(v) } : fallback;
  } catch {
    return fallback;
  }
}

interface Ctx {
  settings: Settings;
  setSettings: (s: Partial<Settings>) => void;
  t: (k: Key, vars?: Record<string, string | number>) => string;
  user: string | null;
  setUser: (m: string | null) => void;
  profile: Profile;
  saveProfile: (p: Profile) => void;
  origin: Origin | null;
  setOrigin: (o: Origin | null) => void;
  gps: { status: GpsStatus; error: GeoErr | null };
  /** Starts live GPS. Call only from a user tap. */
  startGps: () => void;
  stopGps: () => void;
}

const AppCtx = createContext<Ctx>(null as unknown as Ctx);
export const useApp = () => useContext(AppCtx);

export function AppProvider({ initialUser, children }: { initialUser: string | null; children: ReactNode }) {
  const [settings, setS] = useState<Settings>(() => readJSON(SETTINGS_KEY, DEFAULTS));
  const [user, setUser] = useState<string | null>(initialUser);
  const [profile, setProfile] = useState<Profile>({ name: '', emergency: '' });
  const [origin, setOriginState] = useState<Origin | null>(null);
  const [gps, setGps] = useState<{ status: GpsStatus; error: GeoErr | null }>({ status: 'off', error: null });
  const stopRef = useRef<(() => void) | null>(null);

  const stopGps = useCallback(() => {
    stopRef.current?.();
    stopRef.current = null;
    setGps((g) => (g.status === 'error' ? g : { status: 'off', error: null }));
  }, []);

  const startGps = useCallback(() => {
    stopRef.current?.();
    setGps({ status: 'locating', error: null });
    stopRef.current = watchPosition(
      (p) => {
        setGps({ status: 'live', error: null });
        setOriginState({ lat: p.lat, lon: p.lon, accuracy: p.accuracy, source: 'gps' });
      },
      (e) => {
        stopRef.current?.();
        stopRef.current = null;
        setGps({ status: 'error', error: e });
      },
    );
  }, []);

  // Choosing an area by hand stops live GPS (otherwise the next fix would overwrite it).
  const setOrigin = useCallback((o: Origin | null) => {
    if (!o || o.source === 'manual') {
      stopRef.current?.();
      stopRef.current = null;
      setGps({ status: 'off', error: null });
    }
    setOriginState(o);
  }, []);

  useEffect(() => () => stopRef.current?.(), []);

  useEffect(() => {
    const h = document.documentElement;
    h.dataset.theme = settings.theme;
    h.dataset.accent = settings.accent;
    h.dataset.text = settings.text;
    h.lang = settings.lang;
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      /* storage blocked: settings just won't persist */
    }
  }, [settings]);

  useEffect(() => {
    setProfile(user ? readJSON(`rp_profile_${user}`, { name: '', emergency: '' }) : { name: '', emergency: '' });
    if (!user) setOrigin(null);
  }, [user, setOrigin]);

  const setSettings = useCallback((s: Partial<Settings>) => setS((p) => ({ ...p, ...s })), []);
  const saveProfile = useCallback(
    (p: Profile) => {
      setProfile(p);
      if (user) localStorage.setItem(`rp_profile_${user}`, JSON.stringify(p));
    },
    [user],
  );
  const t = useCallback((k: Key, vars?: Record<string, string | number>) => translate(settings.lang, k, vars), [settings.lang]);

  const value = useMemo(
    () => ({ settings, setSettings, t, user, setUser, profile, saveProfile, origin, setOrigin, gps, startGps, stopGps }),
    [settings, setSettings, t, user, profile, saveProfile, origin, setOrigin, gps, startGps, stopGps],
  );
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

// ---------------------------------------------------------------- tiny hash router
// Hash routes work on Vercel and inside the Android WebView without server rewrites,
// and the phone's back button follows browser history.
export function useRoute() {
  const [hash, setHash] = useState(() => window.location.hash.slice(1) || '/');
  useEffect(() => {
    const on = () => {
      setHash(window.location.hash.slice(1) || '/');
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  const [path, query = ''] = hash.split('?');
  return { path, params: new URLSearchParams(query) };
}

export const go = (to: string) => {
  window.location.hash = to;
};

export function goBack() {
  if (window.history.length > 1) window.history.back();
  else go('/');
}
