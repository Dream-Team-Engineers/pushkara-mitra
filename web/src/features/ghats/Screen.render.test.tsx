import { render } from 'preact-render-to-string';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PUBLISHED_CONTENT } from '../../../../src/content/publishedContent';
import type * as Flags from '../../shared/flags/flags';

/**
 * Screen-level render tests for the Ghats screen: favourites first, the Favourites filter, and the
 * volunteer tags on a ghat card. The partners flag is a build-time constant, so each test loads a
 * fresh copy of the screen with the flags module replaced, so the flag can be set per test.
 */
const ITEMS = PUBLISHED_CONTENT.ghats.dataset.items;
const DISCLAIMER_PART = 'are reports by volunteers, not official figures';
const IDS = ITEMS.map((item) => String(item['id']));
const NAMES = ITEMS.map((item) => String(item['name']));

async function load(partners: boolean) {
  vi.resetModules();
  vi.doMock('../../shared/flags/flags', async (original) => {
    const real = await original<typeof Flags>();
    return { ...real, FLAGS: { ...real.FLAGS, partners } };
  });
  const [screen, resources, i18n, favs, client] = await Promise.all([
    import('./Screen'),
    import('../../shared/data/resources'),
    import('../../shared/i18n/i18n'),
    import('../../shared/prefs/favourites'),
    import('../../shared/partners/partnersClient'),
  ]);
  await resources.ghatsResource.refresh();
  await i18n.setLocale('en');
  return { Screen: screen.default, i18n, favs, client };
}

/** Names in the order the cards appear. */
function cardOrder(html: string): readonly string[] {
  return NAMES.map((name) => ({ name, at: html.indexOf(`>${name}<`) }))
    .filter((entry) => entry.at >= 0)
    .sort((a, b) => a.at - b.at)
    .map((entry) => entry.name);
}

beforeEach(() => {
  vi.useRealTimers();
});

afterEach(() => {
  vi.doUnmock('../../shared/flags/flags');
});

describe('Ghats screen: favourites', () => {
  it('shows starred ghats first and keeps the rest in their original order', async () => {
    const { Screen, favs } = await load(false);
    expect(cardOrder(render(<Screen />))).toEqual(NAMES);

    favs.favourites.value = [IDS[4] ?? '', IDS[2] ?? ''];
    const order = cardOrder(render(<Screen />));
    expect(order.slice(0, 2)).toEqual([NAMES[2], NAMES[4]]);
    expect(order.slice(2)).toEqual(NAMES.filter((_, index) => index !== 2 && index !== 4));
    expect(order).toHaveLength(NAMES.length);
  });

  it('marks the starred ghats as pressed on their star buttons', async () => {
    const { Screen, favs } = await load(false);
    favs.favourites.value = [IDS[1] ?? ''];
    const html = render(<Screen />);
    expect(html.match(/class="star is-on"/g)).toHaveLength(1);
    expect(html.match(/class="star"/g)).toHaveLength(NAMES.length - 1);
  });

  it('puts the Favourites filter on the screen as one of the chips', async () => {
    const { Screen, i18n } = await load(false);
    expect(render(<Screen />)).toContain(i18n.t('ghats.filter.favourites'));
  });
});

describe('Ghats screen: volunteer tags', () => {
  const MINUTE = 60_000;

  function ready(
    client: Awaited<ReturnType<typeof load>>['client'],
    updates: readonly {
      kind: 'crowd' | 'river' | 'food';
      ghatId: string;
      value: string;
      ago: number;
    }[],
  ) {
    client.volunteerUpdatesResource.state.value = {
      status: 'ready',
      data: {
        updates: updates.map((update) => ({
          kind: update.kind,
          ghatId: update.ghatId,
          value: update.value,
          reportedAt: new Date(Date.now() - update.ago * MINUTE).toISOString(),
        })),
        shownForSeconds: 10_800,
      },
      fetchedAt: Date.now(),
      refreshFailed: false,
    };
  }

  it('shows a tagged line only on the ghat that has reports, with the shared disclaimer once', async () => {
    const { Screen, client, i18n } = await load(true);
    ready(client, [
      { kind: 'crowd', ghatId: IDS[0] ?? '', value: 'high', ago: 5 },
      { kind: 'river', ghatId: IDS[0] ?? '', value: 'rising', ago: 12 },
    ]);
    const html = render(<Screen />);

    expect(html.match(/volunteer-compact__label/g)).toHaveLength(1);
    expect(html).toContain('volunteer-compact__tag--bad');
    expect(html).toContain('volunteer-compact__tag--warn');
    expect(html).toContain(`${i18n.t('pv.kind.crowd')}: ${i18n.t('crowd.high')}`);
    expect(html).toContain(`${i18n.t('pv.kind.river')}: ${i18n.t('pv.river.rising')}`);
    expect(html).toContain(i18n.t('pv.strip.age', { minutes: 5 }));
    // The sentence has quotes, which render escaped, so look for a quote-free part of it.
    expect(i18n.t('pv.strip.disclaimer')).toContain(DISCLAIMER_PART);
    expect(html.split(DISCLAIMER_PART)).toHaveLength(2);
  });

  it('names no person, shows no strip and no disclaimer when there are no reports', async () => {
    const { Screen, client, i18n } = await load(true);
    ready(client, []);
    const html = render(<Screen />);
    expect(i18n.t('pv.strip.disclaimer')).toContain(DISCLAIMER_PART);
    expect(html).not.toContain('volunteer-compact');
    expect(html).not.toContain(DISCLAIMER_PART);
  });

  it('shows nothing from volunteers when the partners flag is off', async () => {
    const { Screen, client, i18n } = await load(false);
    ready(client, [{ kind: 'crowd', ghatId: IDS[0] ?? '', value: 'low', ago: 1 }]);
    const html = render(<Screen />);
    expect(i18n.t('pv.strip.disclaimer')).toContain(DISCLAIMER_PART);
    expect(html).not.toContain('volunteer-compact');
    expect(html).not.toContain(DISCLAIMER_PART);
  });
});
