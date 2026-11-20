// Replaces the OpenStreetMap "ghat" entries in web/public/maps/places.json with the owner's list
// (scripts/owner-ghats.json). Run after scripts/build-map-places.mjs. Every place stays verified:false.
import { readFileSync, writeFileSync } from 'node:fs';

const target = 'web/public/maps/places.json';
const file = JSON.parse(readFileSync(target, 'utf8'));
const owner = JSON.parse(readFileSync('scripts/owner-ghats.json', 'utf8'));
const slug = (text) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
const osmGhats = file.places.filter((place) => place.category === 'ghat');
const kept = file.places.filter((place) => place.category !== 'ghat');
const ghats = owner.ghats.map((row) => {
  const osm =
    row.match === undefined ? undefined : osmGhats.find((place) => place.name === row.match);
  const entry = {
    id: `owner/${slug(row.name)}`,
    category: 'ghat',
    name: row.name,
    area: row.area,
    lat: osm?.lat ?? row.lat,
    lng: osm?.lng ?? row.lng,
  };
  if (osm?.nameTe !== undefined) entry.nameTe = osm.nameTe;
  if (row.approx === true) entry.approx = true;
  return entry;
});
file.places = [...ghats, ...kept];
file.ghatSource = owner.source;
writeFileSync(target, `${JSON.stringify(file)}\n`, 'utf8');
console.log(`ghats: ${ghats.length} (from owner list); other places: ${kept.length}`);
