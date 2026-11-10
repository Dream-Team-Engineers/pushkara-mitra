# Frontend cut-over to the new build (ADR 0011)

**Status:** proposed in a pull request labelled `needs-owner-review`. Nothing is deployed by this change.

## What changes

- `wrangler.toml`: every `assets.directory` (default, preview, staging, production) moves from `./public` to `./dist/web`. `run_worker_first = true` is unchanged, so the security and method middleware still wraps every asset.
- `deploy-staging.yml` builds the frontend (`npm run build:web`) before `wrangler deploy`. `npm run dev` builds first.
- The new service worker also deletes the `pushkara-static-prototype-*` caches left by the old public prototype worker.
- `scripts/test-routing.mjs` now checks the new asset paths and the content-hashed entry script.

## What stays

- `public/` and its guard tests stay in the repository, unused, until the new frontend has run on staging. Removing it is a separate pull request.
- Routes are hash routes (`/#/ghats`). Path routing needs a Worker app-shell fallback that excludes `/api/*`, `/auth/*`, `/admin*` and `/healthz`; that is not built.

## Checks before merge (evidence belongs in the pull request)

1. `ci-test` green, including the real-browser smoke test (routes online and offline) and the bundle budget.
2. `npm run test:routing` green against the built `dist/web` (it runs in `ci-test`).
3. A human opens the staging URL on a low-end Android phone and on a slow network and confirms Home, Settings and one data screen. Not yet done.
4. Owner decisions still open: F4 budgets, F6 branch protection, F7 release versioning.

## Rollback

Revert this pull request. `wrangler.toml` points back at `./public`, which is unchanged. Browsers that installed the new worker fetch the old `/sw.js` on their next visit; the old worker's caches use a different name prefix, so they are rebuilt.

## Not verified

Behaviour on real devices, real networks and the deployed Worker. Only local Wrangler routing and headless Chrome in CI are covered.
