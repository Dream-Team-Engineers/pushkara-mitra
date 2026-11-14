import { describe, expect, it } from 'vitest';
import {
  CONTENT_KINDS,
  isContentItem,
  isPublishedDataset,
  publishableProblems,
  type ContentKind,
} from '../../src/content/publicContentSchema';
import { PUBLISHED_CONTENT, type ContentEntry } from '../../src/content/publishedContent';
import worker from '../../src/index';
import { approvedDataset, handlePublicContent } from '../../src/routes/publicContent';

const SHA = 'b'.repeat(40);
const META = {
  source: 'Official district portal',
  sourceUrl: 'https://example.gov.in/pushkaralu',
  updatedAt: '2026-11-14T10:00:00+05:30',
  status: 'verified',
  synthetic: false,
};
const GHAT = {
  ...META,
  id: 'kotilingala',
  name: 'Kotilingala Ghat',
  district: 'east',
  town: 'Rajamahendravaram',
  crowd: 'noData',
  facilities: ['water', 'toilets'],
};

/** Test-only entries. They exist only inside this file, never in the shipped registry. */
function entries(
  overrides: Partial<Record<ContentKind, ContentEntry>> = {},
): Record<ContentKind, ContentEntry> {
  return { ...PUBLISHED_CONTENT, ...overrides };
}
function approvedGhats(items: readonly Record<string, unknown>[] = [GHAT]): ContentEntry {
  return {
    dataset: { kind: 'ghats', revision: 'r1', items },
    review: {
      status: 'approved',
      reviewer: 'owner-login',
      reviewedRevision: SHA,
      reviewedOn: '2026-11-14',
      scope: 'checked every ghat against the district portal',
    },
  };
}
const get = (path: string) => handlePublicContent(new URL(`https://app.test${path}`), entries());

describe('shipped registry', () => {
  it('serves nothing until a human approves a dataset', () => {
    for (const kind of CONTENT_KINDS) expect(approvedDataset(kind)).toBeNull();
  });

  it.each(CONTENT_KINDS)(
    'answers 404 CONTENT_UNAVAILABLE for %s through the Worker',
    async (kind) => {
      const response = await worker.fetch(
        new Request(`https://app.test/api/public/content/${kind}`),
        {},
      );
      expect(response.status).toBe(404);
      expect(response.headers.get('Cache-Control')).toBe('no-store');
      expect(response.headers.get('Content-Security-Policy')).toBeTruthy();
      expect(await response.json()).toEqual({
        error: { code: 'CONTENT_UNAVAILABLE', message: 'No approved content is available.' },
      });
    },
  );
});

describe('routing and query handling', () => {
  it('rejects unknown kinds without echoing them', async () => {
    const response = get('/api/public/content/secrets');
    expect(response.status).toBe(404);
    const body = JSON.stringify(await response.json());
    expect(body).toContain('NOT_FOUND');
    expect(body).not.toContain('secrets');
  });
  it('rejects any query string', () => {
    expect(get('/api/public/content/ghats?x=1').status).toBe(400);
  });
  it('rejects non-GET methods at the Worker', async () => {
    const response = await worker.fetch(
      new Request('https://app.test/api/public/content/ghats', { method: 'POST' }),
      {},
    );
    expect(response.status).toBe(405);
  });
});

describe('approved datasets', () => {
  it('serves a valid approved dataset with no-store', async () => {
    const response = handlePublicContent(
      new URL('https://app.test/api/public/content/ghats'),
      entries({ ghats: approvedGhats() }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    const body: unknown = await response.json();
    expect(isPublishedDataset(body, 'ghats')).toBe(true);
    expect(body).toEqual({ kind: 'ghats', revision: 'r1', items: [GHAT] });
  });

  it.each([
    ['synthetic item', { ...GHAT, synthetic: true }],
    ['missing source URL', { ...GHAT, sourceUrl: null }],
    ['http source URL', { ...GHAT, sourceUrl: 'http://example.gov.in' }],
    ['static crowd level', { ...GHAT, crowd: 'low' }],
    ['extra field', { ...GHAT, phone: '123' }],
    ['missing field', Object.fromEntries(Object.entries(GHAT).filter(([k]) => k !== 'town'))],
    ['unknown facility', { ...GHAT, facilities: ['spa'] }],
    ['date without offset', { ...GHAT, updatedAt: '2026-11-14T10:00:00' }],
  ])('refuses to serve an approved dataset with a %s', (_label, item) => {
    expect(approvedDataset('ghats', entries({ ghats: approvedGhats([item]) }))).toBeNull();
  });

  it('refuses duplicate ids and empty datasets', () => {
    expect(publishableProblems({ kind: 'ghats', revision: 'r', items: [GHAT, GHAT] })).toContain(
      'item 1 repeats id kotilingala',
    );
    expect(approvedDataset('ghats', entries({ ghats: approvedGhats([]) }))).toBeNull();
  });

  it.each([
    ['reviewer', { reviewer: '' }],
    ['revision', { reviewedRevision: 'main' }],
    ['date', { reviewedOn: '14/11/2026' }],
    ['scope', { scope: ' ' }],
  ])('refuses an approval with an invalid %s', (_label, change) => {
    const base = approvedGhats();
    const entry = { ...base, review: { ...base.review, ...change } } as ContentEntry;
    expect(approvedDataset('ghats', entries({ ghats: entry }))).toBeNull();
  });

  it('refuses a dataset filed under the wrong kind', () => {
    expect(approvedDataset('stays', entries({ stays: approvedGhats() }))).toBeNull();
  });
});

describe('item shapes', () => {
  it('accepts every field kind correctly', () => {
    expect(isContentItem('helplines', { ...META, id: 'h1', kind: 'police', number: '100' })).toBe(
      true,
    );
    expect(
      isContentItem('helplines', { ...META, id: 'h1', kind: 'police', number: 'call me' }),
    ).toBe(false);
    expect(
      isContentItem('stays', {
        ...META,
        id: 's1',
        kind: 'govt',
        sponsored: false,
        name: 'Camp',
        distanceKm: -1,
        priceNote: 'free',
      }),
    ).toBe(false);
  });
  it('rejects envelopes with the wrong kind or extra keys', () => {
    const good = { kind: 'ghats', revision: 'r1', items: [GHAT] };
    expect(isPublishedDataset(good, 'ghats')).toBe(true);
    expect(isPublishedDataset(good, 'stays')).toBe(false);
    expect(isPublishedDataset({ ...good, debug: true }, 'ghats')).toBe(false);
    expect(isPublishedDataset({ ...good, items: [] }, 'ghats')).toBe(false);
  });
});
