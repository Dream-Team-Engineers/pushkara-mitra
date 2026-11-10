import { afterEach, describe, expect, it } from 'vitest';
import en from './en.json';
import hi from './hi.json';
import {
  formatClock,
  formatNumber,
  interpolate,
  isLocale,
  LOCALES,
  locale,
  setLocale,
  t,
} from './i18n';
import te from './te.json';

afterEach(async () => {
  await setLocale('te');
});

describe('interpolate', () => {
  it('replaces known placeholders and leaves unknown ones visible', () => {
    expect(interpolate('{a} and {b}', { a: 'x', b: 2 })).toBe('x and 2');
    expect(interpolate('{a} and {missing}', { a: 'x' })).toBe('x and {missing}');
  });
});

describe('t and setLocale', () => {
  it('starts in Telugu', () => {
    expect(locale.value).toBe('te');
    expect(t('nav.home')).toBe(te.messages['nav.home']);
  });

  it('switches to English and Hindi and back', async () => {
    await setLocale('en');
    expect(locale.value).toBe('en');
    expect(t('nav.home')).toBe(en.messages['nav.home']);
    await setLocale('hi');
    expect(t('nav.home')).toBe(hi.messages['nav.home']);
    await setLocale('te');
    expect(t('nav.home')).toBe(te.messages['nav.home']);
  });

  it('fills placeholders', async () => {
    await setLocale('en');
    expect(t('state.updatedMinutes', { minutes: 7 })).toBe('Updated 7 min ago');
  });
});

describe('overlapping language requests', () => {
  it('keeps only the latest request and reports the stale one as not applied', async () => {
    const first = setLocale('en');
    const second = setLocale('te');
    expect(await first).toBe(false);
    expect(await second).toBe(true);
    expect(locale.value).toBe('te');
    expect(t('nav.home')).toBe(te.messages['nav.home']);
  });

  it('applies a request that nothing has replaced', async () => {
    expect(await setLocale('hi')).toBe(true);
    expect(locale.value).toBe('hi');
  });
});

describe('locale helpers', () => {
  it('recognises only the three supported locales', () => {
    for (const value of LOCALES) expect(isLocale(value)).toBe(true);
    expect(isLocale('mr')).toBe(false);
    expect(isLocale(null)).toBe(false);
  });

  it('uses Latin digits and Indian Standard Time', async () => {
    for (const next of LOCALES) {
      await setLocale(next);
      expect(formatNumber(1234)).toMatch(/^1,234$/);
      // 2027-06-26T00:00:00+05:30 is 18:30 UTC the day before; the clock must show IST.
      expect(formatClock(Date.parse('2027-06-25T18:30:00Z'))).toMatch(/12:00|00:00/);
    }
  });
});
