import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AlertTriangle, Bot, Download, LogOut, Moon, Pause, Play, Printer, Radio, RotateCcw, Send, Sun } from 'lucide-react';
import { useApp } from '../lib/app';
import type { Meta, Ward } from '../lib/data';
import { cloudOn, fetchReports, type CloudReport } from '../lib/cloud';
import { DEFAULT_WEIGHTS, FACTORS, FACTOR_INFO, LEVELS, allRisk, monthLabel, priority, recommend, type Factor, type Sim, type WardRisk, type Weights } from '../lib/risk';
import { DataGate, cssVar, useData } from '../components/ui';
import MapView from '../components/MapView';
import { BitesChart, Sources } from '../pages/Dashboard';

const nf = (n: number) => Math.round(n).toLocaleString('en-IN');
const SEQ = ['--seq-1', '--seq-2', '--seq-3', '--seq-4', '--seq-5'];

type LayerId = 'risk' | 'incidence' | 'dogVax' | 'dropout' | 'access';
/** Fixed class breaks so the colours mean the same thing in every month. */
const LAYERS: { id: LayerId; label: string; unit: string; breaks: number[]; get: (r: WardRisk) => number | null; real?: boolean }[] = [
  { id: 'risk', label: 'Rabies Risk Indicator', unit: '', breaks: [], get: (r) => r.score },
  { id: 'incidence', label: 'Bite incidence (per 10,000 / month)', unit: '', breaks: [3, 6, 9, 12], get: (r) => r.ratePer10k },
  { id: 'dogVax', label: 'Dog vaccination coverage (%)', unit: '%', breaks: [30, 45, 60, 75], get: (r) => r.dogVax },
  { id: 'dropout', label: 'Vaccine-course dropout (%)', unit: '%', breaks: [10, 20, 30, 40], get: (r) => r.dropoutPct },
  { id: 'access', label: 'Distance to listed anti-rabies clinic (km)', unit: ' km', breaks: [2, 4, 6, 8], get: (r) => r.arvKm, real: true },
];

const Sim_ = () => <span className="tag sim">SIMULATED DATA</span>;
const Real = ({ children = 'OFFICIAL / OPEN DATA' }: { children?: ReactNode }) => <span className="tag real">{children}</span>;
const Live = () => <span className="tag live">LIVE · UNVERIFIED</span>;

type LiveState = { status: 'off' | 'connecting' | 'live' | 'offline'; rows: CloudReport[]; at: Date | null };
/** Community reports sent from the citizen app. Polls so a new report shows within seconds. */
function useLive(): LiveState {
  const [st, setSt] = useState<LiveState>({ status: cloudOn ? 'connecting' : 'off', rows: [], at: null });
  useEffect(() => {
    if (!cloudOn) return;
    let alive = true;
    const tick = () =>
      fetchReports()
        .then((rows) => alive && setSt({ status: 'live', rows, at: new Date() }))
        .catch(() => alive && setSt((p) => ({ ...p, status: p.at ? 'offline' : 'connecting' })));
    tick();
    const id = setInterval(tick, 6000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);
  return st;
}

const Lvl = ({ r }: { r: WardRisk }) => (
  <span className="lvl">
    <i style={{ background: `var(${r.level.cssVar})` }} />
    {r.level.label}
  </span>
);

const SESSION = 'rp_officer';

/** Officer sign-in. The check runs on the server; this page never holds the password. */
function Login({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [st, setSt] = useState<{ busy: boolean; error?: string }>({ busy: false });
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSt({ busy: true });
    try {
      const res = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }), signal: AbortSignal.timeout(20000) });
      if (res.ok) return onDone();
      setSt({ busy: false, error: res.status === 401 ? 'Wrong email or password.' : 'The server could not check the login. Try again.' });
    } catch {
      setSt({ busy: false, error: 'Server not reachable. Check the internet and try again.' });
    }
  }
  return (
    <div className="app photo-page o-login">
      <div className="hero-auth">
        <div className="brand">
          <img className="logo" src="./icon-192.png" alt="" />
          <h1>RabiesPulse AI</h1>
        </div>
        <p className="muted">Officer dashboard · rabies data analytics and hotspot map · Chennai</p>
      </div>
      <main className="page">
        <img className="o-photo" src="./img/bite-street-dog.jpg" alt="Street dog in Chennai" />
        <form className="card stack" onSubmit={submit}>
          <h2>Officer log in</h2>
          <label className="field">
            Email
            <input className="input" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label className="field">
            Password
            <input className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          {st.error && (
            <div className="error" role="alert">
              {st.error}
            </div>
          )}
          <button className="btn primary big block" disabled={st.busy}>
            {st.busy ? 'Connecting to the server…' : 'Log in'}
          </button>
          <p className="tiny muted center">For health officers only. Ward figures inside are simulated demonstration data.</p>
        </form>
      </main>
    </div>
  );
}

