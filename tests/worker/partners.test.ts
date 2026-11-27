import { env } from 'cloudflare:test';
import { beforeAll, describe, expect, it } from 'vitest';
import core from '../../migrations/0002_backend_core.sql?raw';
import groupName from '../../migrations/0004_group_name.sql?raw';
import groupBlock from '../../migrations/0005_group_block.sql?raw';
import partners from '../../migrations/0007_partners.sql?raw';
import { sha256Hex } from '../../src/db/ids';
import { d1Repository } from '../../src/db/repository';
import { handleV1, type V1Deps } from '../../src/routes/v1';
import type { Jwk } from '../../src/security/googleIdToken';
import { unlimited } from '../../src/security/rateLimit';
import {
  createNonce,
  createSessionToken,
  NONCE_COOKIE,
  pseudonymFor,
  SESSION_COOKIE,
} from '../../src/security/session';

/** Partners (ADR 0019): apply, availability, inbox, updates. Synthetic people only. */
const SECRET = 'test-secret-value-that-is-long-enough-0123456789';
const CLIENT_ID = 'client-123.apps.googleusercontent.com';
const NOW = 1_800_000_000;
const ORIGIN = 'https://example.test';
const DB = (env as unknown as { DB: D1Database }).DB;
const repo = d1Repository(DB);

function b64url(input: string | Uint8Array): string {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

let privateKey: CryptoKey;
let jwk: Jwk;

beforeAll(async () => {
  for (const migration of [core, groupName, groupBlock, partners]) {
    for (const statement of migration.split(/;\s*\n\s*\n/)) {
      const sql = statement.trim();
      if (sql !== '') await DB.prepare(sql).run();
    }
  }
  const pair = (await crypto.subtle.generateKey(
    {
      name: 'RSASSA-PKCS1-v1_5',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['sign', 'verify'],
  )) as CryptoKeyPair;
  const exported = (await crypto.subtle.exportKey('jwk', pair.publicKey)) as JsonWebKey;
  privateKey = pair.privateKey;
  jwk = { kid: 'key-1', kty: 'RSA', alg: 'RS256', n: exported.n ?? '', e: exported.e ?? '' };
});

async function googleToken(sub: string, name: string, nonce: string): Promise<string> {
  const head = b64url(JSON.stringify({ alg: 'RS256', kid: 'key-1', typ: 'JWT' }));
  const body = b64url(
    JSON.stringify({
      iss: 'https://accounts.google.com',
      aud: CLIENT_ID,
      exp: NOW + 3000,
      iat: NOW - 10,
      sub,
      email: `${sub}@example.com`,
      email_verified: true,
      name,
      nonce,
    }),
  );
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    privateKey,
    new TextEncoder().encode(`${head}.${body}`),
  );
  return `${head}.${body}.${b64url(new Uint8Array(signature))}`;
}

async function signIn(sub: string, name: string): Promise<{ cookie: string; ref: string }> {
  const sid = `sid-${sub}-${crypto.randomUUID()}`;
  const ref = await pseudonymFor(sub, SECRET);
  await repo.createSession({
    idHash: await sha256Hex(sid),
    subjectRef: ref,
    createdAt: new Date(NOW * 1000).toISOString(),
    expiresAt: new Date((NOW + 2 * 86_400) * 1000).toISOString(),
  });
  return {
    cookie: `${SESSION_COOKIE}=${await createSessionToken({ sub, name }, SECRET, NOW, sid)}`,
    ref,
  };
}

const ON = { FLAG_PARTNERS: 'enabled' };
function call(
  path: string,
  init: RequestInit = {},
  { flags = ON, now = NOW }: { flags?: object; now?: number } = {},
): Promise<Response> {
  const deps: V1Deps = {
    env: flags,
    repo,
    sessionSecret: SECRET,
    googleClientId: CLIENT_ID,
    googleKeys: () => Promise.resolve([jwk]),
    limiter: unlimited,
    nowSeconds: () => now,
  };
  return handleV1(new Request(`${ORIGIN}${path}`, init), deps);
}

function post(path: string, body: unknown, cookie: string, now = NOW): Promise<Response> {
  return call(
    path,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: ORIGIN, Cookie: cookie },
      body: JSON.stringify(body),
    },
    { now },
  );
}

const get = (path: string, cookie = '', now = NOW) =>
  call(path, { headers: cookie === '' ? {} : { Cookie: cookie } }, { now });

