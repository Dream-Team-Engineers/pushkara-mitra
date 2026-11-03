import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { findCoordinateLogging, findPersistenceCalls } from './scan';

const SRC = join(import.meta.dirname, '..', '..', 'src');

/**
 * Reviewed allow-list of repo-relative paths that may persist data.
 * Adding an entry needs CODEOWNER approval and a note in docs/security/security-architecture.md.
 * Location data must never be persisted, so nothing belongs here for location code.
 */
const REVIEWED_ALLOW_LIST: readonly string[] = [];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return entry.name.endsWith('.ts') ? [path] : [];
  });
}

describe('scanner self-tests', () => {
  it('flags persistence APIs', () => {
    expect(findPersistenceCalls('await this.ctx.storage.put("k", 1)')).not.toEqual([]);
    expect(findPersistenceCalls('ws.serializeAttachment(x)')).not.toEqual([]);
    expect(findPersistenceCalls('await env.BUCKET.put(key, body)')).not.toEqual([]);
  });

  it('flags the SQLite backend, KV storage API, alarms and attachment deserialisation', () => {
    expect(findPersistenceCalls('const sql = storage.sql; sql.exec("INSERT")')).not.toEqual([]);
    expect(findPersistenceCalls('db.sql.exec("SELECT 1")')).not.toEqual([]);
    expect(findPersistenceCalls('storage.kv.put("k", 1)')).not.toEqual([]);
    expect(findPersistenceCalls('await ctx.setAlarm(Date.now())')).not.toEqual([]);
    expect(findPersistenceCalls('const s = ws.deserializeAttachment()')).not.toEqual([]);
  });

  it('does not flag ordinary code', () => {
    expect(findPersistenceCalls('const m = /a/.exec(text); const sqlish = "x";')).toEqual([]);
  });

  it('ignores comments', () => {
    expect(findPersistenceCalls('// never call ctx.storage.put()\nconst a = 1;')).toEqual([]);
  });

  it('flags coordinates in log calls only', () => {
    expect(findCoordinateLogging('console.log({ lat: 1, lng: 2 })')).not.toEqual([]);
    expect(findCoordinateLogging('logger.error("x", { coords })')).not.toEqual([]);
    expect(findCoordinateLogging('console.log("healthy")')).toEqual([]);
    expect(findCoordinateLogging('const lat = 1;')).toEqual([]);
  });
});

describe('src/ guard', () => {
  const files = sourceFiles(SRC).filter(
    (f) => !REVIEWED_ALLOW_LIST.includes(relative(join(SRC, '..'), f).replaceAll('\\', '/')),
  );

  it('scans at least one file', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it('never persists data via forbidden APIs', () => {
    for (const file of files) {
      expect(findPersistenceCalls(readFileSync(file, 'utf8')), file).toEqual([]);
    }
  });

  it('never logs coordinate fields', () => {
    for (const file of files) {
      expect(findCoordinateLogging(readFileSync(file, 'utf8')), file).toEqual([]);
    }
  });
});
