import { useMemo, useState } from 'react';
import { List, Map as MapIcon, Search, ShieldAlert, X, Star } from 'lucide-react';
import { useApp, useRoute } from '../lib/app';
import type { Cat, Facility } from '../lib/data';
import { haversineKm } from '../lib/geo';
import { DataGate, Topbar, useData } from '../components/ui';
import LocationBar from '../components/LocationBar';
import FacilityCard from '../components/FacilityCard';
import MapView from '../components/MapView';
import type { Key } from '../lib/i18n';

type Group = 'arv' | 'govt' | 'hospital' | 'clinic' | 'vet' | 'abc';
const inCats = (...c: Cat[]) => (f: Facility) => c.includes(f.cat);
const GROUPS: { g: Group; test: (f: Facility) => boolean; k: Key; v: string }[] = [
  { g: 'arv', test: (f) => Boolean(f.arv), k: 'arvChip', v: '--c-arv' },
  { g: 'govt', test: inCats('gcc', 'govh'), k: 'cat_govh', v: '--c-govt' },
  { g: 'hospital', test: inCats('hospital'), k: 'cat_hospital', v: '--c-hosp' },
  { g: 'clinic', test: inCats('clinic'), k: 'cat_clinic', v: '--c-clinic' },
  { g: 'vet', test: inCats('vet'), k: 'cat_vet', v: '--c-vet' },
  { g: 'abc', test: inCats('abc'), k: 'cat_abc', v: '--c-abc' },
];

/** Specialist-only places (dental, eye, maternity…) are not where a bite gets treated: skip them in "Best nearby". */
const SPECIALIST = /\b(dental|dentist|eye|ophthal\w*|vision|maternity|lying[- ]in|obstetric\w*|fertility|ivf|cancer|onco\w*|psychiat\w*|mental|rehabilitation|dialysis|physio\w*|skin|derma\w*|ayurved\w*|siddha|unani|homoeo\w*|homeo\w*|naturopathy|yoga|tb|thoracic|chest|leprosy|ent|diagnostic\w*|scans?|lab|labs)\b/i;
const generalCare = (f: Facility) => !SPECIALIST.test(`${f.name} ${f.kind}`);

/** Without a location: listed anti-rabies clinics first, then other govt facilities. */
const rank = (f: Facility) => (f.arv?.status === 'official' ? 3 : f.arv ? 2 : f.cat === 'gcc' || f.cat === 'govh' ? 1 : 0);

export default function Care() {
  const { t } = useApp();
  const q = useData<Facility[]>('facilities.json');
  return (
    <div className="app">
      <Topbar title={t('tile_care')} />
      <main className="page">
        <DataGate q={q}>{(all) => <CareBody all={all} />}</DataGate>
      </main>
    </div>
  );
}

