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

/** Colour of a reported value: good, careful or bad. The words stay on the tag, so colour is never the only signal. */
const TONES = {
  crowd: { low: 'good', moderate: 'warn', high: 'bad' },
  river: { normal: 'good', rising: 'warn', high: 'bad' },
  food: { available: 'good', finished: 'bad' },
} as const satisfies Record<PartnerKind, Record<string, 'good' | 'warn' | 'bad'>>;

export function toneOf(kind: PartnerKind, value: string): 'good' | 'warn' | 'bad' | 'none' {
  const tones: Readonly<Record<string, 'good' | 'warn' | 'bad'>> = TONES[kind];
  return tones[value] ?? 'none';
}

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
/** One line for the closed ghat card: label, a tag per report and the newest age. No disclaimer here; see VolunteerDisclaimer. */
function CompactStrip({ rows }: { readonly rows: readonly Row[] }) {
  const newest = Math.max(...rows.map((row) => Date.parse(row.latest.reportedAt)));
  return (
    <span class="volunteer-compact" aria-label={t('pv.strip.title')}>
      <span class="volunteer-compact__label">{t('pv.strip.title')}</span>
      {rows.map(({ kind, latest, label }) => (
        <span
          key={kind}
          class={`volunteer-compact__tag volunteer-compact__tag--${toneOf(kind, latest.value)}`}
        >
          {t(kind === 'food' ? 'pv.kind.foodShort' : KIND_LABELS[kind])}: {t(label)}
        </span>
      ))}
      <span class="volunteer-compact__age">
        {t('pv.strip.age', { minutes: ageMinutes(new Date(newest).toISOString()) })}
      </span>
    </span>
  );
}

interface Row {
  readonly kind: PartnerKind;
  readonly latest: VolunteerUpdate;
  readonly label: MessageKey;
}

function rowsFor(ghatId: string): readonly Row[] {
  return PARTNER_KINDS.flatMap((kind) => {
    const latest = latestVolunteer(kind, ghatId);
    const label = latest === null ? null : valueLabel(kind, latest.value);
    return latest === null || label === null ? [] : [{ kind, latest, label }];
  });
}

/**
 * The pilgrim-facing "From a volunteer" strip for one ghat (ADR 0019 section 5): the latest report
 * per kind with its age. It never says who reported and never replaces the official crowd reading.
 * The "not an official figure" and official-bulletin lines (wording NEEDS REVIEW, OQ-045) are shown
 * once at the top of a screen by VolunteerDisclaimer; the full variant repeats them for one ghat.
 */
export function VolunteerStrip({
  ghatId,
  compact = false,
}: {
  readonly ghatId: string;
  readonly compact?: boolean;
}) {
  const rows = rowsFor(ghatId);
  if (rows.length === 0) return null;
  if (compact) return <CompactStrip rows={rows} />;
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
      {rows.some((row) => row.kind === 'river') ? (
        <p class="note note--flush">{t('pv.strip.river')}</p>
      ) : null}
    </section>
  );
}

/** One shared line for a whole screen, shown only while at least one volunteer report is visible. */
export function VolunteerDisclaimer() {
  const state = volunteerUpdatesResource.state.value;
  if (state.status !== 'ready' || state.data === null || state.data.updates.length === 0) {
    return null;
  }
  return <p class="note">{t('pv.strip.disclaimer')}</p>;
}
