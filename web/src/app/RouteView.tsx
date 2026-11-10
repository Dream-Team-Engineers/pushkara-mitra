import type { ComponentType } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { ErrorState, Skeleton } from '../shared/ui/Status';
import { current, type RouteState } from './router';
import { eagerScreen, screenLoader } from './routes';

interface Loaded {
  readonly state: RouteState;
  readonly Screen: ComponentType;
}

type Outcome =
  | { readonly kind: 'ready'; readonly loaded: Loaded }
  | { readonly kind: 'failed'; readonly state: RouteState };

/** Loads the screen for the current route, with loading and retry states and focus management. */
export function RouteView() {
  const state = current.value;
  const eager = eagerScreen(state);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [attempt, setAttempt] = useState(0);
  const firstRender = useRef(true);

  useEffect(() => {
    if (eager !== null) return undefined;
    let cancelled = false;
    setOutcome(null);
    screenLoader(state)()
      .then((module) => {
        if (!cancelled) setOutcome({ kind: 'ready', loaded: { state, Screen: module.default } });
      })
      .catch(() => {
        if (!cancelled) setOutcome({ kind: 'failed', state });
      });
    return () => {
      cancelled = true;
    };
  }, [state, eager, attempt]);

  const ready = eager !== null || (outcome?.kind === 'ready' && outcome.loaded.state === state);

  // Move focus to the screen heading after a navigation (not on the first page load).
  useEffect(() => {
    if (!ready) return;
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    window.scrollTo(0, 0);
    document.getElementById('screen-title')?.focus({ preventScroll: true });
  }, [state, ready]);

  if (eager !== null) {
    const Home = eager;
    return <Home />;
  }
  if (outcome?.kind === 'failed' && outcome.state === state) {
    return (
      <ErrorState
        onRetry={() => {
          setAttempt((count) => count + 1);
        }}
      />
    );
  }
  if (outcome?.kind === 'ready' && outcome.loaded.state === state) {
    const Screen = outcome.loaded.Screen;
    return <Screen />;
  }
  return <Skeleton />;
}
