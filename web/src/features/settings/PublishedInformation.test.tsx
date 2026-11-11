import { render } from 'preact-render-to-string';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { PublicInformation } from '../../shared/data/publicInformation';
import { createResource } from '../../shared/data/resource';
import { online } from '../../shared/data/time';
import { accessibilityIssues } from '../../shared/testing/html';
import { PublishedInformation, PublishedInformationView } from './PublishedInformation';

const DOC: PublicInformation = {
  locale: 'en',
  revision: 'r1',
  independentApplication: true,
  title: 'About <this> app',
  paragraphs: ['Plain text', '<script>alert(1)</script>'],
};

describe('PublishedInformation', () => {
  // The server-render test environment has no navigator, so force the online state.
  beforeEach(() => {
    online.value = true;
  });
  afterEach(() => {
    online.value = false;
  });

  it('renders nothing while the flag is off, without touching the network', () => {
    expect(render(<PublishedInformation />)).toBe('');
    expect(render(<PublishedInformation enabled={false} />)).toBe('');
  });

  it('shows a loading skeleton first', () => {
    const resource = createResource(() => Promise.resolve(DOC), 1000);
    const html = render(<PublishedInformationView resource={resource} />);
    expect(html).not.toContain('Plain text');
  });

  it('renders approved copy as escaped text', async () => {
    const resource = createResource(() => Promise.resolve(DOC), 1000);
    await resource.refresh();
    const html = render(<PublishedInformationView resource={resource} />);
    expect(html).toContain('Plain text');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(accessibilityIssues(html)).toEqual([]);
  });

  it('renders nothing when no copy is approved (empty state)', async () => {
    const resource = createResource(() => Promise.resolve(null), 1000);
    await resource.refresh();
    expect(render(<PublishedInformationView resource={resource} />)).toBe('');
  });

  it('shows the retryable error state when the request fails', async () => {
    const resource = createResource<PublicInformation | null>(
      () => Promise.reject(new Error('offline')),
      1000,
    );
    await resource.refresh();
    const html = render(<PublishedInformationView resource={resource} />);
    expect(html).toContain('button');
  });

  it('keeps showing the last good copy, flagged stale, when a refresh fails', async () => {
    let fail = false;
    const resource = createResource<PublicInformation | null>(
      () => (fail ? Promise.reject(new Error('x')) : Promise.resolve(DOC)),
      1000,
    );
    await resource.refresh();
    fail = true;
    await resource.refresh();
    const html = render(<PublishedInformationView resource={resource} />);
    expect(html).toContain('Plain text');
    expect(html).toContain('notice--warn');
  });
});
