import { effect, signal } from '@preact/signals';
import { deviceLocation, type LocationState } from '../location/deviceLocation';

/**
 * My Group client (ADR 0017). Talks to /api/v1/groups and to the group's live room over a WebSocket.
 *
 * Privacy rules:
 * - The device position is read from the in-memory `deviceLocation` signal and sent only while the
 *   person has switched `sharing` on, on this screen, to their own group's room. Never stored in the
 *   browser, never logged, never sent anywhere else.
 * - Members and positions received from the room live in memory and are cleared on disconnect.
 * - Sharing starts off every time; turning it off sends "stop" so the room forgets the position.
 */
export interface MemberPosition {
  readonly lat: number;
  readonly lng: number;
  readonly acc: number;
  readonly ageS: number;
}

export interface LiveMember {
  readonly id: string;
  readonly name: string;
  readonly role: 'owner' | 'member';
  readonly you: boolean;
  readonly pos: MemberPosition | null;
}

export interface MyGroup {
  readonly id: string;
  readonly name: string | null;
  readonly role: 'owner' | 'member';
  readonly memberCount: number;
  readonly expiresAt: string;
}

export type GroupLoad =
  | { readonly status: 'unavailable' }
  | { readonly status: 'signin' }
  | { readonly status: 'none' }
  | { readonly status: 'in'; readonly group: MyGroup };

export type LiveStatus = 'off' | 'connecting' | 'on' | 'lost';

const BASE = '/api/v1/groups';
const TIMEOUT_MS = 10_000;
export const SEND_INTERVAL_MS = 10_000;
const RECONNECT_MS = 5000;
const GROUP_ID = /^[a-z2-7]{26}$/;
export const GROUP_NOTICE_VERSION = 'group-1';

