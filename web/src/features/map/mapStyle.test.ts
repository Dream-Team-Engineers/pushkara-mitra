import { describe, expect, it } from 'vitest';
import { TILES_PATH } from '../../shared/data/mapArchive';
import { buildStyle, flavorFor, MAP_BOUNDS } from './mapStyle';

const ORIGIN = 'https://app.example';

describe('buildStyle', () => {
  const style = buildStyle(ORIGIN, 'light');

  it('serves tiles, glyphs and sprites from this origin only', () => {
    const urls = [
      style.glyphs ?? '',
      typeof style.sprite === 'string' ? style.sprite : '',
      ...Object.values(style.sources).map((source) => ('url' in source ? (source.url ?? '') : '')),
    ];
    for (const url of urls)
      expect(url.replace('pmtiles://', '')).toMatch(/^https:\/\/app\.example\//);
    expect(style.sources['protomaps']).toMatchObject({
      type: 'vector',
      url: `pmtiles://${ORIGIN}${TILES_PATH}`,
    });
  });

  it('credits OpenStreetMap contributors, as the licence requires', () => {
    const source = style.sources['protomaps'];
    expect(source !== undefined && 'attribution' in source ? source.attribution : '').toContain(
      'OpenStreetMap contributors',
    );
  });

  it('has drawing layers, and a dark flavour for the dark theme', () => {
    expect(style.layers.length).toBeGreaterThan(20);
    expect(buildStyle(ORIGIN, 'dark').sprite).toBe(`${ORIGIN}/maps/sprites/v4/dark`);
  });
});

describe('flavorFor', () => {
  it('uses the dark map only for the dark theme', () => {
    expect(flavorFor('dark')).toBe('dark');
    expect(flavorFor('light')).toBe('light');
    expect(flavorFor('outdoor')).toBe('light');
  });
});

describe('map area', () => {
  it('is west, south, east, north around Rajamahendravaram', () => {
    const [west, south, east, north] = MAP_BOUNDS;
    expect(west).toBeLessThan(81.7787);
    expect(east).toBeGreaterThan(81.7787);
    expect(south).toBeLessThan(17.0005);
    expect(north).toBeGreaterThan(17.0005);
  });
});
