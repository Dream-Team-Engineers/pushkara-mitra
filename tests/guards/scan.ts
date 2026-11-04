/** Coarse static scanners for the location-privacy guard (see no-location-persistence.test.ts). */

import ts from 'typescript';

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
  // The parser distinguishes regexes and template substitutions from comments.
  // Hide literal text only while locating comment tokens; return the original
  // literal contents so the existing coarse safety checks retain their scope.
  const parsed = ts.createSourceFile('guard.ts', source, ts.ScriptTarget.Latest, true);
  const masked = source.split('');
  function maskLiterals(node: ts.Node): void {
    if (
      ts.isStringLiteralLike(node) ||
      ts.isTemplateLiteralToken(node) ||
      ts.isRegularExpressionLiteral(node)
    ) {
      for (let i = node.getStart(parsed); i < node.end; i++) {
        if (masked[i] !== '\n' && masked[i] !== '\r') masked[i] = ' ';
      }
    }
    ts.forEachChild(node, maskLiterals);
  }
  maskLiterals(parsed);

  const scanner = ts.createScanner(ts.ScriptTarget.Latest, false, undefined, masked.join(''));
  const parts: string[] = [];
  let position = 0;
  for (let token = scanner.scan(); token !== ts.SyntaxKind.EndOfFileToken; token = scanner.scan()) {
    if (
      token === ts.SyntaxKind.SingleLineCommentTrivia ||
      token === ts.SyntaxKind.MultiLineCommentTrivia
    ) {
      parts.push(source.slice(position, scanner.getTokenStart()));
      position = scanner.getTokenEnd();
    }
  }
  parts.push(source.slice(position));
  return parts.join('');
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
