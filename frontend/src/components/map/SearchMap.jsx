// components/map/SearchMap.jsx — Mapbox map with price markers for search results.
import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MAPBOX_TOKEN, MAP_STYLES, GB_CENTER, GB_BOUNDS, hasMapbox, savedMapStyle, StyleSwitcher } from '../../lib/mapbox';
import { formatRent } from '../../lib/format';
import { mediaUrl } from '../../api/client';
import MapUnavailable from './MapUnavailable';

if (hasMapbox) mapboxgl.accessToken = MAPBOX_TOKEN;

function popupHtml(l, t) {
  const img = mediaUrl(l.cover);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  return `<a href="/listings/${esc(l.id)}" data-listing="${esc(l.id)}" style="display:block;width:240px;text-decoration:none;color:inherit">
    ${img ? `<img src="${esc(img)}" alt="" style="width:100%;height:130px;object-fit:cover;display:block"/>` : ''}
    <div style="padding:10px 12px 12px">
      <div style="font-weight:600;font-size:14px;line-height:1.3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(l.title)}</div>
      <div style="font-size:12px;color:#737889;margin-top:2px">${esc(l.area)} · ${esc(t(`district.${l.district}`))}</div>
      <div style="font-weight:700;margin-top:6px">${esc(formatRent(l.rent))} <span style="font-weight:400;color:#737889;font-size:12px">/ ${esc(t('listing.month'))}</span></div>
    </div></a>`;
}

/**
 * props:
 *  listings        cards from the API (with .location)
 *  activeId        highlighted listing (hovered card)
 *  onBoundsChange  ([minLng,minLat,maxLng,maxLat]) called after the user moves the map
 *  flyTo           [lng, lat] to animate to (e.g. when a district is chosen)
 *  t               translate fn
 */
export default function SearchMap({ listings, activeId, onBoundsChange, onOpen, flyTo, t, className = '' }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef(new Map());
  const userMoved = useRef(false);
  const boundsCb = useRef(onBoundsChange);
  boundsCb.current = onBoundsChange;
  const openCb = useRef(onOpen);
  openCb.current = onOpen;
  const switcherRef = useRef(null);
  const styleLabels = { map: t('map.styleMap'), satellite: t('map.styleSatellite') };
  const labelsRef = useRef(styleLabels);
  labelsRef.current = styleLabels;

  // Popup links navigate inside the SPA instead of reloading the page.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;
    const onClick = (e) => {
      const a = e.target.closest('a[data-listing]');
      if (a && openCb.current) {
        e.preventDefault();
        openCb.current(a.dataset.listing);
      }
    };
    el.addEventListener('click', onClick);
    return () => el.removeEventListener('click', onClick);
  }, []);

  useEffect(() => {
    if (!hasMapbox || !containerRef.current) return undefined;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: MAP_STYLES[savedMapStyle()],
      center: GB_CENTER,
      zoom: 7,
      maxBounds: GB_BOUNDS,
      attributionControl: true,
      cooperativeGestures: false,
    });
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');
    switcherRef.current = new StyleSwitcher(labelsRef.current);
    map.addControl(switcherRef.current, 'bottom-left');
    map.on('dragstart', () => { userMoved.current = true; });
    map.on('zoomstart', (e) => { if (e.originalEvent) userMoved.current = true; });
    map.on('moveend', () => {
      if (!userMoved.current) return;
      userMoved.current = false;
      const b = map.getBounds();
      boundsCb.current?.([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()].map((n) => +n.toFixed(5)));
    });
    mapRef.current = map;
    const markers = markersRef.current;
    return () => {
      markers.forEach((m) => m.remove());
      markers.clear();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Sync markers with the current result set.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const seen = new Set();
    const withLoc = listings.filter((l) => l.location);
    for (const l of withLoc) {
      seen.add(l.id);
      if (markersRef.current.has(l.id)) continue;
      const el = document.createElement('button');
      el.className = 'price-marker';
      el.type = 'button';
      el.textContent = formatRent(l.rent, { compact: true });
      el.dataset.rented = String(l.status === 'rented');
      el.setAttribute('aria-label', l.title);
      const popup = new mapboxgl.Popup({ offset: 18, closeButton: false, maxWidth: '260px' }).setHTML(popupHtml(l, t));
      const marker = new mapboxgl.Marker({ element: el }).setLngLat([l.location.lng, l.location.lat]).setPopup(popup).addTo(map);
      markersRef.current.set(l.id, marker);
    }
    for (const [id, m] of markersRef.current) {
      if (!seen.has(id)) {
        m.remove();
        markersRef.current.delete(id);
      }
    }
  }, [listings, t]);

  // Fit to results when they change (but not when the user is panning around).
  const fitKey = listings.map((l) => l.id).join(',');
  useEffect(() => {
    const map = mapRef.current;
    const pts = listings.filter((l) => l.location);
    if (!map || !pts.length || flyTo) return;
    const b = new mapboxgl.LngLatBounds();
    pts.forEach((l) => b.extend([l.location.lng, l.location.lat]));
    map.fitBounds(b, { padding: 60, maxZoom: 14, duration: 600 });
    // eslint-disable-next-line
  }, [fitKey]);

  // Language changed → relabel the Map / Satellite buttons.
  useEffect(() => {
    switcherRef.current?.setLabels(labelsRef.current);
  }, [t]);

  useEffect(() => {
    if (flyTo && mapRef.current) mapRef.current.flyTo({ center: flyTo, zoom: 11, duration: 900 });
  }, [flyTo]);

  useEffect(() => {
    for (const [id, m] of markersRef.current) {
      const el = m.getElement();
      el.dataset.active = String(id === activeId);
      el.style.zIndex = id === activeId ? '10' : '';
    }
  }, [activeId, listings]);

  if (!hasMapbox) return <MapUnavailable className={className} />;
  return <div ref={containerRef} className={`w-full h-full rounded-2xl overflow-hidden ${className}`} />;
}
