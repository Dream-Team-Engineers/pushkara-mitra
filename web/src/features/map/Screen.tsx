import { useSignal } from '@preact/signals';
import type { ComponentType } from 'preact';
import { useEffect } from 'preact/hooks';
import { hrefFor } from '../../app/router';
import { tilesAvailable } from '../../shared/data/mapArchive';
import {
  loadPlaces,
  PLACE_CATEGORIES,
  type Place,
  type PlaceCategory,
} from '../../shared/data/places';
import { osmPointUrl, osmSearchUrl } from '../../shared/data/sourceLinks';
import { FLAGS, SHOW_SAMPLES } from '../../shared/flags/flags';
import { locale, t, type MessageKey } from '../../shared/i18n/i18n';
import { offlineMapStatus, saveOfflineMap } from '../../shared/pwa/offlineMap';
import {
  deviceLocation,
  startDeviceLocation,
  stopDeviceLocation,
  type LocationFailure,
} from '../../shared/location/deviceLocation';
import { Bi } from '../../shared/ui/Bi';
import { Icon } from '../../shared/ui/Icon';
import { PrototypeBanner, ScreenHeader } from '../../shared/ui/Layout';
import { Spinner } from '../../shared/ui/Status';
import { theme } from '../../shared/ui/theme';
import type { LiveMapProps } from './LiveMap';
import { flavorFor, MAP_BOUNDS } from './mapStyle';
import { PLACE_ICON } from './placeIcons';

/**
 * Maps (flag `liveMap` stays off: nobody else's position is shown). The base map is public: when
 * the regional archive is on this site (/maps/godavari.pmtiles) the real map loads on demand;
 * otherwise a schematic drawing stands in. The member list below is the accessible alternative
 * for the sample group and stays a prototype. Showing the device's own position needs the
 * `geolocation` flag (staging build only until legal review) and an explicit tap; the position is
 * never sent or stored, and without it the map still works.
 */
const FAILURE_TEXT = {
  denied: 'map.locate.denied',
  unavailable: 'map.locate.unavailable',
  timeout: 'map.locate.timeout',
  unsupported: 'map.locate.unsupported',
} as const satisfies Record<LocationFailure, MessageKey>;

type Filter = 'all' | PlaceCategory;
const PAGE = 20;
const CATEGORY_KEY = {
  ghat: 'map.cat.ghat',
  temple: 'map.cat.temple',
  hospital: 'map.cat.hospital',
} as const satisfies Record<PlaceCategory, MessageKey>;

function placeName(place: Place): string {
  if (locale.value === 'te') return place.nameTe ?? place.name;
  if (locale.value === 'hi') return place.nameHi ?? place.name;
  return place.name;
}

/** True when the place lies inside the area covered by the map archive. */
function onMap(place: Place): boolean {
  const [west, south, east, north] = MAP_BOUNDS;
  return place.lng >= west && place.lng <= east && place.lat >= south && place.lat <= north;
}

function pinLabel(place: Place): string {
  return `${placeName(place)}, ${t(CATEGORY_KEY[place.category])}`;
}

