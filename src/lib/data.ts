// Loads the bundled datasets produced by scripts/prepare_data.py.
export type Cat = 'gcc' | 'govh' | 'hospital' | 'clinic' | 'vet' | 'abc';

export interface Facility {
  id: string;
  name: string;
  nameTa?: string | null;
  cat: Cat;
  kind: string;
  src: 'gcc' | 'osm';
  lat: number;
  lon: number;
  address?: string | null;
  phone?: string | null;
  website?: string | null;
  emergency?: boolean | null;
  is247?: boolean | null;
  ward?: string | null;
  zoneName?: string | null;
  /** Documented anti-rabies listing (official government list or news report). */
  arv?: { status: 'official' | 'news'; listedName: string; source: string; url: string; date: string; checked: string };
}

export interface Ward {
  ward: string;
  label: string;
  zone: string | null;
  zoneName: string;
  areaKm2: number;
  population: number | null;
  density: number | null;
  lat: number;
  lon: number;
  gcc: number;
  govh: number;
  hospital: number;
  clinic: number;
  vet: number;
  abc: number;
  govtTotal: number;
  govtPer100k: number | null;
  nearestGovtKm: number;
  nearestGovtName: string;
  nearestArvKm: number | null;
  nearestArvName: string | null;
}

export interface Locality {
  name: string;
  lat: number;
  lon: number;
}

export interface Meta {
  generated: string;
  facilities: { total: number; byCat: Record<Cat, number>; dropped: Record<string, number>; osmDuplicatesOfGcc: number; outsideWards: number };
  osm: { timestamp: string; raw: number };
  gcc: { source: string; byKind: Record<string, number> };
  wards: { count: number; source: string };
  population: { source: string; year: number; wardsWithValue: number; total: number; userPolygonTotal: number; userPolygonAreaKm2: number };
  nrcp: { source: string; url: string; lastUpdated: string; entries: number; tamilNaduOrChennaiEntries: number };
  arv: { official: number; total: number; source: string };
  dogBites: { year: string; metric: string; value: number; geography: string; source: string }[];
}

/** Govt = GCC official centres + government hospitals found in OSM. */
export const isGovt = (c: Cat) => c === 'gcc' || c === 'govh';
/** Places for people (vets and ABC centres are for animals). */
export const isHuman = (c: Cat) => c !== 'vet' && c !== 'abc';

const cache = new Map<string, Promise<unknown>>();

export function load<T>(file: string): Promise<T> {
  if (!cache.has(file)) {
    const p = fetch(`./data/${file}`).then((r) => {
      if (!r.ok) throw new Error(`${file}: ${r.status}`);
      return r.json();
    });
    p.catch(() => cache.delete(file)); // allow retry after an error
    cache.set(file, p);
  }
  return cache.get(file) as Promise<T>;
}
