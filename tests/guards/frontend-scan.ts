/** Coarse static scanners for the frontend privacy guard (see frontend-privacy.test.ts). */

import { readdirSync, readFileSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { stripComments } from './scan';

export const CODE_EXTENSIONS: ReadonlySet<string> = new Set(['.ts', '.tsx', '.js', '.mjs', '.jsx']);

const GEOLOCATION: readonly [string, RegExp][] = [
  // Not a bare word match: the feature flag is legitimately named `geolocation`.
  ['navigator.geolocation', /\bnavigator\b[^;]*?\bgeolocation\b/],
  ['getCurrentPosition', /\bgetCurrentPosition\b/],
  ['watchPosition', /\bwatchPosition\b/],
];

const BROWSER_STORAGE: readonly [string, RegExp][] = [
  ['localStorage', /\blocalStorage\b/],
  ['sessionStorage', /\bsessionStorage\b/],
  ['IndexedDB', /\bindexedDB\b|\bopenDB\s*\(/],
  ['Cache Storage', /\bcaches\s*\.\s*(?:open|put)\b|\.addAll\s*\(/],
  ['cookie', /\bdocument\s*\.\s*cookie\b/],
];

const NETWORK: readonly [string, RegExp][] = [
  ['fetch', /\bfetch\s*\(/],
  ['XMLHttpRequest', /\bXMLHttpRequest\b/],
  ['sendBeacon', /\bsendBeacon\b/],
  ['WebSocket', /\bWebSocket\b/],
  ['EventSource', /\bEventSource\b/],
  ['form submit', /\.\s*(?:submit|requestSubmit)\s*\(|\baction\s*=/],
];

function scanWith(patterns: readonly [string, RegExp][], source: string): string[] {
  const code = stripComments(source);
  return patterns.filter(([, re]) => re.test(code)).map(([label]) => label);
}

export const findGeolocationUse = (source: string): string[] => scanWith(GEOLOCATION, source);
export const findBrowserStorage = (source: string): string[] => scanWith(BROWSER_STORAGE, source);
export const findNetworkUse = (source: string): string[] => scanWith(NETWORK, source);

/** Flags must be constants, never derived from the URL, storage or the network. */
export function findDynamicFlagSources(source: string): string[] {
  return scanWith(
    [
      ['location', /\blocation\s*\.\s*(?:search|hash|href)\b|\bURLSearchParams\b/],
      ['storage', /\b(?:localStorage|sessionStorage|indexedDB)\b/],
      ['network', /\bfetch\s*\(|\bimport\s*\(/],
    ],
    source,
  );
}

export function listCodeFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true, recursive: true })) {
    if (!entry.isFile() || !CODE_EXTENSIONS.has(extname(entry.name))) continue;
    out.push(join(entry.parentPath, entry.name));
  }
  return out.sort();
}

export function readCode(root: string, files: string[]): { path: string; source: string }[] {
  return files.map((file) => ({ path: relative(root, file), source: readFileSync(file, 'utf8') }));
}
