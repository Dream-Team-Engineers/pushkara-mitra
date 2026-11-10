import { fileURLToPath } from 'node:url';
import preact from '@preact/preset-vite';
import { defineConfig } from 'vite';
import { serviceWorkerPlugin } from './web/build/sw';

/**
 * Frontend build (ADR 0011). Source lives in web/, output goes to dist/web.
 * The public shell in public/ keeps serving until the cut-over PR changes wrangler.toml.
 * CSP is `script-src 'self'; style-src 'self'`, so nothing may be inlined into the HTML.
 */
export default defineConfig({
  root: 'web',
  plugins: [
    preact(),
    serviceWorkerPlugin(fileURLToPath(new URL('./web/build/sw.template.js', import.meta.url))),
  ],
  build: {
    outDir: '../dist/web',
    emptyOutDir: true,
    target: 'es2022',
    sourcemap: false,
    cssCodeSplit: true,
    assetsInlineLimit: 0,
    modulePreload: { polyfill: false },
  },
});
