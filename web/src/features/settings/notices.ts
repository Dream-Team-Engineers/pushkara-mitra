/**
 * Third-party components shipped in the built app. Licence identifiers come from
 * docs/legal/licence-register.md (checked against the upstream sources on 2026-11-10); the notice
 * text for the fonts ships beside them. Legal review of this list is still open (NEEDS REVIEW).
 */
export interface Notice {
  readonly name: string;
  readonly licence: string;
  /** Same-origin path of the bundled licence text, when one ships with the app. */
  readonly licenceTextPath?: string;
}

export const FONT_NOTICES: readonly Notice[] = [
  { name: 'Roboto', licence: 'SIL OFL 1.1', licenceTextPath: '/fonts/Roboto-OFL.txt' },
  {
    name: 'Noto Sans Telugu',
    licence: 'SIL OFL 1.1',
    licenceTextPath: '/fonts/NotoSansTelugu-OFL.txt',
  },
  {
    name: 'Noto Sans Devanagari',
    licence: 'SIL OFL 1.1',
    licenceTextPath: '/fonts/NotoSansDevanagari-OFL.txt',
  },
  {
    name: 'Noto Sans (map labels)',
    licence: 'SIL OFL 1.1',
    licenceTextPath: '/maps/fonts/OFL.txt',
  },
];

export const SOFTWARE_NOTICES: readonly Notice[] = [
  { name: 'Preact', licence: 'MIT' },
  { name: '@preact/signals', licence: 'MIT' },
  { name: 'MapLibre GL JS', licence: 'BSD-3-Clause' },
  { name: 'PMTiles', licence: 'BSD-3-Clause' },
  { name: 'Protomaps Basemaps (map style)', licence: 'BSD-3-Clause' },
  {
    name: 'Map icons (Protomaps sprites, derived from tangrams icons)',
    licence: 'MIT (per the Protomaps README; licence text to be added)',
  },
  { name: 'Map data © OpenStreetMap contributors', licence: 'ODbL 1.0' },
];
