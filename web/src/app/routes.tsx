import type { ComponentType } from 'preact';
import HomeScreen from '../features/home/Screen';
import type { RouteState } from './router';

export interface ScreenModule {
  readonly default: ComponentType;
}
export type ScreenLoader = () => Promise<ScreenModule>;

/**
 * Every features/<route id>/Screen.tsx becomes a lazily loaded chunk for its route, so adding a
 * screen needs no change here. Home is imported statically so the first paint needs one request.
 * A route without a screen yet shows the "coming soon" placeholder, never invented content.
 */
const lazyScreens = import.meta.glob<ScreenModule>([
  '../features/*/Screen.tsx',
  '!../features/home/Screen.tsx',
]);

export function screenLoader(state: RouteState): ScreenLoader {
  if (state === 'home') return () => Promise.resolve({ default: HomeScreen });
  if (state === 'notFound') return () => import('../features/status/NotFoundScreen');
  return (
    lazyScreens[`../features/${state}/Screen.tsx`] ??
    (() => import('../features/status/ComingSoonScreen'))
  );
}

export function eagerScreen(state: RouteState): ComponentType | null {
  return state === 'home' ? HomeScreen : null;
}
