import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';
import { MessageChannel, type MessagePort } from 'node:worker_threads';
import { describe, expect, it } from 'vitest';

const source = readFileSync(join(import.meta.dirname, '..', '..', 'public', 'sw.js'), 'utf8');
const origin = 'https://prototype.example';

function serviceWorker(options: { installFails?: boolean; missingPath?: string } = {}) {
  const listeners = new Map<string, (event: unknown) => void>();
  const opened: string[] = [];
  const deleted: string[] = [];
  const network: string[] = [];
  let claimed = false;
  let skipped = false;
  let installedPaths: string[] = [];
  const cache = {
    match: (path: string) =>
      Promise.resolve(path === options.missingPath ? undefined : new Response(`static:${path}`)),
    addAll: (paths: string[]) => {
      installedPaths = [...paths];
      return options.installFails
        ? Promise.reject(new Error('Synthetic precache failure'))
        : Promise.resolve();
    },
  };
  runInNewContext(source, {
    self: {
      location: { origin },
      skipWaiting: () => {
        skipped = true;
        return Promise.resolve();
      },
      addEventListener: (type: string, callback: (event: unknown) => void) => {
        listeners.set(type, callback);
      },
      clients: {
        claim: () => {
          claimed = true;
          return Promise.resolve();
        },
      },
    },
    URL,
    caches: {
      open: (name: string) => {
        opened.push(name);
        return Promise.resolve(cache);
      },
      keys: () =>
        Promise.resolve([
          'pushkara-static-prototype-v0',
          'pushkara-static-prototype-v1',
          'pushkara-static-prototype-v22',
          'unrelated-app-cache',
        ]),
      delete: (name: string) => {
        deleted.push(name);
        return Promise.resolve(true);
      },
    },
    fetch: (request: Request) => {
      network.push(request.url);
      return Promise.reject(new Error('Unexpected network fallback'));
    },
  });
  return {
    listeners,
    opened,
    deleted,
    network,
    claimed: () => claimed,
    skipped: () => skipped,
    installedPaths: () => installedPaths,
  };
}

describe('public prototype cache boundary', () => {
  it('does not intercept private, unknown, cross-origin, query or write requests', () => {
    const worker = serviceWorker();
    const excluded = [
      new Request(`${origin}/api/v1/me/profile`),
      new Request(`${origin}/api/v1/content/events`),
      new Request(`${origin}/auth/session`),
      new Request(`${origin}/admin`),
      new Request(`${origin}/admin/reports`),
      new Request(`${origin}/unknown`),
      new Request(`${origin}/index.html`),
      new Request(`${origin}/?private=synthetic`),
      new Request('https://outside.example/assets/shell.v1.css'),
      new Request(`${origin}/`, { method: 'POST', body: 'synthetic' }),
      new Request(`${origin}/`, { headers: { Authorization: 'synthetic-test-value' } }),
    ];
    let intercepted = false;
    for (const request of excluded) {
      worker.listeners.get('fetch')?.({
        request,
        respondWith: () => {
          intercepted = true;
        },
      });
    }
    expect(intercepted).toBe(false);
    expect(worker.opened).toEqual([]);
    expect(worker.network).toEqual([]);
  });

  it('serves an exact own static resource from its versioned cache', async () => {
    const worker = serviceWorker();
    let pending: Promise<Response> | undefined;
    worker.listeners.get('fetch')?.({
      request: new Request(`${origin}/assets/shell.v1.css`),
      respondWith: (response: Promise<Response>) => {
        pending = response;
      },
    });
    expect(pending).toBeDefined();
    const response = await pending;
    expect(await response?.text()).toBe('static:/assets/shell.v1.css');
    expect(worker.opened).toEqual(['pushkara-static-prototype-v22']);
    expect(worker.network).toEqual([]);
  });

  it('removes only obsolete owned caches during activation', async () => {
    const worker = serviceWorker();
    let activation: Promise<void> | undefined;
    worker.listeners.get('activate')?.({
      waitUntil: (promise: Promise<void>) => {
        activation = promise;
      },
    });
    expect(activation).toBeDefined();
    await activation;
    expect(worker.deleted).toEqual([
      'pushkara-static-prototype-v0',
      'pushkara-static-prototype-v1',
    ]);
    expect(worker.claimed()).toBe(true);
  });
});

interface StatusReply {
  type: string;
  version: string;
  complete: boolean;
}
interface TestController {
  postMessage: (data: unknown, ports: MessagePort[]) => void;
}
const helperSource = readFileSync(
  join(import.meta.dirname, '..', '..', 'public', 'assets', 'offline-status.v1.mjs'),
  'utf8',
);
const offline = runInNewContext(
  helperSource.replace(/^export /gm, '') +
    '\n({ verifyStaticController, EXPECTED_STATIC_CACHE, STATIC_STATUS_MESSAGE })',
  { MessageChannel, setTimeout, clearTimeout },
) as {
  verifyStaticController: (
    controller: TestController | null,
    timeoutMs?: number,
  ) => Promise<boolean>;
  EXPECTED_STATIC_CACHE: string;
  STATIC_STATUS_MESSAGE: string;
};

