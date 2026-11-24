import { describe, expect, it } from 'vitest';
import {
  ageMinutes,
  applyAsPartner,
  fetchVolunteerUpdates,
  loadMe,
  postVolunteerUpdate,
} from './partnersClient';

const NOW = Date.parse('2026-12-01T10:00:00.000Z');
const ago = (seconds: number) => new Date(NOW - seconds * 1000).toISOString();

const reply =
  (status: number, body?: unknown): typeof fetch =>
  () =>
    Promise.resolve(
      body === undefined ? new Response(null, { status }) : Response.json(body, { status }),
    );

const updatesBody = (updates: unknown) => ({
  source: 'volunteer',
  official: false,
  shownForSeconds: 10800,
  updates,
});

describe('fetchVolunteerUpdates', () => {
  it('returns fresh updates and drops one past the window', async () => {
    const result = await fetchVolunteerUpdates(
      reply(
        200,
        updatesBody([
          { kind: 'crowd', ghatId: 'g1', value: 'high', reportedAt: ago(60) },
          { kind: 'food', ghatId: 'g1', value: 'finished', reportedAt: ago(10801) },
        ]),
      ),
      NOW,
    );
    expect(result?.updates).toEqual([
      { kind: 'crowd', ghatId: 'g1', value: 'high', reportedAt: ago(60) },
    ]);
  });

  it('is null when the feature is off (404) or not set up (503)', async () => {
    expect(await fetchVolunteerUpdates(reply(404), NOW)).toBeNull();
    expect(await fetchVolunteerUpdates(reply(503), NOW)).toBeNull();
  });

  it('rejects a value that is not one of the fixed choices', async () => {
    await expect(
      fetchVolunteerUpdates(
        reply(
          200,
          updatesBody([{ kind: 'crowd', ghatId: 'g1', value: 'rising', reportedAt: ago(1) }]),
        ),
        NOW,
      ),
    ).rejects.toThrow();
  });

  it('rejects a body that is not the contract', async () => {
    await expect(fetchVolunteerUpdates(reply(200, { updates: 'x' }), NOW)).rejects.toThrow();
  });
});

describe('loadMe', () => {
  it('maps off, signed out and no application', async () => {
    expect(await loadMe(reply(404))).toEqual({ status: 'unavailable' });
    expect(await loadMe(reply(401))).toEqual({ status: 'signin' });
    expect(await loadMe(reply(200, { status: 'none' }))).toEqual({ status: 'none' });
    expect(await loadMe(reply(200, { status: 'pending' }))).toEqual({ status: 'pending' });
  });

  it('reads an approved partner', async () => {
    const me = await loadMe(
      reply(200, {
        status: 'approved',
        role: 'priest',
        ghatId: null,
        available: true,
        availableUntil: ago(-60),
        unread: 2,
      }),
    );
    expect(me).toMatchObject({ status: 'approved', role: 'priest', available: true, unread: 2 });
  });

  it('rejects an approved body with a missing field', async () => {
    await expect(loadMe(reply(200, { status: 'approved', role: 'priest' }))).rejects.toThrow();
  });
});

describe('writes', () => {
  it('sends only the fixed fields for an update and never a position', async () => {
    let sent = '';
    const spy: typeof fetch = (_url, init) => {
      sent = typeof init?.body === 'string' ? init.body : '';
      return Promise.resolve(Response.json({ recorded: true }, { status: 201 }));
    };
    const result = await postVolunteerUpdate({ kind: 'river', ghatId: 'g1', value: 'rising' }, spy);
    expect(result).toBe('ok');
    expect(JSON.parse(sent)).toEqual({ kind: 'river', ghatId: 'g1', value: 'rising' });
  });

  it('always sends consent true with an application', async () => {
    let sent = '';
    const spy: typeof fetch = (_url, init) => {
      sent = typeof init?.body === 'string' ? init.body : '';
      return Promise.resolve(Response.json({ status: 'pending' }, { status: 201 }));
    };
    const result = await applyAsPartner(
      { credential: 'tok', role: 'volunteer', ghatId: null, locale: 'en' },
      spy,
    );
    expect(result).toBe('ok');
    expect(JSON.parse(sent)).toMatchObject({ consent: true, role: 'volunteer', ghatId: null });
  });

  it('maps statuses to results', async () => {
    const input = { kind: 'crowd', ghatId: 'g1', value: 'low' } as const;
    expect(await postVolunteerUpdate(input, reply(429))).toBe('limited');
    expect(await postVolunteerUpdate(input, reply(401))).toBe('signin');
    expect(await postVolunteerUpdate(input, reply(409))).toBe('refused');
    expect(await postVolunteerUpdate(input, reply(404))).toBe('unavailable');
    expect(await postVolunteerUpdate(input, reply(500))).toBe('failed');
  });
});

describe('ageMinutes', () => {
  it('counts whole minutes and never goes negative', () => {
    expect(ageMinutes(ago(185), NOW)).toBe(3);
    expect(ageMinutes(ago(-500), NOW)).toBe(0);
  });
});
