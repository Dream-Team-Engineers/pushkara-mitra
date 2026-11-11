import { describe, expect, it } from 'vitest';
import {
  approvedDocument,
  INFORMATION_ENTRIES,
  LOCALES,
  validateEntry,
  type InformationEntry,
  type Locale,
} from '../../src/content/publicInformation';
import worker from '../../src/index';
import { handlePublicInformation } from '../../src/routes/publicInformation';

const SHA = 'a'.repeat(40);

/** Test-only approved entries. They exist only inside this test file, never in the shipped registry. */
function approvedEntries(): Record<Locale, InformationEntry> {
  const make = (locale: Locale): InformationEntry => ({
    document: {
      locale,
      revision: 'test-1',
      independentApplication: true,
      title: `Title ${locale}`,
      paragraphs: [`Paragraph ${locale}`],
    },
    review: {
      status: 'approved',
      reviewer: 'example-reviewer',
      reviewedRevision: SHA,
      reviewedOn: '2026-11-11',
      scope: 'test fixture',
    },
  });
  return { te: make('te'), en: make('en'), hi: make('hi') };
}

const url = (query = '') => new URL(`https://example.test/api/public/information${query}`);
const call = (path: string, init?: RequestInit) =>
  worker.fetch(new Request(`https://example.test${path}`, init), {});

describe('PUB-01 approved copy', () => {
  it('returns the exact locale document and defaults to Telugu', async () => {
    const entries = approvedEntries();
    const omitted = handlePublicInformation(url(), entries);
    expect(omitted.status).toBe(200);
    expect(await omitted.json()).toEqual(entries.te.document);
    const english = handlePublicInformation(url('?lang=en'), entries);
    expect(await english.json()).toEqual(entries.en.document);
    expect(english.headers.get('Cache-Control')).toBe('no-store');
    expect(english.headers.get('Content-Type')).toMatch(/application\/json/);
    expect(english.headers.get('Set-Cookie')).toBeNull();
  });

  it('serves nothing beyond the contract fields', async () => {
    const body = (await handlePublicInformation(
      url('?lang=hi'),
      approvedEntries(),
    ).json()) as object;
    expect(Object.keys(body).sort()).toEqual(
      ['independentApplication', 'locale', 'paragraphs', 'revision', 'title'].sort(),
    );
  });
});

describe('PUB-02 invalid queries', () => {
  const cases = [
    '?lang=',
    '?lang=fr',
    '?lang=TE',
    '?lang=te&lang=en',
    '?lang=te&x=1',
    '?x=1',
    `?lang=${'a'.repeat(200)}`,
    '?lang=%3Cscript%3E',
  ];
  it.each(cases)('rejects %s with a fixed safe error', async (query) => {
    const response = handlePublicInformation(url(query), approvedEntries());
    expect(response.status).toBe(400);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    const text = await response.text();
    expect(JSON.parse(text)).toEqual({
      error: { code: 'INVALID_QUERY', message: 'The request query is not valid.' },
    });
    expect(text).not.toContain('script');
    expect(text).not.toContain('aaaa');
  });
});

describe('PUB-03 and PUB-08 no approved copy', () => {
  it('shipped registry has no approved document, so every locale is 404', async () => {
    for (const locale of LOCALES) {
      const response = await call(`/api/public/information?lang=${locale}`);
      expect(response.status, locale).toBe(404);
      expect(await response.json()).toEqual({
        error: {
          code: 'INFORMATION_UNAVAILABLE',
          message: 'No approved information is available.',
        },
      });
    }
  });

  it('never falls back to another language', () => {
    const entries = approvedEntries();
    const only = { ...entries, hi: { ...entries.hi, review: { status: 'draft' } } } as Record<
      Locale,
      InformationEntry
    >;
    expect(handlePublicInformation(url('?lang=hi'), only).status).toBe(404);
    expect(handlePublicInformation(url('?lang=te'), only).status).toBe(200);
  });

  it('shipped draft entries are valid and carry no approval', () => {
    for (const locale of LOCALES) {
      const entry = INFORMATION_ENTRIES[locale];
      expect(validateEntry(locale, entry)).toEqual([]);
      expect(entry.review.status).toBe('draft');
      expect(approvedDocument(locale)).toBeNull();
    }
  });

  it('refuses an approved entry that fails validation (fails closed)', () => {
    const entries = approvedEntries();
    const broken = {
      ...entries,
      te: { ...entries.te, document: { ...entries.te.document, title: '' } },
      en: {
        ...entries.en,
        review: { ...entries.en.review, reviewedRevision: 'not-a-sha' },
      },
      hi: {
        ...entries.hi,
        document: { ...entries.hi.document, paragraphs: Array<string>(13).fill('x') },
      },
    } as Record<Locale, InformationEntry>;
    for (const locale of LOCALES) {
      expect(validateEntry(locale, broken[locale]).length, locale).toBeGreaterThan(0);
      expect(handlePublicInformation(url(`?lang=${locale}`), broken).status, locale).toBe(404);
    }
  });

  it('refuses a locale slot holding another locale document', () => {
    const entries = approvedEntries();
    const swapped = { ...entries, te: entries.en } as Record<Locale, InformationEntry>;
    expect(validateEntry('te', swapped.te)).toContain('locale does not match its slot');
    expect(handlePublicInformation(url('?lang=te'), swapped).status).toBe(404);
  });
});

describe('PUB-04 methods and paths', () => {
  it.each(['POST', 'PUT', 'PATCH', 'DELETE'])('%s is 405 with Allow GET, HEAD', async (method) => {
    const response = await call('/api/public/information', { method });
    expect(response.status).toBe(405);
    expect(response.headers.get('Allow')).toBe('GET, HEAD');
  });

  it.each([
    '/api/public/information/',
    '/api/public/information/extra',
    '/api/public/Information',
    '/api/public/%69nformation',
    '/api/public',
    '/api',
    '/api/anything',
  ])('%s never reaches static assets', async (path) => {
    let assetCalls = 0;
    const env = {
      ASSETS: {
        fetch: () => {
          assetCalls += 1;
          return Promise.resolve(new Response('<!doctype html>'));
        },
      } as unknown as Fetcher,
    };
    const response = await worker.fetch(new Request(`https://example.test${path}`), env);
    expect(response.status).toBe(404);
    expect(assetCalls).toBe(0);
    expect(await response.text()).not.toMatch(/<!doctype|<html/i);
  });
});

describe('PUB-05 and PUB-06 headers', () => {
  it('applies security headers and no-store on success, 400 and 404', async () => {
    for (const path of [
      '/api/public/information?lang=te',
      '/api/public/information?lang=xx',
      '/api/missing',
    ]) {
      const response = await call(path);
      expect(response.headers.get('Cache-Control'), path).toBe('no-store');
      expect(response.headers.get('X-Content-Type-Options'), path).toBe('nosniff');
      expect(response.headers.get('Content-Security-Policy'), path).toContain("default-src 'none'");
    }
  });

  it('ignores cookies and Authorization', async () => {
    const plain = await call('/api/public/information?lang=te');
    const withCredentials = await call('/api/public/information?lang=te', {
      headers: { Cookie: 'a=b', Authorization: 'Bearer x' },
    });
    expect(withCredentials.status).toBe(plain.status);
    expect(await withCredentials.text()).toBe(await plain.text());
  });
});

describe('PUB-07 no side effects', () => {
  it('works with no bindings at all (no database or storage is used)', async () => {
    const response = await worker.fetch(
      new Request('https://example.test/api/public/information?lang=en'),
      {},
    );
    expect(response.status).toBe(404);
  });
});
