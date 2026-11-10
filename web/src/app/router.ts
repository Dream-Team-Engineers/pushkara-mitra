import { signal } from '@preact/signals';
import type { MessageKey } from '../shared/i18n/i18n';

/** Hash routes until a Worker app-shell fallback exists and is tested (ADR 0011, Hosting). */
export const ROUTE_IDS = [
  'home',
  'pass',
  'group',
  'map',
  'ghats',
  'stay',
  'travel',
  'help',
  'updates',
  'conditions',
  'partners',
  'settings',
] as const;
export type RouteId = (typeof ROUTE_IDS)[number];
export type RouteState = RouteId | 'notFound';

export interface RouteInfo {
  readonly id: RouteId;
  readonly path: string;
  readonly titleKey: MessageKey;
}

export const ROUTES: readonly RouteInfo[] = [
  { id: 'home', path: '/', titleKey: 'app.name' },
  { id: 'pass', path: '/pass', titleKey: 'module.pass.title' },
  { id: 'group', path: '/group', titleKey: 'module.group.title' },
  { id: 'map', path: '/map', titleKey: 'module.map.title' },
  { id: 'ghats', path: '/ghats', titleKey: 'module.ghats.title' },
  { id: 'stay', path: '/stay', titleKey: 'module.stay.title' },
  { id: 'travel', path: '/travel', titleKey: 'module.travel.title' },
  { id: 'help', path: '/help', titleKey: 'module.help.title' },
  { id: 'updates', path: '/updates', titleKey: 'module.updates.title' },
  { id: 'conditions', path: '/conditions', titleKey: 'module.conditions.title' },
  { id: 'partners', path: '/partners', titleKey: 'module.partners.title' },
  { id: 'settings', path: '/settings', titleKey: 'settings.title' },
];

export function hrefFor(id: RouteId): string {
  const route = ROUTES.find((candidate) => candidate.id === id);
  return `#${route?.path ?? '/'}`;
}

export function titleKeyFor(state: RouteState): MessageKey {
  if (state === 'notFound') return 'status.notFound.title';
  return ROUTES.find((candidate) => candidate.id === state)?.titleKey ?? 'app.name';
}

/** Accepts `#`, `#/`, `#/ghats`, `#/ghats/` and `#/ghats?x=1`; anything else is not found. */
export function parseHash(hash: string): RouteState {
  const withoutMarker = hash.startsWith('#') ? hash.slice(1) : hash;
  const [rawPath = ''] = withoutMarker.split('?');
  if (rawPath === '' || rawPath === '/') return 'home';
  const path = rawPath.length > 1 && rawPath.endsWith('/') ? rawPath.slice(0, -1) : rawPath;
  return ROUTES.find((candidate) => candidate.path === path)?.id ?? 'notFound';
}

export const current = signal<RouteState>('home');

/** Starts listening to hash changes. Returns a stop function. */
export function startRouter(): () => void {
  const sync = (): void => {
    current.value = parseHash(window.location.hash);
  };
  sync();
  window.addEventListener('hashchange', sync);
  return () => {
    window.removeEventListener('hashchange', sync);
  };
}
