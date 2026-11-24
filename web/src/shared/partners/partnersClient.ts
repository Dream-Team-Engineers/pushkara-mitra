import { createResource } from '../data/resource';

/**
 * Partners client (ADR 0019). Talks to /api/v1/partners. Fixed choices only: no free text, no photo,
 * no contact detail and no position is ever sent. Nothing is stored in the browser. The pilgrim read
 * of volunteer updates is public and carries no partner identity.
 */
export type PartnerKind = 'crowd' | 'river' | 'food';
export type PartnerRole = 'priest' | 'volunteer';

/** Values a partner may report, by kind. Must match the Worker (src/routes/partners.ts). */
export const UPDATE_VALUES: Readonly<Record<PartnerKind, readonly string[]>> = {
  crowd: ['low', 'moderate', 'high'],
  river: ['normal', 'rising', 'high'],
  food: ['available', 'finished'],
};
export const PARTNER_KINDS: readonly PartnerKind[] = ['crowd', 'river', 'food'];
export const PARTNER_NOTICE_VERSION = 'partner-1';

export interface VolunteerUpdate {
  readonly kind: PartnerKind;
  readonly ghatId: string;
  readonly value: string;
  readonly reportedAt: string;
}

export interface VolunteerUpdates {
  readonly updates: readonly VolunteerUpdate[];
  readonly shownForSeconds: number;
}

export type PartnerMe =
  | { readonly status: 'unavailable' }
  | { readonly status: 'signin' }
  | { readonly status: 'none' | 'pending' | 'rejected' | 'suspended' }
  | {
      readonly status: 'approved';
      readonly role: PartnerRole;
      readonly ghatId: string | null;
      readonly available: boolean;
      readonly availableUntil: string | null;
      readonly unread: number;
    };

export interface Nudge {
  readonly id: string;
  readonly kind: PartnerKind;
  readonly ghatId: string | null;
  readonly createdAt: string;
  readonly read: boolean;
}

export type PartnerResult = 'ok' | 'unavailable' | 'signin' | 'refused' | 'limited' | 'failed';

const BASE = '/api/v1/partners';
const TIMEOUT_MS = 10_000;
const MINUTE = 60_000;
const GHAT_ID = /^[a-z0-9][a-z0-9/-]{0,63}$/;

type Fetch = typeof fetch;
const defaultFetch: Fetch = (input, init) => fetch(input, init);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isKind(value: unknown): value is PartnerKind {
  return typeof value === 'string' && (PARTNER_KINDS as readonly string[]).includes(value);
}

