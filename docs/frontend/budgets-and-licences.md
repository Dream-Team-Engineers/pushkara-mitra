# Frontend budgets and licence proposals

Proposal under [ADR 0011](../decisions/0011-frontend-stack-and-hosting.md). Budgets are targets, not measured results.

## Reconciled performance budgets

Where `docs/performance-budget.md` and the frontend master prompt differ, the stricter value is proposed.

| Metric                                   | Proposed target                  | Current (main `1f1fe72`)                  | Source of target          |
| ---------------------------------------- | -------------------------------- | ----------------------------------------- | ------------------------- |
| LCP / INP / CLS / FCP                    | 2.5 s / 200 ms / 0.1 / 1.8 s     | Not measured                              | Master prompt             |
| Repeat visit, Home usable from cache     | 1 s, online or offline           | Not measured                              | Master prompt             |
| Initial JS (gzip)                        | 100 KB                           | 20.1 KB (six modules, gzipped separately) | Master prompt             |
| Each route chunk (gzip)                  | 50 KB                            | n/a                                       | Master prompt             |
| CSS (gzip)                               | 25 KB                            | 6.5 KB                                    | Master prompt             |
| Initial JS + CSS (gzip)                  | 125 KB                           | 26.6 KB (24.6 KB gzipped together)        | Stricter than 150 KB      |
| Fonts precached (WOFF2)                  | 100 KB                           | 217 KB (six WOFF files)                   | Master prompt             |
| Telugu font pair                         | 60 KB                            | 57.5 KB (WOFF)                            | Existing budget           |
| First-visit transfer                     | 300 KB                           | About 307 KB (estimate)                   | Existing budget, stricter |
| Public content refresh                   | 50 KB                            | n/a                                       | Master prompt             |
| Above-the-fold images                    | 80 KB, AVIF or WebP              | 61 KB JPEG                                | Master prompt             |
| JS heap, Home / Maps                     | 60 MB / 150 MB                   | Not measured                              | Master prompt             |
| Long tasks during interaction            | none over 50 ms                  | Not measured                              | Master prompt             |
| First map tiles on the reference network | 3 s                              | n/a                                       | Master prompt             |
| Map tile cache                           | 30 MB, least recently used first | n/a                                       | Master prompt             |
| Lighthouse performance / accessibility   | 90 / 95                          | Not measured                              | Master prompt             |
| Body text / touch targets                | 16 px / 48 px                    | Down to 10.4 px / 30 to 44 px             | Master prompt             |

**Immediate findings against these budgets:**

1. Fonts: convert the six WOFF files to WOFF2 and precache only Latin and Telugu; fetch Devanagari when Hindi is selected. Measure the result.
2. First visit: the estimate is just over 300 KB because every font and the image are precached; fix 1 plus an AVIF/WebP image should bring it under.
3. Type and targets: raise body text to 16 px and targets to 48 px (decision F5).

## Measurement method

- Lab profile: Chrome with 4x CPU throttle, 400 ms RTT, 1.6 Mbps down, 750 kbps up; mobile viewport 360 x 800.
- Lighthouse CI: 5 runs per URL, median reported. Playwright traces for long tasks and frame timing.
- Bundle sizes: gzip of built assets checked in CI against the table.
- Lab results are not field p75 values. Field checks happen on a real low-end Android phone in M8.

## Licence proposals (Preact packages verified at upstream)

The five Preact packages were installed and their MIT licences checked against the upstream repositories on 2026-11-10 (IST); their exact versions and the installed dependency inventory are in `docs/legal/licence-register.md`. The earlier npm registry block is historical. All remaining proposed packages and assets still require upstream verification before use. Built bundle sizes have not been measured.

| Package                 | Purpose                  | Licence / verification                                                       | Use     | Notes                                          |
| ----------------------- | ------------------------ | ---------------------------------------------------------------------------- | ------- | ---------------------------------------------- |
| preact                  | UI runtime               | [MIT](https://github.com/preactjs/preact/blob/main/LICENSE)                  | Runtime | 11.2.0 verified upstream; size unmeasured      |
| @preact/signals         | UI state                 | [MIT](https://github.com/preactjs/signals/blob/main/LICENSE)                 | Runtime | 2.11.4 verified upstream; size unmeasured      |
| preact-iso              | Router, lazy routes      | [MIT](https://github.com/preactjs/preact-iso/blob/main/LICENSE)              | Runtime | 2.12.2 verified upstream; size unmeasured      |
| preact-render-to-string | Required preact-iso peer | [MIT](https://github.com/preactjs/preact-render-to-string/blob/main/LICENSE) | Runtime | 6.8.2 verified upstream; size unmeasured       |
| @preact/preset-vite     | Vite integration         | [MIT](https://github.com/preactjs/preset-vite/blob/main/LICENSE)             | Dev     | 2.10.6 verified upstream; size unmeasured      |
| vite                    | Build                    | MIT                                                                          | Dev     | Already a devDependency                        |
| valibot                 | Contract schemas         | MIT                                                                          | Runtime |                                                |
| idb                     | IndexedDB wrapper        | ISC                                                                          | Runtime | Public content only                            |
| leaflet                 | Map rendering            | BSD-2-Clause                                                                 | Runtime | Maps route only                                |
| pmtiles                 | Self-hosted tile archive | BSD-3-Clause                                                                 | Runtime | Maps route only                                |
| qrcode                  | QR drawing               | MIT                                                                          | Runtime | Prototype only                                 |
| jsqr                    | QR scan fallback         | Apache-2.0                                                                   | Runtime | Prototype only                                 |
| @playwright/test        | End-to-end tests         | Apache-2.0                                                                   | Dev     |                                                |
| axe-core                | Accessibility checks     | MPL-2.0                                                                      | Dev     | Outside allow-list; needs a reviewed exception |
| @axe-core/playwright    | axe in Playwright        | MPL-2.0                                                                      | Dev     | Outside allow-list; needs a reviewed exception |
| @lhci/cli               | Lighthouse CI            | Apache-2.0                                                                   | Dev     |                                                |
| msw                     | API mocks                | MIT                                                                          | Dev     | Optional                                       |
| astro, @astrojs/preact  | Option B only            | MIT                                                                          | Dev     | Only if Option B is chosen                     |
| workbox                 | Not proposed now         | MIT                                                                          | n/a     | Custom service worker kept (ADR 0011)          |

**Data and fonts:**

| Asset                                          | Licence (to verify)                         | Obligations                                                                                               |
| ---------------------------------------------- | ------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| OpenStreetMap data in self-hosted tiles        | ODbL 1.0                                    | Attribution on the map; share-alike for derived databases; never use OSM public tile servers at app scale |
| Roboto, Noto Sans Telugu, Noto Sans Devanagari | SIL OFL 1.1 (licence files already in repo) | Keep licence files; list in Notices page                                                                  |
