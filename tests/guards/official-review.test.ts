import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';

const root = join(import.meta.dirname, '..', '..');
type Candidate = {
  reviewStatus: string;
  checkedOn: string;
  festival: {
    name: string;
    startDate: string;
    endDate: string;
    source: string;
    sourceLastUpdated: string;
  };
  ghatsSource: { url: string; sourceLastUpdated: string };
  groups: { name: string; places: string[] }[];
};
const candidate = JSON.parse(
  readFileSync(join(root, 'docs/content/official-candidate.json'), 'utf8'),
) as Candidate;
const moduleUrl = pathToFileURL(join(root, 'scripts/build-official-review.mjs')).href;
type Submitted = { reviewStatus: string; rows: Record<string, string>[] };
const submitted = JSON.parse(
  readFileSync(join(root, 'docs/content/user-ghats-candidate.json'), 'utf8'),
) as Submitted;
const { renderReview } = (await import(moduleUrl)) as {
  renderReview: (data: Candidate, submitted?: Submitted) => string;
};
function firstGroup(data: Candidate) {
  const group = data.groups[0];
  if (!group || !group.places[0]) throw new Error('Expected a nonempty first group');
  return group;
}

describe('official content review artifact', () => {
  it('shows sourced dates and grouped names with review and unknown-status warnings', () => {
    const html: string = renderReview(candidate);
    expect(html).toContain('NOT APPROVED FOR APP USE');
    expect(html).toContain('2027-06-26');
    expect(html).toContain('2027-07-07');
    expect(html).toContain('Current opening, access, safety, facilities and hours are unknown');
    expect(html).toContain('https://eastgodavari.ap.gov.in/godavari-pushkaralu-2027/');
    expect(html).toContain('https://eastgodavari.ap.gov.in/ghats/');
    expect(candidate.groups.map((group: { places: string[] }) => group.places.length)).toEqual([
      8, 3, 4,
    ]);
    for (const group of candidate.groups)
      for (const place of group.places) expect(html).toContain(place);
  });

  it('rejects invalid dates, missing review status, unexpected sources and duplicate names', () => {
    for (const mutate of [
      (data: typeof candidate) => (data.festival.startDate = '2027-02-29'),
      (data: typeof candidate) => (data.reviewStatus = 'APPROVED'),
      (data: typeof candidate) => (data.ghatsSource.url = 'https://example.com/'),
      (data: typeof candidate) => {
        const group = firstGroup(data);
        group.places.push(group.places[0] ?? '');
      },
    ]) {
      const data = structuredClone(candidate);
      mutate(data);
      expect(() => renderReview(data)).toThrow();
    }
  });

  it('escapes content when generating the review page', () => {
    const data = structuredClone(candidate);
    firstGroup(data).places[0] = '<script>alert(1)</script>';
    const html: string = renderReview(data);
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('includes user-submitted rows as unverified, escaped review leads', () => {
    expect(submitted.rows).toHaveLength(159);
    const data = structuredClone(submitted);
    const first = data.rows[0];
    if (!first) throw new Error('Missing submitted row');
    first['History & significance'] = '<script>alert(1)</script>';
    const html = renderReview(candidate, data);
    expect(html).toContain('159 user-supplied rows');
    expect(html).toContain('not a confirmed 2027 list');
    expect(html).toContain('440 planned ghats');
    expect(html).toContain('175 planned');
    expect(html).toContain('44 planned · 0 submitted');
    expect(html).toContain('Not in the six-district report');
    expect(html).toContain('Directions:</strong> Unavailable until the destination is verified');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).not.toContain('<script>alert(1)</script>');
    data.reviewStatus = 'APPROVED';
    expect(() => renderReview(candidate, data)).toThrow();
  });

  it('filters submitted entries and clears the filter without location access', () => {
    const html = renderReview(candidate, submitted);
    const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
    if (!script) throw new Error('Missing search script');
    const entries = [
      { textContent: 'Pushkar Ghat Rajahmundry', hidden: false },
      { textContent: 'Other ghat Kovvur', hidden: false },
    ];
    const district = { hidden: false, open: false, querySelectorAll: () => entries };
    const status = { textContent: '' };
    let onInput = () => {};
    const search = {
      value: 'rajahmundry',
      addEventListener: (_: string, handler: () => void) => {
        onInput = handler;
      },
    };
    const document = {
      getElementById: (id: string) => (id === 'ghat-search' ? search : status),
      querySelectorAll: () => [district],
    };
    runInNewContext(script, { document });
    onInput();
    expect(entries.map((entry) => entry.hidden)).toEqual([false, true]);
    expect(status.textContent).toBe('1 submitted records match.');
    search.value = '';
    onInput();
    expect(entries.map((entry) => entry.hidden)).toEqual([false, false]);
    expect(status.textContent).toBe('');
  });
});
