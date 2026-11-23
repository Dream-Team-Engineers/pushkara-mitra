import { signal } from '@preact/signals';
import {
  ACCENT_KEY,
  browserStore,
  isTheme,
  readPreferences,
  THEME_KEY,
  writePreference,
  type Accent,
  type Theme,
} from '../prefs/preferences';

export const theme = signal<Theme>('light');
/** Colour choice (owner request 2026-11-23); green unless the person picked another. */
export const accent = signal<Accent>('green');

function applyAccent(next: Accent): void {
  accent.value = next;
  if (typeof document !== 'undefined') document.documentElement.dataset['accent'] = next;
}

export function setAccent(next: Accent): void {
  applyAccent(next);
  writePreference(browserStore(), ACCENT_KEY, next);
}

function applyTheme(next: Theme): void {
  theme.value = next;
  if (typeof document !== 'undefined') document.documentElement.dataset['theme'] = next;
}

export function setTheme(next: Theme): void {
  applyTheme(next);
  writePreference(browserStore(), THEME_KEY, next);
}

/**
 * The stored choice, otherwise light. Dark is used only when the person chooses it (owner request
 * 2026-11-23), even if the phone itself is set to dark mode; the device setting is ignored.
 */
export function initialTheme(stored: Theme | null): Theme {
  return isTheme(stored) ? stored : 'light';
}

export function initTheme(): void {
  const preferences = readPreferences(browserStore());
  applyAccent(preferences.accent ?? 'green');
  applyTheme(initialTheme(preferences.theme));
}
