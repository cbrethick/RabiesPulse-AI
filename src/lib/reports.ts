// Incident reports live in IndexedDB on this device. An anonymous copy (date, animal,
// exposure type, ward) is sent to the officer dashboard; photo, note and position stay here.
import { cloudOn, sendReport, wardOf } from './cloud';
import { load, type Ward } from './data';
export interface Report {
  id: string;
  owner: string;
  createdAt: string;
  date: string;
  animal: string;
  exposure: string;
  area?: string;
  lat?: number;
  lon?: number;
  note?: string;
  photo?: Blob;
  /** True once the anonymous copy reached the officer dashboard. */
  synced?: boolean;
}

const DB = 'rabiespulse';
const STORE = 'reports';

function open(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => {
      const s = r.result.createObjectStore(STORE, { keyPath: 'id' });
      s.createIndex('owner', 'owner');
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((res, rej) => {
    const t = db.transaction(STORE, mode);
    const q = fn(t.objectStore(STORE));
    q.onsuccess = () => res(q.result);
    q.onerror = () => rej(q.error);
  });
}

export const saveReport = (r: Report) => tx('readwrite', (s) => s.put(r));
export const deleteReport = (id: string) => tx('readwrite', (s) => s.delete(id));

export async function listReports(owner: string): Promise<Report[]> {
  const all = await tx<Report[]>('readonly', (s) => s.index('owner').getAll(owner));
  return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

let syncing = false;
/** Send every report that has not reached the dashboard yet. Safe to call often; failures retry next time. */
export async function syncReports(owner: string) {
  if (!cloudOn || syncing) return;
  syncing = true;
  try {
    const pending = (await listReports(owner)).filter((r) => !r.synced);
    if (!pending.length) return;
    const [geo, wards] = await Promise.all([load<GeoJSON.FeatureCollection>('wards.geojson'), load<Ward[]>('wards.json')]);
    for (const r of pending) {
      const ward = r.lat != null && r.lon != null ? wardOf(r.lat, r.lon, geo) : null;
      const zone = ward ? (wards.find((w) => w.ward === ward)?.zoneName ?? null) : null;
      await sendReport({ id: r.id, incident_date: r.date, animal: r.animal, exposure: r.exposure, ward, zone, lat: r.lat != null ? Math.round(r.lat * 100) / 100 : null, lon: r.lon != null ? Math.round(r.lon * 100) / 100 : null });
      await saveReport({ ...r, synced: true });
    }
  } catch {
    /* offline or server asleep: try again on the next call */
  } finally {
    syncing = false;
  }
}

export async function deleteAllReports(owner: string) {
  for (const r of await listReports(owner)) await deleteReport(r.id);
}

/** Shrink a photo to max 1024 px JPEG so storage stays small. */
export async function shrinkImage(file: File, max = 1024): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * scale);
  c.height = Math.round(bmp.height * scale);
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((res) => c.toBlob((b) => res(b || file), 'image/jpeg', 0.8));
}
