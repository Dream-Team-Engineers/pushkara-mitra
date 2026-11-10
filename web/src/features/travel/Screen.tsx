import { useSignal } from '@preact/signals';
import { hrefFor } from '../../app/router';
import type { TravelFixture, TravelMode } from '../../shared/data/fixtures';
import { travelResource } from '../../shared/data/resources';
import { t } from '../../shared/i18n/i18n';
import { ChipGroup, type ChipOption } from '../../shared/ui/Chips';
import { ScreenHeader } from '../../shared/ui/Layout';
import { ResourceView } from '../../shared/ui/ResourceView';
import { SourceStamp } from '../../shared/ui/Status';

const MODES: readonly ChipOption<TravelMode>[] = [
  { value: 'train', label: 'travel.mode.train' },
  { value: 'bus', label: 'travel.mode.bus' },
  { value: 'flight', label: 'travel.mode.flight' },
];

export function filterTravel(
  items: readonly TravelFixture[],
  mode: TravelMode,
  from: string,
): readonly TravelFixture[] {
  const needle = from.trim().toLowerCase();
  return items.filter(
    (item) => item.mode === mode && (needle === '' || item.from.toLowerCase().includes(needle)),
  );
}

export default function TravelScreen() {
  const mode = useSignal<TravelMode>('train');
  const from = useSignal('');
  return (
    <>
      <ScreenHeader titleKey="module.travel.title" subtitleKey="module.travel.subtitle" />
      <ChipGroup
        legend="travel.mode.legend"
        options={MODES}
        selected={mode.value}
        onSelect={(value) => {
          mode.value = value;
        }}
      />
      <div class="field">
        <label for="travel-from">{t('travel.from')}</label>
        <input
          id="travel-from"
          type="text"
          autocomplete="off"
          value={from.value}
          onInput={(event) => {
            from.value = event.currentTarget.value;
          }}
        />
      </div>
      <p class="note">{t('travel.sample')}</p>
      <ResourceView
        resource={travelResource}
        render={(items) => {
          const rows = filterTravel(items, mode.value, from.value);
          return rows.length === 0 ? (
            <p class="note">{t('travel.noRows')}</p>
          ) : (
            <ul class="card-list">
              {rows.map((row) => (
                <li key={row.id} class="card">
                  <h2 class="card__title">{row.name}</h2>
                  <p class="card__meta">
                    {row.from} → {row.to}
                  </p>
                  <p class="card__meta">
                    {t('travel.dep', { time: row.departs })} ·{' '}
                    {t('travel.arr', { time: row.arrives })}
                  </p>
                  <SourceStamp meta={row} />
                </li>
              ))}
            </ul>
          );
        }}
      />
      <section class="section" aria-labelledby="reach-title">
        <h2 id="reach-title" class="section__title">
          {t('travel.reach.title')}
        </h2>
        <ol class="steps">
          <li>
            {t('travel.reach.station')}: {t('state.tbc')}
          </li>
          <li>
            {t('travel.reach.shuttle')}: {t('state.tbc')}
          </li>
          <li>
            {t('travel.reach.walk')}: {t('state.tbc')}
          </li>
        </ol>
        <a class="button button--secondary" href={hrefFor('map')}>
          {t('travel.routeOnMap')}
        </a>
      </section>
    </>
  );
}
