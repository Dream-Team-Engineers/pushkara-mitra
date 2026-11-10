import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Guard for web/src/shared/i18n (docs/i18n.md, ADR 0011).
 * Telugu is the default and English the fallback. A missing key, an empty value,
 * a mismatched placeholder or a wrong-script draft fails CI.
 * Passing this test is not a translation review: te and hi stay needsNativeReview
 * until a named native speaker has reviewed them.
 */
const DIR = join(import.meta.dirname, '..', '..', 'web', 'src', 'shared', 'i18n');
const LOCALES = ['te', 'en', 'hi'] as const;
type Locale = (typeof LOCALES)[number];

interface Catalogue {
  meta: { locale: string; needsNativeReview: boolean; reviewedBy: string | null; status: string };
  messages: Record<string, string>;
}

const SCRIPT: Record<Locale, RegExp | null> = {
  te: /[ఀ-౿]/,
  en: null,
  hi: /[ऀ-ॿ]/,
};

function load(locale: Locale): Catalogue {
  return JSON.parse(readFileSync(join(DIR, `${locale}.json`), 'utf8')) as Catalogue;
}

function placeholders(value: string): string[] {
  return [...value.matchAll(/\{([a-z]+)\}/g)].map((match) => match[1] ?? '').sort();
}

const catalogues = new Map(LOCALES.map((locale) => [locale, load(locale)]));
const english = load('en');
const keys = Object.keys(english.messages).sort();

describe('i18n catalogues', () => {
  it('has a non-trivial English key set with well-formed keys', () => {
    expect(keys.length).toBeGreaterThan(40);
    for (const key of keys) expect(key).toMatch(/^[a-z]+(\.[a-zA-Z]+)+$/);
  });

  it.each(LOCALES)('%s has exactly the English keys', (locale) => {
    expect(Object.keys(catalogues.get(locale)?.messages ?? {}).sort()).toEqual(keys);
  });

  it.each(LOCALES)('%s has no empty or untrimmed values', (locale) => {
    for (const [key, value] of Object.entries(catalogues.get(locale)?.messages ?? {})) {
      expect(typeof value, key).toBe('string');
      expect(value.trim().length, key).toBeGreaterThan(0);
      expect(value, key).toBe(value.trim());
    }
  });

  it.each(LOCALES)('%s uses the same placeholders as English', (locale) => {
    const messages = catalogues.get(locale)?.messages ?? {};
    for (const key of keys) {
      expect(placeholders(messages[key] ?? ''), key).toEqual(
        placeholders(english.messages[key] ?? ''),
      );
    }
  });

  it.each(LOCALES)('%s values are written in the locale script', (locale) => {
    const script = SCRIPT[locale];
    if (script === null) return;
    for (const [key, value] of Object.entries(catalogues.get(locale)?.messages ?? {})) {
      expect(script.test(value), `${locale}:${key}`).toBe(true);
    }
  });

  it.each(LOCALES)('%s metadata is honest about review status', (locale) => {
    const meta = catalogues.get(locale)?.meta;
    expect(meta?.locale).toBe(locale);
    if (meta?.needsNativeReview === true) {
      expect(meta.reviewedBy).toBeNull();
      expect(meta.status).toBe('draft');
    } else {
      expect(locale === 'en' || typeof meta?.reviewedBy === 'string').toBe(true);
    }
  });

  it('keeps Telugu and Hindi marked for native review until someone is named', () => {
    for (const locale of ['te', 'hi'] as const) {
      const meta = catalogues.get(locale)?.meta;
      expect(meta?.needsNativeReview === true || typeof meta?.reviewedBy === 'string').toBe(true);
    }
  });

  it('labels sponsored content and the disclaimer in every locale', () => {
    for (const locale of LOCALES) {
      const messages = catalogues.get(locale)?.messages ?? {};
      expect(messages['home.sponsored']).toContain('Sponsored');
      expect(messages['app.disclaimer']?.length ?? 0).toBeGreaterThan(10);
      expect(messages['module.help.noDispatch']?.length ?? 0).toBeGreaterThan(10);
    }
  });
});
