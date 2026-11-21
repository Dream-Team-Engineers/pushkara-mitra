/**
 * Offline map: asks the service worker to save the map files on this phone, or whether they are
 * already saved. The worker does the storing (web/build/sw.template.js); the page only sends one
 * of two fixed commands and reads a yes/no answer. Nothing about the person is sent or kept.
 */
type Command = 'MAP_STATUS' | 'MAP_DOWNLOAD';

const STATUS_TIMEOUT_MS = 4000;
/** Saving is about 7 MB; a slow connection at the ghats may need minutes. */
const DOWNLOAD_TIMEOUT_MS = 5 * 60 * 1000;

function answer(data: unknown): boolean | null {
  if (typeof data !== 'object' || data === null) return null;
  const ready: unknown = Reflect.get(data, 'ready');
  return typeof ready === 'boolean' ? ready : null;
}

/** true / false from the worker, or null when there is no worker to ask (so no offline map). */
async function ask(command: Command, timeoutMs: number): Promise<boolean | null> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null;
  let worker: ServiceWorker | null | undefined;
  try {
    worker = (await navigator.serviceWorker.getRegistration())?.active;
  } catch {
    return null;
  }
  if (worker === null || worker === undefined) return null;
  const active = worker;
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    const timer = setTimeout(() => {
      channel.port1.close();
      resolve(null);
    }, timeoutMs);
    channel.port1.onmessage = (event: MessageEvent<unknown>) => {
      clearTimeout(timer);
      channel.port1.close();
      resolve(answer(event.data));
    };
    active.postMessage({ type: command }, [channel.port2]);
  });
}

/** null: this browser or build has no offline support, so the button is not shown. */
export function offlineMapStatus(): Promise<boolean | null> {
  return ask('MAP_STATUS', STATUS_TIMEOUT_MS);
}

/** true: saved. false: failed (no signal, server error). null: no worker. */
export function saveOfflineMap(): Promise<boolean | null> {
  return ask('MAP_DOWNLOAD', DOWNLOAD_TIMEOUT_MS);
}
