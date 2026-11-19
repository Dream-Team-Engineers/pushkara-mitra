import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  deviceLocation,
  failureFor,
  startDeviceLocation,
  stopDeviceLocation,
} from './deviceLocation';

type Success = (position: GeolocationPosition) => void;
type Failure = (error: GeolocationPositionError) => void;

function fakeGeo() {
  let onSuccess: Success = () => undefined;
  let onError: Failure = () => undefined;
  const watchPosition = vi.fn((success: Success, error?: Failure | null) => {
    onSuccess = success;
    onError = error ?? (() => undefined);
    return 7;
  });
  const clearWatch = vi.fn();
  return {
    geo: { watchPosition, clearWatch },
    watchPosition,
    clearWatch,
    succeed: (lat: number, lng: number, accuracy: number) => {
      onSuccess({ coords: { latitude: lat, longitude: lng, accuracy } } as GeolocationPosition);
    },
    fail: (code: number) => {
      onError({ code } as GeolocationPositionError);
    },
  };
}

afterEach(() => {
  stopDeviceLocation(undefined);
});

describe('device location', () => {
  it('does nothing until started', () => {
    expect(deviceLocation.value).toEqual({ status: 'idle' });
  });

  it('asks, then holds the position in memory', () => {
    const fake = fakeGeo();
    startDeviceLocation(fake.geo);
    expect(deviceLocation.value).toEqual({ status: 'asking' });
    fake.succeed(17.0005, 81.7787, 12);
    expect(deviceLocation.value).toEqual({
      status: 'on',
      position: { lat: 17.0005, lng: 81.7787, accuracyM: 12 },
    });
    stopDeviceLocation(fake.geo);
  });

  it('starts only one watch however often it is called', () => {
    const fake = fakeGeo();
    startDeviceLocation(fake.geo);
    startDeviceLocation(fake.geo);
    expect(fake.watchPosition).toHaveBeenCalledTimes(1);
    stopDeviceLocation(fake.geo);
  });

  it('maps a refusal to "denied", stops watching, and leaves the map usable', () => {
    const fake = fakeGeo();
    startDeviceLocation(fake.geo);
    fake.fail(1);
    expect(deviceLocation.value).toEqual({ status: 'off', reason: 'denied' });
    expect(fake.clearWatch).toHaveBeenCalledWith(7);
  });

  it('forgets the position and stops following when told to stop', () => {
    const fake = fakeGeo();
    startDeviceLocation(fake.geo);
    fake.succeed(17, 81.7, 5);
    stopDeviceLocation(fake.geo);
    expect(fake.clearWatch).toHaveBeenCalledWith(7);
    expect(deviceLocation.value).toEqual({ status: 'idle' });
  });

  it('reports "unsupported" when the device has no geolocation', () => {
    startDeviceLocation(undefined);
    expect(deviceLocation.value).toEqual({ status: 'off', reason: 'unsupported' });
  });

  it('maps browser error codes to reasons', () => {
    expect(failureFor(1)).toBe('denied');
    expect(failureFor(2)).toBe('unavailable');
    expect(failureFor(3)).toBe('timeout');
  });
});
