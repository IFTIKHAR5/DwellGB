// components/map/ListingMap.jsx — single listing: exact pin (if allowed) or a ~400 m circle.
// Has a Map / Satellite switch like the other maps.
import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MAPBOX_TOKEN, MAP_STYLES, hasMapbox, circlePolygon, savedMapStyle, StyleSwitcher } from '../../lib/mapbox';
import { useLanguage } from '../../context/LanguageContext';
import MapUnavailable from './MapUnavailable';

if (hasMapbox) mapboxgl.accessToken = MAPBOX_TOKEN;

export default function ListingMap({ location, className = 'h-80' }) {
  const { t } = useLanguage();
  const ref = useRef(null);
  const switcherRef = useRef(null);
  const labels = { map: t('map.styleMap'), satellite: t('map.styleSatellite') };
  const labelsRef = useRef(labels);
  labelsRef.current = labels;

  useEffect(() => {
    if (!hasMapbox || !ref.current || !location) return undefined;
    const center = [location.lng, location.lat];
    const map = new mapboxgl.Map({
      container: ref.current,
      style: MAP_STYLES[savedMapStyle()],
      center,
      zoom: location.exact ? 15 : 14,
      cooperativeGestures: true,
    });
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');
    switcherRef.current = new StyleSwitcher(labelsRef.current);
    map.addControl(switcherRef.current, 'bottom-left');

    let marker;
    if (location.exact) {
      // A marker is a normal HTML element, so it survives a style switch.
      marker = new mapboxgl.Marker({ color: '#FF6A33' }).setLngLat(center).addTo(map);
    } else {
      // Layers belong to the style: 'style.load' runs on first load AND after every
      // Map ↔ Satellite switch, so the circle is drawn again each time.
      map.on('style.load', () => {
        if (map.getSource('area')) return;
        map.addSource('area', { type: 'geojson', data: circlePolygon(center, 400) });
        map.addLayer({ id: 'area-fill', type: 'fill', source: 'area', paint: { 'fill-color': '#1F2A6E', 'fill-opacity': 0.16 } });
        map.addLayer({ id: 'area-line', type: 'line', source: 'area', paint: { 'line-color': '#1F2A6E', 'line-width': 2, 'line-opacity': 0.6 } });
      });
    }
    return () => {
      marker?.remove();
      map.remove();
      switcherRef.current = null;
    };
  }, [location]);

  // Language changed → relabel the switch.
  useEffect(() => {
    switcherRef.current?.setLabels(labelsRef.current);
  }, [t]);

  if (!hasMapbox || !location) return <MapUnavailable className={className} />;
  return <div ref={ref} className={`w-full rounded-2xl overflow-hidden ${className}`} />;
}
