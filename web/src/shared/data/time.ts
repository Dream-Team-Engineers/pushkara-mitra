import { signal } from '@preact/signals';

/**
 * Godavari Pushkaralu 2027 window. Confirmed by the owner (gkmraju) on 2026-11-14 from
 * https://eastgodavari.ap.gov.in/godavari-pushkaralu-2027/ ("held from June 26 to July 7, 2027",
 * page updated 29.01.2026), closing OQ-004. Set `datesConfirmed` back to false if an official
 * order changes them. Times are Indian Standard Time.
 */
export interface EventWindow {
  readonly start: number;
  readonly end: number;
}

export const EVENT: EventWindow & { readonly datesConfirmed: boolean } = {
  start: Date.parse('2027-06-26T00:00:00+05:30'),
  end: Date.parse('2027-07-07T23:59:59+05:30'),
  datesConfirmed: true,
};

export type Countdown =
  | {
      readonly phase: 'before';
      readonly days: number;
      readonly hours: number;
      readonly minutes: number;
      readonly seconds: number;
    }
  | { readonly phase: 'during' }
  | { readonly phase: 'after' };

const SECOND = 1000;
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
    seconds: Math.floor((left % MINUTE) / SECOND),
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
export function startClock(intervalMs = 1000): () => void {
  const tick = (): void => {
    now.value = Date.now();
  };
  const timer = setInterval(() => {
    if (document.visibilityState === 'visible') tick();
  }, intervalMs);
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