type Fetch = typeof fetch;
const defaultFetch: Fetch = (input, init) => fetch(input, init);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function send(request: Fetch, path: string, method: 'GET' | 'POST', body?: unknown) {
  return request(path, {
    method,
    credentials: 'same-origin',
    headers: {
      Accept: 'application/json',
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
}

/** The person's current group, or why there is none. 404/503 mean the feature is off or not set up. */
export async function loadGroup(request: Fetch = defaultFetch): Promise<GroupLoad> {
  const response = await send(request, BASE, 'GET');
  if (response.status === 404 || response.status === 503) return { status: 'unavailable' };
  if (response.status === 401) return { status: 'signin' };
  if (response.status !== 200) throw new Error(`Groups failed: ${String(response.status)}`);
  const body: unknown = await response.json();
  const list = isRecord(body) ? body['groups'] : undefined;
  if (!Array.isArray(list)) throw new Error('Groups do not match their contract');
  const active = list.find(
    (row): row is Record<string, unknown> =>
      isRecord(row) && row['state'] === 'active' && typeof row['id'] === 'string',
  );
  if (active === undefined) return { status: 'none' };
  const { id, name, role, memberCount, expiresAt } = active;
  if (
    (name !== null && name !== undefined && typeof name !== 'string') ||
    typeof id !== 'string' ||
    !GROUP_ID.test(id) ||
    (role !== 'owner' && role !== 'member') ||
    typeof memberCount !== 'number' ||
    typeof expiresAt !== 'string'
  ) {
    throw new Error('Groups do not match their contract');
  }
  return {
    status: 'in',
    group: { id, name: typeof name === 'string' ? name : null, role, memberCount, expiresAt },
  };
}

const CODE = /^[A-HJKMNP-Z2-9]{8}$/;

/** Group names: up to 16 letters or digits (any script) and single spaces; the server checks too. */
export const GROUP_NAME_MAX = 16;
const GROUP_NAME = /^[\p{L}\p{M}\p{N}]+(?: [\p{L}\p{M}\p{N}]+)*$/u;

/** Characters as SQLite's length() counts them (Unicode code points). */
function codePoints(text: string): number {
  let count = 0;
  for (const char of text) if (char !== '') count++;
  return count;
}

/** The cleaned name, '' for none, or null when it is not allowed. */
export function cleanGroupName(raw: string): string | null {
  const name = raw.normalize('NFC').trim().replaceAll(/\s+/g, ' ');
  if (name === '') return '';
  return codePoints(name) <= GROUP_NAME_MAX && GROUP_NAME.test(name) ? name : null;
}

/** Creates a group. The join code is shown once; the server keeps only its hash. */
export async function createGroup(
  name = '',
  request: Fetch = defaultFetch,
): Promise<{ id: string; joinCode: string } | null> {
  const clean = cleanGroupName(name);
  if (clean === null) return null;
  const response = await send(request, BASE, 'POST', clean === '' ? {} : { name: clean });
  if (response.status !== 201) return null;
  const body: unknown = await response.json();
  if (!isRecord(body)) return null;
  const { id, joinCode } = body;
  return typeof id === 'string' && typeof joinCode === 'string' && CODE.test(joinCode)
    ? { id, joinCode }
    : null;
}

export type JoinOutcome = 'joined' | 'invalid' | 'already' | 'full' | 'error';

/** The error code in the fixed error envelope, or null. */
async function errorCode(response: Response): Promise<string | null> {
  try {
    const body: unknown = await response.json();
    const error = isRecord(body) ? body['error'] : undefined;
    const code = isRecord(error) ? error['code'] : undefined;
    return typeof code === 'string' ? code : null;
  } catch {
    return null;
  }
}

export async function joinGroup(code: string, request: Fetch = defaultFetch): Promise<JoinOutcome> {
  const clean = code.toUpperCase().replaceAll(/[\s-]/g, '');
  if (!CODE.test(clean)) return 'invalid';
  const response = await send(request, `${BASE}/join`, 'POST', { code: clean });
  if (response.status === 200) return 'joined';
  if (response.status === 409) {
    return (await errorCode(response)) === 'GROUP_FULL' ? 'full' : 'already';
  }
  if (response.status === 400) return 'invalid';
  return 'error';
}

/** A fresh join code (owner only). Null when not allowed or unavailable. */
export async function newInviteCode(
  groupId: string,
  request: Fetch = defaultFetch,
): Promise<string | null> {
  const response = await send(request, `${BASE}/${groupId}/invite`, 'POST', {});
  if (response.status !== 201) return null;
  const body: unknown = await response.json();
  const code = isRecord(body) ? body['joinCode'] : undefined;
  return typeof code === 'string' && CODE.test(code) ? code : null;
}

export async function leaveGroup(groupId: string, request: Fetch = defaultFetch): Promise<boolean> {
  const response = await send(request, `${BASE}/${groupId}/leave`, 'POST', {});
  return response.status === 204;
}

const HANDLE = /^[a-f0-9]{16}$/;

/** The owner removes a member, named by the handle the live room shows. True when removed. */
export async function removeMember(
  groupId: string,
  handle: string,
  request: Fetch = defaultFetch,
): Promise<boolean> {
  if (!HANDLE.test(handle)) return false;
  const response = await send(request, `${BASE}/${groupId}/remove`, 'POST', { member: handle });
  return response.status === 204;
}

/** Records the person's agreement to share their position with the group (append-only record). */
export async function recordGroupConsent(
  locale: 'te' | 'en' | 'hi',
  request: Fetch = defaultFetch,
): Promise<boolean> {
  const response = await send(request, '/api/v1/me/consents', 'POST', {
    purposeId: 'group',
    noticeVersion: GROUP_NOTICE_VERSION,
    locale,
    decision: 'granted',
  });
  return response.status === 201;
}

/** Parses one room message. Null for anything that does not match the contract exactly. */
export function parseRoomState(raw: unknown): readonly LiveMember[] | null {
  if (typeof raw !== 'string') return null;
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(body) || body['t'] !== 'state' || !Array.isArray(body['members'])) return null;
  const members: LiveMember[] = [];
  for (const row of body['members']) {
    if (!isRecord(row)) return null;
    const { id, name, you, pos } = row;
    if (typeof id !== 'string' || typeof name !== 'string' || typeof you !== 'boolean') return null;
    const role = row['role'] === 'owner' ? 'owner' : 'member';
    if (pos === null) {
      members.push({ id, name, role, you, pos: null });
      continue;
    }
    if (!isRecord(pos)) return null;
    const { lat, lng, acc, ageS } = pos;
    if (
      typeof lat !== 'number' ||
      typeof lng !== 'number' ||
      typeof acc !== 'number' ||
      typeof ageS !== 'number'
    ) {
      return null;
    }
    members.push({ id, name, role, you, pos: { lat, lng, acc, ageS } });
  }
  return members;
}

/** The message to send for a location state, or null when there is nothing to share. */
export function positionMessage(state: LocationState): string | null {
  if (state.status !== 'on') return null;
  const { lat, lng, accuracyM } = state.position;
  return JSON.stringify({ t: 'pos', lat, lng, acc: Math.max(1, Math.round(accuracyM)) });
}

/** Straight-line distance in metres (haversine). */
export function distanceM(
  a: { readonly lat: number; readonly lng: number },
  b: { readonly lat: number; readonly lng: number },
): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(h));
}