function replyingController(reply: unknown): TestController {
  return {
    postMessage: (_data, ports) => {
      ports[0]?.postMessage(reply);
      ports[0]?.close();
    },
  };
}

async function workerStatus(options: { missingPath?: string } = {}): Promise<unknown> {
  const worker = serviceWorker(options);
  let pending: Promise<void> | undefined;
  let reply: unknown;
  worker.listeners.get('message')?.({
    data: { type: offline.STATIC_STATUS_MESSAGE },
    ports: [
      {
        postMessage: (data: unknown) => {
          reply = data;
        },
      },
    ],
    waitUntil: (promise: Promise<void>) => {
      pending = promise;
    },
  });
  expect(pending).toBeDefined();
  await pending;
  return reply;
}

describe('offline installation and current-controller acknowledgement', () => {
  it('waits for all fifteen canonical static resources before skipWaiting', async () => {
    const worker = serviceWorker();
    let install: Promise<void> | undefined;
    worker.listeners.get('install')?.({
      waitUntil: (promise: Promise<void>) => {
        install = promise;
      },
    });
    expect(install).toBeDefined();
    expect(worker.skipped()).toBe(false);
    await install;
    expect(worker.installedPaths()).toHaveLength(15);
    expect(worker.installedPaths()).not.toContain('/index.html');
    expect(worker.installedPaths()).toContain('/assets/offline-status.v1.mjs');
    expect(worker.installedPaths()).toContain('/assets/icons.v1.mjs');
    expect(worker.installedPaths()).toContain('/assets/quick-access-synthetic-v1.jpg');
    expect(worker.installedPaths()).toContain('/assets/fonts/NotoSansTelugu-400.woff');
    expect(worker.installedPaths()).toContain('/assets/fonts/NotoSansDevanagari-700.woff');
    expect(worker.skipped()).toBe(true);
  });

  it('does not skipWaiting or represent failed precaching as installed', async () => {
    const worker = serviceWorker({ installFails: true });
    let install: Promise<void> | undefined;
    worker.listeners.get('install')?.({
      waitUntil: (promise: Promise<void>) => {
        install = promise;
      },
    });
    expect(install).toBeDefined();
    await expect(install).rejects.toThrow('Synthetic precache failure');
    expect(worker.skipped()).toBe(false);
    expect(worker.claimed()).toBe(false);
  });

  it('acknowledges only the expected revision with every resource present', async () => {
    const reply = await workerStatus();
    expect(reply).toEqual({
      type: offline.STATIC_STATUS_MESSAGE,
      version: offline.EXPECTED_STATIC_CACHE,
      complete: true,
    });
    await expect(offline.verifyStaticController(replyingController(reply))).resolves.toBe(true);
  });

  it('rejects incomplete current caches', async () => {
    const reply = await workerStatus({ missingPath: '/assets/shell.v1.css' });
    expect(reply).toMatchObject({ version: offline.EXPECTED_STATIC_CACHE, complete: false });
    await expect(offline.verifyStaticController(replyingController(reply))).resolves.toBe(false);
  });

  it('does not trust an old active worker when a new installation fails', async () => {
    const failed = serviceWorker({ installFails: true });
    let pending: Promise<void> | undefined;
    failed.listeners.get('install')?.({
      waitUntil: (promise: Promise<void>) => {
        pending = promise;
      },
    });
    await expect(pending).rejects.toThrow('Synthetic precache failure');
    const oldReply: StatusReply = {
      type: offline.STATIC_STATUS_MESSAGE,
      version: 'pushkara-static-prototype-v1',
      complete: true,
    };
    await expect(offline.verifyStaticController(replyingController(oldReply))).resolves.toBe(false);
  });

  it('fails closed on absent controller, stale protocol, malformed reply or message error', async () => {
    await expect(offline.verifyStaticController(null)).resolves.toBe(false);
    for (const reply of [
      null,
      'ready',
      { complete: true },
      { type: 'OLD_PROTOCOL', version: offline.EXPECTED_STATIC_CACHE, complete: true },
    ]) {
      await expect(offline.verifyStaticController(replyingController(reply))).resolves.toBe(false);
    }
    await expect(
      offline.verifyStaticController({
        postMessage: () => {
          throw new Error('Synthetic channel error');
        },
      }),
    ).resolves.toBe(false);
  });

  it('times out when an older worker has no acknowledgement handler', async () => {
    await expect(
      offline.verifyStaticController(
        {
          postMessage: (_data, ports) => {
            ports[0]?.close();
          },
        },
        15,
      ),
    ).resolves.toBe(false);
  });

  it('ignores commands that attempt to select arbitrary caches or paths', () => {
    const worker = serviceWorker();
    let responded = false;
    worker.listeners.get('message')?.({
      data: { type: 'CACHE_URL', url: '/api/v1/me' },
      ports: [
        {
          postMessage: () => {
            responded = true;
          },
        },
      ],
    });
    expect(responded).toBe(false);
    expect(worker.opened).toEqual([]);
  });
});
