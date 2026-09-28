import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAccount } from '../store/accountStore';

// Standard OpenStreetMap tiles (no key needed). Dark mode is a CSS filter on the tile layer.
const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

interface Props {
  lat: number;
  lng: number;
  accuracy?: number;
  danger?: boolean;
  zoom?: number;
  interactive?: boolean;
}

export function LeafletMap({ lat, lng, accuracy, danger = false, zoom = 16, interactive = true }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const tiles = useRef<L.TileLayer | null>(null);
  const marker = useRef<L.Marker | null>(null);
  const circle = useRef<L.Circle | null>(null);
  const { theme } = useAccount();

  useEffect(() => {
    if (!el.current) return;
    const m = L.map(el.current, {
      zoomControl: interactive,
      attributionControl: true,
      scrollWheelZoom: false,
      dragging: interactive,
      doubleClickZoom: interactive,
      keyboard: interactive,
    }).setView([lat, lng], zoom);
    map.current = m;
    const ro = new ResizeObserver(() => m.invalidateSize());
    ro.observe(el.current);
    return () => {
      ro.disconnect();
      m.remove();
      map.current = null;
      tiles.current = null;
      marker.current = null;
      circle.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    tiles.current?.remove();
    tiles.current = L.tileLayer(TILE_URL, { attribution: ATTRIBUTION, maxZoom: 19, className: `sentra-tiles ${theme}` }).addTo(m);
  }, [theme]);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const icon = L.divIcon({ className: '', html: `<div class="pin ${danger ? 'danger' : ''}"><span></span></div>`, iconSize: [22, 22], iconAnchor: [11, 11] });
    if (!marker.current) marker.current = L.marker([lat, lng], { icon, keyboard: false }).addTo(m);
    else marker.current.setLatLng([lat, lng]).setIcon(icon);

    const color = danger ? '#dc3345' : '#3159e6';
    if (accuracy) {
      if (!circle.current) circle.current = L.circle([lat, lng], { radius: accuracy, color, weight: 1, fillOpacity: 0.08 }).addTo(m);
      else circle.current.setLatLng([lat, lng]).setRadius(accuracy).setStyle({ color });
    }
    m.panTo([lat, lng], { animate: true });
  }, [lat, lng, accuracy, danger]);

  return <div ref={el} style={{ width: '100%', height: '100%' }} role="img" aria-label={`Map showing the band's location at ${lat.toFixed(4)}, ${lng.toFixed(4)}`} />;
}
