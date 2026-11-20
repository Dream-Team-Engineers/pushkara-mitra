import {
  addProtocol,
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  ScaleControl,
  setWorkerUrl,
  type GeoJSONSource,
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
 *
 * Places are clustered by the map itself (numbered bubbles that split as you zoom in); single
 * places are drawn as pin buttons so keyboard and screen-reader users can reach them.
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

const SOURCE = 'places';
/** Clusters break apart at this zoom, so a single place is always reachable by zooming in. */
const CLUSTER_MAX_ZOOM = 15;
const SINGLE_ZOOM = CLUSTER_MAX_ZOOM + 1;

function toGeoJson(places: readonly Place[]) {
  return {
    type: 'FeatureCollection' as const,
    features: places.map((place) => ({
      type: 'Feature' as const,
      properties: { id: place.id },
      geometry: { type: 'Point' as const, coordinates: [place.lng, place.lat] },
    })),
  };
}

export interface LiveMapProps {
  readonly flavor: MapFlavor;
  readonly position: DevicePosition | null;
  readonly onOutside: (outside: boolean) => void;
  /** Places to draw (already filtered by category) and the label for each pin. */
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
  // The latest props, read by map event handlers that are registered once.
  const latest = useRef({ places, placeLabel, selectedId, onSelect });
  latest.current = { places, placeLabel, selectedId, onSelect };

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

    const applySelection = (): void => {
      for (const [id, pin] of pins.current) {
        const selected = id === latest.current.selectedId;
        pin.element.classList.toggle('is-selected', selected);
        if (selected) pin.element.setAttribute('aria-current', 'true');
        else pin.element.removeAttribute('aria-current');
      }
    };

    /** Adds the place source and layers. Runs for every style load, so a theme change keeps the pins. */
    const addPlaceLayers = (): void => {
      if (instance.getSource(SOURCE) === undefined) {
        instance.addSource(SOURCE, {
          type: 'geojson',
          data: toGeoJson(latest.current.places),
          cluster: true,
          clusterRadius: 48,
          clusterMaxZoom: CLUSTER_MAX_ZOOM,
        });
      }
      if (instance.getLayer('place-clusters') !== undefined) return;
      instance.addLayer({
        id: 'place-clusters',
        type: 'circle',
        source: SOURCE,
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': '#0f6e6e',
          'circle-radius': ['step', ['get', 'point_count'], 19, 10, 23, 50, 29],
          'circle-stroke-width': 3,
          'circle-stroke-color': '#ffffff',
        },
      });
      instance.addLayer({
        id: 'place-cluster-count',
        type: 'symbol',
        source: SOURCE,
        filter: ['has', 'point_count'],
        layout: {
          'text-field': ['get', 'point_count_abbreviated'],
          'text-font': ['Noto Sans Medium'],
          'text-size': 15,
          'text-allow-overlap': true,
        },
        paint: { 'text-color': '#ffffff' },
      });
      // Invisible: only used to find the single places in view, which are then drawn as pin buttons.
      instance.addLayer({
        id: 'place-points',
        type: 'circle',
        source: SOURCE,
        filter: ['!', ['has', 'point_count']],
        paint: { 'circle-radius': 16, 'circle-opacity': 0 },
      });
    };

    const syncPins = (): void => {
      if (instance.getLayer('place-points') === undefined) return;
      const inView = new Set<string>();
      for (const feature of instance.queryRenderedFeatures({ layers: ['place-points'] })) {
        const id: unknown = feature.properties['id'];
        if (typeof id !== 'string') continue;
        inView.add(id);
        if (pins.current.has(id)) continue;
        const place = latest.current.places.find((candidate) => candidate.id === id);
        if (place === undefined) continue;
        const element = document.createElement('button');
        element.type = 'button';
        element.className = `map-pin map-pin--${place.category}`;
        element.setAttribute('aria-label', latest.current.placeLabel(place));
        render(<Icon name={PLACE_ICON[place.category]} size={18} />, element);
        element.addEventListener('click', () => {
          latest.current.onSelect?.(place.id);
        });
        // MapLibre moves the marker's own element with a transform, so the pin shape sits inside a holder.
        const holder = document.createElement('div');
        holder.className = 'map-pin-holder';
        holder.append(element);
        const marker = new Marker({ element: holder, anchor: 'bottom' })
          .setLngLat([place.lng, place.lat])
          .addTo(instance);
        pins.current.set(id, { marker, element });
      }
      for (const [id, pin] of pins.current) {
        if (inView.has(id)) continue;
        pin.marker.remove();
        pins.current.delete(id);
      }
      applySelection();
    };

    instance.on('style.load', addPlaceLayers);
    instance.on('moveend', syncPins);
    instance.on('idle', syncPins);
    instance.on('click', 'place-clusters', (event) => {
      const feature = instance.queryRenderedFeatures(event.point, {
        layers: ['place-clusters'],
      })[0];
      const clusterId: unknown = feature?.properties['cluster_id'];
      const source = instance.getSource<GeoJSONSource>(SOURCE);
      if (feature === undefined || typeof clusterId !== 'number' || source === undefined) return;
      const center = (feature.geometry as { coordinates: [number, number] }).coordinates;
      void source.getClusterExpansionZoom(clusterId).then((zoom) => {
        instance.easeTo({ center, zoom });
      });
    });
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

  // A different set of places (a category chip): replace the data and let the map redraw the pins.
  useEffect(() => {
    const instance = map.current;
    if (instance === null) return;
    for (const pin of pins.current.values()) pin.marker.remove();
    pins.current.clear();
    const source = instance.getSource<GeoJSONSource>(SOURCE);
    void source?.setData(toGeoJson(places));
  }, [places]);

  // A selection: highlight its pin and bring it into view, zoomed in far enough to be a single pin.
  useEffect(() => {
    const instance = map.current;
    for (const [id, pin] of pins.current) {
      const selected = id === selectedId;
      pin.element.classList.toggle('is-selected', selected);
      if (selected) pin.element.setAttribute('aria-current', 'true');
      else pin.element.removeAttribute('aria-current');
    }
    const place = places.find((candidate) => candidate.id === selectedId);
    if (instance !== null && place !== undefined) {
      instance.flyTo({
        center: [place.lng, place.lat],
        zoom: Math.max(instance.getZoom(), SINGLE_ZOOM),
      });
    }
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
