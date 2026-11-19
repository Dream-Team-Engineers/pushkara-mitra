import { useSignal } from '@preact/signals';
import { Bi } from '../../shared/ui/Bi';
import type { StayFixture, StayKind } from '../../shared/data/fixtures';
import { stayResource } from '../../shared/data/resources';
import { STAY_LINKS } from '../../shared/data/sourceLinks';
import { LinkCards } from '../../shared/ui/LinkCards';
import { formatNumber, t, type MessageKey } from '../../shared/i18n/i18n';
import { ChipGroup, type ChipOption } from '../../shared/ui/Chips';
import { ScreenHeader } from '../../shared/ui/Layout';
import { ResourceView } from '../../shared/ui/ResourceView';
import { SourceStamp } from '../../shared/ui/Status';

type Filter = 'all' | StayKind;

const FILTERS: readonly ChipOption<Filter>[] = [
  { value: 'all', label: 'action.all' },
  { value: 'hotel', label: 'stay.cat.hotel' },
  { value: 'dharmashala', label: 'stay.cat.dharmashala' },
  { value: 'govt', label: 'stay.cat.govt' },
];

const KIND_LABELS = {
  hotel: 'stay.cat.hotel',
  dharmashala: 'stay.cat.dharmashala',
  govt: 'stay.cat.govt',
} as const satisfies Record<StayKind, MessageKey>;

/**
 * Distance from the ghat is the only ranking key. Sponsored entries are labelled but never
 * moved up. Ranking criteria are disclosed on the screen ("How we rank") and need owner approval.
 */
export function rankStays(items: readonly StayFixture[], filter: Filter): readonly StayFixture[] {
  const visible = filter === 'all' ? items : items.filter((item) => item.kind === filter);
  return [...visible].sort((a, b) => a.distanceKm - b.distanceKm);
}

function StayCard({ stay }: { readonly stay: StayFixture }) {
  return (
    <li class="card">
      {stay.sponsored ? <p class="sponsored-label">{t('home.sponsored')}</p> : null}
      <h2 class="card__title">{stay.name}</h2>
      <p class="card__meta">
        {t(KIND_LABELS[stay.kind])} ·{' '}
        {t('stay.distanceFromGhat', { km: formatNumber(stay.distanceKm) })} · {stay.priceNote}
      </p>
      <p class="card__meta">{t('stay.linkPending')}</p>
      <SourceStamp meta={stay} />
    </li>
  );
}

export default function StayScreen() {
  const filter = useSignal<Filter>('all');
  return (
    <>
      <ScreenHeader titleKey="module.stay.title" subtitleKey="module.stay.subtitle" />
      <p class="note">{t('stay.note')}</p>
      <section class="section" aria-labelledby="stay-links-title">
        <h2 id="stay-links-title" class="section__title">
          <Bi k="links.stay.heading" />
        </h2>
        <LinkCards links={STAY_LINKS} />
      </section>
      <details class="note">
        <summary>
          <Bi k="stay.rank.title" />
        </summary>
        <p>{t('stay.rank.body')}</p>
      </details>
      <ChipGroup
        legend="stay.filter"
        options={FILTERS}
        selected={filter.value}
        onSelect={(value) => {
          filter.value = value;
        }}
      />
      <ResourceView
        resource={stayResource}
        render={(items) => {
          const visible = rankStays(items, filter.value);
          return visible.length === 0 ? (
            <p class="note">{t('state.empty')}</p>
          ) : (
            <ul class="card-list">
              {visible.map((stay) => (
                <StayCard key={stay.id} stay={stay} />
              ))}
            </ul>
          );
        }}
      />
    </>
  );
}
