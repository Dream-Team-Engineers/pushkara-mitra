import { render as renderToString } from 'preact-render-to-string';
import { afterEach, describe, expect, it } from 'vitest';
import { setLocale } from '../i18n/i18n';
import { Bi } from './Bi';

afterEach(async () => {
  await setLocale('te');
});

describe('Bi', () => {
  it('marks each language and hides the repeated English from assistive technology', async () => {
    await setLocale('te');
    const html = renderToString(<Bi k="nav.home" />);
    expect(html).toContain('lang="te"');
    expect(html).toContain('class="bi__sec" lang="en" aria-hidden="true"');
  });

  it('renders one language only in English mode', async () => {
    await setLocale('en');
    const html = renderToString(<Bi k="nav.home" stacked />);
    expect(html).toContain('lang="en"');
    expect(html).not.toContain('bi__sec');
  });
});
