import { execSync } from 'node:child_process';
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

/** Short commit of the source being built, shown in the app so a stale copy is easy to spot. */
function buildId(): string {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

export default defineConfig(({ mode }) => ({
  root: 'web',
  define: {
    'import.meta.env.VITE_BUILD_ID': JSON.stringify(
      `${buildId()}${mode === 'staging' ? ' staging' : ''}`,
    ),
    'import.meta.env.VITE_GOOGLE_CLIENT_ID': JSON.stringify(
      mode === 'staging' ? STAGING_GOOGLE_CLIENT_ID : '',
    ),
    // Device position on the map: staging build only (flags.ts, OQ-041).
    'import.meta.env.VITE_DEVICE_LOCATION': JSON.stringify(mode === 'staging' ? 'enabled' : ''),
    // Real groups and live sharing with the group: staging build only (flags.ts, ADR 0017).
    'import.meta.env.VITE_GROUPS': JSON.stringify(mode === 'staging' ? 'enabled' : ''),
    // Partners (priests and volunteers): staging build only (flags.ts, ADR 0019).
    'import.meta.env.VITE_PARTNERS': JSON.stringify(mode === 'staging' ? 'enabled' : ''),
    // App-open and install counters for the staff dashboard: staging build only (ADR 0018).
    'import.meta.env.VITE_METRICS': JSON.stringify(mode === 'staging' ? 'enabled' : ''),
    // Labelled sample rows and the sample sponsored strip: every build except production (OQ-044).
    'import.meta.env.VITE_SHOW_SAMPLES': JSON.stringify(mode === 'production' ? '' : 'enabled'),
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
