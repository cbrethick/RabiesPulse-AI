import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Database, MapPin } from 'lucide-react';
import { go, useApp } from '../lib/app';
import type { Facility, Meta, Ward } from '../lib/data';
import { listReports, type Report } from '../lib/reports';
import { DataGate, Topbar, useData } from '../components/ui';
import MapView from '../components/MapView';
import { animalKey } from './Report';
import type { Key } from '../lib/i18n';

type Metric = 'arv' | 'dist' | 'density' | 'per100k';
const METRICS: { m: Metric; k: Key; get: (w: Ward) => number | null; fmt: (v: number) => string }[] = [
  { m: 'arv', k: 'm_arv', get: (w) => w.nearestArvKm, fmt: (v) => `${v.toFixed(1)} km` },
  { m: 'dist', k: 'm_dist', get: (w) => w.nearestGovtKm, fmt: (v) => `${v.toFixed(1)} km` },
  { m: 'density', k: 'm_density', get: (w) => w.density, fmt: (v) => Math.round(v).toLocaleString('en-IN') },
  { m: 'per100k', k: 'm_per100k', get: (w) => w.govtPer100k, fmt: (v) => v.toFixed(1) },
];
const SEQ = ['--seq-1', '--seq-2', '--seq-3', '--seq-4', '--seq-5'];
const nf = (n: number) => n.toLocaleString('en-IN');

/** 5 quantile classes (equal-count) so the map is readable despite skewed values. */
function quantiles(vals: number[]) {
  const s = [...vals].sort((a, b) => a - b);
  return [1, 2, 3, 4].map((i) => s[Math.floor((i / 5) * (s.length - 1))]);
}
const classOf = (v: number, br: number[]) => br.filter((b) => v > b).length;

export default function Dashboard() {
  const { t } = useApp();
  const meta = useData<Meta>('meta.json');
  const wards = useData<Ward[]>('wards.json');
  const geo = useData<GeoJSON.FeatureCollection>('wards.geojson');
  const fac = useData<Facility[]>('facilities.json');
  const all = { loading: meta.loading || wards.loading || geo.loading || fac.loading, error: meta.error || wards.error || geo.error || fac.error, data: meta.data && wards.data && geo.data && fac.data ? { meta: meta.data, wards: wards.data, geo: geo.data, fac: fac.data } : undefined, retry: () => [meta, wards, geo, fac].forEach((q) => q.retry()) };
  return (
    <div className="app wide">
      <Topbar title={t('tile_dash')} />
      <main className="page">
        <div className="card warn row small" style={{ alignItems: 'flex-start' }}>
          <AlertTriangle size={20} style={{ flex: 'none' }} />
          <b>{t('dashNote')}</b>
        </div>
        <DataGate q={all}>{(d) => <Body {...d} />}</DataGate>
      </main>
    </div>
  );
}

