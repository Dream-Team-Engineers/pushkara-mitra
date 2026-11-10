import { render } from 'preact-render-to-string';
import { afterEach, describe, expect, it } from 'vitest';
import HomeScreen, { QUICK_CARDS } from '../features/home/Screen';
import SettingsScreen from '../features/settings/Screen';
import ComingSoonScreen from '../features/status/ComingSoonScreen';
import NotFoundScreen from '../features/status/NotFoundScreen';
import { ADS, HEADLINES } from '../shared/data/fixtures-home';
import { LOCALES, setLocale, t } from '../shared/i18n/i18n';
import { accessibilityIssues, countTag } from '../shared/testing/html';
import { App } from './App';
import { current, hrefFor, ROUTE_IDS } from './router';
import { screenLoader } from './routes';

afterEach(async () => {
  current.value = 'home';
  await setLocale('te');
});

describe('Home screen', () => {
  it.each(LOCALES)(
    'renders one h1, no accessibility issues and the app name in %s',
    async (code) => {
      await setLocale(code);
      const html = render(<HomeScreen />);
      expect(countTag(html, 'h1')).toBe(1);
      expect(accessibilityIssues(html)).toEqual([]);
      expect(html).toContain(t('app.name'));
      expect(html).toContain(t('app.disclaimer'));
    },
  );

  it('orders weather, news, adverts, logo, countdown and quick access as agreed', () => {
    const html = render(<HomeScreen />);
    const positions = [
      'class="weather"',
      'marquee--news',
      'marquee--ad',
      'class="hero"',
      'class="countdown"',
      'class="quick-grid"',
    ].map((marker) => html.indexOf(marker));
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it('links to all ten agreed modules', () => {
    const html = render(<HomeScreen />);
    expect(QUICK_CARDS).toHaveLength(10);
    for (const card of QUICK_CARDS) expect(html).toContain(`href="${hrefFor(card.id)}"`);
    expect(countTag(html, 'ul')).toBeGreaterThanOrEqual(3);
  });

  it('labels adverts as sponsored and keeps sample content visibly synthetic', () => {
    const html = render(<HomeScreen />);
    expect(html).toContain(t('home.sponsored'));
    for (const item of [...HEADLINES, ...ADS]) {
      expect(item.synthetic).toBe(true);
      expect(item.status).toBe('unverified');
      expect(item.text.startsWith('[Sample')).toBe(true);
    }
  });

  it('hides the repeated marquee copy from assistive technology', () => {
    const html = render(<HomeScreen />);
    const hidden = html.match(/marquee__copy" aria-hidden="true"/g)?.length ?? 0;
    expect(hidden).toBe(HEADLINES.length + ADS.length);
  });

  it('says the weather is unavailable instead of showing invented values', () => {
    const html = render(<HomeScreen />);
    expect(html).toContain(t('home.weather.unavailable'));
    expect(html).not.toMatch(/\[TEMP\]|°C/);
  });

  it('says the dates are not yet officially confirmed', () => {
    expect(render(<HomeScreen />)).toContain(t('home.countdown.pending'));
  });
});

describe('Settings screen', () => {
  it.each(LOCALES)('renders accessibly in %s with one selected option per group', async (code) => {
    await setLocale(code);
    const html = render(<SettingsScreen />);
    expect(countTag(html, 'h1')).toBe(1);
    expect(accessibilityIssues(html)).toEqual([]);
    expect(html.match(/aria-pressed="true"/g)?.length).toBe(2);
    expect(countTag(html, 'fieldset')).toBe(2);
  });
});

describe('Status screens', () => {
  it('renders the not-found screen with a way home', () => {
    const html = render(<NotFoundScreen />);
    expect(countTag(html, 'h1')).toBe(1);
    expect(html).toContain('href="#/"');
    expect(accessibilityIssues(html)).toEqual([]);
  });

  it('renders the placeholder for a screen that is not built yet', () => {
    current.value = 'ghats';
    const html = render(<ComingSoonScreen />);
    expect(html).toContain(t('module.ghats.title'));
    expect(html).toContain(t('status.comingSoon'));
    expect(accessibilityIssues(html)).toEqual([]);
  });
});

describe('App shell', () => {
  it.each(LOCALES)(
    'has a skip link, header, main, bottom bar and no issues in %s',
    async (code) => {
      await setLocale(code);
      const html = render(<App />);
      expect(html).toContain('class="skip-link"');
      expect(countTag(html, 'header')).toBe(1);
      expect(countTag(html, 'main')).toBe(1);
      expect(html).toContain(`aria-label="${t('nav.main')}"`);
      expect(html).toContain('aria-current="page"');
      expect(accessibilityIssues(html)).toEqual([]);
    },
  );

  it('keeps SOS reachable from the bottom bar on every screen', () => {
    const html = render(<App />);
    expect(html).toContain(`href="${hrefFor('help')}"`);
    expect(html).toContain('is-danger');
  });
});

describe('screen loading', () => {
  it.each(ROUTE_IDS)('resolves a screen component for %s', async (id) => {
    const module = await screenLoader(id)();
    expect(typeof module.default).toBe('function');
  });

  it('resolves the not-found screen', async () => {
    expect(typeof (await screenLoader('notFound')()).default).toBe('function');
  });
});
