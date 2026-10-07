import { Navigation, Phone, Info, Clock } from 'lucide-react';
import { go, useApp } from '../lib/app';
import type { Facility } from '../lib/data';
import { directionsUrl, fmtKm, telUrl } from '../lib/geo';
import { ArvBadge, CatBadge } from './ui';

export default function FacilityCard({ f, km }: { f: Facility; km?: number }) {
  const { t, origin } = useApp();
  const tel = telUrl(f.phone);
  const gpsOrigin = origin?.source === 'gps' ? origin : null;
  return (
    <article className={`card place${f.arv?.status === 'official' ? ' arvbox' : ''}`}>
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <div className="grow stack" style={{ gap: 6 }}>
          <h3>{f.name}</h3>
          <div className="row" style={{ gap: 6 }}>
            <ArvBadge f={f} />
            <CatBadge cat={f.cat} />
            {f.is247 && (
              <span className="badge">
                <Clock size={12} /> 24×7
              </span>
            )}
          </div>
        </div>
        {km != null && <div className="dist">{fmtKm(km)}</div>}
      </div>
      {f.address && <div className="addr">{f.address}</div>}
      <div className="acts">
        <a className="btn primary" href={directionsUrl(f, gpsOrigin)} target="_blank" rel="noopener noreferrer">
          <Navigation size={18} /> {t('navigate')}
        </a>
        {tel ? (
          <a className="btn" href={tel}>
            <Phone size={18} /> {t('call')}
          </a>
        ) : (
          <button className="btn" disabled title={t('noPhone')}>
            <Phone size={18} /> {t('call')}
          </button>
        )}
        <button className="btn" onClick={() => go(`/place?id=${encodeURIComponent(f.id)}`)}>
          <Info size={18} /> {t('details')}
        </button>
      </div>
    </article>
  );
}