function Body({ meta, wards, geo, fac }: { meta: Meta; wards: Ward[]; geo: GeoJSON.FeatureCollection; fac: Facility[] }) {
  const { t, user } = useApp();
  const [metric, setMetric] = useState<Metric>('arv');
  const [zone, setZone] = useState('');
  const [sel, setSel] = useState<string | null>(null);
  const [layers, setLayers] = useState<Set<string>>(new Set(['arv', 'govt']));
  const [reports, setReports] = useState<Report[]>([]);

  useEffect(() => {
    if (user) listReports(user).then(setReports).catch(() => setReports([]));
  }, [user]);

  const M = METRICS.find((x) => x.m === metric)!;
  const zones = useMemo(() => [...new Set(wards.map((w) => w.zoneName))].sort(), [wards]);
  const shown = useMemo(() => wards.filter((w) => !zone || w.zoneName === zone), [wards, zone]);
  const breaks = useMemo(() => quantiles(wards.map(M.get).filter((v): v is number => v != null)), [wards, M]);
  const byWard = useMemo(() => new Map(wards.map((w) => [w.ward, w])), [wards]);
  const shownIds = useMemo(() => new Set(shown.map((w) => w.ward)), [shown]);

  const wardLayer = useMemo(
    () => ({
      geojson: geo,
      selected: sel,
      onWard: setSel,
      color: (id: string) => {
        const w = byWard.get(id);
        if (!w || !shownIds.has(id)) return null;
        const v = M.get(w);
        if (v == null) return null;
        return getComputedStyle(document.documentElement).getPropertyValue(SEQ[classOf(v, breaks)]).trim();
      },
    }),
    [geo, sel, byWard, shownIds, M, breaks],
  );

  const pts = useMemo(
    () =>
      fac.filter(
        (f) =>
          ((layers.has('arv') && f.arv) ||
            (layers.has('govt') && (f.cat === 'gcc' || f.cat === 'govh')) || (layers.has('abc') && f.cat === 'abc') || (layers.has('vet') && f.cat === 'vet') || (layers.has('hospital') && f.cat === 'hospital')) &&
          (!zone || f.zoneName === zone),
      ),
    [fac, layers, zone],
  );

  const govtTotal = (meta.facilities.byCat.gcc || 0) + (meta.facilities.byCat.govh || 0);
  const bites2024 = meta.dogBites.find((b) => b.metric === 'dog_bite_cases' && b.year === '2024');
  const selW = sel ? byWard.get(sel) : null;
  const gaps = [...shown].sort((a, b) => (b.nearestArvKm ?? 0) - (a.nearestArvKm ?? 0)).slice(0, 15);

  const zoneRows = useMemo(() => {
    const m = new Map<string, { govt: number; pop: number }>();
    for (const w of wards) {
      const r = m.get(w.zoneName) || { govt: 0, pop: 0 };
      r.govt += w.govtTotal;
      r.pop += w.population || 0;
      m.set(w.zoneName, r);
    }
    return [...m.entries()].map(([z, r]) => ({ label: z, value: r.govt, sub: r.pop })).sort((a, b) => b.value - a.value);
  }, [wards]);

  const toggleLayer = (l: string) =>
    setLayers((p) => {
      const n = new Set(p);
      if (n.has(l)) n.delete(l);
      else n.add(l);
      return n;
    });

  return (
    <>
      {/* headline numbers */}
      <section className="kpis">
        <Kpi v={nf(meta.wards.count)} l={t('k_wards')} />
        <Kpi v={nf(govtTotal)} l={t('k_govt')} />
        <Kpi v={`${(meta.population.total / 1e6).toFixed(2)}M`} l={`${t('k_pop')} · WorldPop ${meta.population.year}`} />
        <Kpi v={String(meta.arv.official)} l={`${t('k_arv')} · ${t('nrcpZero')}`} />
        <Kpi v={bites2024 ? nf(bites2024.value) : '—'} l={t('k_bites')} />
      </section>

      <div className="dash-grid">
        {/* ward map */}
        <section className="card stack">
          <div className="row">
            <label className="field grow small">
              {t('colourBy')}
              <select className="select" value={metric} onChange={(e) => setMetric(e.target.value as Metric)}>
                {METRICS.map((x) => (
                  <option key={x.m} value={x.m}>
                    {t(x.k)}
                  </option>
                ))}
              </select>
            </label>
            <label className="field grow small">
              {t('zone')}
              <select className="select" value={zone} onChange={(e) => setZone(e.target.value)}>
                <option value="">{t('allZones')}</option>
                {zones.map((z) => (
                  <option key={z} value={z}>
                    {z}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="chips" role="group" aria-label={t('showPlaces')}>
            {[
              ['arv', 'arvChip', '--c-arv'],
              ['govt', 'cat_govh', '--c-govt'],
              ['hospital', 'cat_hospital', '--c-hosp'],
              ['abc', 'cat_abc', '--c-abc'],
              ['vet', 'cat_vet', '--c-vet'],
            ].map(([l, k, v]) => (
              <button key={l} className="chip" aria-pressed={layers.has(l)} onClick={() => toggleLayer(l)}>
                <i className="dot" style={{ background: `var(${v})` }} /> {t(k as Key)}
              </button>
            ))}
          </div>
          <MapView wards={wardLayer} facilities={pts} onFacility={(f) => go(`/place?id=${encodeURIComponent(f.id)}`)} />
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div className="scale" aria-label={t(M.k)}>
              <span>{M.fmt(Math.min(...wards.map(M.get).filter((v): v is number => v != null)))}</span>
              {SEQ.map((s) => (
                <i key={s} style={{ background: `var(${s})` }} />
              ))}
              <span>{M.fmt(Math.max(...wards.map(M.get).filter((v): v is number => v != null)))}</span>
            </div>
            <span className="tiny muted">{t(M.k)}</span>
          </div>
          {selW ? (
            <div className="card flat stack small" style={{ background: 'var(--surface-2)' }}>
              <b>
                {selW.label} · {selW.zoneName}
              </b>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span>{t('population')}</span>
                <b className="nums">{selW.population != null ? nf(selW.population) : '—'}</b>
              </div>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span>{t('m_density')}</span>
                <b className="nums">{selW.density != null ? nf(selW.density) : '—'}</b>
              </div>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span>{t('k_govt')}</span>
                <b className="nums">{selW.govtTotal}</b>
              </div>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span>{t('nearestArv')}</span>
                <b className="nums">
                  {selW.nearestArvKm ?? '—'} km · {selW.nearestArvName}
                </b>
              </div>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span>{t('nearestGovt')}</span>
                <b className="nums">
                  {selW.nearestGovtKm} km · {selW.nearestGovtName}
                </b>
              </div>
            </div>
          ) : (
            <div className="tiny muted">
              <MapPin size={12} /> {t('tapWard')}
            </div>
          )}
        </section>

        <div className="stack">
          <section className="card stack">
            <h2>{t('bitesChart')}</h2>
            <BitesChart meta={meta} />
            <p className="tiny muted">
              {t('partial')}. {meta.dogBites.find((b) => b.year === '2025 (Jan)' && b.metric === 'dog_bite_cases')?.value.toLocaleString('en-IN')} (Jan 2025).
            </p>
            <h3>{t('deaths')}</h3>
            <div className="tablewrap">
              <table>
                <tbody>
                  <tr>
                    {meta.dogBites
                      .filter((b) => b.metric === 'suspected_human_rabies_deaths')
                      .map((b) => (
                        <td key={b.year} className="center">
                          <div className="tiny muted">{b.year}</div>
                          <b>{b.value}</b>
                        </td>
                      ))}
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="tiny muted">IDSP/IHIP via Lok Sabha USQ 4870 · Rajya Sabha AU 1058</p>
          </section>

          <section className="card stack">
            <h2>{t('byZone')}</h2>
            <ZoneBars rows={zoneRows} />
          </section>
        </div>
      </div>

      <section className="card stack">
        <h2>{t('gapTable')}</h2>
        <p className="tiny muted">{t('gapNote')}</p>
        <div className="tablewrap">
          <table>
            <thead>
              <tr>
                <th>{t('ward')}</th>
                <th>{t('zone')}</th>
                <th className="r">{t('population')}</th>
                <th>{t('nearestArv')}</th>
                <th className="r">km</th>
                <th>{t('nearestGovt')}</th>
                <th className="r">km</th>
              </tr>
            </thead>
            <tbody>
              {gaps.map((w) => (
                <tr key={w.ward} onClick={() => setSel(w.ward)} style={{ cursor: 'pointer' }}>
                  <td>{w.label}</td>
                  <td>{w.zoneName}</td>
                  <td className="r">{w.population != null ? nf(w.population) : '—'}</td>
                  <td>{w.nearestArvName ?? '—'}</td>
                  <td className="r bold">{w.nearestArvKm?.toFixed(1) ?? '—'}</td>
                  <td>{w.nearestGovtName}</td>
                  <td className="r">{w.nearestGovtKm.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card stack">
        <h2>{t('yourReports')}</h2>
        {reports.length === 0 ? (
          <p className="small muted">{t('noReports')}</p>
        ) : (
          <div className="row">
            {Object.entries(reports.reduce<Record<string, number>>((a, r) => ({ ...a, [r.animal]: (a[r.animal] || 0) + 1 }), {})).map(([a, n]) => (
              <span key={a} className="badge">
                {t(animalKey(a))}: {n}
              </span>
            ))}
          </div>
        )}
        <p className="tiny muted">{t('notConfirmed')}</p>
      </section>

      <Sources meta={meta} />
    </>
  );
}

const Kpi = ({ v, l }: { v: string; l: string }) => (
  <div className="card kpi">
    <div className="v nums">{v}</div>
    <div className="l">{l}</div>
  </div>
);

/** Grouped bars: two official sources for the same state-level measure. One axis, shared scale. */
function BitesChart({ meta }: { meta: Meta }) {
  const [hover, setHover] = useState<{ x: number; y: number; text: string } | null>(null);
  const years = ['2018', '2019', '2020', '2021', '2022', '2023', '2024'];
  const rs = new Map(meta.dogBites.filter((b) => b.metric === 'dog_bite_cases_rs').map((b) => [b.year, b.value]));
  const ls = new Map(meta.dogBites.filter((b) => b.metric === 'dog_bite_cases').map((b) => [b.year, b.value]));
  const max = Math.max(...rs.values(), ...ls.values());
  const W = 360,
    H = 190,
    L = 36,
    B = 22,
    T = 8;
  const plotH = H - B - T;
  const gw = (W - L) / years.length;
  const bw = Math.min(16, gw / 2 - 3);
  const y = (v: number) => T + plotH - (v / max) * plotH;
  const ticks = [0, 250000, 500000, 750000].filter((v) => v <= max * 1.05);
  const bar = (v: number | undefined, x: number, cls: string, label: string) =>
    v == null ? null : (
      <path
        d={`M${x},${y(0)} V${y(v) + 4} q0,-4 4,-4 h${bw - 8} q4,0 4,4 V${y(0)} Z`}
        fill={`var(${cls})`}
        onMouseEnter={() => setHover({ x: x + bw / 2, y: y(v), text: `${label}: ${v.toLocaleString('en-IN')}` })}
        onMouseLeave={() => setHover(null)}
        onClick={() => setHover({ x: x + bw / 2, y: y(v), text: `${label}: ${v.toLocaleString('en-IN')}` })}
      />
    );
  return (
    <div className="chart">
      <div className="legend" style={{ marginBottom: 6 }}>
        <span>
          <i className="dot" style={{ background: 'var(--series-1)' }} /> Rajya Sabha AU 1058 (2018–23)
        </span>
        <span>
          <i className="dot" style={{ background: 'var(--series-2)' }} /> Lok Sabha USQ 4870 (2022–24)
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Tamil Nadu dog bite cases by year">
        {ticks.map((v) => (
          <g key={v}>
            <line className="gridline" x1={L} x2={W} y1={y(v)} y2={y(v)} />
            <text className="axis" x={L - 4} y={y(v) + 4} textAnchor="end">
              {v === 0 ? '0' : `${v / 1000}k`}
            </text>
          </g>
        ))}
        {years.map((yr, i) => {
          const x0 = L + i * gw + (gw - 2 * bw - 2) / 2;
          return (
            <g key={yr}>
              {bar(rs.get(yr), x0, '--series-1', `${yr} · Rajya Sabha`)}
              {bar(ls.get(yr), x0 + bw + 2, '--series-2', `${yr} · Lok Sabha`)}
              <text className="axis" x={L + i * gw + gw / 2} y={H - 6} textAnchor="middle">
                {yr}
              </text>
            </g>
          );
        })}
      </svg>
      {hover && (
        <div className="tip" style={{ left: `${(hover.x / W) * 100}%`, top: `${((hover.y + 26) / H) * 100}%` }}>
          {hover.text}
        </div>
      )}
      <details className="small">
        <summary>Table</summary>
        <div className="tablewrap">
          <table>
            <thead>
              <tr>
                <th>Year</th>
                <th className="r">Rajya Sabha</th>
                <th className="r">Lok Sabha</th>
              </tr>
            </thead>
            <tbody>
              {years.map((yr) => (
                <tr key={yr}>
                  <td>{yr}</td>
                  <td className="r">{rs.get(yr)?.toLocaleString('en-IN') ?? '—'}</td>
                  <td className="r">{ls.get(yr)?.toLocaleString('en-IN') ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

function ZoneBars({ rows }: { rows: { label: string; value: number; sub: number }[] }) {
  const max = Math.max(...rows.map((r) => r.value));
  return (
    <div className="stack" style={{ gap: 6 }}>
      {rows.map((r) => (
        <div key={r.label} className="small" title={`${r.label}: ${r.value} · ${nf(r.sub)}`}>
          <div className="row" style={{ justifyContent: 'space-between', gap: 4 }}>
            <span>{r.label}</span>
            <b className="nums">{r.value}</b>
          </div>
          <div style={{ height: 8, background: 'var(--surface-2)', borderRadius: 4 }}>
            <div style={{ width: `${(r.value / max) * 100}%`, height: '100%', background: 'var(--series-1)', borderRadius: 4 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function Sources({ meta }: { meta: Meta }) {
  const { t } = useApp();
  const items = [
    { kind: 'Official', name: 'Greater Chennai Corporation open data (UPHC, UCHC, TB, maternity, vet, ABC)', date: 'Date not stated in files', n: Object.values(meta.gcc.byKind).reduce((a, b) => a + b, 0) },
    { kind: 'Official', name: `${meta.nrcp.source} — 0 Chennai entries`, date: meta.nrcp.lastUpdated, n: meta.nrcp.entries },
    { kind: 'Official', name: 'TN State Action Plan for Rabies Elimination — List of Anti-Rabies Clinic (4 in Chennai)', date: 'Oct 2024 · checked 2026-10-07', n: meta.arv.official },
    { kind: 'News', name: 'Govt Peripheral Hospital Periyar Nagar reported giving ARV (MedBound Times / TNIE / TOI)', date: '2025-09-18', n: meta.arv.total - meta.arv.official },
    { kind: 'Official', name: 'Lok Sabha USQ 4870 — dog bites & suspected rabies deaths (IDSP/IHIP)', date: 'Data as on 27-02-2025', n: null },
    { kind: 'Official', name: 'Rajya Sabha Session 262, AU 1058 — dog bites 2018–2023', date: '—', n: null },
    { kind: 'OpenStreetMap', name: 'Hospitals, clinics, vets (Overpass export)', date: meta.osm.timestamp?.slice(0, 10), n: meta.osm.raw },
    { kind: 'Boundary', name: meta.wards.source, date: 'Repo snapshot 2023', n: meta.wards.count },
    { kind: 'Estimate', name: `${meta.population.source}`, date: `Year ${meta.population.year}, retrieved ${meta.generated}`, n: null },
    { kind: 'User', name: 'Your incident reports (this device only, unverified)', date: '—', n: null },
  ];
  return (
    <section className="card stack">
      <h2 className="row">
        <Database size={20} /> {t('dataSources')}
      </h2>
      <div className="tablewrap">
        <table>
          <thead>
            <tr>
              <th>Type</th>
              <th>Source</th>
              <th>Date</th>
              <th className="r">Rows</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.name}>
                <td>
                  <span className="badge">{i.kind}</span>
                </td>
                <td>{i.name}</td>
                <td className="small">{i.date}</td>
                <td className="r">{i.n ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="tiny muted">
        Facilities kept: {meta.facilities.total} (dropped {Object.values(meta.facilities.dropped).reduce((a, b) => a + b, 0)} OSM points without a name; {meta.facilities.osmDuplicatesOfGcc} OSM duplicates of GCC records removed). Distances are straight-line from the ward's interior point. Ward map is an older
        200-ward delimitation from DataMeet/Transparent Chennai.
      </p>
    </section>
  );
}
