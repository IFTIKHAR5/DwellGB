// components/map/LocationPicker.jsx — owners pin their property: search an address,
// click the map, drag the pin, or use GPS. Returns { lat, lng } + a suggested area name.
import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Search, LocateFixed, MapPin } from '@/components/icons';
import { MAPBOX_TOKEN, MAP_STYLES, GB_BOUNDS, GB_CENTER, hasMapbox, geocode, reverseGeocode, savedMapStyle, StyleSwitcher } from '../../lib/mapbox';
import { DISTRICTS, DISTRICT_CENTERS } from '../../lib/constants';
import useDebounce from '../../hooks/useDebounce';
import MapUnavailable from './MapUnavailable';

if (hasMapbox) mapboxgl.accessToken = MAPBOX_TOKEN;

const inGB = (lng, lat) => lng >= 72.4 && lng <= 77.9 && lat >= 34.4 && lat <= 37.1;

// If Mapbox finds nothing, at least offer the districts whose name matches.
function districtMatches(text) {
  const q = text.trim().toLowerCase();
  return DISTRICTS.filter((d) => d.toLowerCase().includes(q)).map((d) => ({
    id: `district-${d}`,
    name: d,
    full: `${d} District, Gilgit-Baltistan`,
    lng: DISTRICT_CENTERS[d][0],
    lat: DISTRICT_CENTERS[d][1],
  }));
}

export default function LocationPicker({ value, onChange, onPlace, focus, t }) {
  const ref = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState('');
  const debounced = useDebounce(query, 300);
  const cb = useRef({ onChange, onPlace });
  cb.current = { onChange, onPlace };

  function place(lng, lat, { fly = true, lookup = true } = {}) {
    if (!inGB(lng, lat)) {
      setError(t('map.outsideGB'));
      return;
    }
    setError('');
    const map = mapRef.current;
    if (!markerRef.current) {
      markerRef.current = new mapboxgl.Marker({ color: '#FF6A33', draggable: true }).setLngLat([lng, lat]).addTo(map);
      markerRef.current.on('dragend', () => {
        const p = markerRef.current.getLngLat();
        place(p.lng, p.lat, { fly: false });
      });
    } else {
      markerRef.current.setLngLat([lng, lat]);
    }
    if (fly) map.flyTo({ center: [lng, lat], zoom: Math.max(map.getZoom(), 15), duration: 700 });
    cb.current.onChange({ lat: +lat.toFixed(6), lng: +lng.toFixed(6) });
    if (lookup) reverseGeocode(lng, lat).then((r) => r && cb.current.onPlace?.(r)).catch(() => {});
  }

  useEffect(() => {
    if (!hasMapbox || !ref.current) return undefined;
    const start = value ? [value.lng, value.lat] : GB_CENTER;
    const map = new mapboxgl.Map({ container: ref.current, style: MAP_STYLES[savedMapStyle()], center: start, zoom: value ? 15 : 7, maxBounds: GB_BOUNDS });
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');
    // Satellite view helps owners find their exact house.
    map.addControl(new StyleSwitcher({ map: t('map.styleMap'), satellite: t('map.styleSatellite') }), 'bottom-left');
    map.getCanvas().style.cursor = 'crosshair';
    map.on('click', (e) => place(e.lngLat.lng, e.lngLat.lat, { fly: false }));
    mapRef.current = map;
    if (value) map.on('load', () => place(value.lng, value.lat, { fly: false, lookup: false }));
    return () => {
      markerRef.current?.remove();
      markerRef.current = null;
      map.remove();
    };
    // eslint-disable-next-line
  }, []);

  // When the owner picks a district, move the map there (if nothing is pinned yet).
  useEffect(() => {
    if (focus && mapRef.current && !markerRef.current) mapRef.current.flyTo({ center: focus, zoom: 12, duration: 800 });
  }, [focus]);

  useEffect(() => {
    const text = debounced.trim();
    if (text.length < 2) {
      setResults([]);
      setSearching(false);
      return undefined;
    }
    const ctrl = new AbortController();
    const c = mapRef.current?.getCenter();
    setSearching(true);
    geocode(text, { signal: ctrl.signal, proximity: c ? [c.lng, c.lat] : undefined })
      .then((found) => {
        setResults(found.length ? found : districtMatches(text));
        setHighlight(0);
        setSearching(false);
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        setResults(districtMatches(text));
        setSearching(false);
      });
    return () => ctrl.abort();
  }, [debounced]);

  function choose(r) {
    place(r.lng, r.lat);
    setQuery(r.name);
    setOpen(false);
  }

  // Enter picks a result (and never submits the listing form), arrows move, Escape closes.
  function onSearchKey(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (results[highlight]) choose(results[highlight]);
    } else if (e.key === 'ArrowDown' && results.length) {
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => (h + 1) % results.length);
    } else if (e.key === 'ArrowUp' && results.length) {
      e.preventDefault();
      setHighlight((h) => (h - 1 + results.length) % results.length);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  const typed = query.trim().length >= 2;
  const waiting = typed && (searching || query !== debounced);

  function useGps() {
    if (!navigator.geolocation) return setError(t('map.noGps'));
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLocating(false); place(pos.coords.longitude, pos.coords.latitude); },
      () => { setLocating(false); setError(t('map.gpsDenied')); },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  if (!hasMapbox) return <MapUnavailable className="h-72" />;

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute start-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            className="input ps-10"
            placeholder={t('map.searchPlaceholder')}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onKeyDown={onSearchKey}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            role="combobox"
            aria-expanded={open && results.length > 0}
            aria-autocomplete="list"
            enterKeyHint="search"
            autoComplete="off"
          />
          {open && typed && (waiting || results.length === 0) && (
            <div className="absolute z-20 mt-1 w-full card shadow-lift px-4 py-3 text-sm text-muted">
              {waiting ? t('map.searching') : t('map.noResults')}
            </div>
          )}
          {open && !waiting && results.length > 0 && (
            <ul className="absolute z-20 mt-1 w-full card shadow-lift p-1.5 max-h-72 overflow-y-auto" role="listbox">
              {results.map((r, i) => (
                <li key={r.id} role="option" aria-selected={i === highlight}>
                  <button
                    type="button"
                    className={`w-full text-start flex gap-2.5 px-3 py-2.5 rounded-xl hover:bg-sunken ${i === highlight ? 'bg-sunken' : ''}`}
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseEnter={() => setHighlight(i)}
                    onClick={() => choose(r)}
                  >
                    <MapPin className="w-4 h-4 mt-0.5 text-muted shrink-0" />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium truncate">{r.name}</span>
                      <span className="block text-xs text-muted truncate">{r.full}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <button type="button" onClick={useGps} className="btn btn-secondary shrink-0" disabled={locating}>
          <LocateFixed className={`w-4 h-4 ${locating ? 'animate-pulse' : ''}`} />
          <span className="hidden sm:inline">{t('map.useMyLocation')}</span>
        </button>
      </div>
      <div ref={ref} className="w-full h-80 md:h-96 rounded-2xl overflow-hidden border border-line" />
      {error ? (
        <p className="text-sm text-danger font-medium">{error}</p>
      ) : (
        <p className="text-xs text-muted">{value ? t('map.pinned', { lat: value.lat.toFixed(5), lng: value.lng.toFixed(5) }) : t('map.clickToPin')}</p>
      )}
    </div>
  );
}
