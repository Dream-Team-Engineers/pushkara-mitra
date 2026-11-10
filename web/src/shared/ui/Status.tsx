import { formatDate, formatNumber, t } from '../i18n/i18n';
import { minutesSince, now } from '../data/time';
import type { PublicMeta } from '../data/contracts';

/** Under this age the stamp says "N min ago"; older items show their date instead. */
const RECENT_MINUTES = 180;

/** Skeleton while content loads. Announced once through aria-busy and a visually hidden label. */
export function Skeleton({ lines = 3 }: { readonly lines?: number }) {
  return (
    <div class="skeleton" aria-busy="true">
      <span class="visually-hidden">{t('state.loading')}</span>
      {Array.from({ length: lines }, (_, index) => (
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
        {t('state.retry')}
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
