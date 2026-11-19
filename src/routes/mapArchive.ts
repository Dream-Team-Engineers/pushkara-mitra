/**
 * GET /maps/godavari.pmtiles: the regional map archive, with byte-range support.
 *
 * The archive is a static file (built by scripts/build-map-extract.mjs). The map library reads it
 * with HTTP range requests, but static-asset serving does not always honour them, so the Worker
 * answers ranges itself by slicing the file. The bytes are public map data (OpenStreetMap, ODbL):
 * nothing about the visitor is read, stored or logged, and the cached copy holds only that file.
 * Files up to 25 MiB are supported, the static-asset limit.
 */
export const MAP_ARCHIVE_PATH = '/maps/godavari.pmtiles';
const MAX_BYTES = 25 * 1024 * 1024;
const CACHE_CONTROL = 'public, max-age=86400';

let cached: Promise<ArrayBuffer | null> | null = null;

async function load(assets: Fetcher, origin: string): Promise<ArrayBuffer | null> {
  const response = await assets.fetch(new Request(`${origin}${MAP_ARCHIVE_PATH}`));
  if (!response.ok) return null;
  const bytes = await response.arrayBuffer();
  return bytes.byteLength > 0 && bytes.byteLength <= MAX_BYTES ? bytes : null;
}

/** Parses one `bytes=start-end` range against a file size. Null when absent or not a single range. */
export function parseRange(
  header: string | null,
  size: number,
): [number, number] | 'invalid' | null {
  if (header === null) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (match === null || (match[1] === '' && match[2] === '')) return null;
  let start: number;
  let end: number;
  if (match[1] === '') {
    // Suffix range: the last N bytes.
    const length = Number(match[2]);
    start = Math.max(0, size - length);
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] === '' ? size - 1 : Math.min(Number(match[2]), size - 1);
  }
  return start > end || start >= size ? 'invalid' : [start, end];
}

export async function handleMapArchive(request: Request, assets: Fetcher): Promise<Response> {
  const url = new URL(request.url);
  cached ??= load(assets, url.origin).catch(() => null);
  const file = await cached;
  if (file === null) {
    cached = null; // try again next time rather than remembering a failure
    return new Response('Not Found', { status: 404, headers: { 'Cache-Control': 'no-store' } });
  }
  const base = {
    'Content-Type': 'application/octet-stream',
    'Accept-Ranges': 'bytes',
    'Cache-Control': CACHE_CONTROL,
  };
  const range = parseRange(request.headers.get('Range'), file.byteLength);
  if (range === 'invalid') {
    return new Response(null, {
      status: 416,
      headers: { ...base, 'Content-Range': `bytes */${String(file.byteLength)}` },
    });
  }
  if (range === null) {
    return new Response(request.method === 'HEAD' ? null : file, {
      headers: { ...base, 'Content-Length': String(file.byteLength) },
    });
  }
  const [start, end] = range;
  return new Response(request.method === 'HEAD' ? null : file.slice(start, end + 1), {
    status: 206,
    headers: {
      ...base,
      'Content-Range': `bytes ${String(start)}-${String(end)}/${String(file.byteLength)}`,
      'Content-Length': String(end - start + 1),
    },
  });
}
