import { env } from 'cloudflare:test';
import { beforeAll, describe, expect, it } from 'vitest';
import migration from '../../migrations/0002_backend_core.sql?raw';
import { sha256Hex } from '../../src/db/ids';
import { d1Repository } from '../../src/db/repository';
import { parseMessage } from '../../src/durable-objects/GroupLocation';
import worker, { type Env } from '../../src/index';
import { createSessionToken, pseudonymFor, SESSION_COOKIE } from '../../src/security/session';

/** Live group room (ADR 0017): access checks, sharing, stop, leave. Synthetic people only. */
const SECRET = 'test-secret-value-that-is-long-enough-0123456789';
const bindings = env as unknown as { DB: D1Database; GROUP_LOCATION: DurableObjectNamespace };
const DB = bindings.DB;
const ORIGIN = 'https://example.test';

const ENABLED: Env = {
  DB,
  SESSION_SECRET: SECRET,
  FLAG_GROUPS: 'enabled',
  FLAG_GROUP_LOCATION: 'enabled',
  GROUP_LOCATION: bindings.GROUP_LOCATION,
};

let counter = 0;
const uniqueIp = () => `198.51.${String(Math.floor(counter / 250))}.${String(++counter % 250)}`;

function call(path: string, init: RequestInit = {}, e: Env = ENABLED): Promise<Response> {
  const headers = new Headers(init.headers);
  if (!headers.has('CF-Connecting-IP')) headers.set('CF-Connecting-IP', uniqueIp());
  return worker.fetch(new Request(`${ORIGIN}${path}`, { ...init, headers }), e);
}

function post(path: string, body: unknown, cookie: string): Promise<Response> {
  return call(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: ORIGIN, Cookie: cookie },
    body: JSON.stringify(body),
  });
}

function upgrade(
  groupId: string,
  cookie: string,
  e: Env = ENABLED,
  extra: Record<string, string> = {},
): Promise<Response> {
  return call(
    `/api/v1/groups/${groupId}/live`,
    { headers: { Upgrade: 'websocket', Origin: ORIGIN, Cookie: cookie, ...extra } },
    e,
  );
}

async function signIn(sub: string, name: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const sid = `sid-${sub}-${crypto.randomUUID()}`;
  await d1Repository(DB).createSession({
    idHash: await sha256Hex(sid),
    subjectRef: await pseudonymFor(sub, SECRET),
    createdAt: new Date(now * 1000).toISOString(),
    expiresAt: new Date((now + 3600) * 1000).toISOString(),
  });
  const token = await createSessionToken({ sub, name }, SECRET, now, sid);
  return `${SESSION_COOKIE}=${token}`;
}

interface Row {
  id: string;
  name: string;
  you: boolean;
  pos: { lat: number; lng: number; acc: number; ageS: number } | null;
}

/** Collects room messages so a test can wait for the first state that matches. */
function listen(socket: WebSocket) {
  const states: Row[][] = [];
  const waiters: { check: (rows: Row[]) => boolean; resolve: (rows: Row[]) => void }[] = [];
  let closed = false;
  socket.addEventListener('message', (event) => {
    const body = JSON.parse(String(event.data)) as { t: string; members: Row[] };
    states.push(body.members);
    for (const waiter of [...waiters]) {
      if (waiter.check(body.members)) {
        waiters.splice(waiters.indexOf(waiter), 1);
        waiter.resolve(body.members);
      }
    }
  });
  socket.addEventListener('close', () => {
    closed = true;
  });
  return {
    next: (check: (rows: Row[]) => boolean) =>
      new Promise<Row[]>((resolve, reject) => {
        const found = states.find(check);
        if (found !== undefined) {
          resolve(found);
          return;
        }
        waiters.push({ check, resolve });
        setTimeout(() => {
          reject(new Error('no matching room state'));
        }, 3000);
      }),
    isClosed: () => closed,
  };
}

async function connect(groupId: string, cookie: string) {
  const response = await upgrade(groupId, cookie);
  expect(response.status).toBe(101);
  const socket = response.webSocket;
  if (socket === null) throw new Error('no socket');
  socket.accept();
  return { socket, room: listen(socket) };
}

async function createGroup(cookie: string): Promise<{ id: string; joinCode: string }> {
  const response = await post('/api/v1/groups', {}, cookie);
  expect(response.status).toBe(201);
  return response.json();
}

beforeAll(async () => {
  for (const statement of migration.split(/;\s*\n\s*\n/)) {
    const sql = statement.replaceAll(/^--.*$/gm, '').trim();
    if (sql === '') continue;
    try {
      await DB.prepare(sql).run();
    } catch (error) {
      if (!String(error).includes('already exists')) throw error;
    }
  }
});

