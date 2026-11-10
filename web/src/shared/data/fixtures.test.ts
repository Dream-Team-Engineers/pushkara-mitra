import { describe, expect, it } from 'vitest';
import { hasPublicMeta } from './contracts';
import { loadPublic } from './client';
import { GHATS, STAYS, TRAVEL, UPDATES } from './fixtures';
import { ADS, HEADLINES } from './fixtures-home';

const ALL = [...GHATS, ...STAYS, ...TRAVEL, ...UPDATES, ...HEADLINES, ...ADS];

describe('synthetic fixtures', () => {
  it('carry complete source metadata', () => {
    for (const item of ALL) expect(hasPublicMeta(item)).toBe(true);
  });

  it('are all marked synthetic and unverified, so none can pass as real information', () => {
    for (const item of ALL) {
      expect(item.synthetic).toBe(true);
      expect(item.status).toBe('unverified');
      expect(item.sourceUrl).toBeNull();
    }
  });

  it('use unique ids within each list', () => {
    for (const list of [GHATS, STAYS, TRAVEL, UPDATES, HEADLINES, ADS]) {
      expect(new Set(list.map((item) => item.id)).size).toBe(list.length);
    }
  });

  it('flag sponsored stays and ads explicitly', () => {
    expect(STAYS.some((stay) => stay.sponsored)).toBe(true);
    expect(ADS.every((ad) => ad.sponsored)).toBe(true);
  });
});

describe('hasPublicMeta', () => {
  it('rejects items with a missing source, a bad date or an unknown status', () => {
    const good = GHATS[0];
    expect(hasPublicMeta({ ...good, source: '' })).toBe(false);
    expect(hasPublicMeta({ ...good, updatedAt: 'later' })).toBe(false);
    expect(hasPublicMeta({ ...good, status: 'trusted' })).toBe(false);
    expect(hasPublicMeta({ ...good, synthetic: 'yes' })).toBe(false);
    expect(hasPublicMeta(null)).toBe(false);
  });
});

describe('loadPublic', () => {
  it('returns valid items and rejects an item without source metadata', async () => {
    expect(await loadPublic(GHATS)).toHaveLength(GHATS.length);
    const broken = [{ ...GHATS[0], source: '' }] as unknown as typeof GHATS;
    await expect(loadPublic(broken)).rejects.toThrow();
  });
});
