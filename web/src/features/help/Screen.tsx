import { helplinesResource, helpPointsResource } from '../../shared/data/resources';
import type { HelplineKind, HelpPointKind } from '../../shared/data/fixtures';
import { t, type MessageKey } from '../../shared/i18n/i18n';
import { PrototypeBanner, ScreenHeader } from '../../shared/ui/Layout';
import { ResourceView } from '../../shared/ui/ResourceView';
import { SourceStamp } from '../../shared/ui/Status';

/**
 * Emergency / Help prototype (flag `sosDispatch` is off). The SOS control is inert, no number is
 * dialled and nothing is dispatched. Helpline numbers are not shown until an officially verified
 * source is supplied. The app never replaces police, ambulance or any government service.
 */
const LINE_LABELS = {
  emergency: 'help.line.emergency',
  ambulance: 'help.line.ambulance',
  police: 'help.line.police',
  control: 'help.line.control',
} as const satisfies Record<HelplineKind, MessageKey>;

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
          {t('help.numbers.title')}
        </h2>
        <ResourceView
          resource={helplinesResource}
          render={(lines) => (
            <ul class="card-list card-list--flush">
              {lines.map((line) => (
                <li key={line.id} class="card">
                  <p class="card__title">{t(LINE_LABELS[line.kind])}</p>
                  <p class="card__meta">{line.number ?? t('help.numbers.pending')}</p>
                  <SourceStamp meta={line} />
                </li>
              ))}
            </ul>
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
      <p class="disclaimer">{t('module.help.noDispatch')}</p>
    </>
  );
}
