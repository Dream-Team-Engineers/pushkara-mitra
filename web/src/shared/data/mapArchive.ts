import { offlineMapStatus } from '../pwa/offlineMap';

/**
 * Where the regional map archive lives on this site, and a check that it is really there
 * (feature code may not use the network, so the request lives here with the other data clients).
 * The archive is built by scripts/build-map-extract.mjs and served as a static file with range requests.
 */
export const TILES_PATH = '/maps/godavari.pmtiles';

/**
 * True only when the archive exists and really is one: the first bytes of a PMTiles file are
 * "PMTiles". A missing file can answer with an HTML page, so the status code alone is not enough.
 */
export async function tilesAvailable(
  request: typeof fetch = (input, init) => fetch(input, init),
): Promise<boolean> {
  // Offline: do not even ask the network (the browser would log a failed request). The real map is
  // still used when the person saved it on this phone; otherwise the schematic is shown.
  const onLine: unknown =
    typeof navigator === 'undefined' ? true : Reflect.get(navigator, 'onLine');
  if (onLine === false) return (await offlineMapStatus()) === true;
  try {
    const response = await request(TILES_PATH, {
      headers: { Range: 'bytes=0-6' },
      credentials: 'omit',
      signal: AbortSignal.timeout(8000),
    });
    if (response.status !== 200 && response.status !== 206) return false;
    const head = new TextDecoder().decode((await response.arrayBuffer()).slice(0, 7));
    return head === 'PMTiles';
  } catch {
    return false;
  }
}
