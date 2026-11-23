import { describe, expect, it } from 'vitest';
import {
  cleanGroupName,
  createGroup,
  distanceM,
  joinGroup,
  loadGroup,
  parseRoomState,
  positionMessage,
  recordGroupConsent,
  removeMember,
  sharing,
} from './groupClient';

const GROUP_ID = 'abcdefghijklmnopqrstuvwxyz';

function fake(status: number, body: unknown = {}) {
  const calls: { url: string; init: RequestInit | undefined }[] = [];
  const request = ((input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: input instanceof Request ? input.url : input.toString(), init });
    if (status === 204) return Promise.resolve(new Response(null, { status }));
    return Promise.resolve(Response.json(body, { status }));
  }) as typeof fetch;
  return { request, calls };
}

describe('group client: groups API', () => {
  it('reads the active group and treats 404/503 as unavailable and 401 as sign-in', async () => {
    const active = {
      groups: [
        { id: GROUP_ID, role: 'owner', state: 'active', expiresAt: '2027-07-07', memberCount: 3 },
      ],
    };
    expect(await loadGroup(fake(200, active).request)).toEqual({
      status: 'in',
      group: {
        id: GROUP_ID,
        name: null,
        joinCode: null,
        role: 'owner',
        memberCount: 3,
        expiresAt: '2027-07-07',
      },
    });
    expect(await loadGroup(fake(200, { groups: [] }).request)).toEqual({ status: 'none' });
    expect(await loadGroup(fake(404).request)).toEqual({ status: 'unavailable' });
    expect(await loadGroup(fake(503).request)).toEqual({ status: 'unavailable' });
    expect(await loadGroup(fake(401).request)).toEqual({ status: 'signin' });
    await expect(loadGroup(fake(200, { groups: 'x' }).request)).rejects.toThrow();
  });

  it('sends cookies only to its own origin and never puts a position in a request', async () => {
    const { request, calls } = fake(201, { id: GROUP_ID, joinCode: 'ABCD2345' });
    expect(await createGroup('', request)).toEqual({ id: GROUP_ID, joinCode: 'ABCD2345' });
    expect(calls[0]?.init?.body).toBe('{}');
    expect(calls[0]?.init?.credentials).toBe('same-origin');
    expect(calls[0]?.init?.body as string).not.toMatch(/lat|lng/);
  });

  it('checks the join code shape before sending and maps the answers', async () => {
    const bad = fake(200);
    expect(await joinGroup('no', bad.request)).toBe('invalid');
    expect(bad.calls).toHaveLength(0);
    expect(await joinGroup('abcd-2345', fake(200, { id: GROUP_ID }).request)).toBe('joined');
    expect(await joinGroup('ABCD2345', fake(409).request)).toBe('already');
    const full = { error: { code: 'GROUP_FULL', message: 'The group is full.' } };
    expect(await joinGroup('ABCD2345', fake(409, full).request)).toBe('full');
    expect(await joinGroup('ABCD2345', fake(400).request)).toBe('invalid');
    expect(await joinGroup('ABCD2345', fake(503).request)).toBe('error');
  });

  it('removes a member by handle only, and only reports success on 204', async () => {
    const bad = fake(204);
    expect(await removeMember(GROUP_ID, 'Ravi', bad.request)).toBe(false);
    expect(bad.calls).toHaveLength(0);
    const good = fake(204);
    expect(await removeMember(GROUP_ID, '0123456789abcdef', good.request)).toBe(true);
    expect(good.calls[0]?.url).toBe(`/api/v1/groups/${GROUP_ID}/remove`);
    expect(good.calls[0]?.init?.body).toBe('{"member":"0123456789abcdef"}');
    expect(await removeMember(GROUP_ID, '0123456789abcdef', fake(404).request)).toBe(false);
  });

  it('records group consent with the notice version and locale', async () => {
    const { request, calls } = fake(201, { recorded: true });
    expect(await recordGroupConsent('te', request)).toBe(true);
    expect(JSON.parse(calls[0]?.init?.body as string)).toEqual({
      purposeId: 'group',
      noticeVersion: 'group-1',
      locale: 'te',
      decision: 'granted',
    });
  });
});

describe('group client: live room', () => {
  it('sends a cleaned group name and refuses a bad one without a request', async () => {
    const named = fake(201, { id: GROUP_ID, joinCode: 'ABCD2345' });
    expect(await createGroup('  Raju   Family ', named.request)).not.toBeNull();
    expect(named.calls[0]?.init?.body).toBe('{"name":"Raju Family"}');
    const bad = fake(201, { id: GROUP_ID, joinCode: 'ABCD2345' });
    expect(await createGroup('Raju-Family!', bad.request)).toBeNull();
    expect(bad.calls).toHaveLength(0);
    expect(cleanGroupName('a'.repeat(17))).toBeNull();
    expect(cleanGroupName('రాజు కుటుంబం')).toBe('రాజు కుటుంబం');
  });

  it('starts with sharing off', () => {
    expect(sharing.value).toBe(false);
  });

  it('parses room state strictly', () => {
    const ok = JSON.stringify({
      t: 'state',
      members: [
        { id: 'a', name: 'Asha', you: true, pos: null },
        { id: 'b', name: 'Ravi', you: false, pos: { lat: 17, lng: 81.7, acc: 9, ageS: 4 } },
      ],
    });
    expect(parseRoomState(ok)).toHaveLength(2);
    for (const bad of [
      'x',
      '{"t":"other","members":[]}',
      '{"t":"state","members":[{"id":"a"}]}',
      '{"t":"state","members":[{"id":"a","name":"A","you":false,"pos":{"lat":"1"}}]}',
      42,
    ]) {
      expect(parseRoomState(bad)).toBeNull();
    }
  });

  it('builds a position message only when the device position is on', () => {
    expect(positionMessage({ status: 'idle' })).toBeNull();
    expect(positionMessage({ status: 'off', reason: 'denied' })).toBeNull();
    expect(
      JSON.parse(
        positionMessage({ status: 'on', position: { lat: 17, lng: 81.7, accuracyM: 12.6 } }) ?? '',
      ),
    ).toEqual({ t: 'pos', lat: 17, lng: 81.7, acc: 13 });
  });

  it('measures distance in metres', () => {
    const d = distanceM({ lat: 17.0, lng: 81.7 }, { lat: 17.01, lng: 81.7 });
    expect(d).toBeGreaterThan(1100);
    expect(d).toBeLessThan(1120);
  });
});
