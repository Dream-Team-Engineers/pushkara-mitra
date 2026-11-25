import { formatDate, formatNumber, t } from '../i18n/i18n';
import { Bi } from './Bi';
import { minutesSince, now } from '../data/time';
import type { PublicMeta } from '../data/contracts';

/** Under this age the stamp says "N min ago"; older items show their date instead. */
const RECENT_MINUTES = 180;

/** A small spinning ring for a short wait. Decorative: pair it with a text label for readers. */
export function Spinner() {
  return <span class="spinner" aria-hidden="true" />;
}

/**
 * Skeleton while content loads. Announced once through aria-busy and a visually hidden label.
 * `rows` draws list-card placeholders (picture, two lines, a badge) instead of plain lines.
 */
export function Skeleton({
  lines = 3,
  rows = 0,
}: {
  readonly lines?: number;
  readonly rows?: number;
}) {
  return (
    <div class="skeleton" aria-busy="true">
      <Spinner />
      <span class="visually-hidden">{t('state.loading')}</span>
      {rows > 0
        ? Array.from({ length: rows }, (_, index) => (
            <span key={index} class="skeleton__row" aria-hidden="true">
              <span class="skeleton__thumb" />
              <span class="skeleton__text">
                <span class="skeleton__line" />
                <span class="skeleton__line skeleton__line--short" />
              </span>
              <span class="skeleton__pill" />
            </span>
          ))
        : Array.from({ length: lines }, (_, index) => (
            <span key={index} class="skeleton__line" aria-hidden="true" />
          ))}
    </div>
  );
}

export function ErrorState({ onRetry }: { readonly onRetry: () => void }) {
  return (
    <div class="state state--error" role="alert">
      <p>{t('state.error')}</p>
      <button type="button" class="button" onClick={onRetry}>
        <Bi k="state.retry" />
      </button>
    </div>
  );
}

export function EmptyState() {
  return (
    <div class="state">
      <p>{t('state.empty')}</p>
    </div>
  );
}

/**
 * Source, age and verification state of one public item. Every list entry shows one,
 * so sample data can never pass as verified information.
 */
export function SourceStamp({ meta }: { readonly meta: PublicMeta }) {
  const minutes = minutesSince(meta.updatedAt, now.value);
  return (
    <p class="stamp">
      <span>{t('state.source', { source: meta.source })}</span>
      {minutes === null ? null : minutes < RECENT_MINUTES ? (
        <span>{t('state.updatedMinutes', { minutes: formatNumber(minutes) })}</span>
      ) : (
        <span>{t('state.updatedOn', { date: formatDate(Date.parse(meta.updatedAt)) })}</span>
      )}
      {meta.synthetic ? <span class="badge badge--sample">{t('state.synthetic')}</span> : null}
      {meta.status === 'unverified' ? (
        <span class="badge badge--warn">{t('state.unverified')}</span>
      ) : null}
      {meta.status === 'stale' ? <span class="badge badge--warn">{t('state.stale')}</span> : null}
    </p>
  );
}
