import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { describe, expect, it } from 'vitest';
import { planPrecache, renderServiceWorker } from '../../build/sw';

const TEMPLATE = readFileSync('web/build/sw.template.js', 'utf8');

describe('planPrecache', () => {
  const plan = planPrecache([
    'index.html',
    'assets/index-abc.js',
    'assets/home-def.css',
    'fonts/Roboto-400-latin.woff',
    'fonts/Roboto-OFL.txt',
    'fonts/NotoSansDevanagari-400.woff',
    'manifest.webmanifest',
    'sw.js',
    'assets/index-abc.js.map',
  ]);

  it('maps index.html to the root path', () => {
    expect(plan.precache).toContain('/');
    expect(plan.precache).not.toContain('/index.html');
  });

  it('precaches the default-language assets only', () => {
    expect(plan.precache).toEqual([
      '/',
      '/assets/home-def.css',
      '/assets/index-abc.js',
      '/fonts/Roboto-400-latin.woff',
      '/manifest.webmanifest',
    ]);
  });

  it('keeps other-language fonts optional, never the worker, source maps or licence text', () => {
    expect(plan.optional).toEqual(['/fonts/NotoSansDevanagari-400.woff']);
    const all = [...plan.precache, ...plan.optional].join(' ');
    expect(all).not.toMatch(/sw\.js|\.map|\.txt/);
  });
});

interface Harness {
  readonly listeners: Map<string, (event: unknown) => void>;
  readonly stores: Map<string, Map<string, Response>>;
  readonly fetched: string[];
  readonly skipped: boolean[];
}

function load(
  precache: string[],
  version = 'v1',
  fetcher: (url: string) => Response = () => new Response('net', { status: 200 }),
  stores: Map<string, Map<string, Response>> = new Map(),
): Harness {
  const listeners = new Map<string, (event: unknown) => void>();
  const fetched: string[] = [];
  const skipped: boolean[] = [];
  const open = (name: string) => {
    const store = stores.get(name) ?? new Map<string, Response>();
    stores.set(name, store);
    const key = (input: string | Request) =>
      new URL(typeof input === 'string' ? input : input.url, 'https://app.test').pathname;
    return Promise.resolve({
      addAll: async (requests: Request[]) => {
        for (const request of requests) {
          fetched.push(request.url);
          store.set(key(request), fetcher(request.url));
        }
      },
      match: (input: string | Request) => Promise.resolve(store.get(key(input))),
      put: (input: string | Request, response: Response) => {
        store.set(key(input), response);
        return Promise.resolve();
      },
      delete: (input: string | Request) => Promise.resolve(store.delete(key(input))),
    });
  };
  const sandbox = {
    self: {
      location: { origin: 'https://app.test' },
      addEventListener: (type: string, fn: (event: unknown) => void) => listeners.set(type, fn),
      skipWaiting: () => {
        skipped.push(true);
        return Promise.resolve();
      },
      clients: { claim: () => Promise.resolve() },
    },
    caches: {
      open,
      keys: () => Promise.resolve([...stores.keys()]),
      delete: (name: string) => Promise.resolve(stores.delete(name)),
    },
    fetch: (request: Request) => {
      fetched.push(request.url);
      return Promise.resolve(fetcher(request.url));
    },
    Request,
    URL,
    Set,
    Promise,
    Error,
  };
  const source = renderServiceWorker(
    TEMPLATE,
    { precache, optional: ['/fonts/opt.woff'] },
    version,
  );
  runInContext(source, createContext(sandbox));
  return { listeners, stores, fetched, skipped };
}

function fetchEvent(url: string, init: { method?: string; headers?: Record<string, string> } = {}) {
  let handled: Promise<Response> | null = null;
  const request = new Request(url, { method: init.method ?? 'GET', headers: init.headers ?? {} });
  return {
    event: { request, respondWith: (p: Promise<Response>) => (handled = p) },
    result: () => handled,
  };
}

async function installed(h: Harness): Promise<void> {
  let wait: Promise<unknown> = Promise.resolve();
  h.listeners.get('install')?.({ waitUntil: (p: Promise<unknown>) => (wait = p) });
  await wait;
}

describe('generated service worker', () => {
  const PRECACHE = ['/', '/assets/app-1.js'];

  it('precaches exactly the planned paths and does not skip waiting by itself', async () => {
    const h = load(PRECACHE);
    await installed(h);
    expect([...(h.stores.get('pushkara-app-v1')?.keys() ?? [])].sort()).toEqual(PRECACHE);
    expect(h.skipped).toEqual([]);
  });

  it('fails the install when a precached response is not usable', async () => {
    const h = load(PRECACHE, 'v1', () => new Response('nope', { status: 500 }));
    await expect(installed(h)).rejects.toThrow('Precache verification failed');
  });

  it('serves cached allow-listed paths and ignores everything else', async () => {
    const h = load(PRECACHE);
    await installed(h);
    const hit = fetchEvent('https://app.test/assets/app-1.js');
    h.listeners.get('fetch')?.(hit.event);
    expect(await (await hit.result())?.text()).toBe('net');

    const ignored = [
      fetchEvent('https://app.test/api/groups'),
      fetchEvent('https://app.test/auth/login'),
      fetchEvent('https://app.test/admin'),
      fetchEvent('https://app.test/assets/app-1.js?x=1'),
      fetchEvent('https://other.test/assets/app-1.js'),
      fetchEvent('https://app.test/assets/app-1.js', { method: 'POST' }),
      fetchEvent('https://app.test/assets/app-1.js', { headers: { Authorization: 'Bearer t' } }),
    ];
    for (const item of ignored) {
      h.listeners.get('fetch')?.(item.event);
      expect(item.result()).toBeNull();
    }
  });

  it('replaces a corrupt cache entry with a fresh copy', async () => {
    const h = load(PRECACHE, 'v1', () => new Response('fresh', { status: 200 }));
    await installed(h);
    h.stores.get('pushkara-app-v1')?.set('/assets/app-1.js', new Response('bad', { status: 500 }));
    const hit = fetchEvent('https://app.test/assets/app-1.js');
    h.listeners.get('fetch')?.(hit.event);
    expect(await (await hit.result())?.text()).toBe('fresh');
    expect(h.stores.get('pushkara-app-v1')?.get('/assets/app-1.js')?.status).toBe(200);
  });

  it('caches an optional font on first use', async () => {
    const h = load(PRECACHE);
    await installed(h);
    const hit = fetchEvent('https://app.test/fonts/opt.woff');
    h.listeners.get('fetch')?.(hit.event);
    await hit.result();
    expect(h.stores.get('pushkara-app-v1')?.has('/fonts/opt.woff')).toBe(true);
  });

  it('deletes only older app caches on activate', async () => {
    const stores = new Map<string, Map<string, Response>>([
      ['pushkara-app-v0', new Map()],
      ['unrelated-cache', new Map()],
    ]);
    const h = load(PRECACHE, 'v1', undefined, stores);
    await installed(h);
    let wait: Promise<unknown> = Promise.resolve();
    h.listeners.get('activate')?.({ waitUntil: (p: Promise<unknown>) => (wait = p) });
    await wait;
    expect([...h.stores.keys()].sort()).toEqual(['pushkara-app-v1', 'unrelated-cache']);
  });

  it('skips waiting only on the SKIP_WAITING message', () => {
    const h = load(PRECACHE);
    h.listeners.get('message')?.({ data: { type: 'OTHER' } });
    expect(h.skipped).toEqual([]);
    h.listeners.get('message')?.({ data: { type: 'SKIP_WAITING' } });
    expect(h.skipped).toEqual([true]);
  });
});
