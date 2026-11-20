import { crowdResource } from '../../shared/data/resources';
import { Bi } from '../../shared/ui/Bi';
import { t, type MessageKey } from '../../shared/i18n/i18n';
import { ScreenHeader } from '../../shared/ui/Layout';
import { ResourceView } from '../../shared/ui/ResourceView';
import { SourceStamp } from '../../shared/ui/Status';

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
function Meter({ label, level }: { readonly label: MessageKey; readonly level: Level }) {
  const bars = LEVEL_BARS[level];
  return (
    <div class={'meter meter--' + level}>
      <span class="meter__label">{t(label)}</span>
      <span class="meter__bars" aria-hidden="true">
        {[1, 2, 3].map((step) => (
          <span key={step} class={step <= bars ? 'meter__bar is-on' : 'meter__bar'} />
        ))}
      </span>
      <span class="meter__text">{t(LEVEL_TEXT[level])}</span>
    </div>
  );
}

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
          <Bi k="conditions.crowd" />
        </h2>
        <p class="note note--flush">{t('conditions.crowdNote')}</p>
        <ResourceView
          resource={crowdResource}
          render={(items) => (
            <ul class="card-list">
              {items.map((ghat) => (
                <li key={ghat.id} class="card">
                  <h3 class="card__title">{ghat.name}</h3>
                  <SourceStamp meta={ghat} />
                  <div class="meter-row">
                    <Meter label="meter.crowd" level={ghat.crowd} />
                    {/* No traffic feed exists yet: always "No data", never a made-up level. */}
                    <Meter label="meter.traffic" level="noData" />
                  </div>
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
          <Bi k="conditions.safety" />
        </h2>
        <p class="note note--flush">{t('conditions.noneVerified')}</p>
        <p class="note note--flush">{t('conditions.safetyNote')}</p>
      </section>
    </>
  );
}
