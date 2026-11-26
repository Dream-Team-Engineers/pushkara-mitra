import { useLiveCrowd } from '../../shared/data/crowd';
import { crowdResource } from '../../shared/data/resources';
import { FLAGS } from '../../shared/flags/flags';
import { ageMinutes } from '../../shared/partners/partnersClient';
import {
  latestVolunteer,
  valueLabel,
  VolunteerDisclaimer,
  VolunteerUpdatesLoader,
} from '../partners/VolunteerStrip';
import { favourites, favouritesFirst } from '../../shared/prefs/favourites';
import { GhatThumb } from '../../shared/ui/GhatThumb';
import { StarButton } from '../../shared/ui/StarButton';
import { Bi } from '../../shared/ui/Bi';
import { t, type MessageKey } from '../../shared/i18n/i18n';
import { ScreenHeader } from '../../shared/ui/Layout';
import { ResourceView } from '../../shared/ui/ResourceView';
import { SourceStamp } from '../../shared/ui/Status';
import type { GhatFixture } from '../../shared/data/fixtures';
import type { LiveCrowd } from '../../shared/data/crowd';

const TILES: readonly { readonly id: string; readonly title: MessageKey }[] = [
  { id: 'weather', title: 'conditions.weather' },
  { id: 'river', title: 'conditions.river' },
  { id: 'stay', title: 'conditions.stay' },
  { id: 'parking', title: 'conditions.parking' },
];

type Level = 'low' | 'moderate' | 'high' | 'noData';
const LEVEL_TEXT = {
  low: 'crowd.low',
  moderate: 'crowd.moderate',
  high: 'crowd.high',
  noData: 'crowd.noData',
} as const satisfies Record<Level, MessageKey>;
const LEVEL_BARS: Readonly<Record<Level, number>> = { low: 1, moderate: 2, high: 3, noData: 0 };

/** A small heat bar (3 steps) with its name and the level in words, so colour is never the only signal. */
function Meter({
  label,
  level,
  text = LEVEL_TEXT[level],
}: {
  readonly label: MessageKey;
  readonly level: Level;
  readonly text?: MessageKey;
}) {
  const bars = LEVEL_BARS[level];
  return (
    <div class={'meter meter--' + level}>
      <span class="meter__label">{t(label)}</span>
      <span class="meter__bars" aria-hidden="true">
        {[1, 2, 3].map((step) => (
          <span key={step} class={step <= bars ? 'meter__bar is-on' : 'meter__bar'} />
        ))}
      </span>
      <span class="meter__text">{t(text)}</span>
    </div>
  );
}

/** Volunteer river words on the same three-step bar: normal, rising, high. */
const RIVER_LEVEL: Readonly<Record<string, Level>> = {
  normal: 'low',
  rising: 'moderate',
  high: 'high',
};

function GhatConditions({
  ghat,
  live,
}: {
  readonly ghat: GhatFixture;
  readonly live: LiveCrowd | null;
}) {
  const volunteerCrowd = FLAGS.partners ? latestVolunteer('crowd', ghat.id) : null;
  const volunteerRiver = FLAGS.partners ? latestVolunteer('river', ghat.id) : null;
  const official = live?.[ghat.id];
  // The official reading wins for crowd; a volunteer report fills in when there is none.
  const crowd: Level =
    official ??
    (volunteerCrowd !== null && volunteerCrowd.value in LEVEL_BARS
      ? (volunteerCrowd.value as Level)
      : ghat.crowd);
  const crowdFromVolunteer =
    official === undefined && crowd !== ghat.crowd && volunteerCrowd !== null;
  const river: Level =
    volunteerRiver === null ? 'noData' : (RIVER_LEVEL[volunteerRiver.value] ?? 'noData');
  const riverText = volunteerRiver === null ? null : valueLabel('river', volunteerRiver.value);
  const newest = [crowdFromVolunteer ? volunteerCrowd : null, volunteerRiver]
    .flatMap((update) => (update === null ? [] : [Date.parse(update.reportedAt)]))
    .sort((x, y) => y - x)[0];
  return (
    <li class="card cond-card">
      <div class="ghat-card__top">
        <GhatThumb ghatId={ghat.id} />
        <h3 class="card__title ghat-card__name">{ghat.name}</h3>
        <StarButton ghatId={ghat.id} />
      </div>
      <div class="meter-row">
        <Meter label="meter.crowd" level={crowd} />
        <Meter
          label="meter.river"
          level={river}
          {...(riverText === null ? {} : { text: riverText })}
        />
      </div>
      {newest === undefined ? null : (
        <p class="cond-card__note">
          {t('pv.strip.title')} ·{' '}
          {t('pv.strip.age', { minutes: ageMinutes(new Date(newest).toISOString()) })}
        </p>
      )}
      <details class="cond-card__source">
        <summary>{t('conditions.sourceMore')}</summary>
        <SourceStamp meta={ghat} />
      </details>
    </li>
  );
}

/**
 * Crowd and river level per ghat come from staff readings and, when switched on, from volunteer
 * reports (marked "From a volunteer", never an official figure). With no report the meter says "No data"
 * instead of a made-up level. Crowd levels are estimates and never safety instructions.
 */
export default function ConditionsScreen() {
  const live = useLiveCrowd();
  return (
    <>
      <ScreenHeader titleKey="module.conditions.title" subtitleKey="module.conditions.subtitle" />
      {FLAGS.partners ? <VolunteerUpdatesLoader /> : null}
      <section class="section" aria-labelledby="crowd-title">
        <h2 id="crowd-title" class="section__title">
          <Bi k="conditions.crowd" />
        </h2>
        <ResourceView
          resource={crowdResource}
          render={(items) => (
            <>
              <ul class="card-list">
                {favouritesFirst(items, favourites.value).map((ghat) => (
                  <GhatConditions key={ghat.id} ghat={ghat} live={live} />
                ))}
              </ul>
              <p class="note note--flush">{t('conditions.crowdNote')}</p>
              {FLAGS.partners ? <VolunteerDisclaimer /> : null}
            </>
          )}
        />
      </section>
      <ul class="tile-grid">
        {TILES.map((tile) => (
          <li key={tile.id} class="tile">
            <h2 class="tile__title">{t(tile.title)}</h2>
            <p>{t('crowd.noData')}</p>
          </li>
        ))}
      </ul>
      <section class="section" aria-labelledby="safety-title">
        <h2 id="safety-title" class="section__title">
          <Bi k="conditions.safety" />
        </h2>
        <p class="note note--flush">{t('conditions.noneVerified')}</p>
        <p class="note note--flush">{t('conditions.safetyNote')}</p>
      </section>
    </>
  );
}