function send(request: Fetch, path: string, method: 'GET' | 'POST', body?: unknown) {
  return request(`${BASE}${path}`, {
    method,
    credentials: 'same-origin',
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
}

function resultFor(status: number): PartnerResult {
  if (status === 404 || status === 503) return 'unavailable';
  if (status === 401) return 'signin';
  if (status === 429) return 'limited';
  if (status === 403 || status === 409 || status === 400) return 'refused';
  return 'failed';
}

/** Pilgrim read: the latest volunteer updates, only those under `shownForSeconds` old. Null when off. */
export async function fetchVolunteerUpdates(
  request: Fetch = defaultFetch,
  nowMs: number = Date.now(),
): Promise<VolunteerUpdates | null> {
  const response = await request(`${BASE}/updates`, {
    method: 'GET',
    credentials: 'omit',
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (response.status === 404 || response.status === 503) return null;
  if (response.status !== 200)
    throw new Error(`Partner updates failed: ${String(response.status)}`);
  const body: unknown = await response.json();
  const shown = isRecord(body) ? body['shownForSeconds'] : undefined;
  const list = isRecord(body) ? body['updates'] : undefined;
  if (typeof shown !== 'number' || !Number.isFinite(shown) || !Array.isArray(list)) {
    throw new Error('Partner updates do not match their contract');
  }
  const updates: VolunteerUpdate[] = [];
  for (const row of list) {
    if (!isRecord(row)) throw new Error('Partner updates do not match their contract');
    const { kind, ghatId, value, reportedAt } = row;
    if (
      !isKind(kind) ||
      typeof ghatId !== 'string' ||
      !GHAT_ID.test(ghatId) ||
      typeof value !== 'string' ||
      !UPDATE_VALUES[kind].includes(value) ||
      typeof reportedAt !== 'string' ||
      Number.isNaN(Date.parse(reportedAt))
    ) {
      throw new Error('Partner updates do not match their contract');
    }
    // Checked again here so a page left open never shows an old report as current.
    if (nowMs - Date.parse(reportedAt) > shown * 1000) continue;
    updates.push({ kind, ghatId, value, reportedAt });
  }
  return { updates, shownForSeconds: shown };
}

export const volunteerUpdatesResource = createResource(fetchVolunteerUpdates, 10 * MINUTE);

/** The signed-in person's own partner status. Never contains their name or email. */
export async function loadMe(request: Fetch = defaultFetch): Promise<PartnerMe> {
  const response = await send(request, '/me', 'GET');
  if (response.status === 404 || response.status === 503) return { status: 'unavailable' };
  if (response.status === 401) return { status: 'signin' };
  if (response.status !== 200) throw new Error(`Partner status failed: ${String(response.status)}`);
  const body: unknown = await response.json();
  if (!isRecord(body)) throw new Error('Partner status does not match its contract');
  const { status } = body;
  if (
    status === 'none' ||
    status === 'pending' ||
    status === 'rejected' ||
    status === 'suspended'
  ) {
    return { status };
  }
  const { role, ghatId, available, availableUntil, unread } = body;
  if (
    status !== 'approved' ||
    (role !== 'priest' && role !== 'volunteer') ||
    (ghatId !== null && typeof ghatId !== 'string') ||
    typeof available !== 'boolean' ||
    (availableUntil !== null && typeof availableUntil !== 'string') ||
    typeof unread !== 'number'
  ) {
    throw new Error('Partner status does not match its contract');
  }
  return { status, role, ghatId, available, availableUntil, unread };
}

/** Sends the application. `credential` is a fresh Google token; the server takes name and email from it. */
export async function applyAsPartner(
  input: {
    readonly credential: string;
    readonly role: PartnerRole;
    readonly ghatId: string | null;
    readonly locale: 'te' | 'en' | 'hi';
  },
  request: Fetch = defaultFetch,
): Promise<PartnerResult> {
  const response = await send(request, '/apply', 'POST', { ...input, consent: true });
  return response.status === 201 ? 'ok' : resultFor(response.status);
}

export async function setAvailable(
  available: boolean,
  request: Fetch = defaultFetch,
): Promise<PartnerResult> {
  const response = await send(request, '/availability', 'POST', { available });
  return response.status === 200 ? 'ok' : resultFor(response.status);
}

export async function loadInbox(request: Fetch = defaultFetch): Promise<readonly Nudge[]> {
  const response = await send(request, '/inbox', 'GET');
  if (response.status !== 200) throw new Error(`Inbox failed: ${String(response.status)}`);
  const body: unknown = await response.json();
  const list = isRecord(body) ? body['nudges'] : undefined;
  if (!Array.isArray(list)) throw new Error('Inbox does not match its contract');
  return list.map((row): Nudge => {
    if (!isRecord(row)) throw new Error('Inbox does not match its contract');
    const { id, kind, ghatId, createdAt, read } = row;
    if (
      typeof id !== 'string' ||
      !isKind(kind) ||
      (ghatId !== null && typeof ghatId !== 'string') ||
      typeof createdAt !== 'string' ||
      typeof read !== 'boolean'
    ) {
      throw new Error('Inbox does not match its contract');
    }
    return { id, kind, ghatId, createdAt, read };
  });
}

export async function markInboxRead(request: Fetch = defaultFetch): Promise<PartnerResult> {
  const response = await send(request, '/inbox/read', 'POST', {});
  return response.status === 204 ? 'ok' : resultFor(response.status);
}

export async function postVolunteerUpdate(
  input: { readonly kind: PartnerKind; readonly ghatId: string; readonly value: string },
  request: Fetch = defaultFetch,
): Promise<PartnerResult> {
  const response = await send(request, '/updates', 'POST', input);
  return response.status === 201 ? 'ok' : resultFor(response.status);
}

/** Whole minutes since `iso`, never negative. */
export function ageMinutes(iso: string, nowMs: number = Date.now()): number {
  return Math.max(0, Math.floor((nowMs - Date.parse(iso)) / MINUTE));
}
