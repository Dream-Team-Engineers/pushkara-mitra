import { batch, signal } from '@preact/signals';
import te from './te.json';

/**
 * Message catalogues (te default, en, hi). Telugu is bundled; English and Hindi load on demand.
 * The `Messages` type makes a missing key in any catalogue a compile error;
 * tests/guards/i18n-catalogues.test.ts also checks placeholders and review metadata.
 */
export const LOCALES = ['te', 'en', 'hi'] as const;
export type Locale = (typeof LOCALES)[number];
export type Messages = typeof te.messages;
export type MessageKey = keyof Messages;
export type MessageParams = Readonly<Record<string, string | number>>;

export const DEFAULT_LOCALE: Locale = 'te';

/** Native names are shown untranslated so a person can always find their own language. */
export const LOCALE_NAMES: Readonly<Record<Locale, string>> = {
  te: 'తెలుగు',
  en: 'English',
  hi: 'हिन्दी',
};

const LOADERS: Readonly<Record<Locale, () => Promise<Messages>>> = {
  te: () => Promise.resolve(te.messages),
  en: async () => (await import('./en.json')).default.messages,
  hi: async () => (await import('./hi.json')).default.messages,
};

/** Latin digits keep numbers readable for all three languages. */
const INTL_TAGS: Readonly<Record<Locale, string>> = {
  te: 'te-IN-u-nu-latn',
  en: 'en-IN',
  hi: 'hi-IN-u-nu-latn',
};

export const locale = signal<Locale>(DEFAULT_LOCALE);
const catalogue = signal<Messages>(te.messages);

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

export function interpolate(template: string, params: MessageParams): string {
  return template.replace(/\{([a-z]+)\}/g, (match: string, name: string) => {
    const value = params[name];
    return value === undefined ? match : String(value);
  });
}

/** Reads the catalogue signal, so a component that calls t() re-renders on a language change. */
export function t(key: MessageKey, params?: MessageParams): string {
  const template = catalogue.value[key];
  return params === undefined ? template : interpolate(template, params);
}

let latestRequest = 0;

/**
 * Switches language. Only the most recent request wins: a slower, earlier download that finishes
 * last is discarded and reports `false`. A failed download rejects and leaves the current
 * language in place.
 */
export async function setLocale(next: Locale): Promise<boolean> {
  latestRequest += 1;
  const request = latestRequest;
  const messages = await LOADERS[next]();
  if (request !== latestRequest) return false;
  batch(() => {
    catalogue.value = messages;
    locale.value = next;
  });
  if (typeof document !== 'undefined') document.documentElement.lang = next;
  return true;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat(INTL_TAGS[locale.value]).format(value);
}

/** Festival times are always Indian Standard Time, whatever the device zone says. */
export function formatClock(timestamp: number): string {
  return new Intl.DateTimeFormat(INTL_TAGS[locale.value], {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata',
  }).format(timestamp);
}

export function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat(INTL_TAGS[locale.value], {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  }).format(timestamp);
}
