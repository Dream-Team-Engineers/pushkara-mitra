# 0011. Frontend stack and hosting

Status: **Owner accepted on 2026-11-10 (IST), by instruction in the requesting session. Independent review of this pull request is still required before merge.** Prepared on `main` `1f1fe72`.

## Context

The public PWA today is a hand-written plain-JavaScript shell served as Worker static assets (see [Phase 0 preflight](../frontend/phase-0-preflight.md)). It is small (24.6 KB of JS and CSS when gzipped together) and its service worker is strict, but it builds the DOM imperatively, has no type checking, uses hash routing, and has no component tests. The frontend master prompt asks for Home plus ten modules with forms, tabs, maps, offline states and stale-data indicators, built by three developers and reviewed by people other than their authors.

Constraints: low-end Android (2 to 3 GB RAM, 4x CPU throttle), Slow 4G with about 400 ms RTT and frequent disconnection, Telugu first, $0 tooling, free/open-source licences recorded before use, and the location and personal-data rules in ADR 0004 and ADR 0008.

## Options

| Option                               | Benefits                                                                                                                            | Risks and costs                                                                                                  |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| A. Preact + strict TypeScript + Vite | Component model and typed props; small runtime; signals limit re-renders; familiar React-style API; Vite already in devDependencies | One runtime dependency set to review; migration effort from the current shell; JSX build step                    |
| B. Astro with Preact islands         | Static HTML by default, JavaScript only where interactive; good for content-heavy public pages                                      | Second framework layer; app-like flows (tabs, map, forms, offline states) become many islands; more build config |
| C. Keep the plain-JavaScript shell   | No new runtime dependencies; already within size budgets; no migration                                                              | Imperative DOM code grows hard to test and review across eleven stateful screens; no types without a TS build    |

Size of A and B cannot be measured in this session (npm registry blocked). Phase 1 must measure each built bundle against the budgets before migration continues.

## Recommendation (not a decision)

**Option A, migrated screen by screen.**

1. Add a Vite build with strict TypeScript and Preact; keep the current shell live until each migrated screen passes its tests.
2. **Keep the custom service worker design** (exact-path allow-list, no query strings, no `Authorization` requests) and generate its path list at build time. Do not adopt Workbox now: it adds dependency weight and replaces a reviewed, minimal worker. Revisit only if runtime caching needs exceed what the custom worker can do safely.
3. Signals for UI state; a small in-house stale-while-revalidate resource cache for server state, backed by `idb` for public content only.
4. Valibot schemas for contracts; Vitest, Playwright and axe for tests.

Why A over C: the remaining work is mostly stateful screens; types, components and tests reduce review risk more than the runtime costs, provided Phase 1 measurements stay within budget. Why A over B: most screens are app-like, not static documents.

## Hosting

**Recommendation: keep Worker static assets with `run_worker_first = true`.** Issue #38 showed asset-first routing bypassed the Worker's security headers; Worker-first routing fixes that and keeps `/healthz` and method checks in one place. Cloudflare Pages would need a separate headers mechanism and a second deployment unit.

This differs from the engineering standards baseline, which names Cloudflare Pages for the PWA. **Accepting this ADR records that deviation and needs owner approval.**

Path-based routes (for example `/ghats/:id`) need an app-shell fallback in the Worker that must never apply to `/api/*`, `/auth/*`, `/admin*` or `/healthz`. Until that fallback exists and is tested, keep hash routing.

## Conflicts needing an owner decision

| ID  | Conflict                                                                                                                        | Proposed resolution                                                                                       |
| --- | ------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| F1  | Master prompt: Home plus ten modules. Repo shell and `PRODUCT_BLUEPRINT.md`: eight areas plus Staff Console                     | Choose one information architecture. Mapping proposal in `architecture-blueprint.md`                      |
| F2  | Master prompt tokens (blue/teal, Inter). Repo design (warm paper, brown, clay, river green; Roboto already licensed and subset) | Keep the repo's reviewed tokens and Roboto unless the owner chooses otherwise; avoid adding a fourth font |
| F3  | Standards baseline names Cloudflare Pages; repo uses Worker static assets                                                       | Keep Worker static assets (above); record the deviation                                                   |
| F4  | `docs/performance-budget.md` (150 KB JS+CSS, 300 KB first load, Telugu font under 60 KB) differs from the prompt's budgets      | Adopt the reconciled budgets in `budgets-and-licences.md` (stricter value wins)                           |
| F5  | Current CSS has text below 16 px and targets of 30 to 44 px; prompt requires 16 px body text and 48 px targets                  | Fix in the Phase 1 token PR and Phase 2 Home PR                                                           |
| F6  | Independent review is required but `main` is unprotected and recent PRs have no approvals                                       | Owner completes ADR 0007 provisioning; until then reviewers approve in the PR before merge                |
| F7  | Release `v1.1.0` exists although no product has launched                                                                        | Outside frontend scope; flag to owner                                                                     |
| F8  | Licences and library sizes could not be verified (npm registry blocked)                                                         | Verify at each upstream project before adoption; Phase 1 blocked on this                                  |

## Consequences if accepted

- Phase 1 adds runtime dependencies listed in `budgets-and-licences.md`, each recorded in the licence register first.
- `wrangler.toml` `assets.directory` changes to the Vite output folder in a reviewed Phase 1 PR.
- The current `public/` shell is retired screen by screen; Playwright parity tests decide each switch.
- No geolocation, personal-data submission, SOS dispatch or production deploy is authorised by this ADR.

## Owner decisions recorded 2026-11-10 (IST)

Given by the owner in the requesting session. They are not a GitHub Approve review, a legal opinion or a security sign-off.

| ID  | Decision                                                                                                                                         |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| F1  | Keep Home plus the ten modules of the decided prototype as the information architecture. The eight-area shell is superseded for the new frontend |
| F2  | Start the visual design fresh from the UI workflow prototype (ink blue, teal, saffron tokens). The existing repo design is not carried over      |
| F3  | Keep Worker static assets with `run_worker_first = true`. The deviation from the Cloudflare Pages baseline is accepted                           |
| F8  | Verify each dependency, font and data licence at its upstream source when it is first needed, before it is added                                 |

Stack: Option A (Preact, strict TypeScript, Vite), migrated screen by screen, is accepted with the recommendation above.

Still open: F4 (budgets, proposed values stand until measured), F5 (fixed in Phase 1 and 2), F6 (branch protection, ADR 0007), F7 (release versioning).
