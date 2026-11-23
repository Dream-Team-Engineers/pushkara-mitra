# 0018. Staff admin dashboard

Status: Accepted by the owner for staging (2026-11-23). Production stays off until the owner approves the release.
Date: 2026-11-23

## Context

The owner and two developers need to see how the app is used (traffic, sign-ins, groups) and, later, to coordinate partners (priests and volunteers). The app deliberately keeps almost nothing about people: no location history, no person names in D1, no tracking identifiers (ADR 0004, ADR 0006, ADR 0017). The Access verifier (`src/security/accessJwt.ts`) was built and kept unwired until the admin identity (BF-02) and roles (BF-03) decisions were made.

## Decision

1. **Separate admin Worker.** The project has no custom domain, and on `workers.dev` Cloudflare Access protects a whole Worker, not a path. The dashboard is therefore its own Worker (`src/admin/`, `wrangler.admin.toml`) with its own `workers.dev` address. The public app Worker gains no `/admin` route. Both Workers bind the same D1 database per environment.
2. **Identity (BF-02, owner decision).** Staff sign in only through Cloudflare Access. The Access policy for the admin Worker allows exactly the three people the owner named on 2026-11-23 (the owner and two developers). Their email addresses live only in the Access policy, never in code, docs or Git. The admin Worker verifies the `Cf-Access-Jwt-Assertion` token on every request (issuer = the configured team domain, audience = the application's AUD tag, RS256 keys from the team's certs endpoint) and fails closed: no configuration, no keys or a bad token answers 403 or 503 and shows nothing. Optionally, `ADMIN_SUBJECTS` (comma-separated Access subjects, set outside Git) narrows admission further; when unset, the Access policy is the allow-list.
3. **Roles (BF-03, owner decision).** One role, `admin`, held by those three people. All dashboard pages are read-only in phase 1. Assignment and revocation happen in the Access policy, by the owner.
4. **Counts only, never individuals.** The dashboard shows aggregates: per-day counts of app opens and installs (by language), sign-ins (first-time and returning, from the session table), groups created, joins, group sizes and removals, crowd-reading freshness. It never lists a person, a pseudonym, a name, an email, a group name or a position. No unique-visitor or "came back" figures for anonymous visitors (that would need a device identifier; owner agreed to leave it out).
5. **App-open counter.** The app sends one small request per page load (`POST /api/v1/ping`, body `{ "event": "open" | "install", "locale": "te" | "en" | "hi" }`), only when flag `FLAG_METRICS` is exactly `enabled`. The Worker adds one to a per-day (and per-hour, for the Live tab) counter in D1 (`daily_metric`, migration 0006). No IP address, device identifier, cookie, user agent or screen path is stored. Days are counted in India time (UTC+05:30).
6. **Tabs.** Growth (Today / 7 days / 30 days / one day; headline app opens, new sign-ins and groups created; trend line and day-by-day table), Live (last hour, active groups, crowd readings, build), Groups (active, average size, full, removals, ending soon), Partners, More (system details). The owner dropped SOS and "Needs you" (2026-11-23).
7. **Phases.**
   - Phase 1 (this change): admin Worker, Access check, counters, Growth, Live, Groups and More; Partners shows what is coming.
   - Phase 2: partners. Priests and volunteers sign in with Google and ask to become partners; one of the three admins approves them on the dashboard. Approved partners set themselves available or not. Admins nudge partners for crowd level, river level and free-food updates through an in-app inbox. A partner's update is shown to pilgrims at once, marked as from a volunteer, with fixed choices instead of free text where possible; admins can hide an update. Needs its own data-inventory rows and threat model before code.
   - Phase 3: phone notifications (Web Push) for nudges, as well as the inbox (owner chose both). Needs the partner's permission, VAPID keys kept as secrets, and a privacy-notice update.

## Consequences

- The owner must create the Access application and policy and give the agent the team domain and AUD tag (not secrets) before the dashboard opens; until then it answers 503.
- `tests/guards/access-jwt-disabled.test.ts` changes: the verifier may be imported by `src/admin/` only, and the public Worker entry still has no `/admin` route.
- Counters add one D1 write per page load; within the free plan at current traffic (OQ-028 tracks the paid plan).
- Data inventory DI-19 (open and install counters) added. Partner data (phase 2) is not collected yet.
