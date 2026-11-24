import { isLocale, type Locale } from '../i18n/i18n';

/**
 * The only browser storage the app may use: language, theme and colour (docs/compliance/data-inventory.md).
 * Values are validated on read, storage failures are ignored, and nothing else is ever stored.
 * tests/guards/frontend-privacy.test.ts allows storage in this file only.
 */
export const THEMES = ['light', 'dark', 'outdoor'] as const;
export type Theme = (typeof THEMES)[number];

export const LOCALE_KEY = 'pm.locale';
export const THEME_KEY = 'pm.theme';
export const ACCENT_KEY = 'pm.accent';

/** Colour choices (owner request 2026-11-23). Green is the default. */
export const ACCENTS = ['green', 'saffron', 'blue', 'gold'] as const;
export type Accent = (typeof ACCENTS)[number];

export function isAccent(value: unknown): value is Accent {
  return typeof value === 'string' && (ACCENTS as readonly string[]).includes(value);
}

export interface PreferenceStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface Preferences {
  readonly locale: Locale | null;
  readonly theme: Theme | null;
  readonly accent: Accent | null;
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
    const storedAccent = store?.getItem(ACCENT_KEY) ?? null;
    return {
      locale: isLocale(storedLocale) ? storedLocale : null,
      theme: isTheme(storedTheme) ? storedTheme : null,
      accent: isAccent(storedAccent) ? storedAccent : null,
    };
  } catch {
    return { locale: null, theme: null, accent: null };
  }
}

export function writePreference(
  store: PreferenceStore | undefined,
  key: typeof LOCALE_KEY | typeof THEME_KEY | typeof ACCENT_KEY,
  value: Locale | Theme | Accent,
): void {
  try {
    store?.setItem(key, value);
  } catch {
    // Storage may be full, blocked or private; the choice still applies for this visit.
  }
}

/**
 * Favourite ghats (owner request 2026-11-24): a short list of ghat ids, on this device only, so the
 * ghats the person cares about are shown first. Ids only: no position, no name, no account. Never
 * sent to a server. Values are validated on read.
 */
export const FAVOURITES_KEY = 'pm.favs';
export const MAX_FAVOURITES = 30;
const GHAT_ID = /^[a-z0-9][a-z0-9/-]{0,63}$/;

export function readFavourites(store: PreferenceStore | undefined): readonly string[] {
  try {
    const raw = store?.getItem(FAVOURITES_KEY) ?? null;
    if (raw === null) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const ids = parsed.filter((id): id is string => typeof id === 'string' && GHAT_ID.test(id));
    return [...new Set(ids)].slice(0, MAX_FAVOURITES);
  } catch {
    return [];
  }
}

export function writeFavourites(store: PreferenceStore | undefined, ids: readonly string[]): void {
  try {
    store?.setItem(FAVOURITES_KEY, JSON.stringify(ids.slice(0, MAX_FAVOURITES)));
  } catch {
    // Storage may be full, blocked or private; the favourites still apply for this visit.
  }
}
