import { render } from 'preact-render-to-string';
import { afterEach, describe, expect, it } from 'vitest';
import ConditionsScreen from '../features/conditions/Screen';
import GhatsScreen, { filterGhats } from '../features/ghats/Screen';
import StayScreen, { rankStays } from '../features/stay/Screen';
import TravelScreen, { filterTravel } from '../features/travel/Screen';
import UpdatesScreen, { filterUpdates } from '../features/updates/Screen';
import { GHATS, STAYS, TRAVEL, UPDATES } from '../shared/data/fixtures';
import {
  crowdResource,
  ghatsResource,
  stayResource,
  travelResource,
  updatesResource,
} from '../shared/data/resources';
import { LOCALES, setLocale, t } from '../shared/i18n/i18n';
import { accessibilityIssues, countTag } from '../shared/testing/html';

afterEach(async () => {
  await setLocale('te');
});

async function load(): Promise<void> {
  await Promise.all(
    [ghatsResource, stayResource, travelResource, updatesResource, crowdResource].map((resource) =>
      resource.refresh(),
    ),
  );
}

describe('filters and ranking', () => {
  it('filters ghats by district', () => {
    expect(filterGhats(GHATS, 'all')).toHaveLength(GHATS.length);
    expect(filterGhats(GHATS, 'east').every((ghat) => ghat.district === 'east')).toBe(true);
    expect(filterGhats(GHATS, 'west')).toHaveLength(1);
  });

  it('ranks stays by distance only and never promotes a sponsored one', () => {
    const ranked = rankStays(STAYS, 'all');
    const distances = ranked.map((stay) => stay.distanceKm);
    expect(distances).toEqual([...distances].sort((a, b) => a - b));
    expect(ranked[0]?.sponsored).toBe(false);
    expect(rankStays(STAYS, 'hotel').every((stay) => stay.kind === 'hotel')).toBe(true);
  });

  it('filters travel by mode and origin', () => {
    expect(filterTravel(TRAVEL, 'train', '').every((row) => row.mode === 'train')).toBe(true);
    expect(filterTravel(TRAVEL, 'train', 'chen')).toHaveLength(1);
    expect(filterTravel(TRAVEL, 'flight', 'zzz')).toHaveLength(0);
  });

  it('groups updates by tab', () => {
    expect(filterUpdates(UPDATES, 'today')).toHaveLength(UPDATES.length);
    expect(filterUpdates(UPDATES, 'events').every((item) => item.kind === 'event')).toBe(true);
    expect(filterUpdates(UPDATES, 'rituals')).toHaveLength(1);
  });
});

describe('public module screens', () => {
  const SCREENS = [
    ['ghats', GhatsScreen],
    ['stay', StayScreen],
    ['travel', TravelScreen],
    ['updates', UpdatesScreen],
    ['conditions', ConditionsScreen],
  ] as const;

  it.each(SCREENS)('%s shows a loading skeleton before data arrives', (_name, Screen) => {
    const html = render(<Screen />);
    expect(countTag(html, 'h1')).toBe(1);
    expect(accessibilityIssues(html)).toEqual([]);
  });

  it.each(LOCALES)('every screen renders ready content without issues in %s', async (code) => {
    await setLocale(code);
    await load();
    for (const [name, Screen] of SCREENS) {
      const html = render(<Screen />);
      expect(countTag(html, 'h1'), name).toBe(1);
      expect(accessibilityIssues(html), name).toEqual([]);
      expect(html, name).toContain(t('state.synthetic'));
      expect(html, name).toContain(t('state.unverified'));
    }
  });

  it('labels sponsored stays and discloses the ranking criteria', async () => {
    await load();
    const html = render(<StayScreen />);
    expect(html).toContain('sponsored-label');
    expect(html).toContain(t('home.sponsored'));
    expect(html).toContain(t('stay.rank.body'));
    expect(html).not.toMatch(/href="https?:/);
  });

  it('shows crowd levels as text and as an estimate, never as safety instructions', async () => {
    await load();
    const html = render(<ConditionsScreen />);
    expect(html).toContain(t('crowd.low'));
    expect(html).toContain(t('crowd.high'));
    expect(html).toContain(t('conditions.crowdNote'));
  });

  it('does not invent weather, river, stay or parking figures', async () => {
    await load();
    const html = render(<ConditionsScreen />);
    expect(html).not.toMatch(/°C|\d+\s*(?:cm|m|lots)\b/);
    expect(html).toContain(t('conditions.noneVerified'));
  });

  it('keeps stay, parking and weather tiles on a no-data state', async () => {
    await load();
    const html = render(<ConditionsScreen />);
    expect(html.match(new RegExp(t('crowd.noData'), 'g'))?.length).toBeGreaterThanOrEqual(5);
  });
});
