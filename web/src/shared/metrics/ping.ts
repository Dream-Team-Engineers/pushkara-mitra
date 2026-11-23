import { COUNT_OPENS } from '../flags/flags';
import { locale } from '../i18n/i18n';

/**
 * App-open and install counter for the staff dashboard (ADR 0018). Staging build only. Sends one
 * request per page load and one when the app is installed: the event and the screen language,
 * nothing else. No identifier, cookie or storage; a failure is ignored and never retried.
 */
export type CountedEvent = 'open' | 'install';

type Fetch = typeof fetch;
const defaultFetch: Fetch = (input, init) => fetch(input, init);

let openCounted = false;

export async function countEvent(
  event: CountedEvent,
  request: Fetch = defaultFetch,
  enabled: boolean = COUNT_OPENS,
): Promise<boolean> {
  if (!enabled) return false;
  try {
    const response = await request('/api/v1/ping', {
      method: 'POST',
      credentials: 'omit',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, locale: locale.value }),
      keepalive: true,
      signal: AbortSignal.timeout(5000),
    });
    return response.status === 204;
  } catch {
    return false;
  }
}

/** Counts this page load once, and an install if one happens. */
export function startCounting(): void {
  if (!COUNT_OPENS || openCounted || typeof window === 'undefined') return;
  openCounted = true;
  void countEvent('open');
  window.addEventListener('appinstalled', () => {
    void countEvent('install');
  });
}
