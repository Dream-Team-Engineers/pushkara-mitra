import { useResource } from '../../shared/data/useResource';
import { t, type MessageKey } from '../../shared/i18n/i18n';
import {
  ageMinutes,
  PARTNER_KINDS,
  volunteerUpdatesResource,
  type PartnerKind,
  type VolunteerUpdate,
} from '../../shared/partners/partnersClient';

/** Label for each reported value, by kind. Crowd reuses the crowd words pilgrims already know. */
export const VALUE_LABELS = {
  crowd: {
    low: 'crowd.low',
    moderate: 'crowd.moderate',
    high: 'crowd.high',
  },
  river: {
    normal: 'pv.river.normal',
    rising: 'pv.river.rising',
    high: 'pv.river.high',
  },
  food: {
    available: 'pv.food.available',
    finished: 'pv.food.finished',
  },
} as const satisfies Record<PartnerKind, Record<string, MessageKey>>;

export const KIND_LABELS = {
  crowd: 'pv.kind.crowd',
  river: 'pv.kind.river',
  food: 'pv.kind.food',
} as const satisfies Record<PartnerKind, MessageKey>;

export function valueLabel(kind: PartnerKind, value: string): MessageKey | null {
  const labels: Readonly<Record<string, MessageKey>> = VALUE_LABELS[kind];
  return labels[value] ?? null;
}

/** Renders nothing; fetches the volunteer updates once for the whole screen and keeps them fresh. */
export function VolunteerUpdatesLoader() {
  useResource(volunteerUpdatesResource);
  return null;
}

/**
 * The newest volunteer report of one kind for one ghat, or null. Reads the shared resource that
 * `VolunteerUpdatesLoader` refreshes (the server already leaves out anything over three hours old,
 * hidden reports and suspended partners; the client drops stale ones again).
 */
export function latestVolunteer(kind: PartnerKind, ghatId: string): VolunteerUpdate | null {
  const state = volunteerUpdatesResource.state.value;
  if (state.status !== 'ready' || state.data === null) return null;
  const mine = state.data.updates.filter(
    (update) => update.kind === kind && update.ghatId === ghatId,
  );
  return mine.sort((a, b) => Date.parse(b.reportedAt) - Date.parse(a.reportedAt))[0] ?? null;
}

/**
 * The pilgrim-facing "From a volunteer" strip for one ghat (ADR 0019 section 5): the latest report
 * per kind with its age and a plain line that it is not an official figure. It never says who
 * reported and never replaces the official crowd reading. River reports add the official-bulletin
 * line (wording NEEDS REVIEW, OQ-045), unless `compact` (the ghat list), which shows that line in
 * the card's details instead.
 */
export function VolunteerStrip({
  ghatId,
  compact = false,
}: {
  readonly ghatId: string;
  readonly compact?: boolean;
}) {
  const rows = PARTNER_KINDS.flatMap((kind) => {
    const latest = latestVolunteer(kind, ghatId);
    const label = latest === null ? null : valueLabel(kind, latest.value);
    return latest === null || label === null ? [] : [{ kind, latest, label }];
  });
  if (rows.length === 0) return null;
  return (
    <section class="volunteer-strip" aria-label={t('pv.strip.title')}>
      <p class="card__meta">
        <strong>{t('pv.strip.title')}</strong> · {t('pv.strip.notOfficial')}
      </p>
      <ul class="tags">
        {rows.map(({ kind, latest, label }) => (
          <li key={kind}>
            {t(KIND_LABELS[kind])}: {t(label)} ·{' '}
            {t('pv.strip.age', { minutes: ageMinutes(latest.reportedAt) })}
          </li>
        ))}
      </ul>
      {!compact && rows.some((row) => row.kind === 'river') ? (
        <p class="note note--flush">{t('pv.strip.river')}</p>
      ) : null}
    </section>
  );
}
