// Link between the citizen app and the officer website (Supabase REST, no SDK).
// Only anonymous fields are sent: date, animal, exposure type and ward.
const BASE = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
export const cloudOn = !!(BASE && KEY);

export interface CloudReport {
  id: string;
  created_at?: string;
  incident_date: string;
  animal: string;
  exposure: string;
  ward: string | null;
  zone: string | null;
  /** Position rounded to about 1 km. */
  lat?: number | null;
  lon?: number | null;
}

const headers = () => ({ apikey: KEY!, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' });
const timeout = (ms: number) => AbortSignal.timeout(ms);

/** Resolves when the report is stored (a repeat of the same id also counts). */
export async function sendReport(r: CloudReport) {
  if (!cloudOn) throw new Error('cloud off');
  const post = (body: CloudReport) => fetch(`${BASE}/rest/v1/reports`, { method: 'POST', headers: { ...headers(), Prefer: 'return=minimal' }, body: JSON.stringify(body), signal: timeout(15000) });
  let res = await post(r);
  // an older table without the position columns: send the report without them
  if (res.status === 400 && r.lat != null) res = await post({ ...r, lat: undefined, lon: undefined });
  if (!res.ok && res.status !== 409) throw new Error(`send ${res.status}`);
}

export async function fetchReports(): Promise<CloudReport[]> {
  if (!cloudOn) throw new Error('cloud off');
  const res = await fetch(`${BASE}/rest/v1/reports?select=*&order=created_at.desc&limit=500`, { headers: headers(), signal: timeout(15000) });
  if (!res.ok) throw new Error(`fetch ${res.status}`);
  return res.json();
}

type Ring = number[][];
const inRing = (lon: number, lat: number, ring: Ring) => {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};
const inPolygon = (lon: number, lat: number, poly: Ring[]) => inRing(lon, lat, poly[0]) && !poly.slice(1).some((hole) => inRing(lon, lat, hole));

/** Ward id for a point, or null when it is outside every ward. */
export function wardOf(lat: number, lon: number, geo: GeoJSON.FeatureCollection): string | null {
  for (const f of geo.features) {
    const g = f.geometry;
    const polys = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
    if (polys.some((p) => inPolygon(lon, lat, p as Ring[]))) return (f.properties?.ward as string) ?? null;
  }
  return null;
}
