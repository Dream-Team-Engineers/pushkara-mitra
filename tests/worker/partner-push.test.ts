import { env } from 'cloudflare:test';
import { beforeAll, describe, expect, it } from 'vitest';
import core from '../../migrations/0002_backend_core.sql?raw';
import groupName from '../../migrations/0004_group_name.sql?raw';
import groupBlock from '../../migrations/0005_group_block.sql?raw';
import partners from '../../migrations/0007_partners.sql?raw';
import roles from '../../migrations/0008_partner_roles.sql?raw';
import pushMigration from '../../migrations/0010_partner_push.sql?raw';
import {
  decidePartner,
  PUSH_PER_NUDGE_CAP,
  PUSH_PER_PARTNER_PER_HOUR,
  purgeDuePartnerData,
  pushTargets,
  recordPushResults,
} from '../../src/db/adminPartners';
import { sha256Hex } from '../../src/db/ids';
import { d1Repository } from '../../src/db/repository';
import {
  pushConfig,
  sendEmptyPush,
  sendToTargets,
  vapidAuthorization,
  type PushConfig,
} from '../../src/admin/push';
import { handleV1, type V1Deps } from '../../src/routes/v1';
import { isPushEndpoint } from '../../src/security/pushEndpoint';
import { unlimited } from '../../src/security/rateLimit';
import { createSessionToken, pseudonymFor, SESSION_COOKIE } from '../../src/security/session';

/** Partner phone notifications (ADR 0020). Synthetic people and synthetic push addresses only. */
const SECRET = 'test-secret-value-that-is-long-enough-0123456789';
const NOW = 1_800_000_000;
const NOW_MS = NOW * 1000;
const NOW_ISO = new Date(NOW_MS).toISOString();
const ORIGIN = 'https://example.test';
const KEY = 'BPublicKeyForTestsOnly';
const DB = (env as unknown as { DB: D1Database }).DB;
const repo = d1Repository(DB);
/** The address a fake fetch was called with. */
const addressOf = (input: Parameters<typeof fetch>[0]): string =>
  typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
const ENDPOINT = 'https://fcm.googleapis.com/fcm/send/synthetic-token-0001';
const ON = { FLAG_PARTNERS: 'enabled', FLAG_PARTNER_PUSH: 'enabled', VAPID_PUBLIC_KEY: KEY };

beforeAll(async () => {
  for (const migration of [core, groupName, groupBlock, partners, roles, pushMigration]) {
    for (const statement of migration.split(/;\s*\n\s*\n/)) {
      const sql = statement.trim();
      if (sql !== '') await DB.prepare(sql).run();
    }
  }
});

let counter = 0;
async function person(
  status: 'approved' | 'pending' = 'approved',
  options: { ghat?: string | null; available?: boolean } = {},
): Promise<{ cookie: string; ref: string }> {
  const sub = `push-${String((counter += 1))}`;
  const ref = await pseudonymFor(sub, SECRET);
  const sid = `sid-${sub}`;
  await repo.createSession({
    idHash: await sha256Hex(sid),
    subjectRef: ref,
    createdAt: NOW_ISO,
    expiresAt: new Date((NOW + 86_400) * 1000).toISOString(),
  });
  await DB.prepare(
    `INSERT INTO partner (subject_ref, role, ghat_id, status, applied_at, available_until)
     VALUES (?, 'volunteer', ?, ?, ?, ?)`,
  )
    .bind(
      ref,
      options.ghat === undefined ? 'kotilingala' : options.ghat,
      status,
      NOW_ISO,
      options.available === false ? null : new Date(NOW_MS + 3_600_000).toISOString(),
    )
    .run();
  return {
    cookie: `${SESSION_COOKIE}=${await createSessionToken({ sub, name: 'Test' }, SECRET, NOW, sid)}`,
    ref,
  };
}

function call(path: string, init: RequestInit = {}, flags: object = ON): Promise<Response> {
  const deps: V1Deps = {
    env: flags,
    repo,
    sessionSecret: SECRET,
    limiter: unlimited,
    nowSeconds: () => NOW,
  };
  return handleV1(new Request(`${ORIGIN}${path}`, init), deps);
}

function post(path: string, body: unknown, cookie: string, flags: object = ON): Promise<Response> {
  return call(
    path,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: ORIGIN, Cookie: cookie },
      body: JSON.stringify(body),
    },
    flags,
  );
}

