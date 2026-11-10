import { crowdResource } from '../../shared/data/resources';
import { t, type MessageKey } from '../../shared/i18n/i18n';
import { CrowdChip } from '../../shared/ui/Chips';
import { ScreenHeader } from '../../shared/ui/Layout';
import { ResourceView } from '../../shared/ui/ResourceView';
import { SourceStamp } from '../../shared/ui/Status';

const TILES: readonly { readonly id: string; readonly title: MessageKey }[] = [
  { id: 'weather', title: 'conditions.weather' },
  { id: 'river', title: 'conditions.river' },
  { id: 'stay', title: 'conditions.stay' },
  { id: 'parking', title: 'conditions.parking' },
];

/**
 * No real feed is connected, so the tiles say "no data" instead of showing placeholder numbers
 * that could be read as live conditions. Crowd levels are estimates and never safety instructions.
 */
export default function ConditionsScreen() {
  return (
    <>
      <ScreenHeader titleKey="module.conditions.title" subtitleKey="module.conditions.subtitle" />
      <section class="section" aria-labelledby="crowd-title">
        <h2 id="crowd-title" class="section__title">
          {t('conditions.crowd')}
        </h2>
        <p class="note note--flush">{t('conditions.crowdNote')}</p>
        <ResourceView
          resource={crowdResource}
          render={(items) => (
            <ul class="card-list">
              {items.map((ghat) => (
                <li key={ghat.id} class="card">
                  <div class="card__head">
                    <h3 class="card__title">{ghat.name}</h3>
                    <CrowdChip level={ghat.crowd} />
                  </div>
                  <SourceStamp meta={ghat} />
                </li>
              ))}
            </ul>
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
          {t('conditions.safety')}
        </h2>
        <p class="note note--flush">{t('conditions.noneVerified')}</p>
        <p class="note note--flush">{t('conditions.safetyNote')}</p>
      </section>
    </>
  );
}
