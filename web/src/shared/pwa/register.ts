import { signal } from '@preact/signals';

/** True when a new version is installed and waiting for the person to accept it. */
export const updateReady = signal(false);

let waiting: ServiceWorker | null = null;
let reloading = false;

function watch(registration: ServiceWorkerRegistration): void {
  const flag = (worker: ServiceWorker | null): void => {
    if (worker !== null && navigator.serviceWorker.controller !== null) {
      waiting = worker;
      updateReady.value = true;
    }
  };
  flag(registration.waiting);
  registration.addEventListener('updatefound', () => {
    const installing = registration.installing;
    installing?.addEventListener('statechange', () => {
      if (installing.state === 'installed') flag(installing);
    });
  });
}

/** Registers the generated worker in production builds only. Failure leaves the app online-only. */
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading) return;
    reloading = true;
    window.location.reload();
  });
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .then(watch)
      .catch(() => {
        // Offline support is an enhancement; the app keeps working without it.
      });
  });
}

/** Called when the person taps "Update": the waiting worker takes over and the page reloads. */
export function applyUpdate(): void {
  waiting?.postMessage({ type: 'SKIP_WAITING' });
}