const optIn = (cookie: string, endpoint: string = ENDPOINT, extra: object = {}) =>
  post('/api/v1/partners/push', { endpoint, locale: 'en', consent: true, ...extra }, cookie);

async function pushRows(ref: string): Promise<number> {
  const row = await DB.prepare('SELECT COUNT(*) AS n FROM partner_push WHERE subject_ref = ?')
    .bind(ref)
    .first<{ n: number }>();
  return row?.n ?? 0;
}

describe('phone notification routes', () => {
  it('answers 404 and shows no push settings while the flag is off', async () => {
    const p = await person();
    const flagOff = { FLAG_PARTNERS: 'enabled', VAPID_PUBLIC_KEY: KEY };
    expect((await post('/api/v1/partners/push', {}, p.cookie, flagOff)).status).toBe(404);
    expect((await post('/api/v1/partners/push/off', {}, p.cookie, flagOff)).status).toBe(404);
    const meRes = await call('/api/v1/partners/me', { headers: { Cookie: p.cookie } }, flagOff);
    const me = await meRes.json<{ push: unknown }>();
    expect(me.push).toBeNull();
    // The flag alone is not enough: the public key must exist too.
    const noKey = { FLAG_PARTNERS: 'enabled', FLAG_PARTNER_PUSH: 'enabled' };
    expect((await post('/api/v1/partners/push', {}, p.cookie, noKey)).status).toBe(404);
  });

  it('refuses a person who is not an approved partner', async () => {
    const waiting = await person('pending');
    expect((await optIn(waiting.cookie)).status).toBe(403);
    expect(await pushRows(waiting.ref)).toBe(0);
    expect((await call('/api/v1/partners/push', { method: 'POST' })).status).toBe(401);
  });

  it('refuses addresses that are not a browser push service, and a missing consent', async () => {
    const p = await person();
    for (const bad of [
      'https://evil.example/push',
      'http://fcm.googleapis.com/fcm/send/x',
      'https://fcm.googleapis.com.evil.example/x',
      'https://user:pw@fcm.googleapis.com/x',
      'https://fcm.googleapis.com:8443/x',
      'not a url',
      42,
    ]) {
      expect((await optIn(p.cookie, bad as string)).status, String(bad)).toBe(400);
    }
    expect((await optIn(p.cookie, ENDPOINT, { consent: false })).status).toBe(400);
    expect((await optIn(p.cookie, ENDPOINT, { extra: 1 })).status).toBe(400);
    expect(await pushRows(p.ref)).toBe(0);
  });

  it('refuses a request that does not come from this site', async () => {
    const p = await person();
    const res = await call('/api/v1/partners/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://other.example',
        Cookie: p.cookie,
      },
      body: JSON.stringify({ endpoint: ENDPOINT, locale: 'en', consent: true }),
    });
    expect(res.status).toBe(403);
    expect(await pushRows(p.ref)).toBe(0);
  });

  it('opts in, records consent, never returns the address, and opts out again', async () => {
    const p = await person();
    const res = await optIn(p.cookie);
    expect(res.status).toBe(201);
    expect(await res.text()).not.toContain('fcm.googleapis');
    expect(await pushRows(p.ref)).toBe(1);

    const meRes = await call('/api/v1/partners/me', { headers: { Cookie: p.cookie } });
    const meText = await meRes.text();
    expect(meText).not.toContain('fcm.googleapis');
    expect(JSON.parse(meText)).toMatchObject({ push: { key: KEY, on: true } });

    const off = await post('/api/v1/partners/push/off', { locale: 'en' }, p.cookie);
    expect(off.status).toBe(204);
    expect(await pushRows(p.ref)).toBe(0);

    const ledger = await DB.prepare(
      "SELECT decision, notice_version FROM consent_ledger WHERE subject_ref = ? AND purpose_id = 'partner_push' ORDER BY rowid",
    )
      .bind(p.ref)
      .all<{ decision: string; notice_version: string }>();
    expect(ledger.results).toEqual([
      { decision: 'granted', notice_version: 'partner-push-1' },
      { decision: 'withdrawn', notice_version: 'partner-push-1' },
    ]);
  });

  it('keeps one address per partner: a new opt-in replaces the old one', async () => {
    const p = await person();
    await optIn(p.cookie, ENDPOINT);
    await optIn(p.cookie, 'https://updates.push.services.mozilla.com/wpush/v2/synthetic');
    expect(await pushRows(p.ref)).toBe(1);
  });

  it('removes the push address when the account is erased', async () => {
    const p = await person();
    await optIn(p.cookie);
    await repo.eraseSubject(p.ref);
    expect(await pushRows(p.ref)).toBe(0);
  });
});

