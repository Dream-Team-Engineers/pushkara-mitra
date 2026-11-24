import { env } from 'cloudflare:test';
import { beforeAll, describe, expect, it } from 'vitest';
import core from '../../migrations/0002_backend_core.sql?raw';
import groupName from '../../migrations/0004_group_name.sql?raw';
import groupBlock from '../../migrations/0005_group_block.sql?raw';
import partnersMigration from '../../migrations/0007_partners.sql?raw';
import { sha256Hex } from '../../src/db/ids';
import { d1Repository } from '../../src/db/repository';
import worker, { type Env } from '../../src/index';
import { createSessionToken, pseudonymFor, SESSION_COOKIE } from '../../src/security/session';

const SECRET = 'test-secret-value-that-is-long-enough-0123456789';
const DB = (env as unknown as { DB: D1Database }).DB;
const ORIGIN = 'https://example.test';

const ENABLED: Env = {
  DB,
  SESSION_SECRET: SECRET,
  FLAG_GROUPS: 'enabled',
  FLAG_SOS: 'enabled',
};

let counter = 0;
const uniqueIp = () => `203.0.${String(Math.floor(counter / 250))}.${String(++counter % 250)}`;

function call(path: string, init: RequestInit = {}, e: Env = ENABLED): Promise<Response> {
  const headers = new Headers(init.headers);
  if (!headers.has('CF-Connecting-IP')) headers.set('CF-Connecting-IP', uniqueIp());
  return worker.fetch(new Request(`${ORIGIN}${path}`, { ...init, headers }), e);
}

function post(path: string, body: unknown, cookie?: string, e: Env = ENABLED): Promise<Response> {
  return call(
    path,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: ORIGIN,
        ...(cookie === undefined ? {} : { Cookie: cookie }),
      },
      body: JSON.stringify(body),
    },
    e,
  );
}

/** A signed-in cookie for a synthetic person, with the matching server-side session row. */
async function signIn(sub: string): Promise<{ cookie: string; sid: string; subject: string }> {
  const now = Math.floor(Date.now() / 1000);
  const sid = `sid-${sub}-${crypto.randomUUID()}`;
  const subject = await pseudonymFor(sub, SECRET);
  await d1Repository(DB).createSession({
    idHash: await sha256Hex(sid),
    subjectRef: subject,
    createdAt: new Date(now * 1000).toISOString(),
    expiresAt: new Date((now + 3600) * 1000).toISOString(),
  });
  const token = await createSessionToken({ sub, name: 'Test Person' }, SECRET, now, sid);
  return { cookie: `${SESSION_COOKIE}=${token}`, sid, subject };
}

async function columnsOf(table: string): Promise<string> {
  const result = await DB.prepare(`PRAGMA table_info(${table})`).all<{ name: string }>();
  return result.results.map((c) => c.name).join(',');
}

beforeAll(async () => {
  const migration = [core, groupName, groupBlock, partnersMigration].join('\n\n');
  for (const statement of migration.split(/;\s*\n\s*\n/)) {
    const sql = statement.replaceAll(/^--.*$/gm, '').trim();
    if (sql !== '') await DB.prepare(sql).run();
  }
});

describe('flags fail closed', () => {
  it('answers 404 for SOS and groups when the flag is not exactly "enabled"', async () => {
    for (const value of [undefined, '', 'true', 'ENABLED', '1']) {
      const e: Env = {
        DB,
        SESSION_SECRET: SECRET,
        ...(value === undefined ? {} : { FLAG_SOS: value, FLAG_GROUPS: value }),
      };
      const sos = await post(
        '/api/v1/sos',
        { requestId: 'abcdefgh1', category: 'medical' },
        undefined,
        e,
      );
      expect(sos.status).toBe(404);
      expect((await call('/api/v1/groups', {}, e)).status).toBe(404);
    }
  });

  it('answers 404 for unknown v1 paths', async () => {
    expect((await call('/api/v1/me/missing')).status).toBe(404);
    expect((await call('/api/v1/nothing')).status).toBe(404);
  });
});

describe('no database', () => {
  it('answers 503 and never pretends an SOS was received', async () => {
    const e: Env = { FLAG_SOS: 'enabled', SESSION_SECRET: SECRET };
    const res = await post(
      '/api/v1/sos',
      { requestId: 'abcdefgh1', category: 'medical' },
      undefined,
      e,
    );
    expect(res.status).toBe(503);
    expect(JSON.stringify(await res.json())).not.toMatch(/received/);
  });
});

