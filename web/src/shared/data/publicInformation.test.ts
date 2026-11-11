import { describe, expect, it } from 'vitest';
import type { InformationEntry, Locale } from '../../../../src/content/publicInformation';
import { handlePublicInformation } from '../../../../src/routes/publicInformation';
import {
  fetchPublicInformation,
  isPublicInformation,
  type PublicInformation,
  type RequestFn,
} from './publicInformation';

const GOOD: PublicInformation = {
  locale: 'en',
  revision: 'r1',
  independentApplication: true,
  title: 'About',
  paragraphs: ['One'],
};

const respond =
  (status: number, body: unknown): RequestFn =>
  () =>
    Promise.resolve(new Response(JSON.stringify(body), { status }));

describe('isPublicInformation', () => {
  it('accepts a contract-shaped document for the expected locale', () => {
    expect(isPublicInformation(GOOD, 'en')).toBe(true);
  });

  const bad: [string, unknown][] = [
    ['wrong locale', { ...GOOD, locale: 'te' }],
    ['extra field', { ...GOOD, extra: 1 }],
    ['missing field', { locale: 'en', revision: 'r1', title: 'a', paragraphs: ['x'] }],
    ['not independent', { ...GOOD, independentApplication: false }],
    ['bad revision', { ...GOOD, revision: 'a b' }],
    ['empty title', { ...GOOD, title: '' }],
    ['long title', { ...GOOD, title: 'x'.repeat(121) }],
    ['no paragraphs', { ...GOOD, paragraphs: [] }],
    ['too many paragraphs', { ...GOOD, paragraphs: Array<string>(13).fill('x') }],
    ['long paragraph', { ...GOOD, paragraphs: ['x'.repeat(601)] }],
    ['non-string paragraph', { ...GOOD, paragraphs: [1] }],
    ['null', null],
    ['array', []],
  ];
  it.each(bad)('rejects %s', (_name, value) => {
    expect(isPublicInformation(value, 'en')).toBe(false);
  });
});

describe('fetchPublicInformation', () => {
  it('returns the document and sends a credential-free no-store GET', async () => {
    let seen: { url: string; init: RequestInit } | null = null;
    const request: RequestFn = (url, init) => {
      seen = { url, init };
      return Promise.resolve(new Response(JSON.stringify(GOOD), { status: 200 }));
    };
    expect(await fetchPublicInformation('en', request)).toEqual(GOOD);
    expect(seen).not.toBeNull();
    const captured = seen as unknown as { url: string; init: RequestInit };
    expect(captured.url).toBe('/api/public/information?lang=en');
    expect(captured.init.credentials).toBe('omit');
    expect(captured.init.cache).toBe('no-store');
    expect(captured.init.method).toBe('GET');
  });

  it('treats the contract 404 body as "no approved copy" (null)', async () => {
    const body = { error: { code: 'INFORMATION_UNAVAILABLE', message: 'x' } };
    expect(await fetchPublicInformation('te', respond(404, body))).toBeNull();
  });

  it('treats any other 404 as an error', async () => {
    await expect(fetchPublicInformation('te', respond(404, 'nope'))).rejects.toThrow();
    await expect(
      fetchPublicInformation('te', respond(404, { error: { code: 'OTHER' } })),
    ).rejects.toThrow();
  });

  it.each([400, 500, 503, 204])('throws on status %s', async (status) => {
    await expect(fetchPublicInformation('te', respond(status, {}))).rejects.toThrow();
  });

  it('throws on a body that breaks the contract', async () => {
    await expect(
      fetchPublicInformation('en', respond(200, { ...GOOD, locale: 'te' })),
    ).rejects.toThrow();
    await expect(fetchPublicInformation('en', respond(200, { nope: true }))).rejects.toThrow();
  });

  it('propagates network failure', async () => {
    const failing: RequestFn = () => Promise.reject(new TypeError('offline'));
    await expect(fetchPublicInformation('en', failing)).rejects.toThrow('offline');
  });
});

describe('contract: real Worker handler output against the client', () => {
  const approved = (locale: Locale): InformationEntry => ({
    document: {
      locale,
      revision: 'contract-1',
      independentApplication: true,
      title: `Title ${locale}`,
      paragraphs: ['Paragraph'],
    },
    review: {
      status: 'approved',
      reviewer: 'example-reviewer',
      reviewedRevision: 'b'.repeat(40),
      reviewedOn: '2026-11-11',
      scope: 'contract test',
    },
  });
  const entries = { te: approved('te'), en: approved('en'), hi: approved('hi') };
  const viaHandler =
    (table: Record<Locale, InformationEntry>): RequestFn =>
    (path) =>
      Promise.resolve(handlePublicInformation(new URL(path, 'https://example.test'), table));

  it.each(['te', 'en', 'hi'] as const)('accepts the Worker 200 for %s', async (lang) => {
    const result = await fetchPublicInformation(lang, viaHandler(entries));
    expect(result?.locale).toBe(lang);
  });

  it('maps the Worker 404 (no approved copy) to null', async () => {
    const drafts = {
      te: { ...entries.te, review: { status: 'draft' } },
      en: { ...entries.en, review: { status: 'draft' } },
      hi: { ...entries.hi, review: { status: 'draft' } },
    } as Record<Locale, InformationEntry>;
    expect(await fetchPublicInformation('en', viaHandler(drafts))).toBeNull();
  });
});
