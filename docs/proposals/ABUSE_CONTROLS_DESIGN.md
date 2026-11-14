# Abuse controls and rate limiting (BF-10) — design proposal

Status: **PROPOSED — design only.** Prepared 2026-11-14 (IST). Nothing here adds a binding, route, limit or dependency, and BF-10 is not approved. Related: [BF recommendations](BF_DECISION_RECOMMENDATIONS.md), [ADR 0012](../decisions/0012-backend-architecture-and-d1.md), [RBAC matrix](RBAC_MATRIX.md).

## 1. What the Cloudflare rate-limit binding does (official docs, retrieved 2026-11-14)

Source: https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/

| Fact                                                                                                                                               | Implication                                                                  |
| -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Configured as a `ratelimits` entry with `name`, a unique `namespace_id` and `simple.limit` / `simple.period`; needs Wrangler 4.36.0 or later       | A Wrangler version check is part of any change                               |
| `env.NAME.limit({ key, delta? })` returns `{ success }`                                                                                            | Cheap to call; deny when `success` is false                                  |
| `period` must be 10 or 60 seconds                                                                                                                  | No hourly or daily quotas from this binding                                  |
| Counters are per Cloudflare location, eventually consistent, and "Requests can exceed your configured limit while counts update in the background" | Approximate throttling only; **not** a strict quota and not a global limit   |
| For a strict global limit the docs recommend a Durable Objects limiter                                                                             | Use a DO only where exactness matters (invitations, sign-in)                 |
| The docs advise keys such as user, API key or path, and against IP addresses because many users share them                                         | Behind pilgrim-heavy mobile networks, per-IP keys will punish innocent users |
| Bindings are not visible in the dashboard; monitoring uses Workers Logs, Traces or Analytics Engine                                                | Needs the logging decision (ADR 0005/0010, OQ-017)                           |
| The page states no pricing or plan availability                                                                                                    | **Not verified**: confirm plan, price and availability before relying on it  |

## 2. Threats this must address

Scraping and amplification of public reads; enumeration of group codes and invitation ids (stalking risk); brute force on any future sign-in; spam to partner inquiries; staff-route abuse; cost attacks (every asset request is a billed Worker request while `run_worker_first = true`, OQ-028); and abusive Durable Object WebSocket traffic.

## 3. Layered design (proposal)

| Layer                         | Control                                                                                                                                                                          | Where                                                                                                     | Accuracy needed     |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------- |
| 1. Edge                       | Cloudflare-side rules (WAF/rate rules, bot protection) for blanket flood protection                                                                                              | Cloudflare configuration, reproducible through the reviewed setup process; plan features **not verified** | Coarse              |
| 2. Public reads               | Edge cache first; Worker limiter keyed by route class, not by IP alone                                                                                                           | Worker binding                                                                                            | Approximate is fine |
| 3. Invitations and group join | Strict limiter per invitation id and per session, with uniform failure responses and short lockout; store the expiring counter and lockout durably in a dedicated limiter object | Durable Object storage (survives restart)                                                                 | Exact               |
| 4. Staff routes               | Access in front, then a per-principal limiter after authentication                                                                                                               | Worker binding                                                                                            | Approximate         |
| 5. Inquiry forms              | Limiter per route plus size/schema caps and a honeypot-free design (no CAPTCHA decision yet)                                                                                     | Worker binding                                                                                            | Approximate         |
| 6. Durable Object WebSockets  | Per-connection message rate, message size cap, connection cap per group, idle timeout; close on violation                                                                        | Durable Object                                                                                            | Exact               |

Common rules: deny-by-default behaviour when the limiter errors for protected or abuse-sensitive routes (fail closed), but fail open for public reads so an outage of the limiter does not take down visitor information; 429 with a fixed body and `Retry-After`; no key ever contains location, tokens or personal data; keys use route class plus an opaque identifier, hashed, never a raw IP in a log.

For the strict invitation limiter, write each consumed attempt and lockout deadline to Durable Object storage before returning an allow or deny decision. Reconstruct state from storage after hibernation, eviction, or a runtime update; if storage is unavailable, deny the attempt. Expire and delete the opaque counter keys after the event window. In-memory caching may speed reads but is never the source of truth. Cloudflare states that hibernation discards in-memory state: https://developers.cloudflare.com/durable-objects/concepts/durable-object-lifecycle/ (retrieved 2026-11-14).

## 4. Proposed starting budgets (placeholders, not decisions)

No load test has been run, and no traffic figure here is a fact. These exist only to give the review something to change.

| Route class             | Key                                | Starting limit (proposed)                                     | Period         | Basis                                                                                        |
| ----------------------- | ---------------------------------- | ------------------------------------------------------------- | -------------- | -------------------------------------------------------------------------------------------- |
| Public read             | route class + coarse client bucket | high, to stop only floods                                     | 10 s           | Browsing is bursty on page loads (about 20 API reads per user per day in the ADR 0012 model) |
| Invitation join attempt | invitation id                      | very low (single digits)                                      | 60 s           | Guessing must be uneconomical                                                                |
| Staff mutation          | principal ref                      | low                                                           | 10 s           | Humans, not bots                                                                             |
| Partner inquiry         | coarse client bucket               | very low                                                      | 60 s           | Spam control                                                                                 |
| WebSocket messages      | connection                         | set from the location-update rate decided in the group design | per connection | ADR 0004 and the location design                                                             |

Numbers are decided by the owners after the load test (ADR 0012 section 6), on the paid plan.

## 5. Verification plan

- Local tests with a fake limiter: denies after the limit, keys carry no personal data, uniform 429 body, `Retry-After` present, security headers on 429.
- Failure-mode tests: limiter error on a protected route denies; on a public read allows; never throws to the client.
- Load test against staging on the intended paid plan, measuring real overshoot of the per-location, eventually consistent counters.
- DO limiter tests: exact counts, lockout, expiry and deletion, restart/hibernation recovery during the window, and fail-closed behaviour when storage is unavailable.

## 6. Open decisions

1. Plan and availability of the binding, and any Cloudflare-side rate rules (not verified).
2. Whether and which CAPTCHA or bot challenge is acceptable for accessibility and privacy.
3. What counts as a "coarse client bucket" without using raw IP addresses as the identity.
4. Fail-open versus fail-closed per route (proposed above, needs the security reviewer).
5. Logging of throttle events without personal data (OQ-017).

No budget numbers or binding names are approved by this document.