describe('SOS intake', () => {
  it('needs no sign-in, stores no location, and is idempotent on the request id', async () => {
    const first = await post('/api/v1/sos', { requestId: 'req-idem-0001', category: 'medical' });
    expect(first.status).toBe(202);
    const a = await first.json<{ status: string; reference: string }>();
    expect(a.status).toBe('received');
    const second = await post('/api/v1/sos', { requestId: 'req-idem-0001', category: 'medical' });
    const b = await second.json<{ reference: string }>();
    expect(b.reference).toBe(a.reference);
    const count = await DB.prepare('SELECT COUNT(*) AS n FROM sos_request WHERE id = ?')
      .bind(a.reference)
      .first<{ n: number }>();
    expect(count?.n).toBe(1);
    expect(await columnsOf('sos_request')).not.toMatch(
      /lat|lng|lon|coord|name|phone|email|note|message/i,
    );
  });

  it('stores the hash of the request id, not the id', async () => {
    await post('/api/v1/sos', { requestId: 'req-hash-0002', category: 'lost' });
    const hashed = await DB.prepare('SELECT 1 FROM sos_request WHERE request_hash = ?')
      .bind(await sha256Hex('sos.v1|req-hash-0002'))
      .first();
    expect(hashed).not.toBeNull();
    const raw = await DB.prepare(
      "SELECT 1 FROM sos_request WHERE request_hash = 'req-hash-0002'",
    ).first();
    expect(raw).toBeNull();
  });

  it('rejects coordinates, free text, unknown categories and bad ids with the fixed envelope', async () => {
    const bad = [
      { requestId: 'abcdefgh1', category: 'medical', lat: 17.0, lng: 81.7 },
      { requestId: 'abcdefgh1', category: 'medical', note: 'help' },
      { requestId: 'abcdefgh1', category: 'fire' },
      { requestId: 'short', category: 'medical' },
      { requestId: 'abcdefgh1' },
      [],
    ];
    for (const body of bad) {
      const res = await post('/api/v1/sos', body);
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({
        error: { code: 'INVALID_REQUEST', message: 'The request is not valid.' },
      });
    }
  });

  it('requires JSON, a small body and POST', async () => {
    expect((await call('/api/v1/sos', { method: 'POST', body: 'x' })).status).toBe(415);
    const big = await post('/api/v1/sos', { requestId: 'x'.repeat(5000), category: 'other' });
    expect(big.status).toBe(413);
    expect((await call('/api/v1/sos')).status).toBe(405);
  });

  it('rate limits per client', async () => {
    let last = 0;
    for (let i = 0; i < 12; i += 1) {
      const res = await call('/api/v1/sos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '198.51.100.7' },
        body: JSON.stringify({ requestId: `rate-limit-${String(i)}x`, category: 'other' }),
      });
      last = res.status;
    }
    expect(last).toBe(429);
  });
});

