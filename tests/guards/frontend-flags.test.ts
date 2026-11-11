import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FLAGS, isEnabled, type FlagName } from '../../web/src/shared/flags/flags';
import { findDynamicFlagSources } from './frontend-scan';

/**
 * Release-blocking flags (master instructions section 16). Enabling any of them is a
 * deliberate change to this test in the same reviewed PR, with the approvals linked.
 */
const REQUIRED_FLAGS: readonly FlagName[] = [
  'geolocation',
  'pilgrimPass',
  'myGroup',
  'liveMap',
  'sosDispatch',
  'photoUpload',
  'missingPersons',
  'partnerContact',
  'payments',
  'donations',
  'publishedInformation',
];

describe('frontend feature flags', () => {
  it('defines every required risky flag', () => {
    expect(Object.keys(FLAGS).sort()).toEqual([...REQUIRED_FLAGS].sort());
  });

  it.each(REQUIRED_FLAGS)('%s is off by default', (name) => {
    expect(FLAGS[name]).toBe(false);
    expect(isEnabled(name)).toBe(false);
  });

  it('is a literal constant file with no dynamic sources', () => {
    const source = readFileSync(
      join(import.meta.dirname, '..', '..', 'web', 'src', 'shared', 'flags', 'flags.ts'),
      'utf8',
    );
    expect(findDynamicFlagSources(source)).toEqual([]);
  });

  it('scanner detects URL, storage and network sources', () => {
    expect(findDynamicFlagSources('const a = location.search;')).toContain('location');
    expect(findDynamicFlagSources("localStorage.getItem('f')")).toContain('storage');
    expect(findDynamicFlagSources("await fetch('/flags')")).toContain('network');
    const commented = '// location.search in a comment\nexport const X = false;';
    expect(findDynamicFlagSources(commented)).toEqual([]);
  });
});
