import { render } from 'preact-render-to-string';
import { afterEach, describe, expect, it } from 'vitest';
import ConditionsScreen from '../features/conditions/Screen';
import GhatsScreen, { filterGhats } from '../features/ghats/Screen';
import StayScreen, { rankStays } from '../features/stay/Screen';
import TravelScreen, { filterTravel } from '../features/travel/Screen';
import UpdatesScreen, { filterUpdates } from '../features/updates/Screen';
import { crowdLiveResource } from '../shared/data/crowd';
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
  /** Screens backed by an owner-approved dataset (ghats; conditions reads the same ghat list). */
  const OWNER_APPROVED = new Set<string>(['ghats', 'conditions']);

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
      if (OWNER_APPROVED.has(name)) {
        // Approved official data carries no sample badge and never states a crowd level.
        expect(html, name).not.toContain(t('state.synthetic'));
        expect(html, name).not.toContain(t('crowd.low'));
      } else {
        expect(html, name).toContain(t('state.synthetic'));
        expect(html, name).toContain(t('state.unverified'));
      }
    }
  });

  it('shows approved ghats with their source and without invented facilities', async () => {
    await load();
    const html = render(<GhatsScreen />);
    expect(html).toContain('Kotilingala Revu');
    expect(html).toContain(t('ghats.noteVerified'));
    expect(html).not.toContain(t('ghats.note'));
    expect(html).not.toContain('class="tags"');
  });

  it('shows a fresh staff-reported crowd level on the ghat card, and No data without one', async () => {
    await setLocale('en');
    await load();
    const ready = (data: Record<string, 'low' | 'moderate' | 'high'>) => {
      crowdLiveResource.state.value = {
        status: 'ready',
        data,
        fetchedAt: Date.now(),
        refreshFailed: false,
      };
    };
    try {
      ready({ 'pushkar-ghat': 'high' });
      const withLevel = render(<GhatsScreen />);
      expect(withLevel).toContain(t('crowd.high'));
      // Only the one ghat that has a report: every other card still says No data.
      expect(withLevel.split(t('crowd.high')).length - 1).toBe(1);
      expect(withLevel).toContain(t('crowd.noData'));
      ready({});
      const without = render(<GhatsScreen />);
      expect(without).not.toContain(t('crowd.high'));
      expect(without).toContain(t('crowd.noData'));
    } finally {
      crowdLiveResource.state.value = { status: 'loading' };
    }
  });

  it('labels sponsored stays and discloses the ranking criteria', async () => {
    await load();
    const html = render(<StayScreen />);
    expect(html).toContain('sponsored-label');
    expect(html).toContain(t('home.sponsored'));
    expect(html).toContain(t('stay.rank.body'));
    expect(html).not.toMatch(/href="http:/);
    // Every outside link opens in a new tab without handing over the opener.
    for (const tag of html.match(/<a [^>]*href="https:[^>]*>/g) ?? []) {
      expect(tag).toContain('rel="noopener noreferrer"');
    }
    expect(html).toContain('https://eastgodavari.ap.gov.in/Hotels');
  });

  it('shows no crowd level for official ghats, and frames crowds as estimates', async () => {
    await load();
    const html = render(<ConditionsScreen />);
    expect(html).toContain(t('crowd.noData'));
    expect(html).not.toContain(t('crowd.low'));
    expect(html).not.toContain(t('crowd.high'));
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
