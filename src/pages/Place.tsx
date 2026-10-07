import { Navigation, Phone, Clock, Globe, MapPin, Info, ShieldAlert, ShieldCheck, ExternalLink } from 'lucide-react';
import { useApp, useRoute } from '../lib/app';
import type { Facility } from '../lib/data';
import { isHuman } from '../lib/data';
import { directionsUrl, fmtKm, haversineKm, telUrl } from '../lib/geo';
import { ArvBadge, CatBadge, DataGate, Topbar, useData } from '../components/ui';
import MapView from '../components/MapView';

export default function Place() {
  const { t } = useApp();
  const q = useData<Facility[]>('facilities.json');
  const { params } = useRoute();
  const id = params.get('id');
  return (
    <div className="app">
      <Topbar title={t('details')} />
      <main className="page">
        <DataGate q={q}>
          {(all) => {
            const f = all.find((x) => x.id === id);
            if (!f) return <div className="empty">{t('noResults')}</div>;
            return <PlaceBody f={f} />;
          }}
        </DataGate>
      </main>
    </div>
  );
}

function PlaceBody({ f }: { f: Facility }) {
  const { t, origin } = useApp();
  const tel = telUrl(f.phone);
  const km = origin ? haversineKm(origin, f) : null;
  const gpsOrigin = origin?.source === 'gps' ? origin : null;
  return (
    <>
      <div className="stack" style={{ gap: 8 }}>
        <h1 style={{ overflowWrap: 'anywhere' }}>{f.name}</h1>
        {f.nameTa && <div className="muted">{f.nameTa}</div>}
        <div className="row">
          <ArvBadge f={f} />
          <CatBadge cat={f.cat} />
          {f.is247 && (
            <span className="badge">
              <Clock size={12} /> {t('open247')}
            </span>
          )}
        </div>
      </div>

      {f.arv && (
        <div className="card arvbox stack small">
          <b className="row">
            <ShieldCheck size={18} color="var(--c-arv)" /> {f.arv.status === 'official' ? t('cat_arv') : t('arvNews')}
          </b>
          <span>
            {t('listedIn')}: {f.arv.source} ({f.arv.date})
          </span>
          <span className="muted">“{f.arv.listedName}”</span>
          <a href={f.arv.url} target="_blank" rel="noopener noreferrer">
            {t('source')} <ExternalLink size={12} />
          </a>
          <span className="muted">{t('checkFirst')}</span>
        </div>
      )}
      {!f.arv && (f.cat === 'gcc' || f.cat === 'govh') && <div className="card flat small muted">{t('arvPolicy')}</div>}

      {!isHuman(f.cat) && (
        <div className="card warn row small" style={{ alignItems: 'flex-start' }}>
          <ShieldAlert size={20} style={{ flex: 'none' }} />
          <span>{f.cat === 'abc' ? t('abcInfo') : t('animalOnly')}</span>
        </div>
      )}

      <div className="row">
        <a className="btn primary big grow" href={directionsUrl(f, gpsOrigin)} target="_blank" rel="noopener noreferrer">
          <Navigation size={20} /> {t('navigate')}
        </a>
        {tel && (
          <a className="btn big grow" href={tel}>
            <Phone size={20} /> {t('call')}
          </a>
        )}
      </div>

      <MapView short facilities={[f]} origin={origin} focus={f} />

      <div className="card stack">
        {km != null && (
          <div className="row">
            <MapPin size={18} />
            <span className="grow">{t('distance')}</span>
            <b>
              {fmtKm(km)} <span className="muted small">({t('straightLine')})</span>
            </b>
          </div>
        )}
        {f.address && (
          <div className="row" style={{ alignItems: 'flex-start' }}>
            <Info size={18} style={{ flex: 'none', marginTop: 2 }} />
            <span className="grow">{f.address}</span>
          </div>
        )}
        <div className="row">
          <Phone size={18} />
          <span className="grow">{f.phone || <span className="muted">{t('noPhone')}</span>}</span>
        </div>
        {f.website && (
          <div className="row">
            <Globe size={18} />
            <a className="grow" href={f.website} target="_blank" rel="noopener noreferrer" style={{ overflowWrap: 'anywhere' }}>
              {f.website}
            </a>
          </div>
        )}
        {(f.ward || f.zoneName) && (
          <div className="small muted">
            {f.ward && `${t('ward')} ${f.ward}`} {f.zoneName && `· ${t('zone')} ${f.zoneName}`}
          </div>
        )}
      </div>

      <div className="small muted stack" style={{ gap: 4 }}>
        <div>
          {t('source')}: {f.src === 'gcc' ? `${t('src_gcc')} — ${f.kind}` : t('src_osm')}
        </div>
        <div>{t('checkFirst')}</div>
      </div>
    </>
  );
}
