import { describe, expect, it } from 'vitest';
import {
  LOCALE_KEY,
  readPreferences,
  THEME_KEY,
  writePreference,
  type PreferenceStore,
} from './preferences';

function memoryStore(initial: Record<string, string> = {}): PreferenceStore & {
  data: Map<string, string>;
} {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
  };
}

describe('preferences', () => {
  it('reads valid values', () => {
    const store = memoryStore({ [LOCALE_KEY]: 'hi', [THEME_KEY]: 'outdoor' });
    expect(readPreferences(store)).toEqual({ locale: 'hi', theme: 'outdoor' });
  });

  it('ignores unknown or tampered values', () => {
    const store = memoryStore({ [LOCALE_KEY]: 'mr', [THEME_KEY]: '<script>' });
    expect(readPreferences(store)).toEqual({ locale: null, theme: null });
  });

  it('works without storage and when storage throws', () => {
    expect(readPreferences(undefined)).toEqual({ locale: null, theme: null });
    const broken: PreferenceStore = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('full');
      },
    };
    expect(readPreferences(broken)).toEqual({ locale: null, theme: null });
    expect(() => {
      writePreference(broken, THEME_KEY, 'dark');
    }).not.toThrow();
  });

  it('writes only the two allowed keys', () => {
    const store = memoryStore();
    writePreference(store, LOCALE_KEY, 'en');
    writePreference(store, THEME_KEY, 'dark');
    expect([...store.data.keys()].sort()).toEqual([LOCALE_KEY, THEME_KEY]);
  });
});