export default function Officer() {
  const { settings, setSettings } = useApp();
  const meta = useData<Meta>('meta.json');
  const wards = useData<Ward[]>('wards.json');
  const geo = useData<GeoJSON.FeatureCollection>('wards.geojson');
  const sim = useData<Sim>('sim.json');
  const qs = [meta, wards, geo, sim];
  const all = {
    loading: qs.some((q) => q.loading),
    error: qs.map((q) => q.error).find(Boolean),
    data: meta.data && wards.data && geo.data && sim.data ? { meta: meta.data, wards: wards.data, geo: geo.data, sim: sim.data } : undefined,
    retry: () => qs.forEach((q) => q.retry()),
  };
  const dark = settings.theme !== 'light';
  const [authed, setAuthed] = useState(() => {
    try {
      return sessionStorage.getItem(SESSION) === '1';
    } catch {
      return false;
    }
  });
  const sign = (on: boolean) => {
    try {
      if (on) sessionStorage.setItem(SESSION, '1');
      else sessionStorage.removeItem(SESSION);
    } catch {
      /* storage blocked: stay signed in for this page only */
    }
    setAuthed(on);
  };
  if (!authed) return <Login onDone={() => sign(true)} />;
  return (
    <div className="officer">
      <header className="o-head">
        <img src="./icon-192.png" alt="" />
        <div className="grow">
          <h1>RabiesPulse AI · Officer Dashboard</h1>
          <div className="tiny muted">Rabies data analytics and hotspot map · Chennai</div>
        </div>
        <button className="btn sm" onClick={() => sign(false)}>
          <LogOut size={16} /> Log out
        </button>
        <button className="iconbtn" onClick={() => setSettings({ theme: dark ? 'light' : 'dark' })} aria-label="Switch theme">
          {dark ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </header>
      <main className="o-main">
        <DataGate q={all}>{(d) => <Body {...d} />}</DataGate>
      </main>
    </div>
  );
}

function Body({ meta, wards, geo, sim }: { meta: Meta; wards: Ward[]; geo: GeoJSON.FeatureCollection; sim: Sim }) {
  const last = sim.months.length - 1;
  const [m, setM] = useState(last);
  const [playing, setPlaying] = useState(false);
  const [zone, setZone] = useState('');
  const [layerId, setLayerId] = useState<LayerId>('risk');
  const [weights, setWeights] = useState<Weights>(DEFAULT_WEIGHTS);
  const [sel, setSel] = useState<string | null>(null);
  const live = useLive();

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setM((x) => (x >= last ? 0 : x + 1)), 900);
    return () => clearInterval(id);
  }, [playing, last]);

  const zones = useMemo(() => [...new Set(wards.map((w) => w.zoneName))].sort(), [wards]);
  const risk = useMemo(() => allRisk(wards, sim, m, weights), [wards, sim, m, weights]);
  const shown = useMemo(() => risk.filter((r) => !zone || r.ward.zoneName === zone), [risk, zone]);
  const byId = useMemo(() => new Map(shown.map((r) => [r.ward.ward, r])), [shown]);
  const top = useMemo(() => priority(shown, 10), [shown]);
  const picked = (sel && byId.get(sel)) || top[0];
  const layer = LAYERS.find((l) => l.id === layerId)!;

  const wardLayer = useMemo(
    () => ({
      geojson: geo,
      fit: true,
      selected: picked?.ward.ward ?? null,
      onWard: setSel,
      color: (id: string) => {
        const r = byId.get(id);
        if (!r) return null;
        if (layer.id === 'risk') return cssVar(r.level.cssVar);
        const v = layer.get(r);
        return v == null ? null : cssVar(SEQ[layer.breaks.filter((b) => v > b).length]);
      },
      tip: (id: string) => {
        const r = byId.get(id);
        return r ? `${r.ward.label} · ${r.ward.zoneName} — risk ${r.score.toFixed(0)} (${r.level.label})` : '';
      },
    }),
    [geo, byId, layer, picked],
  );

  // live community reports, limited to the chosen zone
  const liveRows = useMemo(() => live.rows.filter((r) => !zone || r.zone === zone), [live.rows, zone]);
  const pins = useMemo(() => {
    // one dot per ward; reports outside the ward map get a dot at their rounded position
    const m = new Map<string, { lat: number; lon: number; n: number; name: string }>();
    for (const r of liveRows) {
      const w = r.ward ? wards.find((x) => x.ward === r.ward) : undefined;
      const at = w ? { lat: w.lat, lon: w.lon, name: w.label } : r.lat != null && r.lon != null ? { lat: +r.lat, lon: +r.lon, name: 'Outside the Chennai ward map' } : null;
      if (!at) continue;
      const k = `${at.lat},${at.lon}`;
      m.set(k, { ...at, n: (m.get(k)?.n || 0) + 1 });
    }
    return [...m.values()].map((p) => ({ lat: p.lat, lon: p.lon, n: p.n, label: `${p.name}: ${p.n} community report(s), unverified` }));
  }, [liveRows, wards]);

  // headline numbers for the chosen month and scope
  const cases = shown.reduce((a, r) => a + r.cases, 0);
  const prev = m > 0 ? shown.reduce((a, r) => a + sim.wards[r.ward.ward].cases[m - 1], 0) : null;
  const delta = prev ? ((cases - prev) / prev) * 100 : null;
  const pop = shown.reduce((a, r) => a + (r.ward.population || 0), 0);
  const vax = pop ? shown.reduce((a, r) => a + r.dogVax * (r.ward.population || 0), 0) / pop : 0;
  const done = shown.reduce((a, r) => a + sim.wards[r.ward.ward].completed[m], 0);
  const hot = shown.filter((r) => r.score >= 50).length;

  const trend = useMemo(() => sim.months.map((_, i) => shown.reduce((a, r) => a + sim.wards[r.ward.ward].cases[i], 0)), [sim, shown]);
  const sumKey = (k: 'dog' | 'cat' | 'monkey' | 'other' | 'a0' | 'a1' | 'a2') => shown.reduce((a, r) => a + sim.wards[r.ward.ward][k][m], 0);
  const scope = zone || 'Chennai (all wards)';

  const exportCsv = () => {
    const head = ['rank', 'ward', 'zone', 'risk_score', 'risk_level', 'main_factors', 'recommended_action', 'bites_this_month_SIM', 'dog_vaccination_pct_SIM', 'course_dropout_pct_SIM', 'nearest_listed_arv_km_REAL'];
    const rows = top.map((r, i) => [i + 1, r.ward.label, r.ward.zoneName, r.score, r.level.label, r.drivers.map((f) => FACTOR_INFO[f].short).join(' + '), recommend(r).map((a) => a.action).join(' + '), r.cases, r.dogVax, r.dropoutPct.toFixed(1), r.arvKm ?? '']);
    const csv = [`"${sim.label} Month: ${sim.months[m]}. Scope: ${scope}."`, head.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `priority-wards-${sim.months[m]}-SIMULATED.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <>
      <div className="simbar" role="note">
        <AlertTriangle size={20} style={{ flex: 'none', marginTop: 2 }} />
        <details className="grow">
          <summary>
            <b>{sim.label}</b> Ward and month numbers are synthetic. This is a demonstration risk score, not an outbreak prediction.
          </summary>
          <ul className="small" style={{ margin: '8px 0 0', paddingLeft: 18 }}>
            <li>Real inputs: {sim.assumptions.realInputs.join(', ')}.</li>
            <li>Simulated: monthly bite cases, animal type, age group, vaccine-course completion, dog vaccination coverage.</li>
            <li>
              Assumed base rate: {sim.assumptions.baseRatePerResidentPerMonth * 10000} bites per 10,000 residents per month (a demo parameter, not an estimate for Chennai). Yearly trend {(sim.assumptions.yearlyTrend * 100).toFixed(1)}% — {sim.assumptions.yearlyTrendSource}.
            </li>
            <li>
              {sim.assumptions.check}. Fixed random seed {sim.seed}; rebuild with <code>python3 scripts/simulate_data.py</code>.
            </li>
          </ul>
        </details>
      </div>

      {/* filters: one row above everything they control */}
      <section className="card ctrl">
        <label className="field small">
          <span className="row" style={{ justifyContent: 'space-between' }}>
            <span>Month</span>
            <b>{monthLabel(sim.months[m])}</b>
          </span>
          <span className="row" style={{ flexWrap: 'nowrap' }}>
            <button className="btn sm" onClick={() => setPlaying((p) => !p)} aria-label={playing ? 'Pause' : 'Play months'}>
              {playing ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <input type="range" min={0} max={last} value={m} onChange={(e) => (setPlaying(false), setM(+e.target.value))} aria-label="Month" />
          </span>
        </label>
        <label className="field small">
          Zone
          <select className="select" value={zone} onChange={(e) => (setZone(e.target.value), setSel(null))}>
            <option value="">All zones</option>
            {zones.map((z) => (
              <option key={z}>{z}</option>
            ))}
          </select>
        </label>
        <label className="field small">
          Map shows
          <select className="select" value={layerId} onChange={(e) => setLayerId(e.target.value as LayerId)}>
            {LAYERS.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="o-kpis">
        <Kpi v={nf(cases)} l="Bite cases this month" sub={delta == null ? '' : `${delta >= 0 ? '▲' : '▼'} ${Math.abs(delta).toFixed(1)}% vs ${monthLabel(sim.months[m - 1])}`} tag={<Sim_ />} />
        <Kpi v={String(hot)} l={`Wards at High or Very high risk (of ${shown.length})`} tag={<Sim_ />} />
        <Kpi v={`${vax.toFixed(0)}%`} l="Dog vaccination coverage" sub="Target often used: 70%" tag={<Sim_ />} />
        <Kpi v={cases ? `${((done / cases) * 100).toFixed(0)}%` : '—'} l="Patients finishing the vaccine course" tag={<Sim_ />} />
        <Kpi v={live.status === 'off' || (live.status === 'connecting' && !live.at) ? '—' : String(liveRows.length)} l="Community reports from the app" sub={`${(pop / 1e6).toFixed(2)}M people in ${shown.length} wards`} tag={<Live />} />
      </section>

      <div className="o-two">
        <LiveCard live={live} rows={liveRows} wards={wards} />
        <AskCard
          data={[
            `Month: ${monthLabel(sim.months[m])}. Scope: ${scope}. ${sim.label}`,
            `Bite cases this month (simulated): ${cases}${delta == null ? '' : `, ${delta.toFixed(1)}% vs previous month`}. Dog vaccination coverage (simulated): ${vax.toFixed(0)}%. Vaccine-course completion (simulated): ${cases ? ((done / cases) * 100).toFixed(0) : '-'}%.`,
            `Wards by Rabies Risk Indicator level: ${LEVELS.map((l) => `${l.label} ${shown.filter((r) => r.level.id === l.id).length}`).join(', ')}.`,
            `Formula weights: ${FACTORS.map((f) => `${FACTOR_INFO[f].label} ${weights[f]}`).join(', ')}.`,
            'Top priority wards (score, level, bites per 10,000, dog vaccination %, course dropout %, km to listed anti-rabies clinic [real], main issues, action):',
            ...top.map((r, i) => `${i + 1}. ${r.ward.label} (${r.ward.zoneName}): ${r.score}, ${r.level.label}, ${r.ratePer10k.toFixed(1)}, ${r.dogVax}%, ${r.dropoutPct.toFixed(0)}%, ${r.arvKm ?? '-'} km, ${r.drivers.map((f) => FACTOR_INFO[f].short).join(' + ')}, ${recommend(r).map((a) => a.action).join(' + ')}`),
            `Monthly simulated bite cases: ${sim.months.map((ym, i) => `${ym}=${trend[i]}`).join(', ')}.`,
            `Live community reports from the app (unverified): ${live.status === 'live' ? `${liveRows.length} total; by ward: ${pins.map((p) => p.label).join('; ') || 'none with a ward'}` : 'not connected'}.`,
          ].join('\n')}
          fallback={`Top priority wards for ${monthLabel(sim.months[m])} (simulated data): ${top.slice(0, 3).map((r) => `${r.ward.label} (${r.score.toFixed(0)}, ${recommend(r).map((a) => a.action).join(' + ')})`).join('; ')}.`}
        />
      </div>

      <div className="o-grid">
        <section className="card stack">
          <div className="cardhead">
            <h2>
              {layer.label} · {monthLabel(sim.months[m])}
            </h2>
            {layer.real ? <Real>OPEN DATA</Real> : <Sim_ />}
          </div>
          <MapView wards={wardLayer} pins={pins} />
          {layer.id === 'risk' ? (
            <div className="legend">
              {LEVELS.map((l, i) => (
                <span key={l.id}>
                  <i className="dot" style={{ background: `var(${l.cssVar})`, borderRadius: 3 }} />
                  {l.label} ({l.min}–{LEVELS[i + 1]?.min ?? 100})
                </span>
              ))}
            </div>
          ) : (
            <div className="legend">
              {SEQ.map((s, i) => (
                <span key={s}>
                  <i className="dot" style={{ background: `var(${s})`, borderRadius: 3 }} />
                  {i === 0 ? `up to ${layer.breaks[0]}` : i === 4 ? `over ${layer.breaks[3]}` : `${layer.breaks[i - 1]}–${layer.breaks[i]}`}
                  {layer.unit}
                </span>
              ))}
            </div>
          )}
          {pins.length > 0 && (
            <div className="legend">
              <span>
                <i className="dot" style={{ background: 'var(--c-you)' }} /> Live community report from the app (unverified)
              </span>
            </div>
          )}
          <p className="tiny muted">Tap a ward for details. Ward map: {meta.wards.source}.</p>
        </section>

        {picked && <WardCard r={picked} rank={top.findIndex((t) => t.ward.ward === picked.ward.ward)} />}
      </div>

      <section className="card stack">
        <div className="cardhead">
          <h2>Top 10 priority wards · {scope}</h2>
          <span className="row">
            <Sim_ />
            <button className="btn sm" onClick={exportCsv}>
              <Download size={16} /> CSV
            </button>
            <button className="btn sm" onClick={() => window.print()}>
              <Printer size={16} /> Print
            </button>
          </span>
        </div>
        <div className="tablewrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Ward</th>
                <th>Zone</th>
                <th className="r">Risk score</th>
                <th>Level</th>
                <th>Main issue</th>
                <th>Recommended action</th>
              </tr>
            </thead>
            <tbody>
              {top.map((r, i) => (
                <tr key={r.ward.ward} className="pick" aria-selected={picked?.ward.ward === r.ward.ward} onClick={() => setSel(r.ward.ward)}>
                  <td>{i + 1}</td>
                  <td className="bold">{r.ward.label}</td>
                  <td>{r.ward.zoneName}</td>
                  <td className="r bold">{r.score.toFixed(1)}</td>
                  <td>
                    <Lvl r={r} />
                  </td>
                  <td>{r.drivers.map((f) => FACTOR_INFO[f].short).join(' + ')}</td>
                  <td>
                    {recommend(r)
                      .map((a) => a.action)
                      .join(' + ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="tiny muted">Each action comes from the factors that add the most points to that ward's score. Tap a row to see why.</p>
      </section>

      <div className="o-charts">
        <section className="card stack">
          <div className="cardhead">
            <h2>Monthly bite cases · {scope}</h2>
            <Sim_ />
          </div>
          <TrendChart months={sim.months} values={trend} at={m} onPick={(i) => (setPlaying(false), setM(i))} />
        </section>
        <section className="card stack">
          <div className="cardhead">
            <h2>Wards by risk level</h2>
            <Sim_ />
          </div>
          <Bars rows={LEVELS.map((l) => ({ label: l.label, value: shown.filter((r) => r.level.id === l.id).length, color: l.cssVar }))} unit=" wards" />
          <h3>What drives the score (average points)</h3>
          <Bars rows={FACTORS.map((f) => ({ label: FACTOR_INFO[f].label, value: shown.reduce((a, r) => a + r.points[f], 0) / (shown.length || 1) }))} unit=" pts" digits={1} />
        </section>
        <section className="card stack">
          <div className="cardhead">
            <h2>Who was bitten · {monthLabel(sim.months[m])}</h2>
            <Sim_ />
          </div>
          <h3>Animal</h3>
          <Bars rows={(['dog', 'cat', 'monkey', 'other'] as const).map((k) => ({ label: k[0].toUpperCase() + k.slice(1), value: sumKey(k) }))} unit=" cases" />
          <h3>Age group</h3>
          <Bars rows={(['a0', 'a1', 'a2'] as const).map((k, i) => ({ label: `${sim.ages[i]} years`, value: sumKey(k) }))} unit=" cases" />
        </section>
      </div>

      <Formula weights={weights} setWeights={setWeights} />

      <section className="card stack">
        <div className="cardhead">
          <h2>Official reference: Tamil Nadu dog-bite cases by year</h2>
          <Real />
        </div>
        <p className="small muted">State-level totals from Parliament answers. These are the only official bite counts in our sources; no ward-level figures exist.</p>
        <div style={{ maxWidth: 560 }}>
          <BitesChart meta={meta} />
        </div>
      </section>
      <Sources meta={meta} />
    </>
  );
}

const Kpi = ({ v, l, sub, tag }: { v: string; l: string; sub?: string; tag: ReactNode }) => (
  <div className="card kpi">
    <div className="v nums">{v}</div>
    <div className="l">{l}</div>
    {sub && <div className="tiny muted">{sub}</div>}
    <div style={{ marginTop: 6 }}>{tag}</div>
  </div>
);

const ago = (iso?: string) => {
  if (!iso) return '';
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  return min < 1 ? 'just now' : min < 60 ? `${min} min ago` : min < 1440 ? `${Math.round(min / 60)} h ago` : `${Math.round(min / 1440)} d ago`;
};
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

function LiveCard({ live, rows, wards }: { live: LiveState; rows: CloudReport[]; wards: Ward[] }) {
  const label = new Map(wards.map((w) => [w.ward, w.label]));
  const today = new Date().toDateString();
  const status = { off: 'Not set up', connecting: 'Connecting to the server…', live: `Live · updated ${live.at?.toLocaleTimeString('en-IN') ?? ''}`, offline: 'Server not reachable · showing the last data received' }[live.status];
  return (
    <section className="card stack">
      <div className="cardhead">
        <h2 className="row">
          <Radio size={20} /> Community reports from the citizen app
        </h2>
        <Live />
      </div>
      <div className="row small" role="status">
        {live.status === 'connecting' ? <span className="spinner" style={{ width: 16, height: 16 }} /> : <i className="dot" style={{ background: live.status === 'live' ? 'var(--risk-low)' : 'var(--muted)' }} />}
        {status}
      </div>
      {live.status !== 'off' && (live.at || live.status === 'live') && (
        <>
          <div className="row" style={{ gap: 20 }}>
            <div>
              <div className="score">{rows.length}</div>
              <div className="tiny muted">reports in total</div>
            </div>
            <div>
              <div className="score">{rows.filter((r) => r.created_at && new Date(r.created_at).toDateString() === today).length}</div>
              <div className="tiny muted">received today</div>
            </div>
          </div>
          {rows.length === 0 ? (
            <p className="small muted">No reports yet. Send one from the app and it appears here within a few seconds.</p>
          ) : (
            <div className="tablewrap" style={{ maxHeight: 250, overflowY: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Received</th>
                    <th>Animal</th>
                    <th>Type</th>
                    <th>Ward</th>
                    <th>Zone</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 30).map((r) => (
                    <tr key={r.id}>
                      <td>
                        {ago(r.created_at)} {r.created_at && Date.now() - new Date(r.created_at).getTime() < 180000 && <span className="tag live">NEW</span>}
                      </td>
                      <td className="bold">{cap(r.animal)}</td>
                      <td>{cap(r.exposure)}</td>
                      <td>{r.ward ? (label.get(r.ward) ?? r.ward) : r.lat != null ? 'Outside ward map' : 'No location'}</td>
                      <td>{r.zone ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
      <p className="tiny muted">Self-reported by app users and not checked. These are not confirmed rabies cases and are not part of the risk score. No name, phone number, photo or exact location is collected.</p>
    </section>
  );
}

const QUICK = ['Which wards need action first, and why?', 'Which intervention should be prioritised this month?', 'How did bite cases change over the last 6 months?'];

function AskCard({ data, fallback }: { data: string; fallback: string }) {
  const [q, setQ] = useState('');
  const [st, setSt] = useState<{ busy: boolean; answer?: string; offline?: boolean }>({ busy: false });
  async function ask(question: string) {
    if (!question.trim() || st.busy) return;
    setQ(question);
    setSt({ busy: true });
    try {
      const res = await fetch('/api/ask', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question, data }), signal: AbortSignal.timeout(40000) });
      const out = await res.json();
      if (!res.ok || !out.answer) throw new Error(out.error);
      setSt({ busy: false, answer: out.answer });
    } catch {
      setSt({ busy: false, answer: fallback, offline: true });
    }
  }
  return (
    <section className="card stack">
      <div className="cardhead">
        <h2 className="row">
          <Bot size={20} /> Ask the data
        </h2>
        <span className="tag real">GEMINI AI</span>
      </div>
      <form
        className="row"
        style={{ flexWrap: 'nowrap' }}
        onSubmit={(e) => {
          e.preventDefault();
          void ask(q);
        }}
      >
        <input className="input grow" value={q} onChange={(e) => setQ(e.target.value)} maxLength={300} placeholder="Ask about the month and zone shown above" aria-label="Question" />
        <button className="btn primary" disabled={st.busy || !q.trim()} aria-label="Ask">
          <Send size={18} />
        </button>
      </form>
      <div className="chips">
        {QUICK.map((x) => (
          <button key={x} className="chip" onClick={() => void ask(x)} disabled={st.busy}>
            {x}
          </button>
        ))}
      </div>
      {st.busy && (
        <div className="row small" role="status">
          <span className="spinner" style={{ width: 16, height: 16 }} /> Connecting to the AI server… this can take a few seconds.
        </div>
      )}
      {st.answer && (
        <div className="card flat stack small" style={{ background: 'var(--surface-2)', whiteSpace: 'pre-wrap' }}>
          {st.offline && <b>AI server not reachable. Summary from the dashboard instead:</b>}
          <span>{st.answer}</span>
        </div>
      )}
      <p className="tiny muted">Answers use only the numbers on this page for the chosen month and zone. Ward figures are simulated. Not medical advice.</p>
    </section>
  );
}

function WardCard({ r, rank }: { r: WardRisk; rank: number }) {
  const w = r.ward;
  return (
    <section className="card stack">
      <div className="cardhead">
        <h2>
          {w.label} · {w.zoneName}
        </h2>
        <Sim_ />
      </div>
      <div className="row" style={{ gap: 16 }}>
        <div className="score">{r.score.toFixed(0)}</div>
        <div>
          <Lvl r={r} />
          <div className="tiny muted">Rabies Risk Indicator, 0–100{rank >= 0 ? ` · priority #${rank + 1}` : ''}</div>
        </div>
      </div>
      <h3>Why this score</h3>
      {FACTORS.map((f) => (
        <div key={f} className="fbar" title={FACTOR_INFO[f].scale}>
          <span>
            {FACTOR_INFO[f].label} <span className="muted">· {r.parts[f].toFixed(0)}/100</span>
          </span>
          <b className="nums">+{r.points[f].toFixed(1)} pts</b>
          <div className="track">
            <i style={{ width: `${r.parts[f]}%` }} />
          </div>
        </div>
      ))}
      <h3>Recommended action</h3>
      <ul className="actions">
        {recommend(r).map((a) => (
          <li key={a.factor}>
            <b>{a.action}.</b> {a.detail}
          </li>
        ))}
      </ul>
      <div>
        <div className="kv">
          <span>Bite cases this month</span>
          <b className="nums">
            {r.cases} · {r.ratePer10k.toFixed(1)} per 10,000 (3-month avg)
          </b>
        </div>
        <div className="kv">
          <span>Dog vaccination coverage</span>
          <b className="nums">{r.dogVax.toFixed(0)}%</b>
        </div>
        <div className="kv">
          <span>Vaccine-course dropout</span>
          <b className="nums">{r.dropoutPct.toFixed(0)}%</b>
        </div>
        <div className="kv">
          <span>
            Nearest listed anti-rabies clinic <Real>REAL</Real>
          </span>
          <b className="nums">{w.nearestArvKm != null ? `${w.nearestArvName} · ${w.nearestArvKm.toFixed(1)} km` : '—'}</b>
        </div>
        <div className="kv">
          <span>
            Nearest government centre <Real>REAL</Real>
          </span>
          <b className="nums">
            {w.nearestGovtName} · {w.nearestGovtKm.toFixed(1)} km
          </b>
        </div>
        <div className="kv">
          <span>
            Population <Real>MODELLED</Real>
          </span>
          <b className="nums">{w.population != null ? nf(w.population) : '—'}</b>
        </div>
      </div>
    </section>
  );
}

