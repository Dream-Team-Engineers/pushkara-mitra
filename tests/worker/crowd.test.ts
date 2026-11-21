import { env } from 'cloudflare:test';
import { beforeAll, describe, expect, it } from 'vitest';
import core from '../../migrations/0002_backend_core.sql?raw';
import crowdMigration from '../../migrations/0003_crowd_reading.sql?raw';
import { d1Repository } from '../../src/db/repository';
import worker, { type Env } from '../../src/index';
import { CROWD_STALE_AFTER_SECONDS } from '../../src/routes/v1';

const DB = (env as unknown as { DB: D1Database }).DB;
const ORIGIN = 'https://example.test';
const TOKEN = 'test-crowd-token-long-enough-0123456789';
const ENABLED: Env = { DB, FLAG_CROWD: 'enabled', CROWD_INGEST_TOKEN: TOKEN };

let counter = 0;
const uniqueIp = () => `198.51.${String(Math.floor(counter / 250))}.${String(++counter % 250)}`;

function call(path: string, init: RequestInit = {}, e: Env = ENABLED): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set('CF-Connecting-IP', uniqueIp());
  return worker.fetch(new Request(`${ORIGIN}${path}`, { ...init, headers }), e);
}

function report(body: unknown, token: string | null = TOKEN, e: Env = ENABLED) {
  return call(
    '/api/v1/crowd',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token === null ? {} : { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(body),
    },
    e,
  );
}

const read = async (e: Env = ENABLED) => (await call('/api/v1/crowd', {}, e)).json();

beforeAll(async () => {
  for (const migration of [core, crowdMigration]) {
    for (const statement of migration.split(/;\s*\n\s*\n/)) {
      const sql = statement.replaceAll(/^--.*$/gm, '').trim();
      if (sql !== '') await DB.prepare(sql).run();
    }
  }
});

describe('crowd flag and storage fail closed', () => {
  it('answers 404 unless FLAG_CROWD is exactly "enabled"', async () => {
    for (const value of [undefined, '', 'true', 'ENABLED', '1']) {
      const e: Env = {
        DB,
        CROWD_INGEST_TOKEN: TOKEN,
        ...(value === undefined ? {} : { FLAG_CROWD: value }),
      };
      expect((await call('/api/v1/crowd', {}, e)).status).toBe(404);
      expect((await report({ ghatId: 'a', level: 'low' }, TOKEN, e)).status).toBe(404);
    }
  });

  it('answers 503 without a database and never pretends to have stored anything', async () => {
    const e: Env = { FLAG_CROWD: 'enabled', CROWD_INGEST_TOKEN: TOKEN };
    expect((await call('/api/v1/crowd', {}, e)).status).toBe(503);
    expect((await report({ ghatId: 'a', level: 'low' }, TOKEN, e)).status).toBe(503);
  });

  it('answers 503 for reporting when no ingest token is configured', async () => {
    const e: Env = { DB, FLAG_CROWD: 'enabled' };
    expect((await report({ ghatId: 'a', level: 'low' }, 'anything', e)).status).toBe(503);
    expect((await call('/api/v1/crowd', {}, e)).status).toBe(200);
  });
});

