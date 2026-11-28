import { env } from 'cloudflare:test';
import { beforeAll, describe, expect, it } from 'vitest';
import core from '../../migrations/0002_backend_core.sql?raw';
import partnersMigration from '../../migrations/0007_partners.sql?raw';
import pushMigration from '../../migrations/0010_partner_push.sql?raw';
import { handleAdmin, type AdminEnv } from '../../src/admin/index';
import { setUpdateHidden } from '../../src/db/adminPartners';
import type { KeyLookup } from '../../src/security/accessJwt';

/** Admin Partners tab (ADR 0019). Synthetic keys, admins and people only. */
const DB = (env as unknown as { DB: D1Database }).DB;
const ISSUER = 'https://synthetic-team.cloudflareaccess.com';
const AUD = 'synthetic-admin-aud';
const NOW_MS = Date.parse('2026-11-24T06:30:00Z');
const NOW = Math.floor(NOW_MS / 1000);
const ORIGIN = 'https://admin.example.test';

function b64url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
const encodeJson = (value: unknown) => b64url(new TextEncoder().encode(JSON.stringify(value)));

let privateKey: CryptoKey;
let lookupKey: KeyLookup;

async function token(sub = 'synthetic-admin-1'): Promise<string> {
  const head = encodeJson({ alg: 'RS256', typ: 'JWT', kid: 'k1' });
  const body = encodeJson({ iss: ISSUER, aud: [AUD], sub, iat: NOW, exp: NOW + 600 });
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    privateKey,
    new TextEncoder().encode(`${head}.${body}`),
  );
  return `${head}.${body}.${b64url(new Uint8Array(signature))}`;
}

const ON: AdminEnv = {
  DB,
  ACCESS_TEAM_DOMAIN: ISSUER,
  ACCESS_AUD: AUD,
  ENVIRONMENT_NAME: 'test',
  FLAG_PARTNERS: 'enabled',
};
const OFF: AdminEnv = { ...ON, FLAG_PARTNERS: 'off' };
const deps = () => ({ lookupKey, nowMs: () => NOW_MS });

function view(jwt: string, query = '?tab=partners', e: AdminEnv = ON): Promise<Response> {
  return handleAdmin(
    new Request(`${ORIGIN}/${query}`, { headers: { 'Cf-Access-Jwt-Assertion': jwt } }),
    e,
    deps(),
  );
}

/** The CSRF token the page embeds in its forms. */
async function csrfFrom(jwt: string): Promise<string> {
  const html = await (await view(jwt)).text();
  const match = /name="csrf" value="([a-f0-9]{64})"/.exec(html);
  if (match?.[1] === undefined) throw new Error('no csrf field on the page');
  return match[1];
}

function submit(
  path: string,
  jwt: string,
  fields: Record<string, string>,
  { origin = ORIGIN, e = ON, type = 'application/x-www-form-urlencoded' } = {},
): Promise<Response> {
  return handleAdmin(
    new Request(`${ORIGIN}${path}`, {
      method: 'POST',
      headers: { 'Cf-Access-Jwt-Assertion': jwt, Origin: origin, 'Content-Type': type },
      body: new URLSearchParams(fields).toString(),
    }),
    e,
    deps(),
  );
}

const location = (r: Response) => r.headers.get('Location') ?? '';

let seq = 0;
async function addPartner(
  status: 'pending' | 'approved',
  extra: { name?: string; role?: 'priest' | 'volunteer'; availableUntil?: string | null } = {},
): Promise<string> {
  const ref = `synthetic-ref-${String(++seq)}-${crypto.randomUUID().slice(0, 6)}`;
  await DB.prepare(
    `INSERT INTO partner (subject_ref, role, ghat_id, status, name, email, applied_at, available_until)
     VALUES (?, ?, 'kotilingala', ?, ?, ?, ?, ?)`,
  )
    .bind(
      ref,
      extra.role ?? 'volunteer',
      status,
      extra.name ?? `Name ${ref}`,
      `${ref}@example.com`,
      new Date(NOW_MS - 3_600_000).toISOString(),
      extra.availableUntil ?? null,
    )
    .run();
  return ref;
}

