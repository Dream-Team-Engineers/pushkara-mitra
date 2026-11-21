import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import type { Plugin } from 'vite';

export interface PrecachePlan {
  readonly precache: readonly string[];
  readonly optional: readonly string[];
  /** Map archive, glyphs, sprites and places: saved only when the person asks (offline map). */
  readonly map: readonly string[];
}

/**
 * Fonts for other languages and the map screen's code (about 1 MB: MapLibre and its worker) are
 * cached when first used, so the first visit stays small.
 */
const OPTIONAL_PATTERN = /^\/fonts\/NotoSansDevanagari-|^\/assets\/(?:LiveMap|maplibre-gl-worker)-/;
/** The map archive, glyphs and sprites are fetched on demand, never precached (the archive is megabytes). */
const EXCLUDED_PATTERN = /\.(?:map|txt)$|^\/sw\.js$|^\/maps\//;
const MAP_FILE_PATTERN = /^maps\/.*(?<!\.txt)$/;

/** Files (relative to the output directory) that make up the downloadable offline map. */
export function mapFiles(files: readonly string[]): string[] {
  return files
    .map((file) => file.replaceAll('\\', '/'))
    .filter((file) => MAP_FILE_PATTERN.test(file));
}

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
  // Paths are stored percent-encoded, as `URL.pathname` reports them (glyph folders contain spaces).
  const map = mapFiles(files)
    .map((file) => encodeURI(`/${file}`))
    .sort();
  return { precache, optional, map };
}

export function renderServiceWorker(
  template: string,
  plan: PrecachePlan,
  version: string,
  mapVersion = version,
): string {
  return template
    .replace('__MAP_VERSION__', mapVersion)
    .replace('__MAP__', JSON.stringify(plan.map))
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
      const mapVersion = versionFor(outDir, mapFiles(files));
      const source = renderServiceWorker(
        readFileSync(templatePath, 'utf8'),
        plan,
        version,
        mapVersion,
      );
      writeFileSync(join(outDir, 'sw.js'), source);
    },
  };
}
