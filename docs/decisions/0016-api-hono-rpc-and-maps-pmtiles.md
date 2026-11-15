# 0016. API layer (Hono with RPC) and maps (MapLibre, OSM, PMTiles on R2) — owner-stated direction

Status: **PROPOSED — owner direction recorded 2026-11-15; approval PENDING.**

## API

1. **Hono** is the router in the Worker, with **zod** schemas shared between Worker and web.
2. **Hono RPC** gives the web app a typed client. To keep the existing OpenAPI contract (ADR 0012 section 7: the OpenAPI file is the contract, guarded by a test) the routes are declared with `@hono/zod-openapi` so one definition yields types and the OpenAPI document. Not yet verified that this combination keeps the bundle inside the frontend budget: RPC types are compile-time, but the client helper adds code. Measure with `npm run budget:web`.
3. Keep reserved prefixes and the single error envelope from ADR 0012 section 7. Existing routing tests in `scripts/test-routing.mjs` must keep passing.
4. Middleware order: request ID, security headers, rate limit, auth, role check, error handler. No coordinates or tokens in logs.

## Maps

1. **MapLibre GL JS** renders the map. Data from **OpenStreetMap**, packaged as a **PMTiles** archive stored in **Cloudflare R2** and fetched by HTTP range requests. No tile server, works with a service worker for offline regions.
2. **OSM attribution is mandatory** on the map. ODbL licence obligations apply to the data we publish; licence-check and attribution review pending (NEEDS REVIEW, OQ-036).
3. Do not use the public OSM tile servers for production traffic.
4. Fonts and sprites for MapLibre labels must cover Telugu and Hindi glyphs; this relates to the open missing-font-characters fix.
5. Size: a Godavari-region extract must fit R2 and the offline cache budget; extract size and bundle impact unmeasured. MapLibre itself is large and may need lazy loading to respect the web budget.
6. User location on the map is the device's own and is never sent or stored except under ADR 0004 for groups.
