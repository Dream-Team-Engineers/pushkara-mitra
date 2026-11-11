# Frontend-to-backend integration matrix

Status: **PROPOSED — design only.** Prepared 2026-11-11 (IST) against `main` at `f0ac908`. Related: [ADR 0012](../decisions/0012-backend-architecture-and-d1.md), [product blueprint](PRODUCT_BLUEPRINT.md), [contract acceptance](BACKEND_CONTRACT_ACCEPTANCE.md), [public-information OpenAPI](../contracts/public-information.openapi.yaml).

## Status vocabulary

| Term        | Meaning                                                                          |
| ----------- | -------------------------------------------------------------------------------- |
| implemented | Real code on main that behaves as described, no backend needed                   |
| synthetic   | Screen reads in-process fixtures labelled `synthetic: true`, status `unverified` |
| inert       | Prototype screen; actions do nothing real and a flag is off                      |
| proposed    | Only described here; no screen or route                                          |
| live        | Verified against a deployed backend. **Nothing is live today.**                  |

Hard rules for every row: candidate ghat records and unverified contacts are never shown as approved guidance; nothing implies emergency dispatch, a registration or a payment succeeded without a verified backend outcome; location is never stored or logged (ADR 0004). Route shapes follow ADR 0012 section 7 (`/api/public/*`, `/api/v1/me/*`, `/admin/api/v1/*`). All endpoints below except `/api/public/information` are **proposed names, not contracts**.

Common states for every data screen (existing Resource client): loading skeleton, empty, failure with retry, stale notice when a refresh fails after data was shown, offline notice. The `PublicMeta` fields `status` and `synthetic` stay visible.

## 1. My Pushkaram (Home)

| Action                                     | Screen / status                         | Endpoint                           | Access | Source, review, freshness                          | Storage / class      | Offline / cache                                              | Gate                              | Acceptance test                                                            |
| ------------------------------------------ | --------------------------------------- | ---------------------------------- | ------ | -------------------------------------------------- | -------------------- | ------------------------------------------------------------ | --------------------------------- | -------------------------------------------------------------------------- |
| See today's key notices                    | Home, **synthetic**                     | proposed `GET /api/public/updates` | public | Operator-entered, approved only; stale after 6 h   | content_item, public | memory + service-worker shell; `/api` never cached by the SW | Content approval workflow (BF-03) | Draft or unapproved item never returned; stale banner after failed refresh |
| See the disclaimer and independence notice | Home/Settings, **implemented** (static) | none                               | public | Repo text; native-language review pending (OQ-019) | none                 | in bundle                                                    | Copy review                       | Notice present in te/en/hi at 200% text                                    |

## 2. Plan Your Visit (Ghats, Stay, Travel, Conditions)

| Action                      | Screen / status           | Endpoint                          | Access | Source, review, freshness                                                                        | Storage / class      | Offline / cache | Gate                                 | Acceptance test                                               |
| --------------------------- | ------------------------- | --------------------------------- | ------ | ------------------------------------------------------------------------------------------------ | -------------------- | --------------- | ------------------------------------ | ------------------------------------------------------------- |
| Browse ghats                | Ghats, **synthetic**      | proposed `GET /api/public/ghats`  | public | Candidate records stay `unverified` until a named reviewer approves; map data licence unresolved | content_item, public | memory          | Content approval; map licence review | Candidate record never rendered as guidance; provenance shown |
| Browse stays                | Stay, **synthetic**       | proposed `GET /api/public/stays`  | public | Vendor claims unverified; sponsored placement must be labelled                                   | content_item         | memory          | Vendor directory review (M3)         | Sponsored label present; no unverified claim as fact          |
| Travel options and timings  | Travel, **synthetic**     | proposed `GET /api/public/travel` | public | Only operator-published timings with source and date                                             | content_item         | memory          | Content approval                     | Timing without source rejected                                |
| Conditions (weather, crowd) | Conditions, **synthetic** | none yet                          | public | No authoritative source chosen; no crowd claim may be shown as live                              | none                 | none            | Source and licence decision          | No "live" wording while synthetic                             |

## 3. Pilgrim Pass

| Action           | Screen / status                     | Endpoint                   | Access                | Source     | Storage / class                          | Offline | Gate                             | Acceptance test                                                                   |
| ---------------- | ----------------------------------- | -------------------------- | --------------------- | ---------- | ---------------------------------------- | ------- | -------------------------------- | --------------------------------------------------------------------------------- |
| View/create pass | Pass, **inert** (`pilgrimPass` off) | proposed `/api/v1/me/pass` | protected, owner only | User input | pass_record, **blocked** (no field list) | none    | BF-01, ADR 0008, counsel, notice | No success message without a stored, verified record; cross-user read returns 404 |

## 4. Travel Together (Group, Map)

