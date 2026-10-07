// Rabies Risk Indicator (demonstration score). Built from SIMULATED ward data plus
// the real distance to a listed anti-rabies clinic. It is not an outbreak prediction.
import type { Ward } from './data';

export interface SimWard {
  cases: number[];
  dog: number[];
  cat: number[];
  monkey: number[];
  other: number[];
  a0: number[];
  a1: number[];
  a2: number[];
  completed: number[];
  dogVax: number[];
}

export interface Sim {
  simulated: true;
  label: string;
  seed: number;
  months: string[];
  animals: string[];
  ages: string[];
  assumptions: { baseRatePerResidentPerMonth: number; yearlyTrend: number; yearlyTrendSource: string; check: string; realInputs: string[] };
  wards: Record<string, SimWard>;
}

export type Factor = 'incidence' | 'lowVax' | 'dropout' | 'access';
export type Weights = Record<Factor, number>;
export const FACTORS: Factor[] = ['incidence', 'lowVax', 'dropout', 'access'];
export const DEFAULT_WEIGHTS: Weights = { incidence: 35, lowVax: 25, dropout: 20, access: 20 };

/** Each factor is mapped to 0–100 on a fixed scale, so months can be compared. */
export const SCALES = {
  /** bites per 10,000 residents per month (3-month average): 0 → 0, 15 or more → 100 */
  incidenceMax: 15,
  /** dog vaccination coverage: 80% or more → 0, 20% or less → 100 */
  vaxGood: 80,
  vaxBad: 20,
  /** vaccine-course dropout: 0% → 0, 50% or more → 100 */
  dropoutMax: 50,
  /** straight-line km to the nearest listed anti-rabies clinic: 0 → 0, 10 or more → 100 */
  accessMaxKm: 10,
};
export const WINDOW = 3;

export const FACTOR_INFO: Record<Factor, { label: string; short: string; scale: string; action: string; detail: string; real: boolean }> = {
  incidence: {
    label: 'Bite incidence',
    short: 'High bite incidence',
    scale: `Bites per 10,000 residents per month, ${WINDOW}-month average. 0 → 0, ${SCALES.incidenceMax}+ → 100`,
    action: 'Awareness campaign',
    detail: 'Run a ward awareness drive and a targeted stray-dog intervention with the veterinary team.',
    real: false,
  },
  lowVax: {
    label: 'Low dog vaccination',
    short: 'Low dog vaccination',
    scale: `Dog vaccination coverage. ${SCALES.vaxGood}%+ → 0, ${SCALES.vaxBad}% or less → 100`,
    action: 'Dog vaccination camp',
    detail: 'Hold a mass dog vaccination camp in this ward.',
    real: false,
  },
  dropout: {
    label: 'Vaccine-course dropout',
    short: 'Patients not finishing the vaccine course',
    scale: `Share of bite patients who did not finish the course, ${WINDOW}-month window. 0% → 0, ${SCALES.dropoutMax}%+ → 100`,
    action: 'Patient follow-up',
    detail: 'Follow up patients who have not finished the course and remind them to return.',
    real: false,
  },
  access: {
    label: 'Poor access to care',
    short: 'Far from a listed anti-rabies clinic',
    scale: `Straight-line distance to the nearest listed anti-rabies clinic. 0 km → 0, ${SCALES.accessMaxKm} km+ → 100`,
    action: 'ARV stock review / mobile camp',
    detail: 'Review anti-rabies vaccine stock at the nearest government centre, or send a mobile medical camp.',
    real: true,
  },
};

export type Level = 'low' | 'moderate' | 'high' | 'veryHigh';
export const LEVELS: { id: Level; label: string; min: number; cssVar: string }[] = [
  { id: 'low', label: 'Low', min: 0, cssVar: '--risk-low' },
  { id: 'moderate', label: 'Moderate', min: 25, cssVar: '--risk-moderate' },
  { id: 'high', label: 'High', min: 50, cssVar: '--risk-high' },
  { id: 'veryHigh', label: 'Very high', min: 75, cssVar: '--risk-veryhigh' },
];
export const levelOf = (score: number) => [...LEVELS].reverse().find((l) => score >= l.min)!;

const clamp = (v: number) => Math.max(0, Math.min(100, v));
const sumWindow = (a: number[], m: number) => {
  let s = 0;
  for (let i = Math.max(0, m - WINDOW + 1); i <= m; i++) s += a[i];
  return s;
};

export interface WardRisk {
  ward: Ward;
  /** raw values behind the score */
  cases: number;
  ratePer10k: number;
  dogVax: number;
  dropoutPct: number;
  arvKm: number | null;
  /** 0–100 for each factor */
  parts: Record<Factor, number>;
  /** points each factor adds to the score (weight × part) */
  points: Record<Factor, number>;
  score: number;
  level: (typeof LEVELS)[number];
  /** factors that drive this ward's score, strongest first */
  drivers: Factor[];
}

export function wardRisk(ward: Ward, s: SimWard, m: number, weights: Weights = DEFAULT_WEIGHTS): WardRisk {
  const n = Math.min(WINDOW, m + 1);
  const windowCases = sumWindow(s.cases, m);
  const ratePer10k = ward.population ? (windowCases / n / ward.population) * 10000 : 0;
  const dropoutPct = windowCases ? (1 - sumWindow(s.completed, m) / windowCases) * 100 : 0;
  const dogVax = s.dogVax[m];
  const parts: Record<Factor, number> = {
    incidence: clamp((ratePer10k / SCALES.incidenceMax) * 100),
    lowVax: clamp(((SCALES.vaxGood - dogVax) / (SCALES.vaxGood - SCALES.vaxBad)) * 100),
    dropout: clamp((dropoutPct / SCALES.dropoutMax) * 100),
    access: ward.nearestArvKm == null ? 100 : clamp((ward.nearestArvKm / SCALES.accessMaxKm) * 100),
  };
  const total = FACTORS.reduce((a, f) => a + weights[f], 0) || 1;
  const points = Object.fromEntries(FACTORS.map((f) => [f, (weights[f] / total) * parts[f]])) as Record<Factor, number>;
  const score = Math.round(FACTORS.reduce((a, f) => a + points[f], 0) * 10) / 10;
  const ranked = [...FACTORS].sort((a, b) => points[b] - points[a]);
  // a driver is the top factor, plus any other factor that is itself at 50/100 or more
  const drivers = ranked.filter((f, i) => i === 0 || parts[f] >= 50).slice(0, 2);
  return { ward, cases: s.cases[m], ratePer10k, dogVax, dropoutPct, arvKm: ward.nearestArvKm, parts, points, score, level: levelOf(score), drivers };
}

export function allRisk(wards: Ward[], sim: Sim, m: number, weights: Weights = DEFAULT_WEIGHTS): WardRisk[] {
  return wards.filter((w) => sim.wards[w.ward]).map((w) => wardRisk(w, sim.wards[w.ward], m, weights));
}

/** Highest score first; ties broken by ward id so the order is stable. */
export const priority = (rows: WardRisk[], n = 10) => [...rows].sort((a, b) => b.score - a.score || a.ward.ward.localeCompare(b.ward.ward)).slice(0, n);

/** Actions come only from the ward's own drivers. */
export const recommend = (r: WardRisk) => r.drivers.map((f) => ({ factor: f, action: FACTOR_INFO[f].action, detail: FACTOR_INFO[f].detail }));

export const monthLabel = (ym: string) => new Date(`${ym}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