/** Applies with a fresh nonce and a Google token for the same account. */
async function applyAs(
  person: { cookie: string },
  sub: string,
  extra: Record<string, unknown> = {},
  tokenSub = sub,
): Promise<Response> {
  const nonceCookie = await createNonce(SECRET, NOW);
  const token = await googleToken(tokenSub, 'Lakshmi Devi', nonceCookie.split('.')[0] ?? '');
  return post(
    '/api/v1/partners/apply',
    {
      credential: token,
      role: 'volunteer',
      ghatId: 'kotilingala',
      locale: 'en',
      consent: true,
      adult: true,
      ...extra,
    },
    `${person.cookie}; ${NONCE_COOKIE}=${nonceCookie}`,
  );
}

async function approve(ref: string): Promise<void> {
  await DB.prepare(
    "UPDATE partner SET status = 'approved', decided_at = ?, decided_by = 'admin-1' WHERE subject_ref = ?",
  )
    .bind(new Date(NOW * 1000).toISOString(), ref)
    .run();
}

let n = 0;
const uniq = () => `p${String(++n)}-${crypto.randomUUID().slice(0, 8)}`;

describe('flag and access', () => {
  it('answers 404 for every partner route when FLAG_PARTNERS is not enabled', async () => {
    for (const flags of [{}, { FLAG_PARTNERS: 'true' }, { FLAG_PARTNERS: '' }]) {
      for (const path of [
        '/api/v1/partners/updates',
        '/api/v1/partners/me',
        '/api/v1/partners/inbox',
      ]) {
        expect((await call(path, {}, { flags })).status).toBe(404);
      }
    }
  });

  it('serves volunteer updates to anyone, marked not official', async () => {
    const response = await get('/api/v1/partners/updates');
    expect(response.status).toBe(200);
    const body = await response.json<{
      source: string;
      official: boolean;
      updates: unknown[];
    }>();
    expect(body.source).toBe('volunteer');
    expect(body.official).toBe(false);
    expect(Array.isArray(body.updates)).toBe(true);
  });

  it('needs sign-in for everything else', async () => {
    expect((await get('/api/v1/partners/me')).status).toBe(401);
    expect((await get('/api/v1/partners/inbox')).status).toBe(401);
    expect((await post('/api/v1/partners/availability', { available: true }, '')).status).toBe(401);
  });
});