/** Straight-line distance in km. Computed on this phone only, from a position that is never stored. */
function distanceKm(
  from: { readonly lat: number; readonly lng: number },
  to: { readonly lat: number; readonly lng: number },
): number {
  const rad = Math.PI / 180;
  const dLat = (to.lat - from.lat) * rad;
  const dLng = (to.lng - from.lng) * rad;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(from.lat * rad) * Math.cos(to.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}

function CategoryChips({
  filter,
  places,
  onChange,
}: {
  readonly filter: Filter;
  readonly places: readonly Place[];
  readonly onChange: (next: Filter) => void;
}) {
  const options: readonly Filter[] = ['all', ...PLACE_CATEGORIES];
  return (
    <div class="place-chips" role="group" aria-label={t('map.places.filter')}>
      {options.map((option) => {
        const count =
          option === 'all'
            ? places.length
            : places.filter((place) => place.category === option).length;
        return (
          <button
            key={option}
            type="button"
            class="place-chip"
            aria-pressed={filter === option}
            onClick={() => {
              onChange(option);
            }}
          >
            {option === 'all' ? null : <Icon name={PLACE_ICON[option]} size={14} />}
            <span>{t(option === 'all' ? 'map.cat.all' : CATEGORY_KEY[option])}</span>
            <span class="place-chip__count">{count}</span>
          </button>
        );
      })}
    </div>
  );
}

function PlaceList({
  places,
  selectedId,
  from,
  onSelect,
}: {
  readonly places: readonly Place[];
  readonly selectedId: string | null;
  readonly from: { readonly lat: number; readonly lng: number } | null;
  readonly onSelect: (id: string) => void;
}) {
  const shown = useSignal(PAGE);
  const sorted = [...places]
    .map((place) => ({ place, km: from === null ? null : distanceKm(from, place) }))
    .sort((a, b) =>
      a.km !== null && b.km !== null ? a.km - b.km : a.place.name.localeCompare(b.place.name),
    );
  return (
    <div class="sheet-body">
      <ul class="legend legend--places">
        {PLACE_CATEGORIES.map((category) => (
          <li key={category}>
            <span class={`map-pin map-pin--${category} map-pin--legend`} aria-hidden="true">
              <Icon name={PLACE_ICON[category]} size={16} />
            </span>
            {t(CATEGORY_KEY[category])}
          </li>
        ))}
      </ul>
      <p class="note">{t('map.places.unverified')}</p>
      {sorted.length === 0 ? <p class="note">{t('map.places.empty')}</p> : null}
      <ul class="card-list card-list--flush">
        {sorted.slice(0, shown.value).map(({ place, km }) => (
          <li
            key={place.id}
            class={place.id === selectedId ? 'card place-card is-selected' : 'card place-card'}
          >
            <span class={`map-pin map-pin--${place.category} map-pin--legend`} aria-hidden="true">
              <Icon name={PLACE_ICON[place.category]} size={16} />
            </span>
            <div class="place-card__text">
              <p class="card__title">{placeName(place)}</p>
              <p class="card__meta">
                {t(CATEGORY_KEY[place.category])}
                {place.area === undefined ? '' : ' · ' + place.area}
                {km === null ? '' : ' · ' + t('map.places.away', { km: km.toFixed(1) })}
              </p>
              {place.approx === true ? <p class="card__meta">{t('map.places.approx')}</p> : null}
            </div>
            {onMap(place) ? (
              <button
                type="button"
                class="button button--secondary place-card__show"
                onClick={() => {
                  onSelect(place.id);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                {t('map.places.show')}
              </button>
            ) : (
              <a
                class="button button--secondary place-card__show"
                href={osmPointUrl(place.lat, place.lng)}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t('map.places.outside')}
              </a>
            )}
          </li>
        ))}
      </ul>
      {sorted.length > shown.value ? (
        <div class="actions">
          <button
            type="button"
            class="button button--secondary"
            onClick={() => {
              shown.value += PAGE;
            }}
          >
            {t('map.places.more')}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function LocateControl({ outside }: { readonly outside: boolean }) {
  const state = deviceLocation.value;
  return (
    <section class="locate" aria-label={t('map.locate.start')}>
      <p class="note note--flush" role="status">
        {state.status === 'asking'
          ? t('map.locate.asking')
          : state.status === 'on'
            ? outside
              ? t('map.locate.outside')
              : t('map.locate.on', { m: Math.round(state.position.accuracyM) })
            : state.status === 'off'
              ? t(FAILURE_TEXT[state.reason])
              : null}
      </p>
      <p class="note note--flush">{t('map.locate.privacy')}</p>
    </section>
  );
}

/**
 * "Save map for offline use": shown only where a service worker is active. The worker stores the
 * map files on this phone; nothing is sent about the person.
 */
function OfflineMapControl() {
  const state = useSignal<'hidden' | 'idle' | 'saving' | 'saved' | 'failed'>('hidden');
  useEffect(() => {
    const mounted = { current: true };
    void offlineMapStatus().then((ready) => {
      if (mounted.current && ready !== null) state.value = ready ? 'saved' : 'idle';
    });
    return () => {
      mounted.current = false;
    };
  }, []);
  if (state.value === 'hidden') return null;
  return (
    <section class="locate" aria-labelledby="offline-map-title">
      <h2 id="offline-map-title" class="card__title">
        {t('map.offline.title')}
      </h2>
      <p class="note note--flush" role="status">
        {state.value === 'saving'
          ? t('map.offline.saving')
          : state.value === 'saved'
            ? t('map.offline.saved')
            : state.value === 'failed'
              ? t('map.offline.failed')
              : null}
      </p>
      {state.value === 'saved' ? null : (
        <div class="actions">
          <button
            type="button"
            class="button button--secondary"
            disabled={state.value === 'saving'}
            onClick={() => {
              state.value = 'saving';
              void saveOfflineMap().then((ok) => {
                state.value = ok === true ? 'saved' : 'failed';
              });
            }}
          >
            {t('map.offline.save')}
          </button>
        </div>
      )}
      <p class="note note--flush">{t('map.offline.note')}</p>
    </section>
  );
}

/** The "my location" button floats on the map (bottom right, above the zoom and scale). */
function LocateFab() {
  const state = deviceLocation.value;
  const on = state.status === 'on' || state.status === 'asking';
  return (
    <button
      type="button"
      class={on ? 'locate-fab is-on' : 'locate-fab'}
      aria-pressed={on}
      onClick={() => {
        if (on) stopDeviceLocation();
        else startDeviceLocation();
      }}
    >
      <Icon name="map" size={20} />
      <span>{on ? t('map.locate.stop') : t('map.locate.start')}</span>
    </button>
  );
}

/**
 * The bottom sheet under the map. Collapsed it shows the selected place (or a one-line summary);
 * opened it holds the legend and the full list. It is a normal button and region, not a drag gesture,
 * so it works with a keyboard and a screen reader.
 */
function MapSheet({
  places,
  selected,
  selectedId,
  from,
  onSelect,
}: {
  readonly places: readonly Place[];
  readonly selected: Place | undefined;
  readonly selectedId: string | null;
  readonly from: { readonly lat: number; readonly lng: number } | null;
  readonly onSelect: (id: string) => void;
}) {
  const open = useSignal(false);
  const km = selected === undefined || from === null ? null : distanceKm(from, selected);
  return (
    <section class={open.value ? 'map-sheet is-open' : 'map-sheet'} aria-labelledby="places-title">
      <button
        type="button"
        class="map-sheet__handle"
        aria-expanded={open.value}
        aria-controls="map-sheet-body"
        onClick={() => {
          open.value = !open.value;
        }}
      >
        <span class="map-sheet__grip" aria-hidden="true" />
        <span id="places-title" class="map-sheet__title">
          {t('map.places.title')}
        </span>
        <span class="place-chip__count">{t('map.places.count', { n: places.length })}</span>
        <Icon name="chevron" size={20} />
      </button>
      {selected === undefined ? null : (
        <div class="map-sheet__selected" role="status">
          <span class={`map-pin map-pin--${selected.category} map-pin--legend`} aria-hidden="true">
            <Icon name={PLACE_ICON[selected.category]} size={18} />
          </span>
          <div class="place-card__text">
            <p class="map-sheet__name">{placeName(selected)}</p>
            <p class="card__meta">
              {t('map.places.selected')} · {t(CATEGORY_KEY[selected.category])}
              {km === null ? '' : ' · ' + t('map.places.away', { km: km.toFixed(1) })}
            </p>
          </div>
        </div>
      )}
      <div id="map-sheet-body" hidden={!open.value}>
        <PlaceList
          places={places}
          selectedId={selectedId}
          from={from}
          onSelect={(id) => {
            onSelect(id);
            open.value = false;
          }}
        />
      </div>
    </section>
  );
}

function Schematic() {
  return (
    <>
      <figure class="map-figure">
        <svg viewBox="0 0 320 200" role="img" aria-label={t('map.alt')}>
          <rect class="map__land" x="0" y="0" width="320" height="200" />
          <path
            class="map__river"
            d="M-10 120 C 60 70, 110 150, 170 105 S 270 60, 330 90 L 330 140 C 270 110, 200 160, 150 145 S 40 110, -10 160 Z"
          />
          <rect class="map__ghat" x="96" y="108" width="14" height="14" />
          <rect class="map__ghat" x="206" y="84" width="14" height="14" />
          <circle class="map__pin map__pin--live" cx="150" cy="60" r="8" />
          <circle class="map__pin map__pin--stale" cx="250" cy="150" r="8" />
        </svg>
        <figcaption>{t('map.schematic')}</figcaption>
      </figure>
      <ul class="legend">
        <li>
          <span class="legend__swatch legend__swatch--live" aria-hidden="true" />
          {t('map.legend.live')}
        </li>
        <li>
          <span class="legend__swatch legend__swatch--stale" aria-hidden="true" />
          {t('map.legend.stale')}
        </li>
      </ul>
    </>
  );
}

export default function MapScreen() {
  const live = useSignal<ComponentType<LiveMapProps> | null>(null);
  // 'pending' until we know whether the real map can load, so the schematic sample is not flashed first.
  const phase = useSignal<'pending' | 'fallback'>('pending');
  const outside = useSignal(false);
  const places = useSignal<readonly Place[]>([]);
  const filter = useSignal<Filter>('all');
  const selectedId = useSignal<string | null>(null);

  useEffect(() => {
    const mounted = { current: true };
    const isMounted = (): boolean => mounted.current;
    void loadPlaces().then((list) => {
      if (isMounted()) places.value = list;
    });
    void tilesAvailable().then(async (ok) => {
      if (!isMounted()) return;
      if (!ok) {
        phase.value = 'fallback';
        return;
      }
      try {
        const module = await import('./LiveMap');
        if (isMounted()) live.value = module.LiveMap;
      } catch {
        // The schematic is shown; the map is an enhancement.
        if (isMounted()) phase.value = 'fallback';
      }
    });
    return () => {
      mounted.current = false;
      // Leaving the screen forgets the position and stops following the device.
      stopDeviceLocation();
    };
  }, []);

  const position = deviceLocation.value.status === 'on' ? deviceLocation.value.position : null;
  const LiveMap = live.value;
  const visible =
    filter.value === 'all'
      ? places.value
      : places.value.filter((place) => place.category === filter.value);

  const visibleOnMap = visible.filter(onMap);

  return (
    <>
      <ScreenHeader titleKey="module.map.title" subtitleKey="module.map.subtitle" />
      {LiveMap === null ? (
        <div class={phase.value === 'pending' ? 'map-pending' : undefined}>
          {phase.value === 'pending' ? (
            <div class="map-skeleton" aria-hidden="true">
              <Spinner />
            </div>
          ) : null}
          <PrototypeBanner />
          <p class="state-line" role="status">
            <span class="state-line__dot" aria-hidden="true" />
            {t('map.sharing.off')}
          </p>
          <Schematic />
        </div>
      ) : (
        <>
          <div class="map-stage">
            <LiveMap
              flavor={flavorFor(theme.value)}
              position={position}
              places={visibleOnMap}
              placeLabel={pinLabel}
              selectedId={selectedId.value}
              onSelect={(id) => {
                selectedId.value = id;
              }}
              onOutside={(value) => {
                outside.value = value;
              }}
            />
            {places.value.length > 0 ? (
              <CategoryChips
                filter={filter.value}
                places={places.value}
                onChange={(next) => {
                  filter.value = next;
                  selectedId.value = null;
                }}
              />
            ) : null}
            {FLAGS.geolocation ? <LocateFab /> : null}
          </div>
          {places.value.length > 0 ? (
            <MapSheet
              places={visible}
              selected={places.value.find((place) => place.id === selectedId.value)}
              selectedId={selectedId.value}
              from={position !== null && !outside.value ? position : null}
              onSelect={(id) => {
                selectedId.value = id;
              }}
            />
          ) : null}
          <p class="note">{t('map.live.area')}</p>
          <PrototypeBanner />
          <p class="state-line" role="status">
            <span class="state-line__dot" aria-hidden="true" />
            {t('map.sharing.off')}
          </p>
        </>
      )}
      {FLAGS.geolocation ? <LocateControl outside={outside.value} /> : null}
      <OfflineMapControl />
      <a
        class="card link-card"
        href={osmSearchUrl('Rajahmundry, Andhra Pradesh')}
        target="_blank"
        rel="noopener noreferrer"
      >
        <span class="link-card__icon">
          <Icon name="map" />
        </span>
        <span class="link-card__body">
          <span class="card__title">{t('map.openOsm')}</span>
          <span class="card__meta">{t('map.osmNote')}</span>
        </span>
        <span class="link-card__go">
          <Icon name="external" size={20} />
          <span class="visually-hidden">{t('links.opensNewTab')}</span>
        </span>
      </a>
      {/* Placeholder members: not shown in production (OQ-044). */}
      {SHOW_SAMPLES ? (
        <>
          <section class="section" aria-labelledby="map-members-title">
            <h2 id="map-members-title" class="section__title">
              <Bi k="map.members" />
            </h2>
            <ul class="card-list card-list--flush">
              <li class="card">
                <p class="card__title">{t('nav.me')}</p>
                <p class="card__meta">{t('map.member.off')}</p>
              </li>
              <li class="card">
                <p class="card__title">[Member 2]</p>
                <p class="card__meta">{t('map.member.live')}</p>
              </li>
              <li class="card">
                <p class="card__title">[Member 3]</p>
                <p class="card__meta">{t('map.member.stale')}</p>
              </li>
            </ul>
          </section>
          <div class="field field--check">
            <input id="map-only-group" type="checkbox" checked disabled />
            <label for="map-only-group">
              <Bi k="map.onlyGroup" />
            </label>
          </div>
        </>
      ) : null}
      <p class="note">{t('map.noHistory')}</p>
      <p class="note">{t('map.attribution')}</p>
      <div class="actions">
        <a class="button button--secondary" href={hrefFor('group')}>
          <Bi k="map.manage" />
        </a>
      </div>
    </>
  );
}
