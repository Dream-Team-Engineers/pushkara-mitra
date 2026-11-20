import { beforeEach, describe, expect, it } from 'vitest';
import { loadPlaces, parsePlaces, resetPlacesCache } from './places';

const good = { id: 'node/1', category: 'ghat', name: 'Pushkar Ghat', lat: 17, lng: 81.78 };

describe('parsePlaces', () => {
  it('keeps valid places and optional Telugu and Hindi names', () => {
    const [place] = parsePlaces({ places: [{ ...good, nameTe: 'పుష్కర ఘాట్', nameHi: 'पुष्कर घाट' }] });
    expect(place).toMatchObject({ name: 'Pushkar Ghat', nameTe: 'పుష్కర ఘాట్', nameHi: 'पुष्कर घाट' });
  });

  it('drops rows that are malformed, unknown, off the globe or oversized', () => {
    const rows = [
      good,
      { ...good, id: 'node/2', category: 'casino' },
      { ...good, id: 'node/3', lat: 'x' },
      { ...good, id: 'node/4', lat: 91 },
      { ...good, id: 'node/5', name: '' },
      { ...good, id: 'node/6', name: 'x'.repeat(500) },
      null,
      'text',
    ];
    expect(parsePlaces({ places: rows }).map((place) => place.id)).toEqual(['node/1']);
  });

  it('returns nothing for a body that is not a place list', () => {
    expect(parsePlaces(null)).toEqual([]);
    expect(parsePlaces({ places: 'no' })).toEqual([]);
    expect(parsePlaces([])).toEqual([]);
  });
});

describe('loadPlaces', () => {
  beforeEach(() => {
    resetPlacesCache();
  });

  const reply = (body: string, type: string, status = 200) =>
    (() =>
      Promise.resolve(
        new Response(body, { status, headers: { 'Content-Type': type } }),
      )) as unknown as typeof fetch;

  it('loads the list and remembers it', async () => {
    let calls = 0;
    const request = (() => {
      calls += 1;
      return Promise.resolve(Response.json({ places: [good] }));
    }) as unknown as typeof fetch;
    expect(await loadPlaces(request)).toHaveLength(1);
    expect(await loadPlaces(request)).toHaveLength(1);
    expect(calls).toBe(1);
  });

  it('treats an HTML fallback page or an error as no places, and retries next time', async () => {
    expect(await loadPlaces(reply('<html></html>', 'text/html'))).toEqual([]);
    expect(await loadPlaces(reply('{}', 'application/json', 404))).toEqual([]);
    expect(
      await loadPlaces(reply(JSON.stringify({ places: [good] }), 'application/json')),
    ).toHaveLength(1);
  });

  it('treats a network failure as no places', async () => {
    const down = (() => Promise.reject(new Error('offline'))) as unknown as typeof fetch;
    expect(await loadPlaces(down)).toEqual([]);
  });
});
