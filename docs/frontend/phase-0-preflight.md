# Frontend Phase 0: repository preflight

Inspected 2026-11-10 (IST), read-only. Baseline: `main` at `1f1fe7232933b68f095ac9575c25e8ea0d7cf33a` (merge of PR #67, 2026-11-09). Nothing in this file is an approval or a measured field result.

## Observed repository facts

| Area              | Observation                                                                                                                                        | Evidence                                                            |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| CI on `main`      | CI, Security, Supply chain, Release and Deploy staging succeeded on `1f1fe72`; Scorecard skipped                                                   | Actions run 42624197967 (CI), 42624198070 (Deploy staging)          |
| Open PRs          | #69 daily status (docs), #68 Dependabot TypeScript 6 to 7 (major)                                                                                  | GitHub pulls API                                                    |
| Branch protection | `main` is not protected; repository is private                                                                                                     | `branches/main.protected = false`                                   |
| Review evidence   | Last 10 merged PRs (#58 to #67) have 0 approving reviews; #58, #59, #63 and #65 were merged by their author                                        | GitHub reviews API                                                  |
| Release version   | `v1.1.0` (release-please manifest)                                                                                                                 | `.release-please-manifest.json`                                     |
| Standards         | `docs/ENGINEERING_STANDARDS.md` is an adoption candidate, "PENDING FINAL INDEPENDENT REVIEW"; not a placeholder and not accepted                   | File header                                                         |
| ADRs              | 0001 to 0003 Accepted; 0004 Proposed (Amendment 1 staging only); 0005, 0006, 0008, 0010 Proposed; 0007 owner choice recorded, provisioning pending | `docs/decisions/`                                                   |
| Runtime deps      | None. Vite 8 is already a devDependency                                                                                                            | `package.json`                                                      |
| Hosting           | Worker static assets from `./public` with `run_worker_first = true` in every environment                                                           | `wrangler.toml`                                                     |
| Frontend code     | Hand-written plain JavaScript modules; DOM built imperatively; hash routing over 8 blueprint areas; te, en, hi catalogues                          | `public/assets/shell.v1.mjs`, `mobile-sections.v1.mjs`              |
| Service worker    | Exact-path allow-list (17 paths), no query strings, skips `Authorization` requests, versioned cache `v23`                                          | `public/sw.js`                                                      |
| Fonts             | Six self-hosted WOFF files (Roboto, Noto Sans Telugu, Noto Sans Devanagari; 400 and 700), `unicode-range` set, `font-display: swap`                | `public/assets/fonts/`, `shell.v1.css`, `docs/design/typography.md` |
| Type sizes        | CSS uses sizes down to `0.65rem` (10.4 px at a 16 px root); most body text 0.85 to 0.94 rem                                                        | `shell.v1.css`                                                      |
| Touch targets     | Interactive sizes of 30, 36, 40 and 44 px found                                                                                                    | `shell.v1.css` lines 238, 336, 414, 479, 744, 759                   |
| Design direction  | Warm paper, deep brown, muted clay, river green and blue accents; Roboto for Latin                                                                 | `docs/design/interface-foundation.md`, `docs/design/typography.md`  |

## Measured asset sizes on `main` (bytes; gzip -9 for text)

| Asset                           | Raw     | Gzip   |
| ------------------------------- | ------- | ------ |
| `index.html`                    | 13,468  | 3,556  |
| `shell.v1.mjs`                  | 25,034  | 7,338  |
| `mobile-sections.v1.mjs`        | 25,146  | 6,565  |
| `shell.v1.css`                  | 31,689  | 6,491  |
| `ghats-draft.v1.mjs`            | 22,160  | 2,437  |
| `ghats-draft-view.v1.mjs`       | 5,501   | 2,078  |
| `icons.v1.mjs`                  | 2,293   | 1,055  |
| `offline-status.v1.mjs`         | 1,379   | 641    |
| All JS + CSS, gzipped together  | 113,202 | 24,560 |
| `sw.js`                         | 2,961   | 1,170  |
| `quick-access-synthetic-v1.jpg` | 60,954  | n/a    |
| Six WOFF fonts                  | 217,236 | n/a    |
| Noto Sans Telugu 400 + 700      | 57,472  | n/a    |

The service worker precaches all 17 paths on install, so a first visit downloads every font and the image. Estimated first-visit transfer: about 307 KB (HTML 3.6 + JS/CSS 24.6 + fonts 217 + image 61 + small files). This is an estimate from file sizes, not a network measurement.

## Not verified in this session

- Dependency licences and bundle sizes for proposed libraries: the npm registry was blocked by the session network policy (HTTP 403) on 2026-11-10. Every licence in `budgets-and-licences.md` is marked unverified.
- Live staging headers and device performance: not measured.
- Whether Marathi is still in scope: catalogues show te, en, hi; earlier staging showed a Marathi option.
