import { useSignal } from '@preact/signals';
import { hrefFor } from '../../app/router';
import type { District, Facility, GhatFixture } from '../../shared/data/fixtures';
import { ghatsResource } from '../../shared/data/resources';
import { t, type MessageKey } from '../../shared/i18n/i18n';
import { ChipGroup, CrowdChip, type ChipOption } from '../../shared/ui/Chips';
import { ScreenHeader } from '../../shared/ui/Layout';
import { ResourceView } from '../../shared/ui/ResourceView';
import { SourceStamp } from '../../shared/ui/Status';

type Filter = 'all' | District;

const FILTERS: readonly ChipOption<Filter>[] = [
  { value: 'all', label: 'action.all' },
  { value: 'east', label: 'ghats.district.east' },
  { value: 'west', label: 'ghats.district.west' },
  { value: 'other', label: 'ghats.district.other' },
];

const DISTRICT_LABELS = {
  east: 'ghats.district.east',
  west: 'ghats.district.west',
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

function GhatCard({ ghat }: { readonly ghat: GhatFixture }) {
  return (
    <li class="card">
      <div class="card__head">
        <h2 class="card__title">{ghat.name}</h2>
        <CrowdChip level={ghat.crowd} />
      </div>
      <p class="card__meta">
        {t(DISTRICT_LABELS[ghat.district])} · {ghat.town}
      </p>
      <p class="card__meta">{t('crowd.estimate')}</p>
      {ghat.facilities.length === 0 ? null : (
        <ul class="tags" aria-label={t('ghats.facilities')}>
          {ghat.facilities.map((facility) => (
            <li key={facility}>{t(FACILITY_LABELS[facility])}</li>
          ))}
        </ul>
      )}
      <p class="card__meta">{t('ghats.snanamPending')}</p>
      <SourceStamp meta={ghat} />
      <a class="button button--secondary" href={hrefFor('map')}>
        {t('action.directions')}
      </a>
    </li>
  );
}

export default function GhatsScreen() {
  const filter = useSignal<Filter>('all');
  return (
    <>
      <ScreenHeader titleKey="module.ghats.title" subtitleKey="module.ghats.subtitle" />
      <p class="note">{t('ghats.note')}</p>
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
          const visible = filterGhats(items, filter.value);
          return visible.length === 0 ? (
            <p class="note">{t('state.empty')}</p>
          ) : (
            <ul class="card-list">
              {visible.map((ghat) => (
                <GhatCard key={ghat.id} ghat={ghat} />
              ))}
            </ul>
          );
        }}
      />
    </>
  );
}