describe('signed-in routes', () => {
  it('rejects a signed cookie with no live server-side session (revocation)', async () => {
    const who = await signIn('revoked-person');
    expect((await call('/api/v1/me', { headers: { Cookie: who.cookie } })).status).toBe(200);
    await d1Repository(DB).revokeSession(await sha256Hex(who.sid), new Date().toISOString());
    expect((await call('/api/v1/me', { headers: { Cookie: who.cookie } })).status).toBe(401);
  });

  it('rejects a cookie without a session id, and no cookie at all', async () => {
    const token = await createSessionToken(
      { sub: 'legacy' },
      SECRET,
      Math.floor(Date.now() / 1000),
    );
    const res = await call('/api/v1/me', { headers: { Cookie: `${SESSION_COOKIE}=${token}` } });
    expect(res.status).toBe(401);
    expect((await call('/api/v1/me')).status).toBe(401);
  });

  it('records consent append-only and rejects bad values', async () => {
    const who = await signIn('consent-person');
    const body = {
      purposeId: 'group',
      noticeVersion: 'v1-draft',
      locale: 'te',
      decision: 'granted',
    };
    expect((await post('/api/v1/me/consents', body, who.cookie)).status).toBe(201);
    const withdrawn = { ...body, decision: 'withdrawn' };
    expect((await post('/api/v1/me/consents', withdrawn, who.cookie)).status).toBe(201);
    const res = await call('/api/v1/me/consents', { headers: { Cookie: who.cookie } });
    const list = await res.json<{ consents: { decision: string }[] }>();
    expect(list.consents.map((c) => c.decision)).toEqual(['granted', 'withdrawn']);
    expect(
      (await post('/api/v1/me/consents', { ...body, purposeId: 'marketing' }, who.cookie)).status,
    ).toBe(400);
    expect((await post('/api/v1/me/consents', { ...body, extra: 1 }, who.cookie)).status).toBe(400);
    await expect(
      DB.prepare("UPDATE consent_ledger SET decision = 'granted'").run(),
    ).rejects.toThrow();
  });

  it('refuses a cross-origin write', async () => {
    const who = await signIn('csrf-person');
    const res = await call('/api/v1/me/consents', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://evil.test',
        Cookie: who.cookie,
      },
      body: '{}',
    });
    expect(res.status).toBe(403);
  });

  it('erases everything held for the person and clears the cookie', async () => {
    const who = await signIn('erase-person');
    const consent = {
      purposeId: 'sign-in',
      noticeVersion: 'v1',
      locale: 'en',
      decision: 'granted',
    };
    await post('/api/v1/me/consents', consent, who.cookie);
    const madeRes = await post('/api/v1/groups', {}, who.cookie);
    const made = await madeRes.json<{ id: string }>();
    const res = await call('/api/v1/me', {
      method: 'DELETE',
      headers: { Origin: ORIGIN, Cookie: who.cookie },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('Set-Cookie')).toContain('Max-Age=0');
    for (const table of ['session', 'consent_ledger', 'membership']) {
      const n = await DB.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE subject_ref = ?`)
        .bind(who.subject)
        .first<{ n: number }>();
      expect(n?.n).toBe(0);
    }
    expect(await DB.prepare('SELECT 1 FROM group_ WHERE id = ?').bind(made.id).first()).toBeNull();
  });
});

describe('groups (metadata only)', () => {
  it('creates, joins by code, lists, and leaves; the last member removes the group', async () => {
    const owner = await signIn('group-owner');
    const guest = await signIn('group-guest');
    const made = await post('/api/v1/groups', {}, owner.cookie);
    const created = await made.json<{ id: string; joinCode: string }>();
    expect(created.joinCode).toMatch(/^[A-HJKMNP-Z2-9]{8}$/);

    const stored = await DB.prepare('SELECT code_hash FROM invitation WHERE group_id = ?')
      .bind(created.id)
      .first<{ code_hash: string }>();
    expect(stored?.code_hash).toBe(await sha256Hex(`join.v1|${created.joinCode}`));

    const joined = await post(
      '/api/v1/groups/join',
      { code: created.joinCode.toLowerCase() },
      guest.cookie,
    );
    expect(joined.status).toBe(200);
    expect(
      (await post('/api/v1/groups/join', { code: created.joinCode }, guest.cookie)).status,
    ).toBe(409);

    const listed = await call('/api/v1/groups', { headers: { Cookie: guest.cookie } });
    const mine = await listed.json<{
      groups: { id: string; role: string; memberCount: number }[];
    }>();
    expect(mine.groups).toMatchObject([{ id: created.id, role: 'member', memberCount: 2 }]);

    expect((await post(`/api/v1/groups/${created.id}/leave`, {}, guest.cookie)).status).toBe(204);
    expect((await post(`/api/v1/groups/${created.id}/leave`, {}, guest.cookie)).status).toBe(404);
    expect((await post(`/api/v1/groups/${created.id}/leave`, {}, owner.cookie)).status).toBe(204);
    expect(
      await DB.prepare('SELECT 1 FROM group_ WHERE id = ?').bind(created.id).first(),
    ).toBeNull();
  });

  it('only the owner can invite, and a stranger learns nothing about the id', async () => {
    const owner = await signIn('invite-owner');
    const guest = await signIn('invite-guest');
    const made = await post('/api/v1/groups', {}, owner.cookie);
    const created = await made.json<{ id: string; joinCode: string }>();
    await post('/api/v1/groups/join', { code: created.joinCode }, guest.cookie);
    expect((await post(`/api/v1/groups/${created.id}/invite`, {}, guest.cookie)).status).toBe(404);
    expect((await post(`/api/v1/groups/${'a'.repeat(26)}/invite`, {}, guest.cookie)).status).toBe(
      404,
    );
    expect((await post(`/api/v1/groups/${created.id}/invite`, {}, owner.cookie)).status).toBe(201);
  });

  it('rejects bad codes and spends each use once', async () => {
    const owner = await signIn('uses-owner');
    const made = await post('/api/v1/groups', {}, owner.cookie);
    const created = await made.json<{ joinCode: string }>();
    const stranger = await signIn('uses-stranger');
    expect((await post('/api/v1/groups/join', { code: 'nope' }, stranger.cookie)).status).toBe(400);
    expect((await post('/api/v1/groups/join', { code: 'ZZZZZZZZ' }, stranger.cookie)).status).toBe(
      400,
    );
    await DB.prepare('UPDATE invitation SET uses_left = 1 WHERE code_hash = ?')
      .bind(await sha256Hex(`join.v1|${created.joinCode}`))
      .run();
    expect(
      (await post('/api/v1/groups/join', { code: created.joinCode }, stranger.cookie)).status,
    ).toBe(200);
    const late = await signIn('uses-late');
    expect(
      (await post('/api/v1/groups/join', { code: created.joinCode }, late.cookie)).status,
    ).toBe(400);
  });

  it('has no column that could hold a position', async () => {
    for (const table of ['group_', 'membership', 'invitation', 'session', 'consent_ledger']) {
      expect(await columnsOf(table)).not.toMatch(/lat|lng|lon|coord|position|location/i);
    }
  });
});
