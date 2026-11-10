import { hrefFor } from '../../app/router';
import { t } from '../../shared/i18n/i18n';
import { PrototypeBanner, ScreenHeader } from '../../shared/ui/Layout';

/**
 * Maps prototype (flags `liveMap` and `geolocation` are off). A schematic drawing stands in for
 * the map: real tiles need a licensed source (ODbL attribution) and a CSP change, and any
 * location display needs ADR 0004. Pins are fixed samples; the device location is never read.
 * The member list below the drawing is the accessible alternative to the picture.
 */
export default function MapScreen() {
  return (
    <>
      <ScreenHeader titleKey="module.map.title" subtitleKey="module.map.subtitle" />
      <PrototypeBanner />
      <p class="state-line" role="status">
        <span class="state-line__dot" aria-hidden="true" />
        {t('map.sharing.off')}
      </p>
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
      <section class="section" aria-labelledby="map-members-title">
        <h2 id="map-members-title" class="section__title">
          {t('map.members')}
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
        <label for="map-only-group">{t('map.onlyGroup')}</label>
      </div>
      <p class="note">{t('map.noHistory')}</p>
      <p class="note">{t('map.attribution')}</p>
      <div class="actions">
        <a class="button button--secondary" href={hrefFor('group')}>
          {t('map.manage')}
        </a>
      </div>
    </>
  );
}