describe('the endpoint allow-list', () => {
  it('accepts the four browser push services only', () => {
    for (const ok of [
      'https://fcm.googleapis.com/fcm/send/abc',
      'https://updates.push.services.mozilla.com/wpush/v2/abc',
      'https://web.push.apple.com/abc',
      'https://wns2-pn1p.notify.windows.com/w/?token=abc',
    ]) {
      expect(isPushEndpoint(ok), ok).toBe(true);
    }
    for (const bad of ['https://example.com/x', 'https://169.254.169.254/latest', '', undefined]) {
      expect(isPushEndpoint(bad), String(bad)).toBe(false);
    }
  });
});

describe('who is notified for a nudge', () => {
  async function optedIn(
    status: 'approved' | 'pending',
    options: { ghat?: string | null; available?: boolean } = {},
  ): Promise<string> {
    const p = await person(status, options);
    await DB.prepare(
      'INSERT INTO partner_push (subject_ref, endpoint, created_at) VALUES (?, ?, ?)',
    )
      .bind(p.ref, `https://fcm.googleapis.com/fcm/send/${p.ref.slice(0, 12)}`, NOW_ISO)
      .run();
    return p.ref;
  }
  const clean = () => DB.prepare('DELETE FROM partner_push').run();

  it('picks approved, available, opted-in partners at the right ghat', async () => {
    await clean();
    const yes = await optedIn('approved', { ghat: 'kotilingala' });
    await optedIn('approved', { ghat: 'other-ghat' });
    await optedIn('approved', { available: false });
    await optedIn('pending');
    const noPush = await person('approved');

    const forGhat = await pushTargets(DB, 'kotilingala', NOW_MS);
    expect(forGhat.targets.map((t) => t.ref)).toEqual([yes]);
    expect(forGhat.more).toBe(0);
    expect(forGhat.targets.map((t) => t.ref)).not.toContain(noPush.ref);

    const everyone = await pushTargets(DB, null, NOW_MS);
    expect(everyone.targets).toHaveLength(2);
  });

  it('skips partners over their hourly limit and caps one nudge', async () => {
    await clean();
    const busy = await optedIn('approved');
    for (let i = 0; i < PUSH_PER_PARTNER_PER_HOUR; i += 1) {
      await recordPushResults(DB, [{ ref: busy, outcome: 'ok' }], NOW_MS);
    }
    expect((await pushTargets(DB, null, NOW_MS)).targets).toHaveLength(0);
    // An hour and a minute later the hourly window has passed (availability lasts 12 hours).
    await DB.prepare('UPDATE partner SET available_until = ? WHERE subject_ref = ?')
      .bind(new Date(NOW_MS + 12 * 3_600_000).toISOString(), busy)
      .run();
    expect((await pushTargets(DB, null, NOW_MS + 61 * 60_000)).targets).toHaveLength(1);

    await clean();
    for (let i = 0; i < PUSH_PER_NUDGE_CAP + 3; i += 1) await optedIn('approved');
    const capped = await pushTargets(DB, null, NOW_MS);
    expect(capped.targets).toHaveLength(PUSH_PER_NUDGE_CAP);
    expect(capped.more).toBe(3);
  });

  it('records results: success, failure, and a gone address is deleted', async () => {
    await clean();
    const good = await optedIn('approved');
    const flaky = await optedIn('approved');
    const gone = await optedIn('approved');
    await recordPushResults(
      DB,
      [
        { ref: good, outcome: 'ok' },
        { ref: flaky, outcome: 'failed' },
        { ref: gone, outcome: 'gone' },
      ],
      NOW_MS,
    );
    const rows = await DB.prepare(
      'SELECT subject_ref, last_ok_at, failed_at, hour_count FROM partner_push',
    ).all<{
      subject_ref: string;
      last_ok_at: string | null;
      failed_at: string | null;
      hour_count: number;
    }>();
    expect(rows.results).toHaveLength(2);
    const byRef = new Map(rows.results.map((r) => [r.subject_ref, r]));
    expect(byRef.get(good)).toMatchObject({ last_ok_at: NOW_ISO, failed_at: null, hour_count: 1 });
    expect(byRef.get(flaky)).toMatchObject({ last_ok_at: null, failed_at: NOW_ISO, hour_count: 1 });
    // A later success clears the failure.
    await recordPushResults(DB, [{ ref: flaky, outcome: 'ok' }], NOW_MS + 1000);
    const again = await DB.prepare(
      'SELECT failed_at, hour_count FROM partner_push WHERE subject_ref = ?',
    )
      .bind(flaky)
      .first<{ failed_at: string | null; hour_count: number }>();
    expect(again).toEqual({ failed_at: null, hour_count: 2 });
  });

  it('deletes the address when a partner is suspended or rejected', async () => {
    await clean();
    const ref = await optedIn('approved');
    expect(await decidePartner(DB, 'admin-1', ref, 'suspend', NOW_MS)).toBe(true);
    expect(await pushRows(ref)).toBe(0);
  });

  it('deletes an address that has failed for over 30 days', async () => {
    await clean();
    const stale = await optedIn('approved');
    const fresh = await optedIn('approved');
    await DB.prepare('UPDATE partner_push SET failed_at = ? WHERE subject_ref = ?')
      .bind(new Date(NOW_MS - 31 * 86_400_000).toISOString(), stale)
      .run();
    await DB.prepare('UPDATE partner_push SET failed_at = ? WHERE subject_ref = ?')
      .bind(new Date(NOW_MS - 2 * 86_400_000).toISOString(), fresh)
      .run();
    await purgeDuePartnerData(DB, NOW_MS);
    expect(await pushRows(stale)).toBe(0);
    expect(await pushRows(fresh)).toBe(1);
  });

  it('is deleted with all partner data on the retention date', async () => {
    await clean();
    const ref = await optedIn('approved');
    await repo.purgePartners('2028-07-14T00:00:00.000Z', '2028-07-14T00:00:00.000Z');
    expect(await pushRows(ref)).toBe(0);
  });
});