async function status(ref: string): Promise<string | undefined> {
  return (
    await DB.prepare('SELECT status FROM partner WHERE subject_ref = ?').bind(ref).first<{
      status: string;
    }>()
  )?.status;
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
  for (const migration of [core, partnersMigration, pushMigration]) {
    for (const statement of migration.split(/;\s*\n\s*\n/)) {
      const sql = statement.replaceAll(/^--.*$/gm, '').trim();
      if (sql !== '') await DB.prepare(sql).run();
    }
  }
});

describe('the Partners tab', () => {
  it('lists waiting applicants with name and email, escaped, and shows the buttons', async () => {
    const jwt = await token();
    const ref = await addPartner('pending', { name: '<b>Ravi</b> & Sons' });
    const html = await (await view(jwt)).text();
    expect(html).toContain('&lt;b&gt;Ravi&lt;/b&gt; &amp; Sons');
    expect(html).not.toContain('<b>Ravi</b>');
    expect(html).toContain(`${ref}@example.com`);
    expect(html).toContain('action="/partners/decide"');
    expect(html).toContain('Waiting for approval');
  });

  it('is read-only and says so while FLAG_PARTNERS is off', async () => {
    const jwt = await token();
    await addPartner('pending');
    const html = await (await view(jwt, '?tab=partners', OFF)).text();
    expect(html).toContain('switched off');
    expect(html).not.toContain('action="/partners/decide"');
    expect(html).not.toContain('action="/partners/nudge"');
  });

  it('counts available priests and volunteers by availability that has not expired', async () => {
    const jwt = await token();
    const future = new Date(NOW_MS + 3_600_000).toISOString();
    const past = new Date(NOW_MS - 3_600_000).toISOString();
    await addPartner('approved', { role: 'priest', availableUntil: future });
    await addPartner('approved', { role: 'volunteer', availableUntil: past });
    const html = await (await view(jwt)).text();
    expect(html).toMatch(/<strong>1<\/strong><span>Priests available/);
  });
});

