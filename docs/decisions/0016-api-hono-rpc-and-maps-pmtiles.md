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

## Implementation note, phase 1 (2026-11-19)

Built at the owner's direction ("start phase 1"); this does not change the ADR's PROPOSED status.

- MapLibre GL JS 6.16.0, PMTiles 4.5.0 and Protomaps Basemaps 5.7.2 (exact versions), loaded only on the Map screen, and only when the archive exists. The map chunk is about 290 KB gzip against its own 350 KB cap in `scripts/measure-web-bundle.mjs` (owner-accepted exception); every other chunk keeps the 50 KB limit.
- **Static file instead of R2 for now:** the archive is `web/public/maps/godavari.pmtiles` (3.1 MiB, 879 tiles, zoom 0 to 15), served by the Worker with byte-range support (`src/routes/mapArchive.ts`). No R2 bucket was created. Move to R2 when the area grows past the 25 MiB static-asset limit.
- The archive is built by `scripts/build-map-extract.mjs` from a Protomaps planet build (20261118) and checked with `scripts/verify-map-extract.mjs` (sampled tiles identical to the source). The official `pmtiles` command-line tool was not used.
- Glyphs (Noto Sans Latin and punctuation ranges) and sprites are served from `/maps/`, so the page policy stays `connect-src 'self'` and `worker-src 'self'`. The service worker never precaches `/maps/` at install. Offline map (2026-11-21): a person can tap "Save map for offline use" on the Map screen; the worker then fetches the archive, glyphs, sprites and places list whole into its own cache (`pushkara-map-<hash>`, about 7 MB with the map screen code (measured 6.68 MB)), serves them first from then on (cutting byte ranges from the saved archive, since the Cache API cannot store partial answers), and uses the real map with no signal. Nothing about the person is sent or stored; the page only sends the worker two fixed commands. Not yet tested on a real phone with airplane mode.
- Device position: `web/src/shared/location/deviceLocation.ts`, in memory only. See OQ-041 and data inventory DI-16.
