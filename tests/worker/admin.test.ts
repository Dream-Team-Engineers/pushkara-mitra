import { env } from 'cloudflare:test';
import { beforeAll, describe, expect, it } from 'vitest';
import core from '../../migrations/0002_backend_core.sql?raw';
import crowd from '../../migrations/0003_crowd_reading.sql?raw';
import groupName from '../../migrations/0004_group_name.sql?raw';
import groupBlock from '../../migrations/0005_group_block.sql?raw';
import metric from '../../migrations/0006_daily_metric.sql?raw';
import partnersMigration from '../../migrations/0007_partners.sql?raw';
import pushMigration from '../../migrations/0010_partner_push.sql?raw';
import { handleAdmin, type AdminEnv } from '../../src/admin/index';
import { escapeHtml } from '../../src/admin/render';
import worker, { type Env } from '../../src/index';
import type { KeyLookup } from '../../src/security/accessJwt';

/** Staff dashboard (ADR 0018). Synthetic keys, subjects and rows only. */
const DB = (env as unknown as { DB: D1Database }).DB;
const ISSUER = 'https://synthetic-team.cloudflareaccess.com';
const AUD = 'synthetic-admin-aud';
// 2026-11-23 12:00 IST.
const NOW_MS = Date.parse('2026-11-23T06:30:00Z');
const NOW = Math.floor(NOW_MS / 1000);
const ORIGIN = 'https://example.test';

function b64url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
const encodeJson = (value: unknown) => b64url(new TextEncoder().encode(JSON.stringify(value)));

let privateKey: CryptoKey;
let lookupKey: KeyLookup;

async function token(payload: Record<string, unknown> = {}): Promise<string> {
  const head = encodeJson({ alg: 'RS256', typ: 'JWT', kid: 'k1' });
  const body = encodeJson({
    iss: ISSUER,
    aud: [AUD],
    sub: 'synthetic-admin-subject',
    iat: NOW,
    exp: NOW + 600,
    ...payload,
  });
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    privateKey,
    new TextEncoder().encode(`${head}.${body}`),
  );
  return `${head}.${body}.${b64url(new Uint8Array(signature))}`;
}

const ENV: AdminEnv = { DB, ACCESS_TEAM_DOMAIN: ISSUER, ACCESS_AUD: AUD, ENVIRONMENT_NAME: 'test' };

async function get(path: string, jwt: string | null, e: AdminEnv = ENV): Promise<Response> {
  const headers = new Headers();
  if (jwt !== null) headers.set('Cf-Access-Jwt-Assertion', jwt);
  return handleAdmin(new Request(`https://admin.example.test${path}`, { headers }), e, {
    lookupKey,
    nowMs: () => NOW_MS,
  });
}

beforeAll(async () => {
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
  privateKey = pair.privateKey;
  const jwk = (await crypto.subtle.exportKey('jwk', pair.publicKey)) as JsonWebKey;
  lookupKey = (kid) => Promise.resolve(kid === 'k1' ? jwk : null);

  const migration = [
    core,
    crowd,
    groupName,
    groupBlock,
    metric,
    partnersMigration,
    pushMigration,
  ].join('\n\n');
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
  // Synthetic activity: two sign-ins by one person (one new, one returning), one group, counters.
  await DB.batch([
    DB.prepare(
      "INSERT INTO session (id_hash, subject_ref, created_at, expires_at) VALUES ('h1', 'subj-a', '2026-11-22T05:00:00.000Z', '2026-12-30T00:00:00.000Z')",
    ),
    DB.prepare(
      "INSERT INTO session (id_hash, subject_ref, created_at, expires_at) VALUES ('h2', 'subj-a', '2026-11-23T05:00:00.000Z', '2026-12-30T00:00:00.000Z')",
    ),
    DB.prepare(
      "INSERT INTO group_ (id, name, created_at, expires_at) VALUES ('g1', 'Secret Family', '2026-11-23T04:00:00.000Z', '2026-12-07T00:00:00.000Z')",
    ),
    DB.prepare(
      "INSERT INTO membership (group_id, subject_ref, role, joined_at) VALUES ('g1', 'subj-a', 'owner', '2026-11-23T04:00:00.000Z')",
    ),
    DB.prepare(
      "INSERT INTO daily_metric (period, metric, locale, n) VALUES ('2026-11-23', 'open', 'te', 7), ('2026-11-23', 'open', 'en', 3), ('2026-11-23T12', 'open', 'te', 4), ('2026-11-22', 'install', 'te', 2)",
    ),
  ]);
});

