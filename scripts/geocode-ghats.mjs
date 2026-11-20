// One-off helper: looks up each ghat from the owner's list (2026-11-20) on OpenStreetMap Nominatim and prints
// what it found. Results are unverified; nothing is written. Usage: node scripts/geocode-ghats.mjs
const LIST = [
  ['Pushkar Ghat', 'Rajahmundry'],
  ['Kotilingala Revu', 'Rajahmundry'],
  ['Saraswati Ghat', 'Rajahmundry'],
  ['Gowthami Ghat', 'Rajahmundry'],
  ['Tummalapalli Vari Revu', 'Rajahmundry'],
  ['Narasimha Nagar Ghat', 'Rajahmundry'],
  ['Dowleswaram Barrage', 'Dowleswaram'],
  ['Venkateswara Ghat', 'Rajahmundry'],
  ['Goshpada Kshetram', 'Kovvur'],
  ['Subrahmanyeswara Ghat', 'Kovvur'],
  ['Nagareswaram', 'Kovvur'],
  ['Purushottapatnam', 'East Godavari'],
  ['Seethanagaram', 'East Godavari'],
  ['Pattiseema', 'East Godavari'],
  ['Vangalapudi', 'East Godavari'],
  ['Munikudali', 'East Godavari'],
  ['Antarvedi', 'Konaseema'],
  ['Narasapuram', 'West Godavari'],
  ['Bhadrachalam', 'Telangana'],
];
for (const [name, area] of LIST) {
  const q = `${name}, ${area}, India`;
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=2&q=${encodeURIComponent(q)}`;
  try {
    const r = await globalThis.fetch(url, {
      headers: { 'User-Agent': 'pushkara-mitra-ghat-lookup/1.0' },
    });
    const rows = await r.json();
    console.log(
      name,
      '|',
      rows.length === 0
        ? 'NOT FOUND'
        : rows
            .map(
              (x) =>
                `${(+x.lat).toFixed(4)},${(+x.lon).toFixed(4)} ${x.type} "${x.display_name.slice(0, 60)}"`,
            )
            .join(' ;; '),
    );
  } catch (e) {
    console.log(name, '| error', e.message);
  }
  await new Promise((d) => setTimeout(d, 1500));
}
