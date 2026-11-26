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
/**
 * Files allowed to build a tel: link. Owner decision 2026-11-15: helpline numbers may be called,
 * but only from the confirmation dialog in HelplineList after an explicit tap. No other file may
 * dial, text or mail, and the dialled number comes only from approved, officially sourced data.
 */
const DIAL_ALLOW_LIST: readonly string[] = [
  'features/help/HelplineList.tsx',
  // Owner request 2026-11-26: "Contact us" on Me opens the person's own email app with a mail link
  // to the address already published on the Privacy screen. Mail links only (checked below); the
  // app itself sends and stores nothing.
  'features/contact/ContactUs.tsx',
];
/** Files allowed only a mail link: never tel: or sms:. */
const MAIL_ONLY: readonly string[] = ['features/contact/ContactUs.tsx'];

/**
 * The only file allowed to read the device position. Owner decision 2026-11-19: show the device's
 * own position on the map, on this phone only. The file may not touch storage or the network
 * (checked below); the flag is on in the staging build only (OQ-041).
 */
const GEOLOCATION_ALLOW_LIST: readonly string[] = [
  'shared/location/deviceLocation.ts',
  'shared/location/deviceLocation.test.ts',
];

const files = readCode(ROOT, listCodeFiles(ROOT));
const features = files.filter((file) => file.path.startsWith('features/'));

describe('frontend privacy guard: real sources', () => {
  it('finds frontend code to scan', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files.map((file) => file.path))('%s never reads device location', (path) => {
    if (GEOLOCATION_ALLOW_LIST.includes(path)) return;
    const file = files.find((candidate) => candidate.path === path);
    expect(findGeolocationUse(file?.source ?? '')).toEqual([]);
  });

  it('keeps location reading to the one reviewed file, which never stores or sends it', () => {
    for (const path of GEOLOCATION_ALLOW_LIST) {
      const file = files.find((candidate) => candidate.path === path);
      expect(file, path).toBeDefined();
      expect(findBrowserStorage(file?.source ?? '')).toEqual([]);
      expect(findNetworkUse(file?.source ?? '')).toEqual([]);
    }
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
      .filter(
        (file) =>
          !DIAL_ALLOW_LIST.includes(file.path) ||
          findDeviceCapture(file.source).some((hit) => hit !== 'dial, sms or mail link'),
      )
      .map((file) => file.path);
    expect(offenders).toEqual([]);
  });

  it('lets the contact screen build mail links only, never dial or text links', () => {
    for (const path of MAIL_ONLY) {
      const file = files.find((candidate) => candidate.path === path);
      expect(file, path).toBeDefined();
      const code = file?.source ?? '';
      expect(code).toMatch(/\bmailto:/);
      expect(code).not.toMatch(/\b(?:tel|sms):/);
    }
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
