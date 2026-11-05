# Public prototype verification

This unmerged, original public prototype is a review surface, not an official festival service or launch approval. Planner entries are synthetic. All translations and asset rights remain NEEDS REVIEW. No personal-data or private service is activated.

## Reproduce local checks

Use the repository Node22/npm toolchain and a frozen install. Run `npm run check` and `npm run test:routing`. Routing launches all four configurations with `--local` only, checks actual security headers and exits its own servers; a production-named local test is not a production deploy.

For browser review, launch Wrangler locally on a loopback port. Verify mobile widths320/375/390/768/1440, keyboard skip/focus without changing the active Plan/About route, filters, back navigation, all language choices and theme state. At320px with200% root-font size, check all four routes in all four languages for horizontal overflow. This stress test is distinct from native browser zoom and screen-reader/WCAG assessment.

Use a fresh browser context to verify the current service worker installs with real Worker-first CSP/security headers. Only six canonical public URLs are precached: `/`, `/assets/shell.v1.css`, `/assets/shell.v1.mjs`, `/assets/offline-status.v1.mjs`, `/assets/mitra-mark.svg`, `/manifest.webmanifest`. `/index.html` redirects and is intentionally excluded; offline navigation uses canonical `/` plus fragment routes. No offline alias availability is promised.

Verify offline reload/navigation, no local/session storage, no external requests, no API/admin/auth/query/cross-origin/write/Authorization caching and no page errors. Simulate a failed new static installation with an older worker controlling the page: the current revision must never be reported ready offline. All asynchronous browser waits must have a timeout.

## Executed integration evidence

The integrated snapshot passed146 Vitest tests, lint/types/format,80 local HTTP cases,16 real Chromium behavior groups, a real failed-upgrade regression and16 enlarged-text route/language cases. Independent agent cache/DOM review supplemented tests; it is not human approval. Local browser artifacts are task evidence, not a claimed existing CI browser gate.

## Remaining gates

Native-language and public-copy review, independent human final-head review, full accessibility/real-device/performance tests, legal/IP decisions, external credential enforcement and authorized staging verification remain open. Keep private/backend API activation behind explicit foundation decisions. Bump both service-worker cache/protocol and acknowledgement helper versions whenever precached content changes. Do not weaken security headers to make offline tests pass.

## Optional repeatable browser harness

`scripts/test-public-browser.mjs` uses an already installed Playwright module and its Chromium browser, both free; it does not install packages or run in CI automatically. Start the exact checked-out app with local Wrangler, then run:

```bash
QA_ORIGIN=http://127.0.0.1:8912 SHELL_PUBLIC_DIR="$PWD/public" node scripts/test-public-browser.mjs
```

If Playwright is supplied outside this project, set `PLAYWRIGHT_MODULE` to its absolute module entry (for example a local `index.mjs`); set `CHROMIUM_EXECUTABLE` only for an explicitly installed browser. Set `QA_ARTIFACT_DIR` to choose an evidence directory; default is `/tmp/pushkara-public-browser-qa`. No paid service or application dependency is added. The target is restricted to loopback HTTP. The harness closes only its own synthetic HTTP fixture and browser; the operator owns/stops the primary Wrangler server.

Executed final v6 QA:14 groups passed,0 failed;96 route/language/width/root-font layout states plus computed light/dark text contrast, keyboard/focus/history/filter behavior, six-resource current-controller readiness, actual offline/private-cache exclusions and synthetic failed/successful upgrades. A synthetic older worker may recreate an old public cache while completing an in-flight fetch; current-controller/version/completeness and current offline content are verified rather than claiming perpetual old-cache absence. These checks are not axe coverage, screen-reader testing, native-language approval, native browser-zoom certification or cross-browser/device conformance.
