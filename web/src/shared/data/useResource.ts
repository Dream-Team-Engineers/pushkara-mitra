import { useEffect } from 'preact/hooks';
import type { Resource, ResourceState } from './resource';

/** Refreshes on screen open, when the page becomes visible again, and when the network returns. */
export function useResource<T>(resource: Resource<T>): ResourceState<T> {
  useEffect(() => {
    void resource.refresh();
    const refresh = (): void => {
      void resource.refresh();
    };
    const onVisible = (): void => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', refresh);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', refresh);
    };
  }, [resource]);
  return resource.state.value;
}
