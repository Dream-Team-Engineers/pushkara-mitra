import { cloudflareTest } from '@cloudflare/vitest-plugin';
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
