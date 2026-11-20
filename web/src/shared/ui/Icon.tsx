/** Original line icons drawn for this app (24 x 24 grid, 2 px stroke). No third-party icon set. */
export type IconName =
  | 'hospital'
  | 'home'
  | 'pass'
  | 'group'
  | 'ghats'
  | 'map'
  | 'stay'
  | 'travel'
  | 'help'
  | 'updates'
  | 'conditions'
  | 'partners'
  | 'settings'
  | 'back'
  | 'globe'
  | 'cloud'
  | 'pause'
  | 'play'
  | 'info'
  | 'phone'
  | 'check'
  | 'lock'
  | 'external'
  | 'close'
  | 'train'
  | 'bus'
  | 'plane'
  | 'temple'
  | 'news'
  | 'bed'
  | 'book'
  | 'chevron';

const PATHS: Readonly<Record<IconName, readonly string[]>> = {
  home: ['M3 11l9-8 9 8', 'M5 10v10h14V10', 'M10 20v-6h4v6'],
  pass: ['M3 6h18v12H3z', 'M7 10h5', 'M7 14h3', 'M15 11h3', 'M15 15h3'],
  group: [
    'M9 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6z',
    'M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6',
    'M17 7a2.5 2.5 0 1 1 0 5',
    'M18 14.2c1.8.7 3 2.4 3 4.8',
  ],
  hospital: ['M9 4h6v5h5v6h-5v5H9v-5H4V9h5z'],
  ghats: ['M3 20h4v-4h4v-4h4V8h6', 'M3 23h18'],
  map: [
    'M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 1 1 13 0c0 5.4-6.5 11-6.5 11z',
    'M12 7.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5z',
  ],
  stay: ['M3 18V6', 'M3 14h18v4', 'M21 14v-3a3 3 0 0 0-3-3h-7v6'],
  travel: ['M5 4h14a2 2 0 0 1 2 2v10H3V6a2 2 0 0 1 2-2z', 'M3 11h18', 'M7 20v-4', 'M17 20v-4'],
  help: ['M12 3l10 18H2z', 'M12 10v5', 'M12 18h.01'],
  updates: ['M5 4h12v16H5z', 'M17 8h3v10a2 2 0 0 1-2 2', 'M8 8h6', 'M8 12h6', 'M8 16h4'],
  conditions: ['M3 17a9 9 0 0 1 18 0', 'M12 17l4-5', 'M3 20h18'],
  partners: ['M12 20s-8-5-8-11a4.5 4.5 0 0 1 8-2.5A4.5 4.5 0 0 1 20 9c0 6-8 11-8 11z'],
  settings: ['M4 7h10', 'M18 7h2', 'M16 5v4', 'M4 17h2', 'M10 17h10', 'M8 15v4'],
  back: ['M15 5l-7 7 7 7'],
  globe: [
    'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z',
    'M3 12h18',
    'M12 3c3 3 3 15 0 18',
    'M12 3c-3 3-3 15 0 18',
  ],
  cloud: ['M7 18a4 4 0 0 1-.5-8A5.5 5.5 0 0 1 17 8.5 4 4 0 0 1 17 18z'],
  pause: ['M8 5v14', 'M16 5v14'],
  play: ['M8 5l11 7-11 7z'],
  info: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z', 'M12 11v5', 'M12 8h.01'],
  phone: [
    'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z',
  ],
  check: ['M5 12l5 5 9-10'],
  lock: ['M6 11h12v9H6z', 'M8 11V8a4 4 0 0 1 8 0v3'],
  close: ['M6 6l12 12', 'M18 6L6 18'],
  train: [
    'M7 3h10a2 2 0 0 1 2 2v10a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V5a2 2 0 0 1 2-2z',
    'M5 11h14',
    'M8 21l2-3',
    'M16 21l-2-3',
    'M9 15h.01',
    'M15 15h.01',
  ],
  bus: ['M5 4h14a2 2 0 0 1 2 2v11H3V6a2 2 0 0 1 2-2z', 'M3 11h18', 'M7 17v3', 'M17 17v3'],
  plane: ['M2 14l9-2-4-8h2l7 8 5-1a1.5 1.5 0 0 1 0 3l-5-1-7 8H7l4-8-9-1z'],
  temple: [
    'M12 3l3 4H9z',
    'M6 11h12l-2-4H8z',
    'M4 21h16',
    'M6 21V11',
    'M18 21V11',
    'M10 21v-5h4v5',
  ],
  news: ['M4 5h13v14H4z', 'M17 9h3v8a2 2 0 0 1-2 2', 'M7 9h7', 'M7 13h7', 'M7 16h4'],
  bed: ['M3 19V6', 'M3 14h18v5', 'M21 14v-2a3 3 0 0 0-3-3h-8v5'],
  book: ['M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z', 'M5 17a3 3 0 0 1 3-3h11'],
  chevron: ['M6 9l6 6 6-6'],
  external: ['M14 4h6v6', 'M20 4l-9 9', 'M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5'],
};

export function Icon({ name, size = 24 }: { readonly name: IconName; readonly size?: number }) {
  return (
    <svg
      class="icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      {PATHS[name].map((d) => (
        // Closed shapes carry a class so tinted contexts can add a soft fill (two-tone icons).
        <path key={d} d={d} class={/z$/i.test(d) ? 'icon__fill' : undefined} />
      ))}
    </svg>
  );
}

export function BrandMark({ size = 32 }: { readonly size?: number }) {
  // Temporary logo (owner-supplied artwork, see docs/design/brand/README.md).
  return (
    <img
      class="brand-mark"
      src="/logo-96.png"
      width={size}
      height={size}
      alt="Pushkara Mitra"
      aria-hidden="true"
      decoding="async"
    />
  );
}
