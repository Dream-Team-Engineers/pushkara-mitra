import { helplinesResource, helpPointsResource } from '../../shared/data/resources';
import type { HelpPointKind } from '../../shared/data/fixtures';
import { t, type MessageKey } from '../../shared/i18n/i18n';
import { Bi } from '../../shared/ui/Bi';
import { HelplineList } from './HelplineList';
import { PrototypeBanner, ScreenHeader } from '../../shared/ui/Layout';
import { ResourceView } from '../../shared/ui/ResourceView';
import { SourceStamp } from '../../shared/ui/Status';

/**
 * Emergency / Help (flag `sosDispatch` is off). The SOS control is inert and nothing is dispatched.
 * Helpline numbers appear only from owner-approved, officially sourced data; each can be called
 * only after an explicit confirmation (HelplineList). The app never replaces police, ambulance or
 * any government service.
 */
const POINT_LABELS = {
  firstAid: 'help.point.firstAid',
  police: 'help.point.police',
  lost: 'help.point.lost',
} as const satisfies Record<HelpPointKind, MessageKey>;

export default function HelpScreen() {
  return (
    <>
      <ScreenHeader titleKey="module.help.title" subtitleKey="module.help.subtitle" />
      <PrototypeBanner />
      <section class="sos" aria-labelledby="sos-title">
        <h2 id="sos-title" class="visually-hidden">
          SOS
        </h2>
        <button type="button" class="sos__button" disabled aria-describedby="sos-note">
          {t('help.sos.button')}
        </button>
        <p id="sos-note" class="note note--flush">
          {t('help.sos.inactive')}
        </p>
      </section>
      <section class="section" aria-labelledby="lines-title">
        <h2 id="lines-title" class="section__title">
          <Bi k="help.numbers.title" />
        </h2>
        <ResourceView
          resource={helplinesResource}
          render={(lines) => (
            <>
              {lines.some((line) => line.number === null) ? (
                <p class="note note--flush">{t('help.numbers.pending')}</p>
              ) : null}
              <HelplineList lines={lines} />
            </>
          )}
        />
      </section>
      <section class="section" aria-labelledby="kin-title">
        <h2 id="kin-title" class="section__title">
          {t('help.kin.title')}
        </h2>
        <p class="note note--flush">{t('help.kin.note')}</p>
      </section>
      <section class="section" aria-labelledby="points-title">
        <h2 id="points-title" class="section__title">
          {t('help.points.title')}
        </h2>
        <ResourceView
          resource={helpPointsResource}
          render={(points) => (
            <ul class="card-list card-list--flush">
              {points.map((point) => (
                <li key={point.id} class="card">
                  <p class="card__title">{t(POINT_LABELS[point.kind])}</p>
                  <p class="card__meta">
                    {point.ghat} · {point.distance}
                  </p>
                  <SourceStamp meta={point} />
                </li>
              ))}
            </ul>
          )}
        />
      </section>
      <p class="disclaimer">
        <Bi k="module.help.noDispatch" stacked />
      </p>
    </>
  );
}
