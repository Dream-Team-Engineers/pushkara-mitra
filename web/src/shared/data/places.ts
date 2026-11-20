/**
 * Map places (ghats, temples, hospitals). The file is built by scripts/build-map-places.mjs from
 * OpenStreetMap (ODbL) and served as a static file from this site. Every place is unverified
 * until someone confirms it; nothing here is official guidance. Feature code does not touch the
 * network, so the request lives here with the other data clients.
 */
export const PLACES_PATH = '/maps/places.json';

export const PLACE_CATEGORIES = ['ghat', 'temple', 'hospital'] as const;
export type PlaceCategory = (typeof PLACE_CATEGORIES)[number];

export interface Place {
  readonly id: string;
  readonly category: PlaceCategory;
  readonly name: string;
  readonly nameTe?: string;
  readonly nameHi?: string;
  readonly lat: number;
  readonly lng: number;
}

const MAX_PLACES = 2000;
const MAX_NAME = 120;

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' && value.length <= MAX_NAME
    ? value.trim()
    : undefined;
}

function parsePlace(raw: unknown): Place | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const row = raw as Record<string, unknown>;
  const id = text(row['id']);
  const name = text(row['name']);
  const category = PLACE_CATEGORIES.find((value) => value === row['category']);
  const { lat, lng } = row;
  if (id === undefined || name === undefined || category === undefined) return null;
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  const nameTe = text(row['nameTe']);
  const nameHi = text(row['nameHi']);
  return {
    id,
    category,
    name,
    lat,
    lng,
    ...(nameTe === undefined ? {} : { nameTe }),
    ...(nameHi === undefined ? {} : { nameHi }),
  };
}

export function parsePlaces(body: unknown): readonly Place[] {
  const list =
    typeof body === 'object' && body !== null ? (body as { places?: unknown }).places : null;
  if (!Array.isArray(list)) return [];
  const places: Place[] = [];
  for (const raw of list.slice(0, MAX_PLACES) as unknown[]) {
    const place = parsePlace(raw);
    if (place !== null) places.push(place);
  }
  return places;
}

let cached: Promise<readonly Place[]> | null = null;

/** The places, or an empty list when the file is missing or unreadable (the map still works). */
export function loadPlaces(
  request: typeof fetch = (input, init) => fetch(input, init),
): Promise<readonly Place[]> {
  cached ??= request(PLACES_PATH, { credentials: 'omit', signal: AbortSignal.timeout(8000) })
    .then(async (response) => {
      const type = response.headers.get('Content-Type') ?? '';
      if (!response.ok || !type.includes('json')) return [];
      return parsePlaces(await response.json());
    })
    .catch(() => [])
    .then((places) => {
      // An empty answer (offline, missing file) is not remembered, so a later visit can try again.
      if (places.length === 0) cached = null;
      return places;
    });
  return cached;
}

/** Test helper. */
export function resetPlacesCache(): void {
  cached = null;
}
