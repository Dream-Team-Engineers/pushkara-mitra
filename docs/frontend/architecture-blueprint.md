# Frontend architecture blueprint

Proposal under [ADR 0011](../decisions/0011-frontend-stack-and-hosting.md). Nothing here is implemented or approved.

## Information architecture (decision F1)

The master prompt lists Home plus ten modules; the repo shell and `PRODUCT_BLUEPRINT.md` use eight areas. One way to reconcile them, keeping the blueprint's areas as navigation groups:

| Master prompt module   | Blueprint area     | Proposed route           |
| ---------------------- | ------------------ | ------------------------ |
| Home                   | My Pushkaram       | `#/`                     |
| Pilgrim Pass           | Pilgrim Pass       | `#/pass`                 |
| My Group               | Travel Together    | `#/group`                |
| Maps                   | Travel Together    | `#/map`                  |
| Ghats                  | Plan Your Visit    | `#/ghats`, `#/ghats/:id` |
| Stay                   | Plan Your Visit    | `#/stay`                 |
| Travel / Transport     | Plan Your Visit    | `#/travel`               |
| Emergency / Help       | Help & Reunite     | `#/help`                 |
| Culture / News         | Festival Updates   | `#/updates`              |
| Conditions             | Festival Updates   | `#/conditions`           |
| Partners / Volunteers  | Community Partners | `#/partners`             |
| (not in master prompt) | Staff Console      | out of frontend scope    |

Hash routes until a Worker app-shell fallback exists and is tested (ADR 0011, Hosting).

## Folder structure

```text
web/
  index.html
  src/
    app/          entry, router, providers, error boundary, update prompt
    routes/       one lazily loaded module per route
    features/     pass, group, map, ghats, stay, travel, help, updates, conditions, partners
    shared/
      ui/         tokens, primitives, patterns (AppHeader, BottomBar, Marquee, SourceStamp ...)
      i18n/       te.json, en.json, hi.json, typed keys, Intl helpers
      data/       resource cache, fetch client, idb store (public content only)
      contracts/  Valibot schemas and types mirroring docs/contracts
      flags/      feature flags (off by default)
      privacy/    guards: no geolocation, no personal-data storage, EXIF stripping
  sw/             service worker source; path list generated at build
tests/
  web-unit/       Vitest component and logic tests
  e2e/            Playwright: navigation matrix, offline, axe, budgets
```

Layers: **tokens, then primitives, then patterns, then screens.** Screens import from `shared/` only; features never import each other.

## Rendering and re-renders

- Preact components with `@preact/signals` for UI state; components read the signals they need, so unrelated parts do not re-render.
- Server state lives in the resource cache, not in components.
- Long lists (ghats, stay) are windowed above a threshold set in Phase 3 after measurement.
- Animate only `transform` and `opacity`; marquees pause off-screen, on hover or focus, and for reduced motion.

## Routing and navigation

- One chunk per route, loaded on navigation; prefetch on pointer-down or focus of a link.
- Move focus to the screen heading on route change; restore scroll position on Back.
- No full page reloads inside the app.
- SOS (Help) reachable from the bottom bar on every screen.

## Data fetching and caching (public content only)

Stale-while-revalidate: show cached data with its age, refresh in the background on route open, on `visibilitychange` and on `online`; deduplicate in-flight requests; retry with exponential backoff and a cap.

| Resource             | Refresh trigger                | Stale after | Offline behaviour               |
| -------------------- | ------------------------------ | ----------- | ------------------------------- |
| Crowd / conditions   | route open, visible, reconnect | 10 min      | Show last value marked stale    |
| News and advisories  | route open, visible, reconnect | 30 min      | Show cached list marked stale   |
| Timetables           | route open                     | 6 h         | Show cached rows marked stale   |
| Ghats, stay listings | route open                     | 24 h        | Show cached list                |
| Weather              | Home open, visible             | 30 min      | Show "unavailable" after expiry |

These thresholds are proposals; the owner must review them before they are treated as safety limits.

**Never cached or queued:** `/api` responses with personal data, `/auth/*`, `/admin*`, tokens, location, photos, pass, group, SOS. No optimistic updates for SOS or the pass.

Every screen has loading (skeleton), empty, error with retry, offline and stale states.

## Service worker

Keep the current design: exact-path allow-list, no query strings, skip requests with `Authorization`, versioned cache, and a status check page-to-worker over a dedicated port. Generate the list from the build manifest. Add: an update prompt (no silent reload mid-task), bounded storage, and recovery that deletes a corrupt cache and refetches.

## Privacy guards (tested)

- A test fails if any source calls `navigator.geolocation` before ADR 0004 is accepted and M2 is authorised.
- A test fails if coordinate-like fields, phone numbers, names or photos are written to `localStorage`, IndexedDB or Cache Storage.
- Prototype forms have no network submit path.
- Photo handling resizes on the device and strips EXIF/GPS; prototypes keep photos in memory only.
- Allowed local storage: language and theme preference only (documented in `docs/compliance/data-inventory.md`).

## API contracts (mock only)

Valibot schemas for weather, news, ghats, stay, travel, conditions, group, pass and SOS status. Every public item carries `source`, `sourceUrl`, `updatedAt`, `status` (`verified`, `unverified`, `stale`) and `synthetic`; listings also carry `sponsored`. Align with `docs/contracts/public-information.openapi.yaml` and report any mismatch. Mocks use synthetic fixtures; `docs/content/*.json` is never imported while marked `NEEDS_REVIEW`.
