import { resolve } from 'node:path';
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
    serviceWorkerPlugin(resolve(import.meta.dirname, 'web/build/sw.template.js')),
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
