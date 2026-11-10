import { signal } from '@preact/signals';
import {
  browserStore,
  isTheme,
  readPreferences,
  THEME_KEY,
  writePreference,
  type Theme,
} from '../prefs/preferences';

export const theme = signal<Theme>('light');

function applyTheme(next: Theme): void {
  theme.value = next;
  if (typeof document !== 'undefined') document.documentElement.dataset['theme'] = next;
}

export function setTheme(next: Theme): void {
  applyTheme(next);
  writePreference(browserStore(), THEME_KEY, next);
}

/** Stored choice first, then the device's dark preference, otherwise light. */
export function initialTheme(stored: Theme | null, prefersDark: boolean): Theme {
  if (isTheme(stored)) return stored;
  return prefersDark ? 'dark' : 'light';
}

export function initTheme(): void {
  const stored = readPreferences(browserStore()).theme;
  const prefersDark =
    typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(initialTheme(stored, prefersDark));
}