describe('applying', () => {
  it('stores a pending application with the verified name and email, and records consent', async () => {
    const sub = uniq();
    const person = await signIn(sub, 'Lakshmi');
    const response = await applyAs(person, sub);
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ status: 'pending' });
    // The nonce cookie is cleared so the token cannot be replayed.
    expect(response.headers.get('Set-Cookie') ?? '').toContain(`${NONCE_COOKIE}=;`);

    const row = await DB.prepare(
      'SELECT status, name, email, role, ghat_id FROM partner WHERE subject_ref = ?',
    )
      .bind(person.ref)
      .first<{ status: string; name: string; email: string; role: string; ghat_id: string }>();
    expect(row).toEqual({
      status: 'pending',
      name: 'Lakshmi Devi',
      email: `${sub}@example.com`,
      role: 'volunteer',
      ghat_id: 'kotilingala',
    });
    const consents = await repo.listConsent(person.ref);
    expect(consents.map((c) => [c.purposeId, c.noticeVersion, c.decision])).toEqual([
      ['partner', 'partner-1', 'granted'],
    ]);

    // The person can see their status but never the name or email held for admins.
    const me = await get('/api/v1/partners/me', person.cookie);
    const text = await me.text();
    expect(JSON.parse(text)).toMatchObject({
      status: 'pending',
      role: 'volunteer',
      available: false,
    });
    expect(text).not.toContain('@');
    expect(text).not.toContain('Lakshmi');
  });

  it('refuses without the consent tick, with a bad role, or with extra fields', async () => {
    const sub = uniq();
    const person = await signIn(sub, 'Ravi');
    expect((await applyAs(person, sub, { consent: false })).status).toBe(400);
    expect((await applyAs(person, sub, { adult: false })).status).toBe(400);
    expect((await applyAs(person, sub, { role: 'official' })).status).toBe(400);
    expect((await applyAs(person, sub, { ghatId: 'Bad Ghat!' })).status).toBe(400);
    expect((await applyAs(person, sub, { note: 'hello' })).status).toBe(400);
    expect(await repo.getPartner(person.ref)).toBeNull();
  });

  it('refuses a Google token for a different account, a missing nonce and a foreign origin', async () => {
    const sub = uniq();
    const person = await signIn(sub, 'Ravi');
    expect((await applyAs(person, sub, {}, uniq())).status).toBe(401);

    const token = await googleToken(sub, 'Ravi', 'x');
    const noNonce = await post(
      '/api/v1/partners/apply',
      { credential: token, role: 'priest', ghatId: null, locale: 'en', consent: true, adult: true },
      person.cookie,
    );
    expect(noNonce.status).toBe(401);

    const foreign = await call('/api/v1/partners/apply', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://evil.test',
        Cookie: person.cookie,
      },
      body: '{}',
    });
    expect(foreign.status).toBe(403);
    expect(await repo.getPartner(person.ref)).toBeNull();
  });

  it('lets an approved partner ask for another role, which waits for staff again', async () => {
    const sub = uniq();
    const person = await signIn(sub, 'Gopal');
    expect((await applyAs(person, sub)).status).toBe(201);
    await approve(person.ref);
    await DB.prepare('UPDATE partner SET available_until = ? WHERE subject_ref = ?')
      .bind(new Date((NOW + 3600) * 1000).toISOString(), person.ref)
      .run();

    // The same role and ghat again changes nothing.
    expect((await applyAs(person, sub)).status).toBe(409);
    expect((await repo.getPartner(person.ref))?.status).toBe('approved');

    // A different role goes back to staff, and the old access (availability) stops at once.
    expect((await applyAs(person, sub, { role: 'priest' })).status).toBe(201);
    expect(await repo.getPartner(person.ref)).toMatchObject({
      role: 'priest',
      status: 'pending',
      availableUntil: null,
    });

    // A suspended partner cannot switch role to get round the suspension.
    await DB.prepare("UPDATE partner SET status = 'suspended' WHERE subject_ref = ?")
      .bind(person.ref)
      .run();
    expect((await applyAs(person, sub, { role: 'volunteer' })).status).toBe(409);
    expect((await repo.getPartner(person.ref))?.status).toBe('suspended');
  });

  it('allows one live application, and a rejected person only after 30 days', async () => {
    const sub = uniq();
    const person = await signIn(sub, 'Sita');
    expect((await applyAs(person, sub)).status).toBe(201);
    expect((await applyAs(person, sub)).status).toBe(409);

    const day = 86_400;
    await DB.prepare("UPDATE partner SET status = 'rejected', decided_at = ? WHERE subject_ref = ?")
      .bind(new Date((NOW - 10 * day) * 1000).toISOString(), person.ref)
      .run();
    const early = await applyAs(person, sub);
    expect(early.status).toBe(409);
    expect((await early.json<{ error: { code: string } }>()).error.code).toBe('APPLY_LATER');

    await DB.prepare('UPDATE partner SET decided_at = ? WHERE subject_ref = ?')
      .bind(new Date((NOW - 31 * day) * 1000).toISOString(), person.ref)
      .run();
    expect((await applyAs(person, sub)).status).toBe(201);
    expect((await repo.getPartner(person.ref))?.status).toBe('pending');
  });
});

