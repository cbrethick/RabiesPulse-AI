import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Facility } from '../lib/data';
import { CHENNAI_CENTER, type LatLon } from '../lib/geo';
import type { Origin } from '../lib/app';
import { useApp } from '../lib/app';
import { CAT_VAR, cssVar, useThemeKey } from './ui';

export interface WardLayer {
  geojson: GeoJSON.FeatureCollection;
  color: (ward: string) => string | null;
  onWard?: (ward: string) => void;
  selected?: string | null;
}

interface Props {
  facilities?: Facility[];
  origin?: Origin | null;
  onTap?: (p: LatLon) => void;
  onFacility?: (f: Facility) => void;
  wards?: WardLayer;
  focus?: LatLon | null;
  short?: boolean;
  /** Re-fit the view when this value changes (e.g. a new origin). */
  fitKey?: string;
  /** With an origin: zoom so the origin and these places are all visible. */
  fitPoints?: LatLon[];
}

const ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

export default function MapView({ facilities = [], origin, onTap, onFacility, wards, focus, short, fitKey, fitPoints }: Props) {
  const { t } = useApp();
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const wardLayer = useRef<L.GeoJSON | null>(null);
  const youLayer = useRef<L.LayerGroup | null>(null);
  const [tileError, setTileError] = useState(false);
  const themeKey = useThemeKey();
  const cb = useRef({ onTap, onFacility, onWard: wards?.onWard });
  cb.current = { onTap, onFacility, onWard: wards?.onWard };

  // create once
  useEffect(() => {
    if (!el.current || map.current) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const m = L.map(el.current, { preferCanvas: true, zoomControl: true, attributionControl: true, zoomAnimation: !reduced, fadeAnimation: !reduced, markerZoomAnimation: !reduced }).setView(
      [CHENNAI_CENTER.lat, CHENNAI_CENTER.lon],
      11,
    );
    const tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: ATTR, subdomains: 'abc' });
    let errors = 0;
    tiles.on('tileerror', () => ++errors > 3 && setTileError(true));
    tiles.on('tileload', () => setTileError(false));
    tiles.addTo(m);
    m.on('click', (e: L.LeafletMouseEvent) => cb.current.onTap?.({ lat: e.latlng.lat, lon: e.latlng.lng }));
    layer.current = L.layerGroup().addTo(m);
    youLayer.current = L.layerGroup().addTo(m);
    map.current = m;
    const ro = new ResizeObserver(() => m.invalidateSize());
    ro.observe(el.current);
    return () => {
      ro.disconnect();
      m.remove();
      map.current = null;
    };
  }, []);

  // ward polygons
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    wardLayer.current?.remove();
    wardLayer.current = null;
    if (!wards) return;
    const line = cssVar('--text');
    wardLayer.current = L.geoJSON(wards.geojson, {
      style: (f) => {
        const w = f?.properties?.ward as string;
        const c = wards.color(w);
        const sel = wards.selected === w;
        return { color: sel ? line : cssVar('--surface') || '#fff', weight: sel ? 3 : 0.8, fillColor: c || 'transparent', fillOpacity: c ? 0.75 : 0, opacity: 1 };
      },
      onEachFeature: (f, lyr) => {
        lyr.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          cb.current.onWard?.(f.properties.ward);
        });
      },
    }).addTo(m);
    wardLayer.current.bringToBack();
  }, [wards, themeKey]);

  // facility markers
  useEffect(() => {
    const g = layer.current;
    if (!g) return;
    g.clearLayers();
    const ring = cssVar('--surface') || '#fff';
    // listed anti-rabies clinics are drawn last so they sit on top
    for (const f of [...facilities].sort((a, b) => Number(!!a.arv) - Number(!!b.arv))) {
      const arv = f.arv?.status === 'official';
      const color = cssVar(arv ? '--c-arv' : CAT_VAR[f.cat]);
      const mk = L.circleMarker([f.lat, f.lon], { radius: arv ? 11 : f.cat === 'gcc' || f.cat === 'govh' ? 8 : 6, color: arv ? cssVar('--text') : ring, weight: arv ? 3 : 2, fillColor: color, fillOpacity: 1 });
      mk.bindTooltip(f.name, { direction: 'top', offset: [0, -6] });
      mk.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        cb.current.onFacility?.(f);
      });
      mk.addTo(g);
    }
  }, [facilities, themeKey]);

  // user / chosen location
  useEffect(() => {
    const g = youLayer.current;
    if (!g) return;
    g.clearLayers();
    if (!origin) return;
    if (origin.source === 'gps' && origin.accuracy && origin.accuracy < 2000) {
      L.circle([origin.lat, origin.lon], { radius: origin.accuracy, color: cssVar('--c-you'), weight: 1, fillOpacity: 0.08 }).addTo(g);
    }
    L.marker([origin.lat, origin.lon], { icon: L.divIcon({ className: '', html: '<div class="you-pin"></div>', iconSize: [18, 18], iconAnchor: [9, 9] }), zIndexOffset: 1000 })
      .bindTooltip(origin.source === 'gps' ? t('you') : origin.label || t('myLocation'))
      .addTo(g);
  }, [origin, t]);

  // fit view on a new origin / focus
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    // instant jumps: an animated multi-level zoom can stall on slow or backgrounded WebViews
    if (focus) m.setView([focus.lat, focus.lon], 16, { animate: false });
    else if (origin && fitPoints?.length) {
      const b = L.latLngBounds([[origin.lat, origin.lon], ...fitPoints.map((p) => [p.lat, p.lon] as [number, number])]);
      m.fitBounds(b, { padding: [36, 36], maxZoom: 16, animate: false });
    } else if (origin) m.setView([origin.lat, origin.lon], 14, { animate: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey, focus?.lat, focus?.lon]);

  return (
    <div className={`mapbox${short ? ' short' : ''}`}>
      <div ref={el} style={{ position: 'absolute', inset: 0 }} role="application" aria-label={t('map')} />
      {tileError && (
        <div className="badge" style={{ position: 'absolute', left: 8, bottom: 24, zIndex: 500 }}>
          {t('mapOffline')}
        </div>
      )}
    </div>
  );
}