describe('reporting a crowd level', () => {
  it('rejects a missing, wrong or malformed token with 401 and stores nothing', async () => {
    const body = { ghatId: 'owner/unauthorised-ghat', level: 'high' };
    for (const token of [null, '', 'wrong', `${TOKEN}x`, TOKEN.slice(1)]) {
      const response = await report(body, token);
      expect(response.status).toBe(401);
      expect(response.headers.get('WWW-Authenticate')).toBe('Bearer');
    }
    const basic = await call('/api/v1/crowd', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Basic ${TOKEN}` },
      body: JSON.stringify(body),
    });
    expect(basic.status).toBe(401);
    expect(JSON.stringify(await read())).not.toContain('unauthorised-ghat');
  });

  it('rejects unknown fields, bad ids and bad levels', async () => {
    const bad: unknown[] = [
      { ghatId: 'a', level: 'low', note: 'extra' },
      { ghatId: 'a', level: 'low', lat: 17.0 },
      { ghatId: 'a' },
      { level: 'low' },
      { ghatId: '', level: 'low' },
      { ghatId: 'A', level: 'low' },
      { ghatId: '../x', level: 'low' },
      { ghatId: 'a'.repeat(65), level: 'low' },
      { ghatId: 'a', level: 'noData' },
      { ghatId: 'a', level: 'LOW' },
      { ghatId: 'a', level: 3 },
      { ghatId: 7, level: 'low' },
      [],
    ];
    for (const body of bad) expect((await report(body)).status).toBe(400);
  });

  it('rejects non-JSON and oversized bodies', async () => {
    const text = await call('/api/v1/crowd', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain', Authorization: `Bearer ${TOKEN}` },
      body: 'x',
    });
    expect(text.status).toBe(415);
    const big = await call('/api/v1/crowd', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
      body: JSON.stringify({ ghatId: 'a', level: 'low', pad: 'x'.repeat(3000) }),
    });
    expect(big.status).toBe(413);
  });

  it('rejects other methods with 405', async () => {
    const response = await call('/api/v1/crowd', { method: 'DELETE' });
    expect(response.status).toBe(405);
  });

  it('stores the latest level per ghat and the public read returns it', async () => {
    expect((await report({ ghatId: 'owner/pushkar-ghat', level: 'low' })).status).toBe(201);
    expect((await report({ ghatId: 'owner/pushkar-ghat', level: 'high' })).status).toBe(201);
    expect((await report({ ghatId: 'owner/saraswati-ghat', level: 'moderate' })).status).toBe(201);
    const body = (await read()) as {
      staleAfterSeconds: number;
      ghats: Record<string, { level: string; reportedAt: string }>;
    };
    expect(body.staleAfterSeconds).toBe(CROWD_STALE_AFTER_SECONDS);
    expect(body.ghats['owner/pushkar-ghat']?.level).toBe('high');
    expect(body.ghats['owner/saraswati-ghat']?.level).toBe('moderate');
    expect(Object.keys(body.ghats['owner/pushkar-ghat'] ?? {}).sort()).toEqual([
      'level',
      'reportedAt',
    ]);
    const rows = await DB.prepare(
      "SELECT COUNT(*) AS n FROM crowd_reading WHERE ghat_id = 'owner/pushkar-ghat'",
    ).first<{ n: number }>();
    expect(rows?.n).toBe(1);
  });

  it('never caches the read or the report', async () => {
    const response = await call('/api/v1/crowd');
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });
});

describe('stale readings are not shown', () => {
  it('leaves out a reading older than the stale window', async () => {
    const repo = d1Repository(DB);
    const now = Math.floor(Date.now() / 1000);
    const at = (seconds: number) => new Date(seconds * 1000).toISOString();
    await repo.upsertCrowdReading({
      ghatId: 'owner/old-ghat',
      level: 'high',
      reportedAt: at(now - CROWD_STALE_AFTER_SECONDS - 60),
    });
    await repo.upsertCrowdReading({
      ghatId: 'owner/fresh-ghat',
      level: 'low',
      reportedAt: at(now - 60),
    });
    const body = (await read()) as { ghats: Record<string, unknown> };
    expect(body.ghats['owner/old-ghat']).toBeUndefined();
    expect(body.ghats['owner/fresh-ghat']).toBeDefined();
  });
});

describe('privacy of the table', () => {
  it('holds no coordinate, person, device or free-text column', async () => {
    const result = await DB.prepare('PRAGMA table_info(crowd_reading)').all<{ name: string }>();
    const columns = result.results.map((c) => c.name);
    expect(columns).toEqual(['ghat_id', 'level', 'reported_at']);
  });
});
