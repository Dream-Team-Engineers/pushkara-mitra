import { resolve } from 'node:path';
import preact from '@preact/preset-vite';
import { defineConfig } from 'vite';
import { serviceWorkerPlugin } from './web/build/sw';

/**
 * Frontend build (ADR 0011). Source lives in web/, output goes to dist/web.
 * The public shell in public/ keeps serving until the cut-over PR changes wrangler.toml.
 * CSP is `script-src 'self'; style-src 'self'`, so nothing may be inlined into the HTML.
 */
/**
 * Public Google OAuth client ID (not a secret) for the STAGING build only: `vite build --mode staging`.
 * Production builds get no ID, so Google sign-in stays off there. Keep it equal to GOOGLE_CLIENT_ID in
 * wrangler.toml [env.staging.vars] (tests/guards/google-signin-config.test.ts checks this).
 */
const STAGING_GOOGLE_CLIENT_ID =
  '433695131529-igclhmojpijekd1nq65m2jnue5rno8tr.apps.googleusercontent.com';

export default defineConfig(({ mode }) => ({
  root: 'web',
  define: {
    'import.meta.env.VITE_GOOGLE_CLIENT_ID': JSON.stringify(
      mode === 'staging' ? STAGING_GOOGLE_CLIENT_ID : '',
    ),
  },
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
}));
