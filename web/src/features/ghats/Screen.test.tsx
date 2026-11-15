import { render } from 'preact-render-to-string';
import { afterEach, describe, expect, it } from 'vitest';
import { PUBLISHED_CONTENT } from '../../../../src/content/publishedContent';
import { ghatsResource } from '../../shared/data/resources';
import { setLocale } from '../../shared/i18n/i18n';
import GhatsScreen from './Screen';

afterEach(async () => {
  await setLocale('te');
});

describe('Ghats: Telugu names', () => {
  it('every approved ghat has a Telugu name in Telugu script', () => {
    const { items } = PUBLISHED_CONTENT.ghats.dataset;
    expect(items).toHaveLength(30);
    for (const item of items) {
      expect(String(item['nameTe'])).toMatch(/[ఀ-౿]/);
      expect(String(item['nameHi'])).toMatch(/[ऀ-ॿ]/);
    }
  });

  it('uses the corrected spellings and marks guide-only ghats unverified', () => {
    const { items } = PUBLISHED_CONTENT.ghats.dataset;
    const byId = new Map(items.map((item) => [item['id'], item]));
    expect(byId.get('dowleswaram-barrage-ghat')?.['nameTe']).toBe('ధవళేశ్వరం బ్యారేజీ ఘాట్');
    expect(byId.get('seethanagaram-ghat')?.['nameTe']).toBe('సీతానగరం ఘాట్');
    expect(items.slice(0, 15).every((item) => item['status'] === 'verified')).toBe(true);
    expect(items.slice(15).every((item) => item['status'] === 'unverified')).toBe(true);
  });

  it('shows the Telugu name first with the English name beneath, and English alone in English', async () => {
    await ghatsResource.refresh();
    await setLocale('te');
    const te = render(<GhatsScreen />);
    expect(te).toContain('పుష్కర్ ఘాట్');
    expect(te).toContain('class="bi__sec" lang="en">Pushkar Ghat');
    await setLocale('en');
    const en = render(<GhatsScreen />);
    expect(en).toContain('Pushkar Ghat');
    expect(en).not.toContain('పుష్కర్ ఘాట్');
  });
});