function CareBody({ all }: { all: Facility[] }) {
  const { t, origin, setOrigin } = useApp();
  const { params } = useRoute();
  const initial = (params.get('cat') as Group) || null;
  const [groups, setGroups] = useState<Set<Group>>(new Set(initial ? [initial] : ['arv', 'govt', 'hospital']));
  const [view, setView] = useState<'list' | 'map'>('list');
  const [text, setText] = useState('');
  const [limit, setLimit] = useState(20);
  const [picked, setPicked] = useState<Facility | null>(null);

  const rows = useMemo(() => {
    const tests = GROUPS.filter((g) => groups.has(g.g)).map((g) => g.test);
    const s = text.trim().toLowerCase();
    const list = all
      .filter((f) => tests.some((tst) => tst(f)))
      .filter((f) => !s || f.name.toLowerCase().includes(s) || (f.address || '').toLowerCase().includes(s) || (f.zoneName || '').toLowerCase().includes(s))
      .map((f) => ({ f, km: origin ? haversineKm(origin, f) : undefined }));
    if (origin) list.sort((a, b) => a.km! - b.km!);
    else list.sort((a, b) => rank(b.f) - rank(a.f) || a.f.name.localeCompare(b.f.name));
    return list;
  }, [all, groups, text, origin]);

  const toggle = (g: Group) =>
    setGroups((prev) => {
      const n = new Set(prev);
      if (n.has(g)) n.delete(g);
      else n.add(g);
      return n.size ? n : prev; // keep at least one
    });

  const animalOnly = [...groups].every((g) => g === 'vet' || g === 'abc');
  // "Best nearby": nearest listed anti-rabies clinic + nearest govt facility, shown first once a location is known
  const best = useMemo(() => {
    if (!origin) return [];
    const nearest = (pred: (f: Facility) => boolean) =>
      all
        .filter(pred)
        .map((f) => ({ f, km: haversineKm(origin, f) }))
        .sort((a, b) => a.km - b.km)[0];
    // 1) the closest hospital of any kind, 2) closest listed anti-rabies clinic, 3) closest govt facility
    const hosp = nearest((f) => (f.cat === 'hospital' || f.cat === 'govh' || f.cat === 'gcc') && generalCare(f));
    const arv = nearest((f) => f.arv?.status === 'official' && f.id !== hosp?.f.id);
    const govt = nearest((f) => (f.cat === 'gcc' || f.cat === 'govh') && generalCare(f) && f.id !== arv?.f.id && f.id !== hosp?.f.id);
    return [
      hosp && { ...hosp, label: 'nearestHosp' as const },
      arv && { ...arv, label: 'nearestArv' as const },
      govt && { ...govt, label: 'nearestGovt' as const },
    ].filter(Boolean) as { f: Facility; km: number; label: 'nearestHosp' | 'nearestArv' | 'nearestGovt' }[];
  }, [all, origin]);

  return (
    <>
      <LocationBar askNow={params.get('gps') === '1' && !origin} />

      {best.length > 0 && (
        <section className="stack" style={{ gap: 8 }} aria-label={t('bestNearby')}>
          <h2 className="row">
            <Star size={20} color="var(--c-arv)" /> {t('bestNearby')}
          </h2>
          {best.map(({ f, km, label }) => (
            <div key={f.id} className="stack" style={{ gap: 4 }}>
              <span className="tiny muted bold">{t(label)}</span>
              <FacilityCard f={f} km={km} />
            </div>
          ))}
        </section>
      )}

      <div className="card warn row small" style={{ alignItems: 'flex-start' }}>
        <ShieldAlert size={20} style={{ flex: 'none' }} />
        <div className="stack" style={{ gap: 4 }}>
          <b>{t('arvNone')}</b>
          <span>{t('arvNote')}</span>
        </div>
      </div>

      <div className="chips" role="group" aria-label="Filter">
        {GROUPS.map(({ g, k, v }) => (
          <button key={g} className="chip" aria-pressed={groups.has(g)} onClick={() => toggle(g)}>
            <i className="dot" style={{ background: `var(${v})` }} />
            {g === 'govt' ? `${t('cat_govh')} / ${t('cat_gcc')}` : g === 'arv' ? `✓ ${t(k)}` : t(k)}
          </button>
        ))}
      </div>
      {animalOnly && <div className="card warn small">{t('animalOnly')}</div>}

      <div className="row">
        <div style={{ position: 'relative' }} className="grow">
          <Search size={18} style={{ position: 'absolute', left: 14, top: 16, color: 'var(--muted)' }} />
          <input className="input" style={{ paddingLeft: 42 }} placeholder={t('searchPlace')} value={text} onChange={(e) => setText(e.target.value)} aria-label={t('searchPlace')} />
        </div>
        <div className="seg" role="group" aria-label="View">
          <button aria-pressed={view === 'list'} onClick={() => setView('list')}>
            <List size={18} /> {t('list')}
          </button>
          <button aria-pressed={view === 'map'} onClick={() => setView('map')}>
            <MapIcon size={18} /> {t('map')}
          </button>
        </div>
      </div>

      {!origin && <div className="small muted">{t('pickLocation')}</div>}

      {view === 'map' && (
        <div className="stack">
          <MapView
            facilities={rows.map((r) => r.f)}
            origin={origin}
            fitKey={origin ? `${origin.source}-${origin.label}-${origin.source === 'gps' ? 'g' : origin.lat}` : 'none'}
            onTap={(p) => setOrigin({ ...p, source: 'manual', label: `${p.lat.toFixed(3)}, ${p.lon.toFixed(3)}` })}
            onFacility={setPicked}
            fitPoints={origin ? rows.slice(0, 5).map((r) => r.f) : undefined}
          />
          {picked && (
            <div className="stack" style={{ gap: 4 }}>
              <div className="row" style={{ justifyContent: 'flex-end' }}>
                <button className="btn sm ghost" onClick={() => setPicked(null)} aria-label="close">
                  <X size={16} />
                </button>
              </div>
              <FacilityCard f={picked} km={origin ? haversineKm(origin, picked) : undefined} />
            </div>
          )}
          <div className="legend">
            {GROUPS.filter((g) => groups.has(g.g)).map((g) => (
              <span key={g.g}>
                <i className="dot" style={{ background: `var(${g.v})` }} />
                {g.g === 'govt' ? `${t('cat_govh')} / ${t('cat_gcc')}` : t(g.k)}
              </span>
            ))}
            <span>
              <i className="dot" style={{ background: 'var(--c-you)' }} /> {t('you')}
            </span>
            <span>
              {rows.length} / {all.length}
            </span>
          </div>
        </div>
      )}

      {view === 'list' && (
        <div className="stack">
          {rows.length === 0 && (
            <div className="empty">
              <Search size={32} />
              {t('noResults')}
            </div>
          )}
          {rows.slice(0, limit).map(({ f, km }) => (
            <FacilityCard key={f.id} f={f} km={km} />
          ))}
          {rows.length > limit && (
            <button className="btn block" onClick={() => setLimit((l) => l + 20)}>
              {t('showMore')} ({rows.length - limit})
            </button>
          )}
        </div>
      )}
    </>
  );
}

