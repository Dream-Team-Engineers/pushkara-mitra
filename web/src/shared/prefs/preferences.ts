import { isLocale, type Locale } from '../i18n/i18n';

/**
 * The only browser storage the app may use: language and theme (docs/compliance/data-inventory.md).
 * Values are validated on read, storage failures are ignored, and nothing else is ever stored.
 * tests/guards/frontend-privacy.test.ts allows storage in this file only.
 */
export const THEMES = ['light', 'dark', 'outdoor'] as const;
export type Theme = (typeof THEMES)[number];

export const LOCALE_KEY = 'pm.locale';
export const THEME_KEY = 'pm.theme';

export interface PreferenceStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface Preferences {
  readonly locale: Locale | null;
  readonly theme: Theme | null;
}

export function isTheme(value: unknown): value is Theme {
  return typeof value === 'string' && (THEMES as readonly string[]).includes(value);
}

export function browserStore(): PreferenceStore | undefined {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage;
  } catch {
    return undefined;
  }
}

export function readPreferences(store: PreferenceStore | undefined): Preferences {
  try {
    const storedLocale = store?.getItem(LOCALE_KEY) ?? null;
    const storedTheme = store?.getItem(THEME_KEY) ?? null;
    return {
      locale: isLocale(storedLocale) ? storedLocale : null,
      theme: isTheme(storedTheme) ? storedTheme : null,
    };
  } catch {
    return { locale: null, theme: null };
  }
}

export function writePreference(
  store: PreferenceStore | undefined,
  key: typeof LOCALE_KEY | typeof THEME_KEY,
  value: Locale | Theme,
): void {
  try {
    store?.setItem(key, value);
  } catch {
    // Storage may be full, blocked or private; the choice still applies for this visit.
  }
}
