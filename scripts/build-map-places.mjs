// Builds web/public/maps/places.json: named ghats, temples and hospitals in the map area, taken from
// OpenStreetMap (ODbL). Every place is written with verified:false; nothing here is official guidance.
// Usage: node scripts/build-map-places.mjs   (needs network; the public Overpass servers can be slow, so it retries)
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, URL } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const output = resolve(root, 'web/public/maps/places.json');
// Same box as MAP_BOUNDS in web/src/features/map/mapStyle.ts (west, south, east, north).
const [west, south, east, north] = [81.62, 16.9, 81.92, 17.12];
const box = `${south},${west},${north},${east}`;
const SERVERS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];

const QUERIES = {
  ghat: [
    `nwr["amenity"="bathing_place"](${box});`,
    `nwr["leisure"="bathing_place"](${box});`,
    `nwr["ghat"](${box});`,
    `nwr["man_made"="ghat"](${box});`,
    `nwr["name"~"[Gg]hat"](${box});`,
  ],
  temple: [`nwr["amenity"="place_of_worship"]["name"](${box});`],
  hospital: [`nwr["amenity"="hospital"]["name"](${box});`],
};

async function overpass(body) {
  const data = `[out:json][timeout:90];(${body});out center tags;`;
  let lastError = 'no attempt';
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const server = SERVERS[attempt % SERVERS.length];
    try {
      const response = await globalThis.fetch(server, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'pushkara-mitra-map-build/1.0',
        },
        body: `data=${encodeURIComponent(data)}`,
        signal: globalThis.AbortSignal.timeout(100_000),
      });
      if (response.ok) return (await response.json()).elements;
      lastError = `${server} ${response.status}`;
    } catch (error) {
      lastError = `${server} ${error instanceof Error ? error.message : 'error'}`;
    }
    await new Promise((done) => setTimeout(done, 4000 * (attempt + 1)));
  }
  throw new Error(`Overpass failed: ${lastError}`);
}

const places = [];
const seen = new Set();
for (const [category, parts] of Object.entries(QUERIES)) {
  const elements = await overpass(parts.join(''));
  let added = 0;
  for (const element of elements) {
    const tags = element.tags ?? {};
    const lat = element.lat ?? element.center?.lat;
    const lng = element.lon ?? element.center?.lon;
    const name = (tags.name ?? tags['name:en'] ?? '').trim();
    if (typeof lat !== 'number' || typeof lng !== 'number' || name === '') continue;
    if (lng < west || lng > east || lat < south || lat > north) continue;
    // Temples: only places explicitly tagged Hindu (untagged places include banks, ashrams and churches).
    if (category === 'temple' && tags.religion !== 'hindu') continue;
    const key = `${element.type}/${element.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const entry = {
      id: key,
      category,
      name,
      lat: Math.round(lat * 1e5) / 1e5,
      lng: Math.round(lng * 1e5) / 1e5,
    };
    const te = (tags['name:te'] ?? '').trim();
    if (te !== '') entry.nameTe = te;
    const hi = (tags['name:hi'] ?? '').trim();
    if (hi !== '') entry.nameHi = hi;
    places.push(entry);
    added += 1;
  }
  console.log(`${category}: ${added} named places`);
}

places.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
const file = {
  source: 'OpenStreetMap contributors (ODbL), queried via Overpass',
  retrieved: new Date().toISOString().slice(0, 10),
  verified: false,
  places,
};
writeFileSync(output, `${JSON.stringify(file)}\n`, 'utf8');
console.log(`Wrote ${places.length} places to web/public/maps/places.json`);