describe('sending an empty push', () => {
  let config: PushConfig;
  let publicKey: CryptoKey;

  function b64url(bytes: Uint8Array | string): string {
    const data = typeof bytes === 'string' ? new TextEncoder().encode(bytes) : bytes;
    let binary = '';
    for (const byte of data) binary += String.fromCharCode(byte);
    return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
  }
  function unb64url(text: string): Uint8Array {
    const padded = text
      .replaceAll('-', '+')
      .replaceAll('_', '/')
      .padEnd(Math.ceil(text.length / 4) * 4, '=');
    return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
  }

  beforeAll(async () => {
    const pair = (await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
      'sign',
      'verify',
    ])) as CryptoKeyPair;
    const jwk = (await crypto.subtle.exportKey('jwk', pair.privateKey)) as JsonWebKey;
    const point = new Uint8Array(65);
    point[0] = 4;
    point.set(unb64url(jwk.x ?? ''), 1);
    point.set(unb64url(jwk.y ?? ''), 33);
    publicKey = pair.publicKey;
    config = {
      privateKey: jwk.d ?? '',
      publicKey: b64url(point),
      subject: 'mailto:ops@example.test',
    };
  });

  it('builds a VAPID header whose signature, audience, expiry and subject verify', async () => {
    const header = await vapidAuthorization(ENDPOINT, config, NOW);
    const match = /^vapid t=([\w-]+)\.([\w-]+)\.([\w-]+), k=([\w-]+)$/.exec(header);
    expect(match).not.toBeNull();
    const [, head = '', claims = '', sig = '', k = ''] = match ?? [];
    expect(k).toBe(config.publicKey);
    expect(JSON.parse(new TextDecoder().decode(unb64url(head)))).toEqual({
      typ: 'JWT',
      alg: 'ES256',
    });
    const payload = JSON.parse(new TextDecoder().decode(unb64url(claims))) as {
      aud: string;
      exp: number;
      sub: string;
    };
    expect(payload).toEqual({
      aud: 'https://fcm.googleapis.com',
      exp: NOW + 43_200,
      sub: 'mailto:ops@example.test',
    });
    const valid = await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      publicKey,
      unb64url(sig),
      new TextEncoder().encode(`${head}.${claims}`),
    );
    expect(valid).toBe(true);
  });

  it('sends no body and no payload, only the auth, TTL and urgency headers', async () => {
    let seen: { url: string; init: RequestInit } | undefined;
    const fake: typeof fetch = (url, init) => {
      seen = { url: addressOf(url), init: init ?? {} };
      return Promise.resolve(new Response(null, { status: 201 }));
    };
    expect(await sendEmptyPush(ENDPOINT, config, NOW, undefined, fake)).toBe('ok');
    expect(seen?.url).toBe(ENDPOINT);
    expect(seen?.init.method).toBe('POST');
    expect(seen?.init.body).toBeUndefined();
    expect(seen?.init.redirect).toBe('manual');
    expect(Object.keys(seen?.init.headers ?? {}).sort()).toEqual([
      'Authorization',
      'TTL',
      'Urgency',
    ]);
  });

  it('maps answers: 2xx ok; 404 and 410 gone; anything else, a redirect or a crash failed', async () => {
    const answer =
      (status: number): typeof fetch =>
      () =>
        Promise.resolve(new Response(null, { status }));
    expect(await sendEmptyPush(ENDPOINT, config, NOW, undefined, answer(204))).toBe('ok');
    expect(await sendEmptyPush(ENDPOINT, config, NOW, undefined, answer(404))).toBe('gone');
    expect(await sendEmptyPush(ENDPOINT, config, NOW, undefined, answer(410))).toBe('gone');
    expect(await sendEmptyPush(ENDPOINT, config, NOW, undefined, answer(429))).toBe('failed');
    expect(await sendEmptyPush(ENDPOINT, config, NOW, undefined, answer(500))).toBe('failed');
    expect(await sendEmptyPush(ENDPOINT, config, NOW, undefined, answer(302))).toBe('failed');
    const crash: typeof fetch = () => Promise.reject(new Error(`secret ${ENDPOINT}`));
    expect(await sendEmptyPush(ENDPOINT, config, NOW, undefined, crash)).toBe('failed');
  });

  it('sends to every target and counts the outcomes without exposing addresses', async () => {
    const fake: typeof fetch = (url) =>
      Promise.resolve(
        new Response(null, {
          status: addressOf(url).endsWith('gone')
            ? 410
            : addressOf(url).endsWith('bad')
              ? 500
              : 201,
        }),
      );
    const { results, run } = await sendToTargets(
      [
        { ref: 'a', endpoint: 'https://fcm.googleapis.com/x/ok' },
        { ref: 'b', endpoint: 'https://fcm.googleapis.com/x/bad' },
        { ref: 'c', endpoint: 'https://fcm.googleapis.com/x/gone' },
      ],
      config,
      NOW,
      fake,
    );
    expect(run).toEqual({ sent: 1, failed: 1, gone: 1 });
    expect(JSON.stringify(results)).not.toContain('fcm.googleapis');
  });

  it('is configured only when the flag and all three values are right', () => {
    const all = {
      FLAG_PARTNER_PUSH: 'enabled',
      VAPID_PRIVATE_KEY: config.privateKey,
      VAPID_PUBLIC_KEY: config.publicKey,
      VAPID_SUBJECT: 'mailto:ops@example.test',
    };
    expect(pushConfig(all)).not.toBeNull();
    expect(pushConfig({ ...all, FLAG_PARTNER_PUSH: 'true' })).toBeNull();
    expect(pushConfig({ ...all, FLAG_PARTNER_PUSH: undefined })).toBeNull();
    expect(pushConfig({ ...all, VAPID_PRIVATE_KEY: undefined })).toBeNull();
    expect(pushConfig({ ...all, VAPID_PUBLIC_KEY: 'not base64!' })).toBeNull();
    expect(pushConfig({ ...all, VAPID_SUBJECT: undefined })).toBeNull();
    expect(pushConfig({ ...all, VAPID_SUBJECT: 'ops@example.test' })).toBeNull();
    expect(pushConfig({ ...all, VAPID_SUBJECT: 'https://example.test/contact' })).not.toBeNull();
  });
});
