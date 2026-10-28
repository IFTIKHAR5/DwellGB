// lib/mapbox.js — Mapbox configuration + geocoding helpers (Search API v6).
// The token is a PUBLIC "pk." token — restrict it to your domains in the Mapbox dashboard.
export const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';
export const hasMapbox = MAPBOX_TOKEN.startsWith('pk.');

// Two looks the user can switch between on every map.
export const MAP_STYLES = {
  map: 'mapbox://styles/mapbox/outdoors-v12', // roads, terrain shading, place names
  satellite: 'mapbox://styles/mapbox/satellite-streets-v12', // satellite photos + road and place names
};
const STYLE_KEY = 'dwellgb.mapStyle';

/** The look the user picked last time ("map" or "satellite"). */
export function savedMapStyle() {
  try {
    return localStorage.getItem(STYLE_KEY) === 'satellite' ? 'satellite' : 'map';
  } catch {
    return 'map';
  }
}

/**
 * Mapbox control with two buttons: "Map" | "Satellite".
 *   map.addControl(new StyleSwitcher({ map: 'Map', satellite: 'Satellite' }), 'bottom-left')
 * Switching calls map.setStyle(). Markers stay; layers you added yourself must be
 * added again on the map's 'style.load' event (see ListingMap).
 */
export class StyleSwitcher {
  constructor(labels) {
    this.labels = labels;
    this.current = savedMapStyle();
  }

  onAdd(map) {
    this.map = map;
    this.el = document.createElement('div');
    this.el.className = 'mapboxgl-ctrl map-style-switch';
    this.el.setAttribute('role', 'group');
    this.buttons = {};
    for (const key of ['map', 'satellite']) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.addEventListener('click', () => this.select(key));
      this.buttons[key] = btn;
      this.el.appendChild(btn);
    }
    this.render();
    return this.el;
  }

  onRemove() {
    this.el.remove();
    this.map = undefined;
  }

  select(key) {
    if (key === this.current) return;
    this.current = key;
    try { localStorage.setItem(STYLE_KEY, key); } catch { /* private mode: just don't remember */ }
    this.map.setStyle(MAP_STYLES[key]);
    this.render();
  }

  setLabels(labels) {
    this.labels = labels;
    if (this.el) this.render();
  }

  render() {
    for (const [key, btn] of Object.entries(this.buttons)) {
      btn.textContent = this.labels[key];
      btn.setAttribute('aria-pressed', String(key === this.current));
    }
  }
}

export const GB_CENTER = [74.65, 35.85];
// [[west, south], [east, north]] — padded so the whole region is always reachable.
export const GB_BOUNDS = [[71.8, 33.9], [78.4, 37.4]];
const SEARCH_BBOX = '72.4,34.4,77.9,37.1';

const BASE = 'https://api.mapbox.com/search/geocode/v6';

export async function geocode(query, { proximity, signal } = {}) {
  if (!hasMapbox || !query || query.trim().length < 2) return [];
  const params = new URLSearchParams({
    q: query.trim(),
    access_token: MAPBOX_TOKEN,
    country: 'pk',
    bbox: SEARCH_BBOX,
    limit: '6',
    language: 'en',
    // Search API v6 has no "poi" type — sending it makes Mapbox reject every search (HTTP 422).
    types: 'district,place,locality,neighborhood,street,address',
  });
  if (proximity) params.set('proximity', proximity.join(','));
  const res = await fetch(`${BASE}/forward?${params}`, { signal });
  if (!res.ok) {
    if (import.meta.env.DEV) console.warn('Mapbox search failed:', res.status, await res.text().catch(() => ''));
    return [];
  }
  const json = await res.json();
  return (json.features || []).map((f) => ({
    id: f.id || f.properties?.mapbox_id,
    name: f.properties?.name || '',
    full: f.properties?.full_address || f.properties?.place_formatted || f.properties?.name || '',
    lng: f.geometry.coordinates[0],
    lat: f.geometry.coordinates[1],
  }));
}

export async function reverseGeocode(lng, lat, { signal } = {}) {
  if (!hasMapbox) return null;
  const params = new URLSearchParams({ longitude: String(lng), latitude: String(lat), access_token: MAPBOX_TOKEN, language: 'en', limit: '1' });
  const res = await fetch(`${BASE}/reverse?${params}`, { signal });
  if (!res.ok) return null;
  const f = (await res.json()).features?.[0];
  if (!f) return null;
  const ctx = f.properties?.context || {};
  return {
    name: f.properties?.name || '',
    full: f.properties?.full_address || f.properties?.place_formatted || '',
    locality: ctx.locality?.name || ctx.neighborhood?.name || ctx.place?.name || '',
    place: ctx.place?.name || '',
  };
}

/** GeoJSON circle polygon (for "approximate location" display). */
export function circlePolygon([lng, lat], radiusMeters = 400, steps = 48) {
  const coords = [];
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * 2 * Math.PI;
    const dx = (radiusMeters * Math.cos(a)) / (111320 * Math.cos((lat * Math.PI) / 180));
    const dy = (radiusMeters * Math.sin(a)) / 110540;
    coords.push([lng + dx, lat + dy]);
  }
  return { type: 'Feature', geometry: { type: 'Polygon', coordinates: [coords] }, properties: {} };
}
