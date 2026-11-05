# Backend contracts and security acceptance — PROPOSED

**Status: design for review only.** No G0/G1 approval is recorded by this document. No route,
identity, role, session, migration, binding or processing purpose is activated. This supplements
[the existing decision register](BACKEND_FOUNDATION_DECISIONS.md), rather than replacing it.

The [public OpenAPI draft](../contracts/public-information.openapi.yaml) documents current health
behavior and a small proposed read-only information endpoint. Its `0.1.0-proposed` version identifies
the document; it does not change the application version or release history. No server URL or
production environment is declared. Proposed behavior below is acceptance criteria, not test results.

## Public boundary: smallest implementation candidate

| Operation                             | Status            | Gate / purpose                             | Proposed acceptance                                                                                                             |
| ------------------------------------- | ----------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `GET /healthz`                        | Existing scaffold | Process liveness only                      | `200`, exact `{"status":"ok"}`, `Cache-Control: no-store`, existing security headers; never report dependency or auth readiness |
| `GET /api/public/information?lang=te` | PROPOSED          | G0 scope/standards plus native/copy review | Read versioned, reviewed application information only; no D1, identifier, personalisation or side effect                        |

Public information must not claim government affiliation, approved event dates, legal compliance,
real-time safety advice or support for excluded features. Content and translation review are distinct
from schema validation. A translation passing a schema is not reviewed legal or native-language copy.
The endpoint proposes repository-controlled strings, not a user-content publishing API.

Before implementation, LEAD must approve the route, locale/default/fallback policy, document limits,
error text and abuse budget under BF-10. These are proposed engineering choices, not accepted defaults.
Infrastructure headers and rate-limit policies must not silently introduce IP retention or new sinks.

| ID     | Acceptance case                                                      | Expected proposed invariant                                                                                                            |
| ------ | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| PUB-01 | Valid approved locale, locale omitted                                | Exact locale document; omitted locale uses reviewed Telugu default; no cookies/identity lookup                                         |
| PUB-02 | Unknown, duplicated, empty or oversized `lang`; unexpected query key | `400` safe `INVALID_QUERY`; no reflected values, partial document or extra work                                                        |
| PUB-03 | Known locale has no approved document                                | `404` safe `INFORMATION_UNAVAILABLE`; no silent language fallback                                                                      |
| PUB-04 | POST/PUT/PATCH/DELETE, path aliases, malformed path                  | No content mutation or persistence; define and test safe method/path handling without asset-fallback bypass                            |
| PUB-05 | HTML/script-shaped query or malformed content fixture                | Query rejected; content is JSON text with JSON Content-Type and existing security headers; consumers render strings as text            |
| PUB-06 | Browser/service-worker navigation after an authenticated request     | All `/api` responses remain `no-store`; no private content can enter this public representation or cache                               |
| PUB-07 | Repeated requests and telemetry inspection                           | No application database calls, visitor identifiers, cookies, location, request-body logs or token logs; bounded response/schema limits |
| PUB-08 | Invalid checked-in content or missing approved revision              | Build/validation rejects it before publication; runtime cannot invent a review or serve draft copy                                     |

GET/HEAD and method-error semantics for the proposed information path still need a specific routing
decision. OpenAPI lists GET only; it does not authorize a write operation or silently change existing
health method behavior. Public help text is not a consent notice or proof of any processing basis.

## Gated foundation: proposed interfaces for decisions

The following candidates are **not active API contracts** and intentionally are not exposed in the
OpenAPI `paths`. Exact names, permission strings and status policies require the linked BF decisions.
No role names, account provider, timeouts, legal retention periods or database columns are selected.

| Boundary / candidate operation                      | Pending decisions                                        | Interface to review                                                                                              | Negative acceptance before exposure                                                                                                                                         |
| --------------------------------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Admin verifier before `/admin*` routing             | G0/G1; BF-02, BF-09, BF-10; Access app/issuer/audience   | Trusted configured issuer/JWKS origin only; verified principal or denial; no raw JWT outside verifier            | Missing/oversized/unsigned/forged token, wrong algorithm/issuer/audience, expired/future claims, unknown key and refresh failure never authenticate                         |
| Central `authorize(principal, operation, resource)` | BF-02/BF-03; assignment/revocation authority             | Server-resolved principal and resource scope; explicit allow/deny for an approved operation; deny unknown values | Client roles, self-enrolment, stale/revoked grants, cross-subject IDs, list/bulk scope escape and unknown operations cannot authorize                                       |
| Session establish/refresh/revoke, paths unset       | BF-01/BF-04 and ADR 0008                                 | Selected identity model, secure transport and approved lifecycle; no speculative signup endpoint                 | Fixation, expiry/revocation reuse, rotation race and applicable CSRF/replay tests; no credential in URL, log or service-worker cache                                        |
| Audit append/internal read, paths unset             | BF-05/BF-06/BF-08; persistence exception and D1 approval | Minimal approved event; scoped access; parameterized local-only statements after approval                        | Ordinary update/delete, unauthorized read, arbitrary metadata and secret/location input rejected; failure policy reviewed before dependent sensitive action                 |
| Consent status/grant/withdraw, paths unset          | BF-01/BF-04/BF-05/BF-07/BF-08                            | Server-derived subject, approved purpose/version, explicit action and reviewed idempotency/order semantics       | Cross-subject request, unknown/unapproved notice, implicit grant, replay, stale grant after withdrawal, concurrent writes and restored stale state cannot enable processing |

For authentication errors, propose a fixed safe envelope and no sensitive claim/key details. Review
whether invalid credentials return 401, verified-but-unauthorized operations 403, and unavailable trust
services 503; these codes are not permission to fail open. Review clock skew, key-cache bounds,
algorithm restrictions, JWKS refresh/rotation and failure policy before a JWT library is chosen.
Token-supplied `jku`, `x5u` and `kid` must never select an arbitrary URL/path or trusted tenant.

Admin protection must cover normalized/encoded paths, nested operations, method variants and static
fallbacks. All private responses and failures must be `no-store`; service-worker tests must demonstrate
private data cannot be cached. Authorization must run server-side for every operation, independently
of Access admission or frontend visibility. Do not expose proposed candidate routes while gated.

## Approval and implementation handoff

1. LEAD records G0 disposition and public scope/copy review with owner, review link and exact revision.
2. Identity/privacy/security owners record BF decisions and G1 evidence before private implementation.
3. Each approved operation gets its own issue, resource-scope rule, input/error limits, negative tests
   and independently reviewed PR. D1 tests/migrations stay local until separately authorized.
4. Review retention, deletion and restore behavior; consent records alone do not enforce withdrawal.
   Ordinary append-only audit behavior is not tamper-proof D1 administration or a retention exemption.
5. Report implemented tests separately from this acceptance plan. No legal sign-off, feature approval,
   production release, spending, location persistence or new persistence allow-list exception is implied.

No body, token, cookie, personal identity, coordinate, movement history or generic arbitrary metadata
belongs in public content. No group/location, directory, child, missing-person, payment, donation or
notification APIs are proposed here. The current persistence allow-list remains unchanged.
