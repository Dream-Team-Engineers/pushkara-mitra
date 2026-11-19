#!/usr/bin/env node
/**
 * Checks a map archive written by build-map-extract.mjs: reads it back with the pmtiles library,
 * prints the header, and (when a planet URL is given) compares sample tiles byte for byte.
 * Usage: node scripts/verify-map-extract.mjs <archive> [planet URL]
 */
import { Buffer } from 'node:buffer';
import { closeSync, openSync, readSync } from 'node:fs';
import { PMTiles } from 'pmtiles';

const [file, planet] = process.argv.slice(2);
if (file === undefined) {
  console.error('Usage: node scripts/verify-map-extract.mjs <archive> [planet URL]');
  process.exit(2);
}

const fd = openSync(file, 'r');
const local = new PMTiles({
  getKey: () => file,
  getBytes: (offset, length) => {
    const buffer = Buffer.alloc(length);
    const read = readSync(fd, buffer, 0, length, offset);
    const slice = buffer.subarray(0, read);
    return Promise.resolve({
      data: slice.buffer.slice(slice.byteOffset, slice.byteOffset + slice.byteLength),
    });
  },
});

const header = await local.getHeader();
console.log({
  tiles: header.numAddressedTiles,
  zoom: `${header.minZoom}-${header.maxZoom}`,
  type: header.tileType,
  compression: header.tileCompression,
  bounds: [header.minLon, header.minLat, header.maxLon, header.maxLat],
});
const meta = await local.getMetadata();
console.log('layers:', (meta.vector_layers ?? []).map((l) => l.id).join(', '));
console.log('attribution:', String(meta.attribution ?? '').replace(/<[^>]*>/g, ''));

const tileAt = (lon, lat, z) => {
  const r = (lat * Math.PI) / 180;
  return [
    z,
    Math.floor(((lon + 180) / 360) * 2 ** z),
    Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** z),
  ];
};
// Rajamahendravaram city centre at several zooms, plus the world tile.
const samples = [[0, 0, 0], ...[8, 12, 14, 15].map((z) => tileAt(81.7787, 17.0005, z))];
const remote = planet === undefined ? null : new PMTiles(planet);
for (const [z, x, y] of samples) {
  const a = await local.getZxy(z, x, y);
  let line = `z${z}/${x}/${y}: ${a === undefined ? 'missing' : `${a.data.byteLength} bytes`}`;
  if (remote !== null && a !== undefined) {
    const b = await remote.getZxy(z, x, y);
    const same = b !== undefined && Buffer.compare(Buffer.from(a.data), Buffer.from(b.data)) === 0;
    line += same ? ' identical to planet (decoded)' : ' DIFFERS from planet';
  }
  console.log(line);
}
closeSync(fd);