function Formula({ weights, setWeights }: { weights: Weights; setWeights: (w: Weights) => void }) {
  const total = FACTORS.reduce((a, f) => a + weights[f], 0) || 1;
  const pct = (f: Factor) => (weights[f] / total) * 100;
  return (
    <section className="card stack formula">
      <div className="cardhead">
        <h2>How the Rabies Risk Indicator is calculated</h2>
        <button className="btn sm" onClick={() => setWeights(DEFAULT_WEIGHTS)}>
          <RotateCcw size={16} /> Reset weights
        </button>
      </div>
      <p className="bold">Risk score = {FACTORS.map((f) => `${pct(f).toFixed(0)}% × ${FACTOR_INFO[f].label}`).join(' + ')}</p>
      <p className="small muted">Each factor is first put on a 0–100 scale (below). Levels: {LEVELS.map((l, i) => `${l.label} ${l.min}–${LEVELS[i + 1]?.min ?? 100}`).join(' · ')}. Move a slider to test other weights; the map and the priority list update at once.</p>
      <div className="tablewrap">
        <table>
          <thead>
            <tr>
              <th>Factor</th>
              <th style={{ minWidth: 160 }}>Weight</th>
              <th>0–100 scale</th>
              <th>Data</th>
            </tr>
          </thead>
          <tbody>
            {FACTORS.map((f) => (
              <tr key={f}>
                <td className="bold">{FACTOR_INFO[f].label}</td>
                <td>
                  <div className="row" style={{ flexWrap: 'nowrap' }}>
                    <input type="range" min={0} max={100} step={5} value={weights[f]} onChange={(e) => setWeights({ ...weights, [f]: +e.target.value })} aria-label={`${FACTOR_INFO[f].label} weight`} />
                    <b className="nums">{pct(f).toFixed(0)}%</b>
                  </div>
                </td>
                <td className="small">{FACTOR_INFO[f].scale}</td>
                <td>{FACTOR_INFO[f].real ? <Real>REAL</Real> : <Sim_ />}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="tiny muted">This is a demonstration score built on simulated ward data. It does not confirm or predict rabies cases.</p>
    </section>
  );
}

/** Horizontal bars with the value written beside each bar (one series, named by its labels). */
function Bars({ rows, unit = '', digits = 0 }: { rows: { label: string; value: number; color?: string }[]; unit?: string; digits?: number }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <div className="stack" style={{ gap: 8 }}>
      {rows.map((r) => (
        <div key={r.label} className="fbar" title={`${r.label}: ${r.value.toFixed(digits)}${unit}`}>
          <span>{r.label}</span>
          <b className="nums">{digits ? r.value.toFixed(digits) : nf(r.value)}</b>
          <div className="track">
            <i style={{ width: `${(r.value / max) * 100}%`, background: r.color ? `var(${r.color})` : undefined }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** One line, one axis. Hover shows a crosshair and value; click jumps the dashboard to that month. */
function TrendChart({ months, values, at, onPick }: { months: string[]; values: number[]; at: number; onPick: (i: number) => void }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 420,
    H = 220,
    L = 40,
    R = 10,
    T = 12,
    B = 26;
  const step = 10 ** Math.floor(Math.log10(Math.max(...values, 10)));
  const top = Math.ceil(Math.max(...values, 1) / step) * step;
  const x = (i: number) => L + (i / (months.length - 1)) * (W - L - R);
  const y = (v: number) => T + (1 - v / top) * (H - T - B);
  const ticks = [0, top / 2, top];
  const idx = (e: React.MouseEvent<SVGSVGElement>) => {
    const b = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - b.left) / b.width) * W;
    return Math.max(0, Math.min(months.length - 1, Math.round(((px - L) / (W - L - R)) * (months.length - 1))));
  };
  const show = hover ?? at;
  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Simulated monthly bite cases" onMouseMove={(e) => setHover(idx(e))} onMouseLeave={() => setHover(null)} onClick={(e) => onPick(idx(e))} style={{ cursor: 'pointer' }}>
        {ticks.map((v) => (
          <g key={v}>
            <line className="gridline" x1={L} x2={W - R} y1={y(v)} y2={y(v)} />
            <text className="axis" x={L - 6} y={y(v) + 4} textAnchor="end">
              {nf(v)}
            </text>
          </g>
        ))}
        {months.map((ym, i) =>
          (i % 6 === 0 && i < months.length - 4) || i === months.length - 1 ? (
            <text key={ym} className="axis" x={x(i)} y={H - 8} textAnchor={i === 0 ? 'start' : i === months.length - 1 ? 'end' : 'middle'}>
              {monthLabel(ym)}
            </text>
          ) : null,
        )}
        <path d={values.map((v, i) => `${i ? 'L' : 'M'}${x(i)},${y(v)}`).join('')} fill="none" stroke="var(--series-1)" strokeWidth={2} strokeLinejoin="round" />
        <line className="cross" x1={x(show)} x2={x(show)} y1={T} y2={H - B} />
        <circle cx={x(show)} cy={y(values[show])} r={5} fill="var(--series-1)" stroke="var(--surface)" strokeWidth={2} />
      </svg>
      <div className="tip" style={{ left: `${Math.max(18, Math.min(82, (x(show) / W) * 100))}%`, top: `${(y(values[show]) / H) * 100}%` }}>
        {monthLabel(months[show])}: {nf(values[show])}
      </div>
      <details className="small">
        <summary>Table</summary>
        <div className="tablewrap" style={{ maxHeight: 220, overflowY: 'auto' }}>
          <table>
            <tbody>
              {months.map((ym, i) => (
                <tr key={ym}>
                  <td>{monthLabel(ym)}</td>
                  <td className="r">{nf(values[i])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