| Action                    | Screen / status                               | Endpoint                             | Access                  | Source         | Storage / class                               | Offline         | Gate                                               | Acceptance test                                                          |
| ------------------------- | --------------------------------------------- | ------------------------------------ | ----------------------- | -------------- | --------------------------------------------- | --------------- | -------------------------------------------------- | ------------------------------------------------------------------------ |
| Create/join group, invite | Group, **inert** (`myGroup` off)              | proposed `/api/v1/me/groups*`        | protected, members only | User input     | group, membership, invitation (metadata only) | none            | ADR 0004, stalking/coercion threat model, BF-01    | Expired or revoked invite rejected; no enumeration                       |
| Share live position       | Map, **inert** (`liveMap`, `geolocation` off) | proposed WebSocket to Durable Object | protected, members only | Device, opt-in | **memory only; never stored or logged**       | no history kept | Guard test, restart/disconnect tests, legal review | Worker restart leaves no coordinates anywhere; stop-sharing is immediate |

## 5. Help & Reunite

| Action                         | Screen / status                          | Endpoint                        | Access | Source                                                          | Storage / class | Offline | Gate                                                  | Acceptance test                                            |
| ------------------------------ | ---------------------------------------- | ------------------------------- | ------ | --------------------------------------------------------------- | --------------- | ------- | ----------------------------------------------------- | ---------------------------------------------------------- |
| Show help points and helplines | Help, **synthetic**                      | proposed `GET /api/public/help` | public | Contacts unverified; shown only after verification and labelled | content_item    | memory  | Verification process; M3                              | Unverified contact never shown as official                 |
| Raise SOS                      | Help, **inert** (`sosDispatch` off)      | none                            | n/a    | n/a                                                             | none            | n/a     | Police/authority arrangement, safety review           | UI states it does not contact responders; no success state |
| Missing-person report          | Help, **blocked** (`missingPersons` off) | none                            | n/a    | n/a                                                             | none proposed   | n/a     | Dedicated safety, privacy and legal review (ADR 0006) | Feature absent                                             |

## 6. Festival Updates

| Action                    | Screen / status                                                    | Endpoint                                                                  | Access | Source                                       | Storage / class | Offline            | Gate                                                         | Acceptance test                                                 |
| ------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------- | ------ | -------------------------------------------- | --------------- | ------------------ | ------------------------------------------------------------ | --------------------------------------------------------------- |
| Read updates              | Updates, **synthetic**                                             | proposed `GET /api/public/updates`                                        | public | Approved operator items with source and time | content_item    | memory             | Content workflow                                             | Withdrawn item disappears on next fetch                         |
| Read published About text | Settings, **implemented behind flag** (`publishedInformation` off) | `GET /api/public/information?lang=` (PR #99, **404 until copy approved**) | public | Repo copy; reviewer and revision required    | none            | memory, `no-store` | LEAD route approval, native-language and counsel copy review | 404 for every locale until approved; no cross-language fallback |

## 7. Community Partners

| Action              | Screen / status                            | Endpoint                             | Access                     | Source | Storage / class | Offline | Gate                                         | Acceptance test                                                   |
| ------------------- | ------------------------------------------ | ------------------------------------ | -------------------------- | ------ | --------------- | ------- | -------------------------------------------- | ----------------------------------------------------------------- |
| Partner information | Partners, **inert** (`partnerContact` off) | none                                 | n/a                        | n/a    | none            | n/a     | Vendor directory review, consumer-law review | No partner contact action available                               |
| Submit inquiry      | Partners, **proposed**                     | `POST /api/public/partner-inquiries` | public with abuse controls | Form   | partner_inquiry | none    | Notice, retention decision, BF-10 rate limit | Oversize/unknown field rejected; no success claimed before stored |

## 8. Staff Console

| Action                                   | Screen / status | Endpoint                          | Access                                           | Source    | Storage / class               | Offline | Gate                | Acceptance test                                                                     |
| ---------------------------------------- | --------------- | --------------------------------- | ------------------------------------------------ | --------- | ----------------------------- | ------- | ------------------- | ----------------------------------------------------------------------------------- |
| Draft, review, approve, withdraw content | **No screen**   | proposed `/admin/api/v1/content*` | staff behind Cloudflare Access, then server RBAC | Operators | content_item, admin_audit_log | none    | BF-02, BF-03, BF-05 | Access admission alone grants nothing; self-approval rejected; every action audited |
| Assign/revoke roles                      | **No screen**   | proposed `/admin/api/v1/roles*`   | approver only                                    | Approvers | role_assignment               | none    | BF-03               | Revoked role denied on next request                                                 |

## What is real today

Implemented: the app shell, language switching, offline shell, settings and notices, and the Resource client. Synthetic: Ghats, Stay, Travel, Updates, Conditions, Help points. Inert: Pass, Group, Map, Partners, SOS. Absent: Staff Console, missing-person flow, payments, donations. Live backend behaviour: none. The one new route, `/api/public/information`, answers 404 for every locale until a human approves copy.
