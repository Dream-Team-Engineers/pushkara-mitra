import { describe, expect, it } from 'vitest';
import { CODE_LIFETIME_MS, forgetCode, readSavedCode, saveCode, type CodeStore } from './savedCode';

const GROUP = 'abcdefghijklmnopqrstuvwxyz';
const OTHER = 'bbcdefghijklmnopqrstuvwxyz';

function memoryStore(): CodeStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
    removeItem: (key) => {
      data.delete(key);
    },
  };
}

describe('saved join code', () => {
  it('keeps one valid code for its own group until it expires', () => {
    const store = memoryStore();
    saveCode(GROUP, 'ABCD2345', 1000, store);
    expect(readSavedCode(GROUP, 2000, store)).toBe('ABCD2345');
    expect(readSavedCode(OTHER, 2000, store)).toBeNull();
    expect(readSavedCode(GROUP, 1000 + CODE_LIFETIME_MS, store)).toBeNull();
    expect(store.data.size).toBe(0);
  });

  it('ignores bad codes and bad stored values, and forgets on request', () => {
    const store = memoryStore();
    saveCode(GROUP, 'not-a-code', 1000, store);
    expect(store.data.size).toBe(0);
    store.data.set('pm.groupCode', '{"g":"x"');
    expect(readSavedCode(GROUP, 1000, store)).toBeNull();
    saveCode(GROUP, 'ABCD2345', 1000, store);
    forgetCode(store);
    expect(readSavedCode(GROUP, 1000, store)).toBeNull();
  });

  it('never throws when storage is missing or blocked', () => {
    const blocked: CodeStore = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
      removeItem: () => {
        throw new Error('blocked');
      },
    };
    expect(() => {
      saveCode(GROUP, 'ABCD2345', 1000, blocked);
      forgetCode(blocked);
    }).not.toThrow();
    expect(readSavedCode(GROUP, 1000, blocked)).toBeNull();
    expect(readSavedCode(GROUP, 1000, undefined)).toBeNull();
  });
});
