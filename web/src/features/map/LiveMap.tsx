import {
  addProtocol,
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  ScaleControl,
  setWorkerUrl,
} from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import { Protocol } from 'pmtiles';
import { useEffect, useRef } from 'preact/hooks';
import type { DevicePosition } from '../../shared/location/deviceLocation';
import { t } from '../../shared/i18n/i18n';
import {
  buildStyle,
  MAP_BOUNDS,
  MAP_CENTER,
  MAP_MAX_ZOOM,
  MAP_START_ZOOM,
  type MapFlavor,
} from './mapStyle';

/**
 * The real map (ADR 0016). Loaded on demand from the Map screen, only when the regional archive is
 * present, so the rest of the app does not pay for MapLibre. The worker is a file on this origin
 * (the page policy allows `worker-src 'self'` only). The device position, when given, is drawn as a
 * dot and never leaves this component: no storage, no logging, no network.
 */
let ready = false;
function prepare(): void {
  if (ready) return;
  ready = true;
  setWorkerUrl(workerUrl);
  addProtocol('pmtiles', new Protocol().tile);
}

export function isInsideMapArea(position: DevicePosition): boolean {
  const [west, south, east, north] = MAP_BOUNDS;
  return (
    position.lng >= west && position.lng <= east && position.lat >= south && position.lat <= north
  );
}

export interface LiveMapProps {
  readonly flavor: MapFlavor;
  readonly position: DevicePosition | null;
  readonly onOutside: (outside: boolean) => void;
}

export function LiveMap({ flavor, position, onOutside }: LiveMapProps) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const dot = useRef<Marker | null>(null);
  const centred = useRef(false);
  const styledWith = useRef(flavor);

  useEffect(() => {
    if (container.current === null) return undefined;
    prepare();
    const instance = new MapLibreMap({
      container: container.current,
      style: buildStyle(window.location.origin, flavor),
      center: [...MAP_CENTER],
      zoom: MAP_START_ZOOM,
      minZoom: 9,
      maxZoom: MAP_MAX_ZOOM,
      maxBounds: [
        [MAP_BOUNDS[0] - 0.05, MAP_BOUNDS[1] - 0.05],
        [MAP_BOUNDS[2] + 0.05, MAP_BOUNDS[3] + 0.05],
      ],
      attributionControl: { compact: true },
      cooperativeGestures: true,
    });
    instance.addControl(new NavigationControl({ showCompass: false }), 'top-right');
    instance.addControl(new ScaleControl({ unit: 'metric' }), 'bottom-left');
    map.current = instance;
    return () => {
      dot.current?.remove();
      dot.current = null;
      instance.remove();
      map.current = null;
      centred.current = false;
    };
    // The map is created once; theme changes restyle it below.
  }, []);

  useEffect(() => {
    // The map starts with this flavour; only a later theme change restyles it.
    if (styledWith.current === flavor) return;
    styledWith.current = flavor;
    map.current?.setStyle(buildStyle(window.location.origin, flavor));
  }, [flavor]);

  useEffect(() => {
    const instance = map.current;
    if (instance === null) return;
    if (position === null) {
      dot.current?.remove();
      dot.current = null;
      centred.current = false;
      onOutside(false);
      return;
    }
    const outside = !isInsideMapArea(position);
    onOutside(outside);
    if (outside) {
      dot.current?.remove();
      dot.current = null;
      return;
    }
    if (dot.current === null) {
      const element = document.createElement('div');
      element.className = 'you-dot';
      element.setAttribute('role', 'img');
      element.setAttribute('aria-label', t('map.locate.here'));
      dot.current = new Marker({ element }).setLngLat([position.lng, position.lat]).addTo(instance);
    } else {
      dot.current.setLngLat([position.lng, position.lat]);
    }
    if (!centred.current) {
      centred.current = true;
      instance.flyTo({
        center: [position.lng, position.lat],
        zoom: Math.max(instance.getZoom(), 15),
      });
    }
  }, [position, onOutside]);

  return (
    <div
      class="live-map"
      ref={container}
      role="region"
      aria-label={t('map.live.alt')}
      tabIndex={-1}
    />
  );
}