export const liveMembers = signal<readonly LiveMember[]>([]);
export const liveStatus = signal<LiveStatus>('off');
/** Why the room closed this person's connection: they left, or the owner removed them. */
export const liveEnded = signal<'left' | 'removed' | null>(null);
/** Off every time the screen opens; only a tap by the person turns it on. */
export const sharing = signal(false);

let socket: WebSocket | null = null;
let wanted: string | null = null;
let retry: ReturnType<typeof setTimeout> | null = null;
let heartbeat: ReturnType<typeof setInterval> | null = null;
let stopEffect: (() => void) | null = null;
let lastSent = 0;

function sendPosition(force: boolean): void {
  if (socket?.readyState !== WebSocket.OPEN || !sharing.value) return;
  const message = positionMessage(deviceLocation.value);
  if (message === null) return;
  const now = Date.now();
  if (!force && now - lastSent < SEND_INTERVAL_MS) return;
  lastSent = now;
  socket.send(message);
}

function open(groupId: string): void {
  liveStatus.value = 'connecting';
  const scheme = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const ws = new WebSocket(`${scheme}//${location.host}${BASE}/${groupId}/live`);
  socket = ws;
  ws.addEventListener('open', () => {
    liveStatus.value = 'on';
    lastSent = 0;
    sendPosition(true);
  });
  ws.addEventListener('message', (event) => {
    const members = parseRoomState(event.data);
    if (members !== null) liveMembers.value = members;
  });
  ws.addEventListener('close', (event) => {
    if (socket !== ws) return;
    socket = null;
    liveMembers.value = [];
    // 4001: this person left the group; 4002: the owner removed them. Otherwise reconnect while
    // the screen still wants it.
    if (event.code === 4001 || event.code === 4002) {
      liveEnded.value = event.code === 4002 ? 'removed' : 'left';
      wanted = null;
      sharing.value = false;
      liveStatus.value = 'off';
      return;
    }
    if (wanted === null) {
      liveStatus.value = 'off';
      return;
    }
    liveStatus.value = 'lost';
    retry = setTimeout(() => {
      retry = null;
      if (wanted !== null) open(wanted);
    }, RECONNECT_MS);
  });
}

/** Joins the live room while the Group screen is open. Safe to call again. */
export function connectLive(groupId: string): void {
  if (!GROUP_ID.test(groupId) || wanted === groupId) return;
  disconnectLive();
  liveEnded.value = null;
  wanted = groupId;
  open(groupId);
  stopEffect = effect(() => {
    const on = sharing.value;
    const state = deviceLocation.value;
    if (!on || state.status !== 'on') return;
    sendPosition(false);
  });
  heartbeat = setInterval(() => {
    if (document.visibilityState === 'visible') sendPosition(true);
  }, SEND_INTERVAL_MS * 3);
}

/** Turns sharing on after the person's tap and sends the position as soon as there is one. */
export function startSharing(): void {
  sharing.value = true;
  lastSent = 0;
  sendPosition(true);
}

/** Turns sharing off and tells the room to forget this person's position. */
export function stopSharing(): void {
  sharing.value = false;
  if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ t: 'stop' }));
}

/** Leaves the live room: called when the screen closes. Positions are dropped on both sides. */
export function disconnectLive(): void {
  wanted = null;
  sharing.value = false;
  stopEffect?.();
  stopEffect = null;
  if (retry !== null) clearTimeout(retry);
  if (heartbeat !== null) clearInterval(heartbeat);
  retry = null;
  heartbeat = null;
  const ws = socket;
  socket = null;
  ws?.close(1000, 'closed');
  liveMembers.value = [];
  liveStatus.value = 'off';
}
