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
        plugins: [cloudflareTest({ wrangler: { configPath: './wrangler.toml' } })],
        test: {
          name: 'worker',
          include: ['tests/worker/**/*.test.ts'],
        },
      },
      {
        // Frontend logic and server-rendered component tests run on Node (no DOM library).
        plugins: [preact()],
        test: {
          name: 'web',
          environment: 'node',
          include: ['web/src/**/*.test.{ts,tsx}'],
        },
      },
      {
        // Static guards and repo scripts need the filesystem, so they run on Node.
        test: {
          name: 'repo-guards',
          environment: 'node',
          include: ['tests/guards/**/*.test.ts'],
        },
      },
    ],
  },
});
