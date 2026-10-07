import { useMemo, useState } from 'react';
import { Crosshair, MapPin, Navigation, Search, X, Globe } from 'lucide-react';
import { useApp } from '../lib/app';
import { inChennaiArea } from '../lib/geo';
import type { Locality, Ward } from '../lib/data';
import { ErrorBox, useData } from './ui';
import type { Key } from '../lib/i18n';

interface Place {
  name: string;
  sub?: string;
  lat: number;
  lon: number;
}

/**
 * GPS + manual location picker. GPS is requested only after the user reads the
 * explanation and taps Allow; it then stays live until Stop / a manual pick.
 */
export default function LocationBar({ compact, askNow }: { compact?: boolean; askNow?: boolean }) {
  const { t, origin, setOrigin, gps, startGps, stopGps } = useApp();
  // askNow only opens our explanation card; the browser permission prompt still needs a tap on Allow
  const [explain, setExplain] = useState(Boolean(askNow));
  const [editing, setEditing] = useState(false);
  const [q, setQ] = useState('');
  const [online, setOnline] = useState<{ loading: boolean; results: Place[] | null; error?: string }>({ loading: false, results: null });
  const locs = useData<Locality[]>('localities.json');
  const wards = useData<Ward[]>('wards.json');

  const places = useMemo<Place[]>(() => {
    const out: Place[] = (locs.data || []).map((l) => ({ name: l.name, lat: l.lat, lon: l.lon }));
    for (const w of wards.data || []) out.push({ name: w.label, sub: w.zoneName, lat: w.lat, lon: w.lon });
    return out;
  }, [locs.data, wards.data]);

  const matches = useMemo(() => {
    const s = q.trim().toLowerCase().replace(/[^a-z0-9 ]/g, '');
    if (s.length < 2) return [];
    return places.filter((p) => `${p.name} ${p.sub || ''}`.toLowerCase().replace(/[^a-z0-9 ]/g, '').includes(s)).slice(0, 6);
  }, [q, places]);

  const pick = (p: Place) => {
    setOrigin({ lat: p.lat, lon: p.lon, source: 'manual', label: p.name });
    setEditing(false);
    setQ('');
    setOnline({ loading: false, results: null });
  };

  async function searchOnline() {
    if (!navigator.onLine) return setOnline({ loading: false, results: null, error: t('offline') });
    setOnline({ loading: true, results: null });
    try {
      const u = new URL('https://nominatim.openstreetmap.org/search');
      u.search = new URLSearchParams({ format: 'json', q: `${q}, Chennai`, countrycodes: 'in', limit: '5', viewbox: '79.95,13.35,80.45,12.75', bounded: '1' }).toString();
      const r = await fetch(u, { headers: { Accept: 'application/json' } });
      const j: { display_name: string; lat: string; lon: string }[] = await r.json();
      setOnline({ loading: false, results: j.map((x) => ({ name: x.display_name.split(',')[0], sub: x.display_name.split(',').slice(1, 3).join(','), lat: +x.lat, lon: +x.lon })) });
    } catch {
      setOnline({ loading: false, results: null, error: t('offline') });
    }
  }

  const allow = () => {
    setExplain(false);
    setEditing(false);
    startGps();
  };

  const showSearch = !origin || editing || gps.status === 'error';

  return (
    <div className="card stack" style={{ padding: compact ? 12 : 16 }}>
      {/* current state */}
      {gps.status === 'locating' && (
        <div className="row" role="status">
          <div className="spinner" style={{ width: 20, height: 20 }} /> {t('locating')}
        </div>
      )}
      {origin && gps.status !== 'locating' && (
        <div className="row">
          {origin.source === 'gps' ? <Navigation size={20} color="var(--c-you)" /> : <MapPin size={20} color="var(--c-you)" />}
          <div className="grow">
            <div className="bold">{origin.source === 'gps' ? t('liveOn') : `${t('near')} ${origin.label}`}</div>
            {origin.source === 'gps' && origin.accuracy != null && <div className="tiny muted">{t('accuracy', { m: Math.round(origin.accuracy) })}</div>}
          </div>
          {origin.source === 'gps' ? (
            <button className="btn sm" onClick={stopGps}>
              {t('stop')}
            </button>
          ) : (
            <button className="btn sm" onClick={() => setExplain(true)}>
              <Crosshair size={16} /> GPS
            </button>
          )}
          <button className="btn sm ghost" onClick={() => setEditing((e) => !e)}>
            {t('change')}
          </button>
        </div>
      )}
      {origin?.source === 'gps' && !inChennaiArea(origin) && <div className="card warn small">{t('farAway')}</div>}

      {gps.status === 'error' && gps.error && (
        <>
          <ErrorBox>{t(`loc_${gps.error}` as Key)}</ErrorBox>
          <button className="btn" onClick={() => setExplain(true)}>
            <Crosshair size={18} /> {t('retry')}
          </button>
        </>
      )}

      {/* explanation before the permission prompt */}
      {explain && (
        <div className="card accent stack" role="dialog" aria-labelledby="locwhy">
          <h3 id="locwhy" className="row">
            <Crosshair size={20} /> {t('locWhyTitle')}
          </h3>
          <p className="small">{t('locWhy')}</p>
          <div className="row">
            <button className="btn primary grow" onClick={allow}>
              {t('allow')}
            </button>
            <button className="btn grow" onClick={() => setExplain(false)}>
              {t('notNow')}
            </button>
          </div>
        </div>
      )}

      {showSearch && !explain && (
        <>
          {!origin && gps.status !== 'locating' && gps.status !== 'error' && (
            <button className="btn primary big block" onClick={() => setExplain(true)}>
              <Crosshair size={22} /> {t('useMyLocation')}
            </button>
          )}
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: 14, top: 16, color: 'var(--muted)' }} />
            <input
              className="input"
              style={{ paddingLeft: 42, paddingRight: q ? 44 : 14 }}
              placeholder={t('searchArea')}
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setOnline({ loading: false, results: null });
              }}
              aria-label={t('searchArea')}
            />
            {q && (
              <button className="iconbtn" style={{ position: 'absolute', right: 2, top: 3 }} onClick={() => setQ('')} aria-label="clear">
                <X size={18} />
              </button>
            )}
          </div>
          {q.trim().length >= 2 && (
            <div className="stack" style={{ gap: 6 }}>
              {[...matches, ...(online.results || [])].map((p, i) => (
                <button key={`${p.name}-${i}`} className="btn" style={{ justifyContent: 'flex-start', whiteSpace: 'normal', textAlign: 'left' }} onClick={() => pick(p)}>
                  <MapPin size={18} style={{ flex: 'none' }} />
                  <span className="grow">
                    {p.name} {p.sub && <span className="muted small">· {p.sub}</span>}
                  </span>
                </button>
              ))}
              {matches.length === 0 && !online.results && !online.loading && <div className="muted small">{t('noArea')}</div>}
              {!online.results && (
                <button className="btn ghost sm" onClick={searchOnline} disabled={online.loading}>
                  <Globe size={16} /> {online.loading ? t('loading') : t('searchOnline')}
                </button>
              )}
              {online.results?.length === 0 && <div className="muted small">{t('noArea')}</div>}
              {online.error && <div className="muted small">{online.error}</div>}
            </div>
          )}
          {!compact && <div className="tiny muted">{t('tapMap')}</div>}
        </>
      )}
    </div>
  );
}
