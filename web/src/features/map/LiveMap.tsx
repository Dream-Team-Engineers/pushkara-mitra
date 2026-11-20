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
import { render } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import type { Place } from '../../shared/data/places';
import { Icon } from '../../shared/ui/Icon';
import { PLACE_ICON } from './placeIcons';
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
  /** Pins to draw (already filtered by category) and the label for each pin. */
  readonly places?: readonly Place[];
  readonly placeLabel?: (place: Place) => string;
  readonly selectedId?: string | null;
  readonly onSelect?: (id: string) => void;
}

export function LiveMap({
  flavor,
  position,
  onOutside,
  places = [],
  placeLabel = (place) => place.name,
  selectedId = null,
  onSelect,
}: LiveMapProps) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const dot = useRef<Marker | null>(null);
  const pins = useRef<Map<string, { marker: Marker; element: HTMLButtonElement }>>(new Map());
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
      for (const pin of pins.current.values()) pin.marker.remove();
      pins.current.clear();
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

  useEffect(() => {
    const instance = map.current;
    if (instance === null) return;
    for (const pin of pins.current.values()) pin.marker.remove();
    pins.current.clear();
    for (const place of places) {
      const element = document.createElement('button');
      element.type = 'button';
      element.className = `map-pin map-pin--${place.category}`;
      element.setAttribute('aria-label', placeLabel(place));
      render(<Icon name={PLACE_ICON[place.category]} size={18} />, element);
      element.addEventListener('click', () => {
        onSelect?.(place.id);
      });
      const holder = document.createElement('div');
      holder.className = 'map-pin-holder';
      holder.append(element);
      const marker = new Marker({ element: holder, anchor: 'bottom' })
        .setLngLat([place.lng, place.lat])
        .addTo(instance);
      pins.current.set(place.id, { marker, element });
    }
    // placeLabel and onSelect are stable enough for a pin redraw only when the places change.
  }, [places]);

  useEffect(() => {
    const instance = map.current;
    for (const [id, pin] of pins.current) {
      pin.element.classList.toggle('is-selected', id === selectedId);
      if (id === selectedId) pin.element.setAttribute('aria-current', 'true');
      else pin.element.removeAttribute('aria-current');
    }
    const place = places.find((candidate) => candidate.id === selectedId);
    if (instance !== null && place !== undefined) {
      instance.flyTo({
        center: [place.lng, place.lat],
        zoom: Math.max(instance.getZoom(), 15),
      });
    }
    // Only a change of selection moves the map.
  }, [selectedId, places]);

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