describe('approved partners', () => {
  async function approved(): Promise<{ cookie: string; ref: string }> {
    const sub = uniq();
    const person = await signIn(sub, 'Anil');
    expect((await applyAs(person, sub)).status).toBe(201);
    await approve(person.ref);
    return person;
  }

  it('keeps pending, rejected and non-applicants out of partner actions', async () => {
    const sub = uniq();
    const person = await signIn(sub, 'Kiran');
    const update = { kind: 'crowd', ghatId: 'kotilingala', value: 'low' };
    expect((await post('/api/v1/partners/updates', update, person.cookie)).status).toBe(403);
    expect((await get('/api/v1/partners/inbox', person.cookie)).status).toBe(403);
    expect(
      (await post('/api/v1/partners/availability', { available: true }, person.cookie)).status,
    ).toBe(403);

    expect((await applyAs(person, sub)).status).toBe(201);
    expect((await post('/api/v1/partners/updates', update, person.cookie)).status).toBe(403);
  });

  it('switches availability on for 12 hours and off again', async () => {
    const person = await approved();
    const on = await post('/api/v1/partners/availability', { available: true }, person.cookie);
    expect(on.status).toBe(200);
    const until = (await on.json<{ availableUntil: string }>()).availableUntil;
    expect(until).toBe(new Date((NOW + 12 * 3600) * 1000).toISOString());
    expect(
      (await (await get('/api/v1/partners/me', person.cookie)).json<{ available: boolean }>())
        .available,
    ).toBe(true);

    // After the 12 hours the switch reads as off by itself.
    const later = await get('/api/v1/partners/me', person.cookie, NOW + 12 * 3600 + 1);
    expect((await later.json<{ available: boolean }>()).available).toBe(false);

    await post('/api/v1/partners/availability', { available: false }, person.cookie);
    expect((await repo.getPartner(person.ref))?.availableUntil).toBeNull();
  });

  it('needs availability to post, accepts only fixed choices, and rate limits', async () => {
    const person = await approved();
    const update = { kind: 'crowd', ghatId: 'kotilingala', value: 'high' };
    expect((await post('/api/v1/partners/updates', update, person.cookie)).status).toBe(409);

    await post('/api/v1/partners/availability', { available: true }, person.cookie);
    for (const bad of [
      { ...update, value: 'rising' }, // a river value on a crowd report
      { ...update, kind: 'weather' },
      { ...update, value: 'high', note: 'free food at gate' },
      { ...update, ghatId: 'Not A Ghat' },
      { kind: 'food', ghatId: 'kotilingala', value: 'free biryani at my shop' },
    ]) {
      expect((await post('/api/v1/partners/updates', bad, person.cookie)).status).toBe(400);
    }
    expect((await post('/api/v1/partners/updates', update, person.cookie)).status).toBe(201);
    // The same kind and ghat again within 10 minutes is refused; a different ghat is fine.
    expect((await post('/api/v1/partners/updates', update, person.cookie)).status).toBe(429);
    expect(
      (await post('/api/v1/partners/updates', { ...update, ghatId: 'pushkar-ghat' }, person.cookie))
        .status,
    ).toBe(201);
    // Ten minutes on, the first spot may be updated again.
    await post('/api/v1/partners/availability', { available: true }, person.cookie, NOW + 601);
    expect((await post('/api/v1/partners/updates', update, person.cookie, NOW + 601)).status).toBe(
      201,
    );
  });

  it('stops at 30 updates a day', async () => {
    const person = await approved();
    await post('/api/v1/partners/availability', { available: true }, person.cookie);
    for (let i = 0; i < 30; i++) {
      await repo.insertPartnerUpdate({
        subjectRef: person.ref,
        kind: 'food',
        ghatId: `spot-${String(i)}`,
        value: 'available',
        createdAt: new Date((NOW - 3600) * 1000).toISOString(),
      });
    }
    const response = await post(
      '/api/v1/partners/updates',
      { kind: 'crowd', ghatId: 'kotilingala', value: 'low' },
      person.cookie,
    );
    expect(response.status).toBe(429);
  });

  it('lists nudges for the partner and marks them read', async () => {
    const person = await approved();
    const later = new Date((NOW + 6 * 3600) * 1000).toISOString();
    const make = (id: string, ghat: string | null, expires: string) =>
      DB.prepare(
        "INSERT INTO partner_nudge (id, kind, ghat_id, created_at, expires_at, created_by) VALUES (?, 'river', ?, ?, ?, 'admin-1')",
      )
        .bind(id, ghat, new Date(NOW * 1000).toISOString(), expires)
        .run();
    const tag = uniq();
    await make(`${tag}-all`, null, later);
    await make(`${tag}-mine`, 'kotilingala', later);
    await make(`${tag}-other`, 'elsewhere', later);
    await make(`${tag}-old`, null, new Date((NOW - 1) * 1000).toISOString());

    const me = await (
      await get('/api/v1/partners/me', person.cookie)
    ).json<{
      unread: number;
    }>();
    const inbox = await (
      await get('/api/v1/partners/inbox', person.cookie)
    ).json<{
      nudges: { id: string; read: boolean }[];
    }>();
    const mine = inbox.nudges
      .filter((x) => x.id.startsWith(tag))
      .map((x) => x.id)
      .sort();
    expect(mine).toEqual([`${tag}-all`, `${tag}-mine`]);
    expect(me.unread).toBeGreaterThanOrEqual(2);

    expect((await post('/api/v1/partners/inbox/read', {}, person.cookie)).status).toBe(204);
    const after = await (
      await get('/api/v1/partners/inbox', person.cookie)
    ).json<{
      nudges: { id: string; read: boolean }[];
    }>();
    expect(after.nudges.filter((x) => x.id.startsWith(tag)).every((x) => x.read)).toBe(true);
  });
});

