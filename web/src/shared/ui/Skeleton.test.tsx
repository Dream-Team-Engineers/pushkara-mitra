import { render } from 'preact-render-to-string';
import { describe, expect, it } from 'vitest';
import { Skeleton } from './Status';

describe('Skeleton', () => {
  it('announces loading once and hides the decoration', () => {
    const html = render(<Skeleton />);
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('class="spinner"');
    expect(html.match(/skeleton__line/g)?.length).toBe(3);
  });

  it('draws list-card rows when asked', () => {
    const html = render(<Skeleton rows={4} />);
    expect(html.match(/skeleton__row/g)?.length).toBe(4);
    expect(html).toContain('skeleton__thumb');
    expect(html).toContain('skeleton__pill');
    expect(html).not.toContain('style=');
  });
});
