import { useSignal } from '@preact/signals';
import { Bi } from '../../shared/ui/Bi';
import { hrefFor } from '../../app/router';
import { useLiveCrowd, type LiveCrowd } from '../../shared/data/crowd';
import type { District, Facility, GhatFixture } from '../../shared/data/fixtures';
import { FLAGS } from '../../shared/flags/flags';
import { osmSearchUrl } from '../../shared/data/sourceLinks';
import { ghatsResource } from '../../shared/data/resources';
import {
  latestVolunteer,
  VolunteerStrip,
  VolunteerUpdatesLoader,
} from '../partners/VolunteerStrip';
import { locale, t, type MessageKey } from '../../shared/i18n/i18n';
import { ChipGroup, CrowdChip, type ChipOption } from '../../shared/ui/Chips';
import { ScreenHeader } from '../../shared/ui/Layout';
import { ResourceView } from '../../shared/ui/ResourceView';
import { SourceStamp } from '../../shared/ui/Status';

type Filter = 'all' | District;

const FILTERS: readonly ChipOption<Filter>[] = [
  { value: 'all', label: 'action.all' },
  { value: 'east', label: 'ghats.district.east' },
  { value: 'west', label: 'ghats.district.west' },
  { value: 'telangana', label: 'ghats.district.telangana' },
  { value: 'other', label: 'ghats.district.other' },
];

const DISTRICT_LABELS = {
  east: 'ghats.district.east',
  west: 'ghats.district.west',
  telangana: 'ghats.district.telangana',
  other: 'ghats.district.other',
} as const satisfies Record<District, MessageKey>;

const FACILITY_LABELS = {
  water: 'facility.water',
  toilets: 'facility.toilets',
  firstAid: 'facility.firstAid',
  ramp: 'facility.ramp',
  parking: 'facility.parking',
} as const satisfies Record<Facility, MessageKey>;

export function filterGhats(items: readonly GhatFixture[], filter: Filter): readonly GhatFixture[] {
  return filter === 'all' ? items : items.filter((item) => item.district === filter);
}

/** The name in the chosen language, when the data has one; English is shown beneath it. */
function localName(ghat: GhatFixture): string | null {
  if (locale.value === 'te') return ghat.nameTe;
  if (locale.value === 'hi') return ghat.nameHi;
  return null;
}

function GhatCard({ ghat, live }: { readonly ghat: GhatFixture; readonly live: LiveCrowd | null }) {
  const local = localName(ghat);
  // A fresh staff report wins; otherwise the record's own level, which is "No data" for approved ghats.
  const crowd = live?.[ghat.id] ?? ghat.crowd;
  const riverReported = FLAGS.partners && latestVolunteer('river', ghat.id) !== null;
  // Compact by default so four or five ghats fit on a screen; tap a card for facilities, source and directions.
  return (
    <li>
      <details class="card ghat-card">
        <summary class="ghat-card__summary">
          <span class="ghat-card__top">
            <h2 class="card__title ghat-card__name">
              {local === null ? (
                ghat.name
              ) : (
                <span class="bi bi--stacked">
                  <span lang={locale.value}>{local}</span>
                  <span class="bi__sec" lang="en">
                    {ghat.name}
                  </span>
                </span>
              )}
            </h2>
            <CrowdChip level={crowd} />
          </span>
          <span class="card__meta ghat-card__meta">
            {t(DISTRICT_LABELS[ghat.district])} · {ghat.town}
          </span>
        </summary>
        {FLAGS.partners ? <VolunteerStrip ghatId={ghat.id} compact /> : null}
        <div class="ghat-card__more">
          {ghat.facilities.length === 0 ? null : (
            <ul class="tags" aria-label={t('ghats.facilities')}>
              {ghat.facilities.map((facility) => (
                <li key={facility}>{t(FACILITY_LABELS[facility])}</li>
              ))}
            </ul>
          )}
          {riverReported ? <p class="note note--flush">{t('pv.strip.river')}</p> : null}
          <SourceStamp meta={ghat} />
          {ghat.synthetic ? (
            <a class="card__link" href={hrefFor('map')}>
              <Bi k="action.directions" />
            </a>
          ) : (
            <a
              class="card__link"
              href={osmSearchUrl(`${ghat.name}, ${ghat.town}, Andhra Pradesh`)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Bi k="action.directions" />
            </a>
          )}
        </div>
      </details>
    </li>
  );
}

export default function GhatsScreen() {
  const filter = useSignal<Filter>('all');
  const live = useLiveCrowd();
  return (
    <>
      <ScreenHeader titleKey="module.ghats.title" subtitleKey="module.ghats.subtitle" />
      {FLAGS.partners ? <VolunteerUpdatesLoader /> : null}
      <ChipGroup
        legend="ghats.filter"
        options={FILTERS}
        selected={filter.value}
        onSelect={(value) => {
          filter.value = value;
        }}
      />
      <ResourceView
        resource={ghatsResource}
        render={(items) => {
          if (items.length === 0) return <p class="note">{t('state.empty')}</p>;
          const visible = filterGhats(items, filter.value);
          // Samples say they are samples; approved data says what the source does not cover.
          const note = items.some((item) => item.synthetic) ? 'ghats.note' : 'ghats.noteVerified';
          return (
            <>
              <p class="note">{t(note)}</p>
              <p class="note">
                {t('crowd.estimate')} {t('ghats.snanamPending')}
              </p>
              {items.some((item) => item.nameTe !== null || item.nameHi !== null) ? (
                <p class="note">{t('ghats.namesUnverified')}</p>
              ) : null}
              {visible.length === 0 ? (
                <p class="note">{t('state.empty')}</p>
              ) : (
                <ul class="card-list">
                  {visible.map((ghat) => (
                    <GhatCard key={ghat.id} ghat={ghat} live={live} />
                  ))}
                </ul>
              )}
            </>
          );
        }}
      />
    </>
  );
}
