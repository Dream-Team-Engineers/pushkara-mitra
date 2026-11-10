import { useSignal } from '@preact/signals';
import { hrefFor } from '../../app/router';
import type { UpdateFixture, UpdateKind } from '../../shared/data/fixtures';
import { updatesResource } from '../../shared/data/resources';
import { t, type MessageKey } from '../../shared/i18n/i18n';
import { ChipGroup, type ChipOption } from '../../shared/ui/Chips';
import { ScreenHeader } from '../../shared/ui/Layout';
import { ResourceView } from '../../shared/ui/ResourceView';
import { SourceStamp } from '../../shared/ui/Status';

type Tab = 'today' | 'news' | 'events' | 'rituals';

const TABS: readonly ChipOption<Tab>[] = [
  { value: 'today', label: 'updates.tab.today' },
  { value: 'news', label: 'updates.tab.news' },
  { value: 'events', label: 'updates.tab.events' },
  { value: 'rituals', label: 'updates.tab.rituals' },
];

const KIND_LABELS = {
  advisory: 'updates.kind.advisory',
  news: 'updates.kind.news',
  event: 'updates.kind.event',
  ritual: 'updates.kind.ritual',
} as const satisfies Record<UpdateKind, MessageKey>;

const TAB_KINDS: Readonly<Record<Tab, readonly UpdateKind[]>> = {
  today: ['advisory', 'news', 'event', 'ritual'],
  news: ['advisory', 'news'],
  events: ['event'],
  rituals: ['ritual'],
};

export function filterUpdates(items: readonly UpdateFixture[], tab: Tab): readonly UpdateFixture[] {
  return items.filter((item) => TAB_KINDS[tab].includes(item.kind));
}

export default function UpdatesScreen() {
  const tab = useSignal<Tab>('today');
  return (
    <>
      <ScreenHeader titleKey="module.updates.title" subtitleKey="module.updates.subtitle" />
      <ChipGroup
        legend="updates.tab.legend"
        options={TABS}
        selected={tab.value}
        onSelect={(value) => {
          tab.value = value;
        }}
      />
      <ResourceView
        resource={updatesResource}
        render={(items) => {
          const visible = filterUpdates(items, tab.value);
          return visible.length === 0 ? (
            <p class="note">{t('state.empty')}</p>
          ) : (
            <ul class="card-list">
              {visible.map((item) => (
                <li key={item.id} class="card">
                  <p class={`kind kind--${item.kind}`}>{t(KIND_LABELS[item.kind])}</p>
                  <h2 class="card__title">{item.title}</h2>
                  <p class="card__meta">{item.detail}</p>
                  <SourceStamp meta={item} />
                </li>
              ))}
            </ul>
          );
        }}
      />
      {tab.value === 'rituals' || tab.value === 'today' ? (
        <p class="note">
          <a href={hrefFor('partners')}>{t('updates.findPandits')}</a>
        </p>
      ) : null}
      <p class="note">{t('updates.footer')}</p>
    </>
  );
}
