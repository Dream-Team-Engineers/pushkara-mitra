import { layers, namedFlavor } from '@protomaps/basemaps';
import type { StyleSpecification } from 'maplibre-gl';
import { TILES_PATH } from '../../shared/data/mapArchive';

/**
 * Map style for the regional archive (ADR 0016). Tiles, glyphs and sprites are all served from this
 * site's own origin under /maps/, so the page policy stays `connect-src 'self'` and no third party
 * ever sees a visitor's address. Street labels use the Latin and punctuation glyph ranges that are
 * shipped; names that exist only in Telugu are not drawn on the map yet (ghat names are page
 * elements, which use the app's own Telugu font).
 *
 * Data: OpenStreetMap contributors (ODbL), via a Protomaps basemap build. Attribution is mandatory.
 */
export const MAP_BOUNDS: readonly [number, number, number, number] = [81.62, 16.9, 81.92, 17.12];
export const MAP_CENTER: readonly [number, number] = [81.7787, 17.0005];
export const MAP_START_ZOOM = 12;
/** Tiles end at zoom 15; the map zooms in further by enlarging them. */
export const MAP_MAX_ZOOM = 18;

export type MapFlavor = 'light' | 'dark';

export function buildStyle(origin: string, flavor: MapFlavor): StyleSpecification {
  return {
    version: 8,
    glyphs: `${origin}/maps/fonts/{fontstack}/{range}.pbf`,
    sprite: `${origin}/maps/sprites/v4/${flavor}`,
    sources: {
      protomaps: {
        type: 'vector',
        url: `pmtiles://${origin}${TILES_PATH}`,
        attribution:
          '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap contributors</a>',
      },
    },
    layers: layers('protomaps', namedFlavor(flavor), { lang: 'en' }),
  };
}

/** The dark app theme gets the dark map; light and outdoor (high contrast, bright sun) get light. */
export function flavorFor(theme: 'light' | 'dark' | 'outdoor'): MapFlavor {
  return theme === 'dark' ? 'dark' : 'light';
}
