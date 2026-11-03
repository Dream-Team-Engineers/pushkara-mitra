/** Coarse static scanners for the location-privacy guard (see no-location-persistence.test.ts). */

const PERSISTENCE_PATTERNS: readonly [string, RegExp][] = [
  ['Durable Object storage', /\b(?:state|ctx|this\.ctx|this\.state)\.storage\b/],
  ['WebSocket attachment serialisation', /\b(?:serialize|deserialize)Attachment\b/],
  ['KV/R2 put', /\.put\s*\(/],
  // ADR 0004 Amendment 1: a SQLite-backed class may exist, but its store must never be used.
  ['SQLite storage access', /\.sql\s*\.\s*exec\b|\bstorage\s*\.\s*sql\b/],
  ['Durable Object KV storage API', /\bstorage\s*\.\s*kv\b/],
  ['Durable Object alarm', /\b(?:set|get|delete)Alarm\s*\(/],
];

const LOG_CALL = /\b(?:console|logger|log)\s*\.\s*(?:log|info|warn|error|debug|trace)\s*\(/g;
const COORD_FIELD = /\b(?:lat|lng|lon|latitude|longitude|coords)\b/i;

export function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

export function findPersistenceCalls(source: string): string[] {
  const code = stripComments(source);
  return PERSISTENCE_PATTERNS.filter(([, re]) => re.test(code)).map(([label]) => label);
}

function callBody(code: string, openIndex: number): string {
  let depth = 0;
  for (let i = openIndex; i < code.length; i++) {
    if (code[i] === '(') depth++;
    if (code[i] === ')' && --depth === 0) return code.slice(openIndex, i + 1);
  }
  return code.slice(openIndex);
}

export function findCoordinateLogging(source: string): string[] {
  const code = stripComments(source);
  const hits: string[] = [];
  for (const match of code.matchAll(LOG_CALL)) {
    const body = callBody(code, match.index + match[0].length - 1);
    if (COORD_FIELD.test(body)) hits.push(match[0] + body.slice(0, 60));
  }
  return hits;
}