describe('admin admission', () => {
  it('answers 503 until Access is configured, and 403 without a valid token', async () => {
    expect((await get('/', await token(), { DB })).status).toBe(503);
    expect((await get('/', null)).status).toBe(403);
    expect((await get('/', 'not.a.token')).status).toBe(403);
    expect((await get('/', await token({ aud: ['other-app'] }))).status).toBe(403);
    expect((await get('/', await token({ exp: NOW - 120 }))).status).toBe(403);
  });

  it('narrows admission to ADMIN_SUBJECTS when that is set', async () => {
    const narrowed = { ...ENV, ADMIN_SUBJECTS: 'someone-else, another' };
    expect((await get('/', await token(), narrowed)).status).toBe(403);
    const listed = { ...ENV, ADMIN_SUBJECTS: 'synthetic-admin-subject' };
    expect((await get('/', await token(), listed)).status).toBe(200);
  });

  it('is read-only and sends strict security headers', async () => {
    const jwt = await token();
    const post = await handleAdmin(
      new Request('https://admin.example.test/', {
        method: 'POST',
        headers: { 'Cf-Access-Jwt-Assertion': jwt },
      }),
      ENV,
      { lookupKey, nowMs: () => NOW_MS },
    );
    expect(post.status).toBe(405);
    const page = await get('/', jwt);
    expect(page.headers.get('Content-Security-Policy')).toContain("default-src 'none'");
    expect(page.headers.get('Cache-Control')).toBe('no-store');
    expect((await get('/admin.css', jwt)).headers.get('Content-Type')).toContain('text/css');
    expect((await get('/elsewhere', jwt)).status).toBe(404);
  });
});

describe('admin pages', () => {
  it('shows counts on every tab and never a pseudonym or group name', async () => {
    const jwt = await token();
    const pages: Record<string, string> = {};
    for (const tab of ['growth', 'live', 'groups', 'partners', 'more']) {
      const response = await get(`/?tab=${tab}`, jwt);
      expect(response.status).toBe(200);
      pages[tab] = await response.text();
      expect(pages[tab]).not.toContain('subj-a');
      expect(pages[tab]).not.toContain('Secret Family');
      expect(pages[tab]).not.toContain('<script');
    }
    const growth = await (await get('/?tab=growth&range=today', jwt)).text();
    expect(growth).toContain('<strong>10</strong> App opens');
    expect(growth).toContain('<strong>1</strong> Groups created');
    expect(pages['groups']).toContain('<strong>1</strong> Active groups');
    expect(pages['live']).toContain('<strong>4</strong> App opens this hour');
    expect(pages['live']).toContain('http-equiv="refresh"');
    const week = await (await get('/?tab=growth&range=7d', jwt)).text();
    expect(week).toContain('<strong>1</strong> New sign-ins');
    expect(week).toContain('Returning sign-ins');
  });

  it('escapes text it prints', () => {
    expect(escapeHtml('<b a="1">&\'')).toBe('&lt;b a=&quot;1&quot;&gt;&amp;&#39;');
  });
});

describe('app-open counter route', () => {
  const ENABLED: Env = { DB, FLAG_METRICS: 'enabled' };
  const ping = (body: unknown, e: Env = ENABLED, origin = ORIGIN) =>
    worker.fetch(
      new Request(`${ORIGIN}/api/v1/ping`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: origin,
          'CF-Connecting-IP': '203.0.113.9',
        },
        body: JSON.stringify(body),
      }),
      e,
    );

  it('is off unless FLAG_METRICS is exactly "enabled"', async () => {
    expect((await ping({ event: 'open', locale: 'te' }, { DB })).status).toBe(404);
  });

  it('counts one open by day and hour, and refuses anything else', async () => {
    const before = await DB.prepare(
      "SELECT COALESCE(SUM(n), 0) AS n FROM daily_metric WHERE metric = 'open' AND locale = 'hi' AND length(period) = 10",
    ).first<{ n: number }>();
    expect((await ping({ event: 'open', locale: 'hi' })).status).toBe(204);
    const after = await DB.prepare(
      "SELECT COALESCE(SUM(n), 0) AS n FROM daily_metric WHERE metric = 'open' AND locale = 'hi' AND length(period) = 10",
    ).first<{ n: number }>();
    expect((after?.n ?? 0) - (before?.n ?? 0)).toBe(1);
    expect((await ping({ event: 'open', locale: 'fr' })).status).toBe(400);
    expect((await ping({ event: 'open', locale: 'te', device: 'x' })).status).toBe(400);
    expect((await ping({ event: 'open', locale: 'te' }, ENABLED, 'https://evil.test')).status).toBe(
      403,
    );
  });
});
