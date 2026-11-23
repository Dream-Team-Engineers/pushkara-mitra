import { describe, expect, it } from 'vitest';
import {
  ACCENT_KEY,
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
    const store = memoryStore({ [LOCALE_KEY]: 'hi', [THEME_KEY]: 'outdoor', [ACCENT_KEY]: 'gold' });
    expect(readPreferences(store)).toEqual({ locale: 'hi', theme: 'outdoor', accent: 'gold' });
  });

  it('ignores unknown or tampered values', () => {
    const store = memoryStore({
      [LOCALE_KEY]: 'mr',
      [THEME_KEY]: '<script>',
      [ACCENT_KEY]: 'pink',
    });
    expect(readPreferences(store)).toEqual({ locale: null, theme: null, accent: null });
  });

  it('works without storage and when storage throws', () => {
    expect(readPreferences(undefined)).toEqual({ locale: null, theme: null, accent: null });
    const broken: PreferenceStore = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('full');
      },
    };
    expect(readPreferences(broken)).toEqual({ locale: null, theme: null, accent: null });
    expect(() => {
      writePreference(broken, THEME_KEY, 'dark');
    }).not.toThrow();
  });

  it('writes only the three allowed keys', () => {
    const store = memoryStore();
    writePreference(store, LOCALE_KEY, 'en');
    writePreference(store, THEME_KEY, 'dark');
    writePreference(store, ACCENT_KEY, 'blue');
    expect([...store.data.keys()].sort()).toEqual([ACCENT_KEY, LOCALE_KEY, THEME_KEY]);
  });
});
