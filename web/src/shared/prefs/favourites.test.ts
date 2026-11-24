import { describe, expect, it } from 'vitest';
import { favouritesFirst } from './favourites';
import {
  FAVOURITES_KEY,
  MAX_FAVOURITES,
  readFavourites,
  writeFavourites,
  type PreferenceStore,
} from './preferences';

function memoryStore(initial: Record<string, string> = {}): PreferenceStore {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
  };
}

describe('favourite ghats', () => {
  it('round-trips ids and keeps nothing but ids', () => {
    const store = memoryStore();
    writeFavourites(store, ['pushkar-ghat', 'g2']);
    expect(readFavourites(store)).toEqual(['pushkar-ghat', 'g2']);
  });

  it('ignores junk, tampered values, duplicates and over-long lists', () => {
    expect(readFavourites(undefined)).toEqual([]);
    expect(readFavourites(memoryStore({ [FAVOURITES_KEY]: 'not json' }))).toEqual([]);
    expect(readFavourites(memoryStore({ [FAVOURITES_KEY]: '{"a":1}' }))).toEqual([]);
    expect(
      readFavourites(memoryStore({ [FAVOURITES_KEY]: '["ok","BAD ID",3,"ok","<x>"]' })),
    ).toEqual(['ok']);
    const many = JSON.stringify(Array.from({ length: 80 }, (_, i) => `g${String(i)}`));
    expect(readFavourites(memoryStore({ [FAVOURITES_KEY]: many }))).toHaveLength(MAX_FAVOURITES);
  });

  it('survives a store that throws', () => {
    const broken: PreferenceStore = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('full');
      },
    };
    expect(readFavourites(broken)).toEqual([]);
    expect(() => {
      writeFavourites(broken, ['a']);
    }).not.toThrow();
  });

  it('lists favourites first and leaves the rest in order', () => {
    const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];
    expect(favouritesFirst(items, ['c', 'a']).map((i) => i.id)).toEqual(['a', 'c', 'b', 'd']);
    expect(favouritesFirst(items, [])).toBe(items);
  });
});
