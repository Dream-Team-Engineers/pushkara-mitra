import { afterEach, describe, expect, it } from 'vitest';
import { LOCALE_KEY, type PreferenceStore } from '../prefs/preferences';
import { locale, setLocale } from './i18n';
import { selectLocale } from './select';

function memoryStore(): PreferenceStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
  };
}

afterEach(async () => {
  await setLocale('te');
});

describe('selectLocale', () => {
  it('saves the choice once it is applied', async () => {
    const store = memoryStore();
    expect(await selectLocale('hi', store)).toBe(true);
    expect(store.data.get(LOCALE_KEY)).toBe('hi');
    expect(locale.value).toBe('hi');
  });

  it('never saves a stale choice over a newer one', async () => {
    const store = memoryStore();
    const first = selectLocale('en', store);
    const second = selectLocale('te', store);
    expect(await first).toBe(false);
    expect(await second).toBe(true);
    expect(store.data.get(LOCALE_KEY)).toBe('te');
    expect(locale.value).toBe('te');
  });
});
