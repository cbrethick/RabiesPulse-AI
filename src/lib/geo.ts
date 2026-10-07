export interface LatLon {
  lat: number;
  lon: number;
}

/** Straight-line distance in km (not road distance). */
export function haversineKm(a: LatLon, b: LatLon) {
  const r = (d: number) => (d * Math.PI) / 180;
  const dLat = r(b.lat - a.lat);
  const dLon = r(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

export const fmtKm = (km: number) => (km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(km < 10 ? 1 : 0)} km`);

/**
 * Google Maps directions. We only send an origin when it is the user's real GPS
 * position; for a manually chosen area Google uses the phone's own location.
 */
export function directionsUrl(dest: LatLon, origin?: LatLon | null) {
  const p = new URLSearchParams({ api: '1', destination: `${dest.lat},${dest.lon}`, travelmode: 'driving' });
  if (origin) p.set('origin', `${origin.lat},${origin.lon}`);
  return `https://www.google.com/maps/dir/?${p.toString()}`;
}

/** tel: link only for numbers that look dialable. */
export function telUrl(phone?: string | null) {
  if (!phone) return null;
  const d = phone.replace(/[^\d+]/g, '');
  const n = d.replace(/^\+/, '').length;
  return n >= 8 && n <= 13 ? `tel:${d}` : null;
}

export type GeoErr = 'denied' | 'unavailable' | 'timeout' | 'unsupported' | 'insecure';

/** One-shot location request. Only ever called from a user tap. */
export function getPosition(): Promise<LatLon & { accuracy: number }> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) return reject('unsupported' as GeoErr);
    if (!window.isSecureContext) return reject('insecure' as GeoErr);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude, accuracy: p.coords.accuracy }),
      (e) => reject((e.code === 1 ? 'denied' : e.code === 3 ? 'timeout' : 'unavailable') as GeoErr),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  });
}

/** Rounds to ~110 m so stored reports never keep an exact position. */
export const coarse = (v: number) => Math.round(v * 1000) / 1000;

/** Rough Chennai box — used to warn when a GPS fix is far outside the dataset. */
export const inChennaiArea = (p: LatLon) => p.lat > 12.75 && p.lat < 13.3 && p.lon > 80.0 && p.lon < 80.4;

export const CHENNAI_CENTER: LatLon = { lat: 13.06, lon: 80.24 };

/**
 * Live GPS: keeps updating while the user is on the page. Started only from a tap;
 * returns a stop function. Errors after the first fix are ignored (we keep the last fix).
 */
export function watchPosition(onFix: (p: LatLon & { accuracy: number }) => void, onError: (e: GeoErr) => void) {
  if (!('geolocation' in navigator)) {
    onError('unsupported');
    return () => {};
  }
  if (!window.isSecureContext) {
    onError('insecure');
    return () => {};
  }
  let gotFix = false;
  const id = navigator.geolocation.watchPosition(
    (p) => {
      gotFix = true;
      onFix({ lat: p.coords.latitude, lon: p.coords.longitude, accuracy: p.coords.accuracy });
    },
    (e) => {
      if (e.code === 1 || !gotFix) onError(e.code === 1 ? 'denied' : e.code === 3 ? 'timeout' : 'unavailable');
    },
    { enableHighAccuracy: true, timeout: 20000, maximumAge: 5000 },
  );
  return () => navigator.geolocation.clearWatch(id);
}
