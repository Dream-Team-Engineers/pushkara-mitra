#!/usr/bin/env node
/**
 * Builds the regional map archive served at /maps/godavari.pmtiles.
 *
 * Reads a Protomaps planet build (OpenStreetMap data, ODbL) over HTTP range requests with the
 * `pmtiles` library, keeps every tile that intersects the bounding box up to the chosen zoom, and
 * writes a PMTiles v3 archive. Tile contents are not changed (decoded by the library and
 * re-gzipped), so the schema and attribution match the source.
 *
 * Usage: node scripts/build-map-extract.mjs <planet.pmtiles URL> <out file> [maxZoom]
 * Example: node scripts/build-map-extract.mjs https://build.protomaps.com/20261118.pmtiles web/public/maps/godavari.pmtiles 15
 *
 * Phase 1 area: Rajamahendravaram, Kovvur and Dowleswaram (BBOX below). Widening it later means
 * changing BBOX and re-running; keep the file under the 25 MiB Workers static-asset limit.
 * Attribution to show on the map: (c) OpenStreetMap contributors (ODbL), OQ-036.
 */
import { Buffer } from 'node:buffer';
import { writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { PMTiles, zxyToTileId } from 'pmtiles';

const [url, out, maxZoomArg] = process.argv.slice(2);
if (url === undefined || out === undefined) {
  console.error('Usage: node scripts/build-map-extract.mjs <planet URL> <out file> [maxZoom]');
  process.exit(2);
}
const MAX_ZOOM = Number(maxZoomArg ?? 15);
/** west, south, east, north (degrees) */
const BBOX = [81.62, 16.9, 81.92, 17.12];
const CENTER = { lon: 81.7787, lat: 17.0005, zoom: 12 };

const lon2x = (lon, z) => Math.floor(((lon + 180) / 360) * 2 ** z);
const lat2y = (lat, z) => {
  const r = (lat * Math.PI) / 180;
  return Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** z);
};

const source = new PMTiles(url);
const header = await source.getHeader();
if (header.tileCompression !== 2) {
  console.error('source tiles are not gzip-compressed; this script writes gzip only');
  process.exit(1);
}
const metadata = await source.getMetadata();

const wanted = [];
for (let z = 0; z <= MAX_ZOOM; z++) {
  const x0 = lon2x(BBOX[0], z);
  const x1 = lon2x(BBOX[2], z);
  const y0 = lat2y(BBOX[3], z);
  const y1 = lat2y(BBOX[1], z);
  for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) wanted.push([z, x, y]);
}
console.log(`tiles wanted: ${wanted.length}`);

const entries = [];
let done = 0;
const pool = 8;
let next = 0;
async function worker() {
  while (next < wanted.length) {
    const [z, x, y] = wanted[next++];
    const tile = await source.getZxy(z, x, y);
    // The library returns decompressed tiles; store them gzip-compressed as the header says.
    if (tile !== undefined)
      entries.push({
        id: zxyToTileId(z, x, y),
        data: new Uint8Array(gzipSync(Buffer.from(tile.data))),
      });
    done++;
    if (done % 100 === 0) console.log(`  ${done}/${wanted.length}`);
  }
}
await Promise.all(Array.from({ length: pool }, worker));
entries.sort((a, b) => a.id - b.id);
console.log(`tiles found: ${entries.length}`);

function varint(n, bytes) {
  let v = BigInt(n);
  while (v >= 0x80n) {
    bytes.push(Number(v & 0x7fn) | 0x80);
    v >>= 7n;
  }
  bytes.push(Number(v));
}

// Directory: count, tile id deltas, run lengths, lengths, offsets (0 = contiguous with the previous).
const dir = [];
varint(entries.length, dir);
let last = 0;
for (const e of entries) {
  varint(e.id - last, dir);
  last = e.id;
}
for (let i = 0; i < entries.length; i++) varint(1, dir);
for (const e of entries) varint(e.data.length, dir);
let pos = 0;
let prevEnd = -1;
for (const e of entries) {
  varint(pos === prevEnd ? 0 : pos + 1, dir);
  prevEnd = pos + e.data.length;
  pos += e.data.length;
}
const rootDir = gzipSync(Buffer.from(dir));
if (rootDir.length > 16384 - 127) {
  console.error('root directory too large for a single directory; add leaf directories first');
  process.exit(1);
}
const meta = gzipSync(
  Buffer.from(
    JSON.stringify({
      ...metadata,
      name: 'Pushkara Mitra Godavari region',
      description: `Extract of ${url} for bbox ${BBOX.join(',')}, zoom 0-${MAX_ZOOM}`,
    }),
  ),
);

const tileBytes = entries.reduce((sum, e) => sum + e.data.length, 0);
const head = Buffer.alloc(127);
head.write('PMTiles', 0, 'latin1');
head.writeUInt8(3, 7);
const u64 = (value, at) => head.writeBigUInt64LE(BigInt(value), at);
const rootOffset = 127;
const metaOffset = rootOffset + rootDir.length;
const dataOffset = metaOffset + meta.length;
u64(rootOffset, 8);
u64(rootDir.length, 16);
u64(metaOffset, 24);
u64(meta.length, 32);
u64(dataOffset, 40); // leaf directories: none (offset points at the end of metadata, length 0)
u64(0, 48);
u64(dataOffset, 56);
u64(tileBytes, 64);
u64(entries.length, 72);
u64(entries.length, 80);
u64(entries.length, 88);
head.writeUInt8(1, 96); // clustered
head.writeUInt8(2, 97); // internal compression: gzip
head.writeUInt8(header.tileCompression, 98);
head.writeUInt8(header.tileType, 99);
head.writeUInt8(0, 100);
head.writeUInt8(MAX_ZOOM, 101);
head.writeInt32LE(Math.round(BBOX[0] * 1e7), 102);
head.writeInt32LE(Math.round(BBOX[1] * 1e7), 106);
head.writeInt32LE(Math.round(BBOX[2] * 1e7), 110);
head.writeInt32LE(Math.round(BBOX[3] * 1e7), 114);
head.writeUInt8(CENTER.zoom, 118);
head.writeInt32LE(Math.round(CENTER.lon * 1e7), 119);
head.writeInt32LE(Math.round(CENTER.lat * 1e7), 123);

writeFileSync(
  out,
  Buffer.concat([head, rootDir, meta, ...entries.map((e) => Buffer.from(e.data))]),
);
console.log(
  `wrote ${out}: ${((127 + rootDir.length + meta.length + tileBytes) / 1048576).toFixed(1)} MiB`,
);
