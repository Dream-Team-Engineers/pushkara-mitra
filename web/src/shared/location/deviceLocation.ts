import { signal } from '@preact/signals';

/**
 * The device's own position, for showing "you are here" on the map (owner decision 2026-11-19).
 *
 * Privacy rules (CLAUDE.md hard rule 1, ADR 0004):
 * - Foreground only, and only after an explicit tap. Nothing here runs on load.
 * - The position lives in this in-memory signal and nowhere else: never written to storage, a
 *   cookie, a log or an error report, and never sent over the network. It is dropped when
 *   tracking stops (leaving the map screen) or the page closes.
 * - If the person says no, or the device cannot provide a position, the map still works without it.
 *
 * This is the only frontend file allowed to touch `navigator.geolocation`
 * (tests/guards/frontend-privacy.test.ts).
 */
export interface DevicePosition {
  readonly lat: number;
  readonly lng: number;
  /** Radius of uncertainty in metres, as reported by the device. */
  readonly accuracyM: number;
}

export type LocationFailure = 'denied' | 'unavailable' | 'timeout' | 'unsupported';

export type LocationState =
  | { readonly status: 'idle' }
  | { readonly status: 'asking' }
  | { readonly status: 'on'; readonly position: DevicePosition }
  | { readonly status: 'off'; readonly reason: LocationFailure };

export const deviceLocation = signal<LocationState>({ status: 'idle' });

const OPTIONS: PositionOptions = { enableHighAccuracy: true, maximumAge: 10_000, timeout: 20_000 };

let watchId: number | null = null;

/** Maps the browser's numeric error code to a reason the screen can explain. */
export function failureFor(code: number): LocationFailure {
  if (code === 1) return 'denied';
  if (code === 3) return 'timeout';
  return 'unavailable';
}

/** Starts following the device position. Call only from a tap. Safe to call twice. */
export function startDeviceLocation(
  geo: Pick<Geolocation, 'watchPosition' | 'clearWatch'> | undefined = typeof navigator ===
  'undefined'
    ? undefined
    : navigator.geolocation,
): void {
  if (watchId !== null) return;
  if (geo === undefined) {
    deviceLocation.value = { status: 'off', reason: 'unsupported' };
    return;
  }
  deviceLocation.value = { status: 'asking' };
  try {
    watchId = geo.watchPosition(
      (result) => {
        deviceLocation.value = {
          status: 'on',
          position: {
            lat: result.coords.latitude,
            lng: result.coords.longitude,
            accuracyM: result.coords.accuracy,
          },
        };
      },
      (error) => {
        stopWatch(geo);
        deviceLocation.value = { status: 'off', reason: failureFor(error.code) };
      },
      OPTIONS,
    );
  } catch {
    deviceLocation.value = { status: 'off', reason: 'unsupported' };
  }
}

function stopWatch(geo: Pick<Geolocation, 'clearWatch'> | undefined): void {
  if (watchId !== null && geo !== undefined) geo.clearWatch(watchId);
  watchId = null;
}

/** Stops following and forgets the position. Called when the map screen closes. */
export function stopDeviceLocation(
  geo: Pick<Geolocation, 'clearWatch'> | undefined = typeof navigator === 'undefined'
    ? undefined
    : navigator.geolocation,
): void {
  stopWatch(geo);
  deviceLocation.value = { status: 'idle' };
}
