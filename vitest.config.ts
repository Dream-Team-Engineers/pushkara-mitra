import { cloudflareTest } from '@cloudflare/vitest-plugin';
import preact from '@preact/preset-vite';
import { defineConfig } from 'vitest/config';

const coverage = {
  provider: 'istanbul' as const,
  reporter: ['text-summary', 'lcov'],
  include: ['src/**/*.ts'],
};

export default defineConfig({
  test: {
    coverage,
    projects: [
      {
        // Worker code runs inside workerd via the Cloudflare pool.
        plugins: [
          cloudflareTest({
            wrangler: { configPath: './wrangler.toml' },
            miniflare: { d1Databases: ['DB'] },
          }),
        ],
        test: {
          name: 'worker',
          include: ['tests/worker/**/*.test.ts'],
        },
      },
      {
        // Frontend logic and server-rendered component tests run on Node (no DOM library).
        plugins: [preact()],
        // Tests render the labelled sample rows; only the production build hides them (OQ-044).
        define: { 'import.meta.env.VITE_SHOW_SAMPLES': JSON.stringify('enabled') },
        test: {
          name: 'web',
          environment: 'node',
          include: ['web/src/**/*.test.{ts,tsx}'],
          setupFiles: ['web/src/shared/testing/setup.ts'],
        },
      },
      {
        // Static guards and repo scripts need the filesystem, so they run on Node.
        test: {
          name: 'repo-guards',
          environment: 'node',
          include: ['tests/guards/**/*.test.ts'],
          // Several guards spawn shell scripts; on Windows with many workers the 5s default flakes.
          testTimeout: 30_000,
        },
      },
    ],
  },
});
