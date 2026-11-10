// Measures the built frontend (dist/web) against the agreed budgets and fails when one is exceeded.
// Budgets come from docs/frontend/budgets-and-licences.md (stricter value wins, ADR 0011).
// Sizes are gzip -9 of text assets and raw bytes of already-compressed assets (fonts, images).
// This is a lab measurement of build output, not a field or device measurement.
import { appendFileSync, existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { gzipSync } from 'node:zlib';

const KB = 1024;
const DIST = process.argv[2] ?? 'dist/web';

const BUDGETS = {
  initialJs: 100 * KB,
  routeChunk: 50 * KB,
  css: 25 * KB,
  initialJsAndCss: 125 * KB,
  fonts: 100 * KB,
  firstVisit: 300 * KB,
};

if (!existsSync(join(DIST, 'index.html'))) {
  console.error(`No build output at ${DIST}. Run "npm run build:web" first.`);
  process.exit(2);
}

function listFiles(dir) {
  return readdirSync(dir, { withFileTypes: true, recursive: true })
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name));
}

const files = listFiles(DIST).map((path) => {
  const bytes = readFileSync(path);
  const ext = extname(path);
  const text = ['.js', '.css', '.html', '.json', '.svg', '.webmanifest', '.mjs'].includes(ext);
  return {
    path: path.slice(DIST.length + 1),
    ext,
    size: text ? gzipSync(bytes, { level: 9 }).length : bytes.length,
    raw: bytes.length,
  };
});

const byPath = new Map(files.map((file) => [file.path, file]));
const html = readFileSync(join(DIST, 'index.html'), 'utf8');

function referenced(pattern) {
  return [...html.matchAll(pattern)].map((match) => match[1].replace(/^\//, ''));
}

const initialJsPaths = new Set([
  ...referenced(/<script\b[^>]*\bsrc="([^"]+)"/g),
  ...[...html.matchAll(/<link\b[^>]*>/g)]
    .map((match) => match[0])
    .filter((tag) => /rel="modulepreload"/.test(tag))
    .map((tag) => /href="([^"]+)"/.exec(tag)?.[1])
    .filter(Boolean)
    .map((href) => href.replace(/^\//, '')),
]);
const initialCssPaths = new Set(
  [...html.matchAll(/<link\b[^>]*>/g)]
    .map((match) => match[0])
    .filter((tag) => /rel="stylesheet"/.test(tag))
    .map((tag) => /href="([^"]+)"/.exec(tag)?.[1])
    .filter(Boolean)
    .map((href) => href.replace(/^\//, '')),
);

const sum = (items) => items.reduce((total, item) => total + item.size, 0);
const pick = (paths) => [...paths].map((path) => byPath.get(path)).filter(Boolean);

const initialJs = pick(initialJsPaths);
const initialCss = pick(initialCssPaths);
const allCss = files.filter((file) => file.ext === '.css');
const routeChunks = files.filter((file) => file.ext === '.js' && !initialJsPaths.has(file.path));
const fonts = files.filter((file) => ['.woff2', '.woff', '.ttf', '.otf'].includes(file.ext));
const htmlFile = byPath.get('index.html');

const results = [
  ['Initial JavaScript (gzip)', sum(initialJs), BUDGETS.initialJs],
  [
    'Largest route chunk (gzip)',
    Math.max(0, ...routeChunks.map((file) => file.size)),
    BUDGETS.routeChunk,
  ],
  ['All CSS (gzip)', sum(allCss), BUDGETS.css],
  ['Initial JavaScript + CSS (gzip)', sum(initialJs) + sum(initialCss), BUDGETS.initialJsAndCss],
  ['Fonts in build', sum(fonts), BUDGETS.fonts],
  [
    'First visit estimate (HTML + initial JS + CSS + fonts)',
    (htmlFile?.size ?? 0) + sum(initialJs) + sum(initialCss) + sum(fonts),
    BUDGETS.firstVisit,
  ],
];

const kb = (bytes) => `${(bytes / KB).toFixed(1)} KB`;
const lines = [
  '### Frontend bundle budget (dist/web, lab measurement)',
  '',
  '| Metric | Measured | Budget | Result |',
  '| --- | --- | --- | --- |',
  ...results.map(
    ([name, size, budget]) =>
      `| ${name} | ${kb(size)} | ${kb(budget)} | ${size <= budget ? 'within' : 'OVER'} |`,
  ),
  '',
  `Initial JS files: ${[...initialJsPaths].join(', ') || 'none'}`,
  `Route chunks: ${routeChunks.length} (${routeChunks.map((file) => `${file.path} ${kb(file.size)}`).join(', ') || 'none'})`,
];
console.log(lines.join('\n'));

if (process.env.GITHUB_STEP_SUMMARY)
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${lines.join('\n')}\n`);
writeFileSync(
  join(DIST, '..', 'web-budget.json'),
  JSON.stringify(
    { budgets: BUDGETS, results: results.map(([name, size, budget]) => ({ name, size, budget })) },
    null,
    2,
  ),
);

if (results.some(([, size, budget]) => size > budget)) {
  console.error('Bundle budget exceeded.');
  process.exit(1);
}
