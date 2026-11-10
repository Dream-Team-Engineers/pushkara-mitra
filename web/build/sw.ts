import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import type { Plugin } from 'vite';

export interface PrecachePlan {
  readonly precache: readonly string[];
  readonly optional: readonly string[];
}

/** Fonts for other languages are cached when first used, so the first visit stays small. */
const OPTIONAL_PATTERN = /^\/fonts\/NotoSansDevanagari-/;
const EXCLUDED_PATTERN = /\.(?:map|txt)$|^\/sw\.js$/;

/** Turns the built file list (paths relative to the output directory) into the cache plan. */
export function planPrecache(files: readonly string[]): PrecachePlan {
  const paths = files
    .map((file) => `/${file.replaceAll('\\', '/')}`)
    .filter((path) => !EXCLUDED_PATTERN.test(path));
  const sorted = [...new Set(paths)].sort();
  const optional = sorted.filter((path) => OPTIONAL_PATTERN.test(path));
  const precache = sorted
    .filter((path) => !OPTIONAL_PATTERN.test(path))
    .map((path) => (path === '/index.html' ? '/' : path))
    .sort();
  return { precache, optional };
}

export function renderServiceWorker(template: string, plan: PrecachePlan, version: string): string {
  return template
    .replace('__VERSION__', version)
    .replace('__PRECACHE__', JSON.stringify(plan.precache))
    .replace('__OPTIONAL__', JSON.stringify(plan.optional));
}

function listFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true, recursive: true })
    .filter((entry) => entry.isFile())
    .map((entry) => relative(dir, join(entry.parentPath, entry.name)));
}

/** Version = hash of every cached file, so any change to the build changes the cache name. */
export function versionFor(dir: string, files: readonly string[]): string {
  const hash = createHash('sha256');
  for (const file of [...files].sort()) {
    hash
      .update(file)
      .update('\0')
      .update(readFileSync(join(dir, file)))
      .update('\0');
  }
  return hash.digest('hex').slice(0, 12);
}

export function serviceWorkerPlugin(templatePath: string): Plugin {
  let outDir = '';
  return {
    name: 'pushkara-service-worker',
    apply: 'build',
    configResolved(config) {
      outDir = join(config.root, config.build.outDir);
    },
    closeBundle() {
      const files = listFiles(outDir).filter((file) => file !== 'sw.js');
      const plan = planPrecache(files);
      const version = versionFor(outDir, files);
      const source = renderServiceWorker(readFileSync(templatePath, 'utf8'), plan, version);
      writeFileSync(join(outDir, 'sw.js'), source);
    },
  };
}
