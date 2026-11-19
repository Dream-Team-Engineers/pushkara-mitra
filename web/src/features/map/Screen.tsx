import { useSignal } from '@preact/signals';
import type { ComponentType } from 'preact';
import { useEffect } from 'preact/hooks';
import { hrefFor } from '../../app/router';
import { tilesAvailable } from '../../shared/data/mapArchive';
import { osmSearchUrl } from '../../shared/data/sourceLinks';
import { FLAGS } from '../../shared/flags/flags';
import { t, type MessageKey } from '../../shared/i18n/i18n';
import {
  deviceLocation,
  startDeviceLocation,
  stopDeviceLocation,
  type LocationFailure,
} from '../../shared/location/deviceLocation';
import { Bi } from '../../shared/ui/Bi';
import { Icon } from '../../shared/ui/Icon';
import { PrototypeBanner, ScreenHeader } from '../../shared/ui/Layout';
import { theme } from '../../shared/ui/theme';
import type { LiveMapProps } from './LiveMap';
import { flavorFor } from './mapStyle';

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

function LocateControl({ outside }: { readonly outside: boolean }) {
  const state = deviceLocation.value;
  const on = state.status === 'on' || state.status === 'asking';
  return (
    <section class="locate" aria-labelledby="locate-title">
      <h2 id="locate-title" class="visually-hidden">
        {t('map.locate.start')}
      </h2>
      <button
        type="button"
        class={on ? 'button button--secondary' : 'button'}
        onClick={() => {
          if (on) stopDeviceLocation();
          else startDeviceLocation();
        }}
      >
        <Icon name="map" size={20} />
        <span>{on ? t('map.locate.stop') : t('map.locate.start')}</span>
      </button>
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
  const outside = useSignal(false);

  useEffect(() => {
    const mounted = { current: true };
    const isMounted = (): boolean => mounted.current;
    void tilesAvailable().then(async (ok) => {
      if (!ok || !isMounted()) return;
      try {
        const module = await import('./LiveMap');
        if (isMounted()) live.value = module.LiveMap;
      } catch {
        // The schematic stays; the map is an enhancement.
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

  return (
    <>
      <ScreenHeader titleKey="module.map.title" subtitleKey="module.map.subtitle" />
      <PrototypeBanner />
      <p class="state-line" role="status">
        <span class="state-line__dot" aria-hidden="true" />
        {t('map.sharing.off')}
      </p>
      {LiveMap === null ? (
        <Schematic />
      ) : (
        <>
          <LiveMap
            flavor={flavorFor(theme.value)}
            position={position}
            onOutside={(value) => {
              outside.value = value;
            }}
          />
          <p class="note">{t('map.live.area')}</p>
        </>
      )}
      {FLAGS.geolocation ? <LocateControl outside={outside.value} /> : null}
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
