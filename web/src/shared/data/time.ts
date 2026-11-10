import { signal } from '@preact/signals';

/**
 * Provisional Godavari Pushkaralu 2027 window (open question OQ-004).
 * Dates are NOT officially confirmed; the UI says so while `datesConfirmed` is false.
 * Times are Indian Standard Time.
 */
export interface EventWindow {
  readonly start: number;
  readonly end: number;
}

export const EVENT: EventWindow & { readonly datesConfirmed: boolean } = {
  start: Date.parse('2027-06-26T00:00:00+05:30'),
  end: Date.parse('2027-07-07T23:59:59+05:30'),
  datesConfirmed: false,
};

export type Countdown =
  | {
      readonly phase: 'before';
      readonly days: number;
      readonly hours: number;
      readonly minutes: number;
    }
  | { readonly phase: 'during' }
  | { readonly phase: 'after' };

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function countdown(now: number, event: EventWindow = EVENT): Countdown {
  if (now > event.end) return { phase: 'after' };
  if (now >= event.start) return { phase: 'during' };
  const left = event.start - now;
  return {
    phase: 'before',
    days: Math.floor(left / DAY),
    hours: Math.floor((left % DAY) / HOUR),
    minutes: Math.floor((left % HOUR) / MINUTE),
  };
}

/** Whole minutes since an ISO timestamp, never negative; null when the timestamp is invalid. */
export function minutesSince(isoTimestamp: string, now: number): number | null {
  const then = Date.parse(isoTimestamp);
  if (Number.isNaN(then)) return null;
  return Math.max(0, Math.floor((now - then) / MINUTE));
}

export const now = signal(Date.now());

/** Ticks the shared clock while the page is visible. Returns a stop function. */
export function startClock(intervalMs = 30_000): () => void {
  const tick = (): void => {
    now.value = Date.now();
  };
  const timer = setInterval(tick, intervalMs);
  const onVisible = (): void => {
    if (document.visibilityState === 'visible') tick();
  };
  document.addEventListener('visibilitychange', onVisible);
  return () => {
    clearInterval(timer);
    document.removeEventListener('visibilitychange', onVisible);
  };
}

export const online = signal(typeof navigator === 'undefined' ? true : navigator.onLine);

/** Mirrors the browser's online state into a signal. Returns a stop function. */
export function watchOnline(): () => void {
  const update = (): void => {
    online.value = navigator.onLine;
  };
  window.addEventListener('online', update);
  window.addEventListener('offline', update);
  return () => {
    window.removeEventListener('online', update);
    window.removeEventListener('offline', update);
  };
}
