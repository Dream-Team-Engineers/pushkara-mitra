/**
 * The group's join code, remembered on this phone only (owner decision 2026-11-23, data inventory
 * DI-18). The server keeps only a hash of each code, so it cannot show a code again; the phone that
 * created a code, or used it to join, keeps it until the code expires so the person can copy it.
 *
 * One entry at most, for the current group. Cleared on leave and on removal. Values are validated on
 * read and every storage failure is ignored: without storage the code is simply not shown again.
 * tests/guards/frontend-privacy.test.ts allows browser storage in this file and preferences.ts only.
 */
const KEY = 'pm.groupCode';
const CODE = /^[A-HJKMNP-Z2-9]{8}$/;
const GROUP_ID = /^[a-z2-7]{26}$/;
/** Join codes work for 24 hours (src/routes/v1.ts INVITE_LIFETIME_SECONDS). */
export const CODE_LIFETIME_MS = 24 * 60 * 60 * 1000;

export interface CodeStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function browserStore(): CodeStore | undefined {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage;
  } catch {
    return undefined;
  }
}

/** The saved code for this group, or null when none, expired, for another group or unreadable. */
export function readSavedCode(
  groupId: string,
  now = Date.now(),
  store: CodeStore | undefined = browserStore(),
): string | null {
  try {
    const raw = store?.getItem(KEY) ?? null;
    if (raw === null) return null;
    const value: unknown = JSON.parse(raw);
    if (typeof value !== 'object' || value === null) return null;
    const { g, c, x } = value as Record<string, unknown>;
    if (g !== groupId || typeof c !== 'string' || !CODE.test(c) || typeof x !== 'number') {
      return null;
    }
    if (x <= now) {
      store?.removeItem(KEY);
      return null;
    }
    return c;
  } catch {
    return null;
  }
}

export function saveCode(
  groupId: string,
  code: string,
  now = Date.now(),
  store: CodeStore | undefined = browserStore(),
): void {
  if (!GROUP_ID.test(groupId) || !CODE.test(code)) return;
  try {
    store?.setItem(KEY, JSON.stringify({ g: groupId, c: code, x: now + CODE_LIFETIME_MS }));
  } catch {
    // Storage full or blocked: the code is not shown again, nothing else changes.
  }
}

export function forgetCode(store: CodeStore | undefined = browserStore()): void {
  try {
    store?.removeItem(KEY);
  } catch {
    // Nothing to do.
  }
}
