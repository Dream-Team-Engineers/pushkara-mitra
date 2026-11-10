import type { ComponentChildren } from 'preact';
import { isStale, type Resource } from '../data/resource';
import { now, online } from '../data/time';
import { useResource } from '../data/useResource';
import { t } from '../i18n/i18n';
import { ErrorState, Skeleton } from './Status';

/** Renders loading, error, offline and stale states around a resource's data. */
export function ResourceView<T>({
  resource,
  render,
}: {
  readonly resource: Resource<T>;
  readonly render: (data: T) => ComponentChildren;
}) {
  const state = useResource(resource);
  if (state.status === 'loading') return <Skeleton />;
  if (state.status === 'error') {
    return (
      <ErrorState
        onRetry={() => {
          void resource.refresh();
        }}
      />
    );
  }
  const stale = state.refreshFailed || isStale(state.fetchedAt, now.value, resource.staleAfterMs);
  return (
    <>
      {online.value ? null : (
        <p class="notice" role="status">
          {t('state.offlineCached')}
        </p>
      )}
      {stale ? (
        <p class="notice notice--warn" role="status">
          {t('state.stale')}
        </p>
      ) : null}
      {render(state.data)}
    </>
  );
}
