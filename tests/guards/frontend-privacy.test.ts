import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  findBrowserStorage,
  findDeviceCapture,
  findGeolocationUse,
  findNetworkUse,
  listCodeFiles,
  readCode,
} from './frontend-scan';

/**
 * Frontend privacy guard (ADR 0004, ADR 0008, docs/frontend/architecture-blueprint.md).
 * Static and coarse by design: it fails closed on any use of a sensitive browser API
 * until the matching ADR is accepted and the allow-list below is changed in a reviewed PR.
 */
const ROOT = join(import.meta.dirname, '..', '..', 'web', 'src');

/**
 * Files allowed to touch browser storage: language and theme preference only
 * (docs/compliance/data-inventory.md). Everything stored there is validated on read and
 * covered by web/src/shared/prefs/preferences.test.ts.
 */
const STORAGE_ALLOW_LIST: readonly string[] = ['shared/prefs/preferences.ts'];
/** Files allowed to use the network. Public read-only content client, once it exists. */
const NETWORK_ALLOW_LIST: readonly string[] = [];

const files = readCode(ROOT, listCodeFiles(ROOT));
const features = files.filter((file) => file.path.startsWith('features/'));

describe('frontend privacy guard: real sources', () => {
  it('finds frontend code to scan', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files.map((file) => file.path))('%s never reads device location', (path) => {
    const file = files.find((candidate) => candidate.path === path);
    expect(findGeolocationUse(file?.source ?? '')).toEqual([]);
  });

  it('keeps browser storage to the allow-list', () => {
    const offenders = files
      .filter((file) => !STORAGE_ALLOW_LIST.includes(file.path))
      .filter((file) => findBrowserStorage(file.source).length > 0)
      .map((file) => file.path);
    expect(offenders).toEqual([]);
  });

  it('uses no camera, file picker, scanner or dial/sms/mail link until each is approved', () => {
    // Tests are excluded: they assert the absence of these patterns in rendered output.
    const offenders = files
      .filter((file) => !/\.test\.tsx?$/.test(file.path))
      .filter((file) => findDeviceCapture(file.source).length > 0)
      .map((file) => file.path);
    expect(offenders).toEqual([]);
  });

  it('keeps feature (prototype) code off the network and forms inert', () => {
    const offenders = features
      .filter((file) => !NETWORK_ALLOW_LIST.includes(file.path))
      .filter((file) => findNetworkUse(file.source).length > 0)
      .map((file) => file.path);
    expect(offenders).toEqual([]);
  });
});

describe('frontend privacy guard: scanners detect violations', () => {
  it('flags geolocation APIs but ignores comments and strings', () => {
    expect(findGeolocationUse('navigator.geolocation.getCurrentPosition(f)')).toEqual([
      'navigator.geolocation',
      'getCurrentPosition',
    ]);
    expect(findGeolocationUse('navigator.geolocation.watchPosition(f)')).toContain('watchPosition');
    expect(findGeolocationUse('// navigator.geolocation is forbidden\nconst a = 1;')).toEqual([]);
  });

  it('flags browser storage', () => {
    expect(findBrowserStorage("localStorage.setItem('phone', p)")).toEqual(['localStorage']);
    expect(findBrowserStorage('sessionStorage.x')).toEqual(['sessionStorage']);
    expect(findBrowserStorage('indexedDB.open("a")')).toEqual(['IndexedDB']);
    expect(findBrowserStorage('const db = await openDB("a")')).toEqual(['IndexedDB']);
    expect(findBrowserStorage('(await caches.open("c")).put(r, s)')).toEqual(['Cache Storage']);
    expect(findBrowserStorage('document.cookie = "a=1"')).toEqual(['cookie']);
    expect(findBrowserStorage('const note = 1;')).toEqual([]);
  });

  it('flags device capture and contact links', () => {
    expect(findDeviceCapture('<input type="file" accept="image/*" capture="user">')).toEqual([
      'file input',
      'capture attribute',
    ]);
    expect(findDeviceCapture('navigator.mediaDevices.getUserMedia({ video: true })')).toEqual([
      'getUserMedia',
    ]);
    expect(findDeviceCapture('new BarcodeDetector()')).toEqual(['barcode or QR scan']);
    expect(findDeviceCapture('<a href="tel:112">')).toEqual(['dial, sms or mail link']);
    expect(findDeviceCapture('const a = 1;')).toEqual([]);
  });

  it('flags network and submit paths', () => {
    expect(findNetworkUse("fetch('/api/x', { method: 'POST' })")).toEqual(['fetch']);
    expect(findNetworkUse('navigator.sendBeacon(u, d)')).toEqual(['sendBeacon']);
    expect(findNetworkUse('new WebSocket(u)')).toEqual(['WebSocket']);
    expect(findNetworkUse('form.requestSubmit()')).toEqual(['form submit']);
    expect(findNetworkUse('<form action="/x">')).toEqual(['form submit']);
    expect(
      findNetworkUse('<form><input name="phone" /><button type="submit">Send</button></form>'),
    ).toEqual(['form submit']);
    expect(findNetworkUse('<FORM method="get">')).toEqual(['form submit']);
    expect(findNetworkUse('const a = 1;')).toEqual([]);
  });
});