describe('write actions', () => {
  it('approves and rejects a waiting applicant, and records which admin and when', async () => {
    const jwt = await token('synthetic-admin-1');
    const csrf = await csrfFrom(jwt);
    const a = await addPartner('pending');
    const b = await addPartner('pending');

    const approved = await submit('/partners/decide', jwt, { csrf, ref: a, do: 'approve' });
    expect(approved.status).toBe(303);
    expect(location(approved)).toBe('/?tab=partners&notice=approved');
    expect(await status(a)).toBe('approved');

    const rejected = await submit('/partners/decide', jwt, { csrf, ref: b, do: 'reject' });
    expect(location(rejected)).toContain('notice=rejected');
    expect(await status(b)).toBe('rejected');

    const rows = await DB.prepare(
      'SELECT admin, action, target, at FROM partner_audit WHERE target IN (?, ?) ORDER BY action',
    )
      .bind(a, b)
      .all<{ admin: string; action: string; target: string; at: string }>();
    expect(rows.results.map((r) => [r.admin, r.action, r.target])).toEqual([
      ['synthetic-admin-1', 'approve', a],
      ['synthetic-admin-1', 'reject', b],
    ]);
    expect(rows.results[0]?.at).toBe(new Date(NOW_MS).toISOString());
  });

  it('suspends an approved partner and re-approves them; refuses impossible changes', async () => {
    const jwt = await token();
    const csrf = await csrfFrom(jwt);
    const ref = await addPartner('approved', {
      availableUntil: new Date(NOW_MS + 3_600_000).toISOString(),
    });
    await submit('/partners/decide', jwt, { csrf, ref, do: 'suspend' });
    expect(await status(ref)).toBe('suspended');
    // Suspension also switches availability off.
    const row = await DB.prepare('SELECT available_until FROM partner WHERE subject_ref = ?')
      .bind(ref)
      .first<{ available_until: string | null }>();
    expect(row?.available_until).toBeNull();
    // A rejected person cannot be approved by a stray request; only a new application can.
    const waiting = await addPartner('pending');
    await submit('/partners/decide', jwt, { csrf, ref: waiting, do: 'reject' });
    const again = await submit('/partners/decide', jwt, { csrf, ref: waiting, do: 'approve' });
    expect(location(again)).toContain('notice=invalid');
    expect(await status(waiting)).toBe('rejected');

    await submit('/partners/decide', jwt, { csrf, ref, do: 'approve' });
    expect(await status(ref)).toBe('approved');
  });

  it('refuses a missing or wrong token, a foreign origin, a wrong type and a closed flag', async () => {
    const jwt = await token();
    const csrf = await csrfFrom(jwt);
    const ref = await addPartner('pending');
    const fields = { csrf, ref, do: 'approve' };

    expect((await submit('/partners/decide', jwt, { ref, do: 'approve' })).status).toBe(403);
    expect(
      (await submit('/partners/decide', jwt, { ...fields, csrf: 'a'.repeat(64) })).status,
    ).toBe(403);
    // A token made for another admin session does not work here.
    const other = await token('synthetic-admin-2');
    expect((await submit('/partners/decide', other, fields)).status).toBe(403);
    expect(
      (await submit('/partners/decide', jwt, fields, { origin: 'https://evil.test' })).status,
    ).toBe(403);
    expect(
      (await submit('/partners/decide', jwt, fields, { type: 'application/json' })).status,
    ).toBe(415);
    expect((await submit('/partners/decide', jwt, fields, { e: OFF })).status).toBe(404);
    expect(await status(ref)).toBe('pending');
  });

  it('accepts a same-origin post that arrives with Origin null, and refuses a cross-site one', async () => {
    const jwt = await token('synthetic-admin-1');
    const csrf = await csrfFrom(jwt);
    const ref = await addPartner('pending');
    const post = (origin: string | null, site: string) =>
      handleAdmin(
        new Request(`${ORIGIN}/partners/decide`, {
          method: 'POST',
          headers: {
            'Cf-Access-Jwt-Assertion': jwt,
            'Sec-Fetch-Site': site,
            'Content-Type': 'application/x-www-form-urlencoded',
            ...(origin === null ? {} : { Origin: origin }),
          },
          body: new URLSearchParams({ csrf, ref, do: 'approve' }).toString(),
        }),
        ON,
        deps(),
      );
    expect((await post('null', 'cross-site')).status).toBe(403);
    expect((await post(null, 'cross-site')).status).toBe(403);
    expect((await post('https://evil.example', 'same-origin')).status).toBe(403);
    expect((await post('null', 'same-origin')).status).toBe(303);
  });

  it('needs a verified Access token for writes too', async () => {
    const response = await handleAdmin(
      new Request(`${ORIGIN}/partners/decide`, {
        method: 'POST',
        headers: { Origin: ORIGIN, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'ref=x&do=approve',
      }),
      ON,
      deps(),
    );
    expect(response.status).toBe(403);
  });

  it('sends fixed-kind nudges, validates the ghat, and limits each admin to 10 an hour', async () => {
    const jwt = await token('synthetic-admin-nudge');
    const csrf = await csrfFrom(jwt);
    const first = await submit('/partners/nudge', jwt, {
      csrf,
      kind: 'river',
      ghat: 'kotilingala',
    });
    expect(location(first)).toContain('notice=nudged');
    const nudge = await DB.prepare(
      "SELECT kind, ghat_id, created_by, expires_at FROM partner_nudge WHERE created_by = 'synthetic-admin-nudge'",
    ).first<{ kind: string; ghat_id: string; created_by: string; expires_at: string }>();
    expect(nudge).toEqual({
      kind: 'river',
      ghat_id: 'kotilingala',
      created_by: 'synthetic-admin-nudge',
      expires_at: new Date(NOW_MS + 6 * 3_600_000).toISOString(),
    });

    expect(location(await submit('/partners/nudge', jwt, { csrf, kind: 'weather' }))).toContain(
      'invalid',
    );
    expect(
      location(await submit('/partners/nudge', jwt, { csrf, kind: 'food', ghat: 'Bad Ghat!' })),
    ).toContain('invalid');

    for (let i = 0; i < 9; i++) {
      expect(location(await submit('/partners/nudge', jwt, { csrf, kind: 'crowd' }))).toContain(
        'nudged',
      );
    }
    expect(location(await submit('/partners/nudge', jwt, { csrf, kind: 'crowd' }))).toContain(
      'limit',
    );
    // Another admin has their own allowance.
    const other = await token('synthetic-admin-other');
    const otherCsrf = await csrfFrom(other);
    expect(
      location(await submit('/partners/nudge', other, { csrf: otherCsrf, kind: 'crowd' })),
    ).toContain('nudged');
  });

  it('hides and shows an update, and the third hidden update suspends the partner', async () => {
    const jwt = await token();
    const csrf = await csrfFrom(jwt);
    const ref = await addPartner('approved');
    const ids: string[] = [];
    for (let i = 0; i < 3; i++) {
      const id = `${'0'.repeat(31)}${String(i)}`.slice(-32).replace(/^0{1}/, 'a');
      ids.push(id);
      await DB.prepare(
        "INSERT INTO partner_update (id, subject_ref, kind, ghat_id, value, created_at) VALUES (?, ?, 'crowd', ?, 'high', ?)",
      )
        .bind(id + String(seq), ref, `spot-${String(i)}`, new Date(NOW_MS - 600_000).toISOString())
        .run();
    }
    const rows = await DB.prepare('SELECT id FROM partner_update WHERE subject_ref = ? ORDER BY id')
      .bind(ref)
      .all<{ id: string }>();
    const [one, two, three] = rows.results.map((r) => r.id);
    expect(one).toBeDefined();
    // The route only accepts 32-hex ids, so exercise the repository for non-conforming synthetic ids.
    expect(await setUpdateHidden(DB, 'synthetic-admin-1', one ?? '', true, NOW_MS)).toBe(true);
    expect(await status(ref)).toBe('approved');
    // Hiding twice changes nothing the second time.
    expect(await setUpdateHidden(DB, 'synthetic-admin-1', one ?? '', true, NOW_MS)).toBe(false);
    expect(await setUpdateHidden(DB, 'synthetic-admin-1', one ?? '', false, NOW_MS)).toBe(true);

    for (const id of [one, two, three])
      await setUpdateHidden(DB, 'synthetic-admin-1', id ?? '', true, NOW_MS);
    expect(await status(ref)).toBe('suspended');
    const system = await DB.prepare(
      "SELECT admin, action FROM partner_audit WHERE target = ? AND action = 'suspend'",
    )
      .bind(ref)
      .first<{ admin: string; action: string }>();
    expect(system).toEqual({ admin: 'system', action: 'suspend' });

    // Through the form: a real 32-hex id.
    const formId = 'f'.repeat(32);
    await DB.prepare(
      "INSERT INTO partner_update (id, subject_ref, kind, ghat_id, value, created_at) VALUES (?, ?, 'food', 'kotilingala', 'available', ?)",
    )
      .bind(formId, ref, new Date(NOW_MS - 60_000).toISOString())
      .run();
    expect(
      location(await submit('/partners/hide', jwt, { csrf, id: formId, do: 'hide' })),
    ).toContain('hidden');
    expect(
      location(await submit('/partners/hide', jwt, { csrf, id: formId, do: 'show' })),
    ).toContain('shown');
    expect(
      location(await submit('/partners/hide', jwt, { csrf, id: 'nope', do: 'hide' })),
    ).toContain('invalid');
  });

  it('removes a rejected applicant name and email after 30 days, and expired nudges', async () => {
    const jwt = await token();
    const ref = await addPartner('pending');
    const day = 86_400_000;
    await DB.prepare("UPDATE partner SET status = 'rejected', decided_at = ? WHERE subject_ref = ?")
      .bind(new Date(NOW_MS - 31 * day).toISOString(), ref)
      .run();
    await DB.prepare(
      "INSERT INTO partner_nudge (id, kind, ghat_id, created_at, expires_at, created_by) VALUES ('old-nudge', 'food', NULL, ?, ?, 'a')",
    )
      .bind(
        new Date(NOW_MS - 2 * day).toISOString(),
        new Date(NOW_MS - 2 * day + 6 * 3_600_000).toISOString(),
      )
      .run();
    await view(jwt); // viewing the tab runs the retention rules
    const row = await DB.prepare('SELECT status, name, email FROM partner WHERE subject_ref = ?')
      .bind(ref)
      .first<{ status: string; name: string | null; email: string | null }>();
    expect(row).toEqual({ status: 'rejected', name: null, email: null });
    const nudge = await DB.prepare(
      "SELECT COUNT(*) AS n FROM partner_nudge WHERE id = 'old-nudge'",
    ).first<{
      n: number;
    }>();
    expect(nudge?.n).toBe(0);
  });
});
