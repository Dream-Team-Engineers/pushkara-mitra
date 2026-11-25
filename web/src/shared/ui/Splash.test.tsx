import { render } from 'preact-render-to-string';
import { describe, expect, it } from 'vitest';
import { Splash } from './Splash';

describe('Splash', () => {
  it('shows the logo, name, tagline and disclaimer, hidden from assistive technology', () => {
    const html = render(<Splash />);
    expect(html).toContain('class="splash"');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('/hero-logo.png');
    expect(html).toContain('పుష్కర మిత్ర');
    expect(html).toContain('splash__tag');
    expect(html).toContain('splash__fine');
  });

  it('has no inline styles and no interactive controls', () => {
    const html = render(<Splash />);
    expect(html).not.toContain('style=');
    expect(html).not.toContain('<button');
    expect(html).not.toContain('<a ');
  });
});