describe('live room access', () => {
  it('is off unless FLAG_GROUP_LOCATION is exactly "enabled"', async () => {
    const cookie = await signIn('owner-flag', 'Asha Rao');
    const group = await createGroup(cookie);
    for (const value of [undefined, '', 'true', 'ENABLED']) {
      const e: Env = { ...ENABLED };
      delete e.FLAG_GROUP_LOCATION;
      if (value !== undefined) e.FLAG_GROUP_LOCATION = value;
      expect((await upgrade(group.id, cookie, e)).status).toBe(404);
    }
  });

  it('needs a WebSocket upgrade, the same origin, sign-in and membership', async () => {
    const cookie = await signIn('owner-access', 'Asha Rao');
    const group = await createGroup(cookie);
    const plain = await call(`/api/v1/groups/${group.id}/live`, {
      headers: { Origin: ORIGIN, Cookie: cookie },
    });
    expect(plain.status).toBe(426);
    expect((await upgrade(group.id, cookie, ENABLED, { Origin: 'https://evil.test' })).status).toBe(
      403,
    );
    expect((await upgrade(group.id, '')).status).toBe(401);
    const stranger = await signIn('stranger', 'Ravi K');
    expect((await upgrade(group.id, stranger)).status).toBe(404);
    expect((await upgrade('a'.repeat(26), cookie)).status).toBe(404);
  });

  it('answers 503 without the room binding and never pretends to connect', async () => {
    const cookie = await signIn('owner-nobinding', 'Asha Rao');
    const group = await createGroup(cookie);
    const e: Env = { ...ENABLED };
    delete e.GROUP_LOCATION;
    expect((await upgrade(group.id, cookie, e)).status).toBe(503);
  });
});

describe('live room sharing', () => {
  it('shows members by first name, shares a rounded position, ignores bad input and stops', async () => {
    const ownerCookie = await signIn('owner-share', 'Asha Rao');
    const memberCookie = await signIn('member-share', 'Ravi Kumar');
    const group = await createGroup(ownerCookie);
    const joined = await post('/api/v1/groups/join', { code: group.joinCode }, memberCookie);
    expect(joined.status).toBe(200);

    const owner = await connect(group.id, ownerCookie);
    const first = await owner.room.next((rows) => rows.length === 1);
    expect(first[0]).toMatchObject({ name: 'Asha', you: true, pos: null });

    const member = await connect(group.id, memberCookie);
    await owner.room.next((rows) => rows.length === 2);

    member.socket.send('not json');
    member.socket.send(JSON.stringify({ t: 'pos', lat: 200, lng: 81.7, acc: 10 }));
    member.socket.send(JSON.stringify({ t: 'pos', lat: 17.0084123, lng: 81.7669456, acc: 12.4 }));
    const shared = await owner.room.next((rows) =>
      rows.some((row) => row.name === 'Ravi' && row.pos !== null),
    );
    const ravi = shared.find((row) => row.name === 'Ravi');
    expect(ravi?.you).toBe(false);
    expect(ravi?.pos).toMatchObject({ lat: 17.00841, lng: 81.76695, acc: 12 });
    expect(ravi?.id).toMatch(/^[a-f0-9]{16}$/);

    member.socket.send(JSON.stringify({ t: 'stop' }));
    await owner.room.next((rows) =>
      rows.some((row) => row.name === 'Ravi' && row.pos === null && rows.length === 2),
    );

    member.socket.close(1000, 'done');
    await owner.room.next((rows) => rows.length === 1);
    owner.socket.close(1000, 'done');
  });

  it('closes the connection of a member who leaves the group', async () => {
    const ownerCookie = await signIn('owner-leave', 'Asha Rao');
    const memberCookie = await signIn('member-leave', 'Ravi Kumar');
    const group = await createGroup(ownerCookie);
    await post('/api/v1/groups/join', { code: group.joinCode }, memberCookie);

    const owner = await connect(group.id, ownerCookie);
    const member = await connect(group.id, memberCookie);
    await owner.room.next((rows) => rows.length === 2);

    const left = await post(`/api/v1/groups/${group.id}/leave`, {}, memberCookie);
    expect(left.status).toBe(204);
    await owner.room.next((rows) => rows.length === 1 && rows[0]?.name === 'Asha');
    expect((await upgrade(group.id, memberCookie)).status).toBe(404);
    owner.socket.close(1000, 'done');
    expect(member.room.isClosed() || member.socket.readyState !== WebSocket.OPEN).toBe(true);
  });
});

describe('room message parser', () => {
  it('accepts only exact position and stop messages within range', () => {
    expect(parseMessage('{"t":"stop"}')).toEqual({ t: 'stop' });
    expect(parseMessage('{"t":"pos","lat":17.1,"lng":81.7,"acc":5}')).toEqual({
      t: 'pos',
      lat: 17.1,
      lng: 81.7,
      acc: 5,
    });
    for (const bad of [
      '{"t":"stop","x":1}',
      '{"t":"pos","lat":17.1,"lng":81.7}',
      '{"t":"pos","lat":91,"lng":81.7,"acc":5}',
      '{"t":"pos","lat":17.1,"lng":181,"acc":5}',
      '{"t":"pos","lat":17.1,"lng":81.7,"acc":0}',
      '{"t":"pos","lat":17.1,"lng":81.7,"acc":5,"name":"x"}',
      '{"t":"pos","lat":"17","lng":81.7,"acc":5}',
      '[1]',
      'x'.repeat(201),
      42,
    ]) {
      expect(parseMessage(bad)).toBeNull();
    }
  });
});
