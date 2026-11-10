import { signal, type Signal } from '@preact/signals';

/**
 * Stale-while-revalidate holder for public, read-only content (docs/frontend/architecture-blueprint.md).
 * Held in memory only: nothing is written to storage, and personal data never goes through here.
 * A failed refresh keeps the last good data and flags it instead of blanking the screen.
 */
export type ResourceState<T> =
  | { readonly status: 'loading' }
  | { readonly status: 'error' }
  | {
      readonly status: 'ready';
      readonly data: T;
      readonly fetchedAt: number;
      readonly refreshFailed: boolean;
    };

export interface Resource<T> {
  readonly state: Signal<ResourceState<T>>;
  /** Age after which the data is shown with a "may be out of date" notice. */
  readonly staleAfterMs: number;
  /** Starts a refresh, or joins the one already running. Never rejects. */
  refresh(): Promise<void>;
}

export function isStale(fetchedAt: number, now: number, staleAfterMs: number): boolean {
  return now - fetchedAt > staleAfterMs;
}

export function createResource<T>(
  loader: () => Promise<T>,
  staleAfterMs: number,
  clock: () => number = Date.now,
): Resource<T> {
  const state = signal<ResourceState<T>>({ status: 'loading' });
  let inflight: Promise<void> | null = null;

  const run = async (): Promise<void> => {
    try {
      const data = await loader();
      state.value = { status: 'ready', data, fetchedAt: clock(), refreshFailed: false };
    } catch {
      const previous = state.value;
      state.value =
        previous.status === 'ready' ? { ...previous, refreshFailed: true } : { status: 'error' };
    }
  };

  return {
    state,
    staleAfterMs,
    refresh: () => {
      inflight ??= run().finally(() => {
        inflight = null;
      });
      return inflight;
    },
  };
}
