import { useSignal } from '@preact/signals';
import { Bi } from '../../shared/ui/Bi';
import { hrefFor } from '../../app/router';
import type { UpdateFixture, UpdateKind } from '../../shared/data/fixtures';
import { updatesResource } from '../../shared/data/resources';
import { useLiveNews } from '../../shared/data/news';
import { CULTURE_LINKS, SIGNIFICANCE } from '../../shared/data/sourceLinks';
import { formatDate, locale, t, type MessageKey } from '../../shared/i18n/i18n';
import { Icon } from '../../shared/ui/Icon';
import { LinkCards } from '../../shared/ui/LinkCards';
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

function LiveNews() {
  const live = useLiveNews();
  if (live === null || live.length === 0) return null;
  return (
    <section class="section" aria-labelledby="live-news-title">
      <h2 id="live-news-title" class="section__title">
        <Bi k="news.heading" />
      </h2>
      <p class="note">{t('news.note')}</p>
      <ul class="card-list">
        {live.map((item) => (
          <li key={item.id}>
            <a class="card link-card" href={item.url} target="_blank" rel="noopener noreferrer">
              <span class="link-card__icon link-card__icon--navy">
                <Icon name="news" />
              </span>
              <span class="link-card__body">
                <span class="card__title">{item.title}</span>
                <span class="card__meta">
                  {t('news.age', {
                    source: item.source,
                    when: formatDate(Date.parse(item.publishedAt)),
                  })}
                </span>
              </span>
              <span class="link-card__go">
                <Icon name="external" size={20} />
                <span class="visually-hidden">{t('links.opensNewTab')}</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Culture() {
  const lang = locale.value;
  return (
    <section class="section" aria-labelledby="culture-title">
      <h2 id="culture-title" class="section__title">
        <Bi k="culture.heading" />
      </h2>
      <p class="note">{t('culture.note')}</p>
      <ul class="card-list">
        {SIGNIFICANCE.map((note) => (
          <li key={note.id} class="card" lang={lang}>
            <p class="card__title">{note.text[lang]}</p>
            <p class="stamp">
              <span>{t('state.source', { source: note.source })}</span>
            </p>
          </li>
        ))}
      </ul>
      <h3 class="section__title">
        <Bi k="culture.more" />
      </h3>
      <LinkCards links={CULTURE_LINKS} />
    </section>
  );
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
      {tab.value === 'today' || tab.value === 'news' ? <LiveNews /> : null}
      {tab.value === 'rituals' ? <Culture /> : null}
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
          <a href={hrefFor('partners')}>
            <Bi k="updates.findPandits" />
          </a>
        </p>
      ) : null}
      <p class="note">{t('updates.footer')}</p>
    </>
  );
}