describe('what pilgrims see', () => {
  it('shows the newest unhidden update per kind and ghat for 3 hours, without any identity', async () => {
    const sub = uniq();
    const person = await signIn(sub, 'Gita');
    await applyAs(person, sub);
    await approve(person.ref);
    const ghat = `g-${uniq()}`;
    const at = (secondsAgo: number) => new Date((NOW - secondsAgo) * 1000).toISOString();
    const add = (kind: 'crowd' | 'river', value: string, secondsAgo: number) =>
      repo.insertPartnerUpdate({
        subjectRef: person.ref,
        kind,
        ghatId: ghat,
        value,
        createdAt: at(secondsAgo),
      });
    await add('crowd', 'low', 3000);
    const newest = await add('crowd', 'high', 600);
    await add('river', 'normal', 4 * 3600); // too old: never shown

    const body = await (
      await get('/api/v1/partners/updates')
    ).json<{
      updates: { kind: string; ghatId: string; value: string; reportedAt: string }[];
    }>();
    const mine = body.updates.filter((u) => u.ghatId === ghat);
    expect(mine).toEqual([{ kind: 'crowd', ghatId: ghat, value: 'high', reportedAt: at(600) }]);
    // Nothing that could identify the partner is in the public answer.
    const raw = JSON.stringify(body);
    expect(raw).not.toContain(person.ref);
    expect(raw).not.toContain('Gita');
    expect(raw).not.toContain('@');

    // Hiding the newest brings back the older visible one; suspending the partner hides all of it.
    await DB.prepare('UPDATE partner_update SET hidden_at = ? WHERE id = ?')
      .bind(at(0), newest)
      .run();
    const afterHide = await (await get('/api/v1/partners/updates')).json<typeof body>();
    expect(afterHide.updates.filter((u) => u.ghatId === ghat).map((u) => u.value)).toEqual(['low']);

    await DB.prepare("UPDATE partner SET status = 'suspended' WHERE subject_ref = ?")
      .bind(person.ref)
      .run();
    const afterSuspend = await (await get('/api/v1/partners/updates')).json<typeof body>();
    expect(afterSuspend.updates.filter((u) => u.ghatId === ghat)).toEqual([]);
  });
});

describe('erasure and the ledger', () => {
  it('removes the partner, their updates and reads, and keeps the audit row without the person', async () => {
    const sub = uniq();
    const person = await signIn(sub, 'Mohan');
    await applyAs(person, sub);
    await approve(person.ref);
    await repo.insertPartnerUpdate({
      subjectRef: person.ref,
      kind: 'food',
      ghatId: 'kotilingala',
      value: 'available',
      createdAt: new Date(NOW * 1000).toISOString(),
    });
    await DB.prepare(
      "INSERT INTO partner_audit (id, admin, action, target, at) VALUES (?, 'admin-1', 'approve', ?, ?)",
    )
      .bind(uniq(), person.ref, new Date(NOW * 1000).toISOString())
      .run();

    await repo.eraseSubject(person.ref);

    for (const table of ['partner', 'partner_update', 'partner_nudge_read']) {
      const row = await DB.prepare(`SELECT COUNT(*) AS c FROM ${table} WHERE subject_ref = ?`)
        .bind(person.ref)
        .first<{ c: number }>();
      expect(row?.c).toBe(0);
    }
    const audit = await DB.prepare('SELECT COUNT(*) AS c FROM partner_audit WHERE target = ?')
      .bind(person.ref)
      .first<{ c: number }>();
    expect(audit?.c).toBe(0);
    expect(await repo.listConsent(person.ref)).toEqual([]);
  });

  it('keeps the consent ledger append-only after the rebuild', async () => {
    const ref = `ledger-${uniq()}`;
    await repo.recordConsent(ref, {
      purposeId: 'partner',
      noticeVersion: 'partner-1',
      locale: 'te',
      decision: 'granted',
      at: new Date(NOW * 1000).toISOString(),
    });
    await expect(
      DB.prepare("UPDATE consent_ledger SET decision = 'withdrawn' WHERE subject_ref = ?")
        .bind(ref)
        .run(),
    ).rejects.toThrow();
  });
});
