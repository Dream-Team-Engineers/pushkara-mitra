import { env } from 'cloudflare:test';
import { beforeAll, describe, expect, it } from 'vitest';
import core from '../../migrations/0002_backend_core.sql?raw';
import groupName from '../../migrations/0004_group_name.sql?raw';
import groupBlock from '../../migrations/0005_group_block.sql?raw';
import partnersMigration from '../../migrations/0007_partners.sql?raw';
import memberName from '../../migrations/0009_member_name.sql?raw';
import { sha256Hex } from '../../src/db/ids';
import { d1Repository } from '../../src/db/repository';
import { parseMessage } from '../../src/durable-objects/GroupLocation';
import { cleanGroupName } from '../../src/routes/v1';
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
  role: 'owner' | 'member';
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
  const migration = [core, groupName, groupBlock, partnersMigration, memberName].join('\n\n');
  for (const statement of migration.split(/;\s*\n\s*\n/)) {
    const sql = statement.replaceAll(/^--.*$/gm, '').trim();
    if (sql === '') continue;
    try {
      await DB.prepare(sql).run();
    } catch (error) {
      const text = String(error);
      if (!text.includes('already exists') && !text.includes('duplicate column')) throw error;
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
    expect(first[0]).toMatchObject({ name: 'Asha', role: 'owner', you: true, pos: null });

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
    expect(ravi?.role).toBe('member');
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

describe('member limit and removal', () => {
  it('refuses the eleventh person and does not spend a code use for them', async () => {
    const ownerCookie = await signIn('owner-full', 'Asha Rao');
    const group = await createGroup(ownerCookie);
    for (let i = 1; i < 10; i++) {
      const cookie = await signIn(`member-full-${String(i)}`, 'Ravi');
      expect((await post('/api/v1/groups/join', { code: group.joinCode }, cookie)).status).toBe(
        200,
      );
    }
    const late = await signIn('member-full-late', 'Late');
    const refused = await post('/api/v1/groups/join', { code: group.joinCode }, late);
    expect(refused.status).toBe(409);
    expect(await refused.json()).toMatchObject({ error: { code: 'GROUP_FULL' } });
    const rows = await DB.prepare('SELECT uses_left FROM invitation WHERE group_id = ?')
      .bind(group.id)
      .all<{ uses_left: number }>();
    expect(rows.results[0]?.uses_left).toBe(10_000 - 9);
  });

  it('lets only the owner remove a member, closes their connection and blocks their return', async () => {
    const ownerCookie = await signIn('owner-remove', 'Asha Rao');
    const memberCookie = await signIn('member-remove', 'Ravi Kumar');
    const otherCookie = await signIn('other-remove', 'Sita Devi');
    const group = await createGroup(ownerCookie);
    await post('/api/v1/groups/join', { code: group.joinCode }, memberCookie);
    await post('/api/v1/groups/join', { code: group.joinCode }, otherCookie);

    const owner = await connect(group.id, ownerCookie);
    const member = await connect(group.id, memberCookie);
    const closed = new Promise<number>((resolve) => {
      member.socket.addEventListener('close', (event) => {
        resolve(event.code);
      });
    });
    const rows = await owner.room.next((list) => list.length === 2);
    const ravi = rows.find((row) => row.name === 'Ravi');
    const asha = rows.find((row) => row.you);
    if (ravi === undefined || asha === undefined) throw new Error('rows missing');
    const path = `/api/v1/groups/${group.id}/remove`;

    // A member cannot remove anyone; nobody can remove the owner; bad bodies are refused.
    expect((await post(path, { member: ravi.id }, otherCookie)).status).toBe(404);
    expect((await post(path, { member: asha.id }, ownerCookie)).status).toBe(404);
    expect((await post(path, { member: 'nothex' }, ownerCookie)).status).toBe(400);
    expect((await post(path, { member: ravi.id, x: 1 }, ownerCookie)).status).toBe(400);
    expect((await post(path, { member: 'f'.repeat(16) }, ownerCookie)).status).toBe(404);

    expect((await post(path, { member: ravi.id }, ownerCookie)).status).toBe(204);
    expect(await closed).toBe(4002);
    await owner.room.next((list) => list.length === 1);
    expect((await upgrade(group.id, memberCookie)).status).toBe(404);
    // The code is unchanged for everyone else, but the removed person cannot rejoin with it.
    expect((await post('/api/v1/groups/join', { code: group.joinCode }, memberCookie)).status).toBe(
      400,
    );
    expect((await post(path, { member: ravi.id }, ownerCookie)).status).toBe(404);
    const newcomer = await signIn('newcomer-remove', 'Gita');
    expect((await post('/api/v1/groups/join', { code: group.joinCode }, newcomer)).status).toBe(
      200,
    );
    owner.socket.close(1000, 'done');
  });
});

describe('permanent join code', () => {
  it('shows every member the same code from creation, and invite returns it too', async () => {
    const ownerCookie = await signIn('owner-code', 'Asha Rao');
    const memberCookie = await signIn('member-code', 'Ravi Kumar');
    const group = await createGroup(ownerCookie);
    await post('/api/v1/groups/join', { code: group.joinCode }, memberCookie);
    for (const cookie of [ownerCookie, memberCookie]) {
      const listed = await call('/api/v1/groups', { headers: { Cookie: cookie } });
      const body: { groups: { id: string; joinCode?: string }[] } = await listed.json();
      expect(body.groups.find((g) => g.id === group.id)?.joinCode).toBe(group.joinCode);
    }
    const again = await post(`/api/v1/groups/${group.id}/invite`, {}, ownerCookie);
    expect(again.status).toBe(201);
    expect(await again.json()).toEqual({ joinCode: group.joinCode });
    expect((await post(`/api/v1/groups/${group.id}/invite`, {}, memberCookie)).status).toBe(404);
  });
});

describe('group name', () => {
  it('keeps up to 16 letters or digits in any script, with single spaces', () => {
    expect(cleanGroupName(undefined)).toBeNull();
    expect(cleanGroupName('   ')).toBeNull();
    expect(cleanGroupName('  Raju   Family ')).toBe('Raju Family');
    expect(cleanGroupName('Rao2027')).toBe('Rao2027');
    expect(cleanGroupName('రాజు కుటుంబం')).toBe('రాజు కుటుంబం');
    expect(cleanGroupName('राजू परिवार')).toBe('राजू परिवार');
    expect(cleanGroupName('a'.repeat(16))).toBe('a'.repeat(16));
    for (const bad of ['a'.repeat(17), 'Raju-Family', '<b>x</b>', 'Raju!', 'x\u0000y', 42, ['x']]) {
      expect(cleanGroupName(bad)).toBeUndefined();
    }
  });

  it('stores the name, shows it to members, refuses a bad one and clears it on erasure', async () => {
    const ownerCookie = await signIn('owner-name', 'Asha Rao');
    const memberCookie = await signIn('member-name', 'Ravi Kumar');
    expect((await post('/api/v1/groups', { name: 'Raju-Family!' }, ownerCookie)).status).toBe(400);
    expect((await post('/api/v1/groups', { name: 'x', extra: 1 }, ownerCookie)).status).toBe(400);
    const made = await post('/api/v1/groups', { name: ' Raju  Family ' }, ownerCookie);
    expect(made.status).toBe(201);
    const group: { id: string; joinCode: string } = await made.json();
    await post('/api/v1/groups/join', { code: group.joinCode }, memberCookie);
    const listed = await call('/api/v1/groups', { headers: { Cookie: memberCookie } });
    const body: { groups: { id: string; name: string | null; role: string }[] } =
      await listed.json();
    expect(body.groups.find((g) => g.id === group.id)).toMatchObject({
      name: 'Raju Family',
      role: 'member',
    });
    const erased = await call('/api/v1/me', {
      method: 'DELETE',
      headers: { Origin: ORIGIN, Cookie: ownerCookie },
    });
    expect(erased.status).toBe(200);
    const row = await DB.prepare('SELECT name FROM group_ WHERE id = ?')
      .bind(group.id)
      .first<{ name: string | null }>();
    expect(row?.name).toBeNull();
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
