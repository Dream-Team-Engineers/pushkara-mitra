# Backend foundation: decisions for human review

Status: **DRAFT — design only, no implementation or approval.** Prepared 2026-11-04 (IST). Based on repository main `4e076c7595dd0b6a789ce50fbbebb1b4cce8ba80`.

This document makes the next backend decisions inspectable. It does not lift the V2 stop gate, accept an ADR, approve a role or consent notice, provision a binding, or authorize collection of personal data. No API, schema, session or authentication feature is implemented by this proposal. Engineering readiness and legal sign-off remain separate.

## Existing decisions and scope

- [Version roadmap](../VERSION_ROADMAP.md): V2 is a secure foundation, and implementation stops after Phase 0 while the standards file is a placeholder. Product features and production launch are outside its scope.
- [Engineering standards placeholder](../ENGINEERING_STANDARDS.md) and [standards review findings](ENGINEERING_STANDARDS_v3_AUDIT.md): the draft is not the authoritative standard; missing approval records and section references need reconciliation.
- [ADR 0004](../decisions/0004-ephemeral-location.md): never persist or log location. Its approved staging-only amendment permits an unused SQLite-backed Durable Object namespace; it does not authorize use of storage or a D1 location table.
- [ADR 0005](../decisions/0005-log-residency-and-minimisation.md): log minimisation and residency are proposed, with applicability and sink decisions unresolved. This draft does not treat them as accepted or prescribe a legal retention period.
- [ADR 0006](../decisions/0006-children-and-dependents.md): child/dependent workflows remain blocked pending counsel. No child schema or API is proposed here.
- [ADR 0007](../decisions/0007-repo-visibility-and-plan.md): repository visibility, plan and effective approval controls require an owner decision.
- [AI delivery proposal](../AI_DELIVERY_PIPELINE.md): G0 and G1 are manual human gates; a merged proposal or green CI is not evidence that either gate passed.

ADR 0008 (user authentication) and ADR 0010 (error tracking) are called for by the roadmap but do not exist in the inspected decision directory. Do not silently create an accepted decision or reuse either number for a different topic.

## Required human gates

| Gate                           | Required evidence before dependent implementation                                                                                                                                               | Decision owners / reviewers                                   |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| G0: standards                  | Authoritative standards committed at an identified SHA; owner, technical, security/privacy and legal review metadata recorded; section references reconciled; explicit V2 stop-gate disposition | LEAD and named human reviewers                                |
| G0: governance and scope       | ADR 0007 decision; effective independent review process verified for the chosen GitHub plan; approved foundation scope and acceptance criteria                                                  | Repository owners and LEAD                                    |
| G1: identity and authorization | Accepted admin trust boundary and subject mapping; approved permission matrix and role-assignment authority; ADR 0008 authentication decision; session and abuse threat model                   | LEAD, security/privacy reviewer and designated identity owner |
| G1: data and privacy           | Approved minimal identity, audit and consent data contracts; purpose and notice versions; retention/deletion/restore handling; processor/residency assessment and legal review where required   | LEAD, privacy owner and counsel                               |
| G1: operational security       | Reviewed logging/error-tracking decision, secret handling, JWT key rotation/failure policy, incident/revocation process and test plan                                                           | LEAD, security reviewer and operations owner                  |

Each evidence record needs a decision, owner, date, review link and exact repository revision. A reviewer still marked TBD, an unreviewed PR, the calendar target or a passing scanner cannot satisfy a gate. Credentials and Access configuration are operational prerequisites after design approval, not substitutes for approval. DNS, paid actions, access/permission changes and production release remain separately subject to G4; this design authorizes none of them.

## Decision register

All entries below are **PENDING HUMAN DECISION**. Candidate choices are not defaults.

| ID    | Question and choices to evaluate                                                                                        | Evidence needed / consequence                                                                                                                              |
| ----- | ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BF-01 | Pilgrim identity: accountless invite, phone OTP, passkey or hybrid; whether a persistent account is needed at all       | ADR 0008 threat model, recovery/abuse model, accessibility and provider/data review; no sign-up route before selection                                     |
| BF-02 | Admin identity key and principal mapping: stable issuer/subject mapping versus another reviewed identifier              | Identity owner confirms stability and lifecycle; do not make an email string or mutable display name an authorization key by assumption                    |
| BF-03 | Roles, permission names and assignment authority; scope and emergency revocation                                        | Approved operation-to-permission matrix and human assignment/review process; no self-enrolment or first-user administrator                                 |
| BF-04 | Session mechanism, absolute/idle expiry, rotation, concurrent sessions, revocation and recovery                         | Accepted auth model and browser/API threat model; exact lifetimes and persistence are unset                                                                |
| BF-05 | D1 subject reference, account linkage and data minimisation                                                             | Approved identity contract; no phone/email/display-name column added merely because an example inventory mentions it                                       |
| BF-06 | Audit purposes, actor representation, permitted event taxonomy and retention/deletion                                   | Operational requirement and privacy/counsel review; reconcile append-only application behavior with lawful erasure and administrative retention procedures |
| BF-07 | Consent purposes, applicable basis, notice content/languages/versioning and withdrawal semantics                        | Review [consent register](../compliance/consent-register.md); account/sign-in basis is explicitly TBD, not automatically consent                           |
| BF-08 | Consent evidence retention, subject rights, deletion and backup/Time Travel restores                                    | Review [data inventory](../compliance/data-inventory.md), processor terms and restore procedures; exact duration remains unset                             |
| BF-09 | Logging, error tracking and any correlation identifiers                                                                 | ADR 0010 plus reconciliation with proposed ADR 0005; no Sentry integration, IP logging or user-identifier hashing selected by this draft                   |
| BF-10 | Abuse controls and trust boundaries: per-route limits, request-size limits, trusted proxy metadata and failure behavior | Route-specific threat model and staging measurements; do not trust arbitrary client IP headers or collect identifiers just for a rate-limit key            |

## Admin authentication requirements for review

The existing roadmap requires Cloudflare Access JWT verification for `/admin*`. Before implementation, confirm the configured Access application, MFA policy, exact trusted team/issuer, audience and principal mapping. Never derive trust configuration from a request, token or client-selected tenant.

A proposed centralized verifier must:

1. Protect every admin operation and nested path consistently before routing or static-asset fallback. Test normalized/encoded paths and method variants so alternate routes do not bypass it.
2. Validate JWT structure and size; restrict accepted algorithms and key types; verify the signature against trusted Access signing keys; reject unsigned tokens and algorithm/key confusion.
3. Validate exact issuer, intended audience and expiration, plus applicable time claims under a reviewed clock-skew policy. Successful decoding, a token header or an Access-looking request header is not authentication.
4. Retrieve keys only from the configured trusted HTTPS origin. Do not follow token-controlled `jku`/`x5u` or use an arbitrary `kid` as a URL or file path. Define bounded caching/refresh and rotation behavior; no unknown key or failed verification becomes an authenticated session.
5. Derive a principal only after verification, then require server-side authorization independently. Access admission alone does not grant every application permission.
6. Return a uniform safe authentication failure without token/claim details. Never persist or log the JWT, authorization headers, cookies, raw identity payload or request body.

The cryptographic library, JWT algorithm set, exact claim policy, key-cache limits and role source remain review decisions. No library or production secret is installed by this draft.

## Authorization and session contracts for review

Use one centralized authorization boundary with a deny-by-default result for unknown principals, operations, permissions, resources or scopes. Route handlers must enforce it server-side; frontend visibility and client role claims are never authority. Each proposed operation must have an explicit permission, resource-scope rule and negative test before exposure.

The human-approved matrix must distinguish administration, audit access, consent subject access and role administration without inventing named roles here. Role assignment, changes and revocation must be performed only by the approved authority; no request may grant its own privileges. Server-resolved resource ownership must prevent cross-subject reads and writes, including bulk/list endpoints.

The selected session design must define fixation resistance, login/privilege-change rotation, expiry, logout/revocation propagation and credential recovery. If cookies are selected, specify Secure/HttpOnly/SameSite behavior, CSRF protection for mutations and origin policy. If a bearer design is selected, document storage, theft/replay and revocation controls. Do not choose local storage, session persistence, cookie domains or numerical lifetimes implicitly.

## Minimal D1 boundaries for review

No executable SQL, remote database, binding or migration is introduced here. A later approved D1 PR may propose the following logical records, with actual columns and constraints reviewed first:

| Boundary          | Candidate minimum evidence                                                                                                                                                                          | Excluded until separately approved                                                                                                                                               |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `admin_audit_log` | Event identifier; approved minimal actor reference; event type; server timestamp; coarse outcome and scoped target reference only when necessary                                                    | JWTs, credentials, bodies, arbitrary JSON metadata, personal content, coordinates, location history and unrestricted identifiers                                                 |
| `consent_ledger`  | Event identifier; approved opaque subject reference; reviewed purpose and notice version; affirmative grant or withdrawal action; server timestamp; replay/idempotency evidence only when necessary | Prechecked grants, inferred browser-permission consent, unknown purposes, bundled optional consent, location payloads, report/payment/child data and unreviewed request metadata |

These are conceptual boundaries, not approval to collect every candidate field. Opaque references can still be personal data and require privacy review. No generic telemetry or user table should be introduced as a shortcut. Session storage is a separate decision under BF-04.

Proposed database controls: parameterized statements; constrained enums and lengths; subject-scoped queries; server-generated timestamps; uniqueness/idempotency rules; atomic operations for related state; stable safe errors. Design append-only audit behavior for ordinary application access and test update/delete denial. D1 administrative access is a separate privilege boundary: application append-only behavior is not a claim of tamper-proof storage. Retention/deletion operations require a reviewed procedure and must not be exposed as ordinary audit mutations.

The current [reviewed persistence allow-list](../security/security-architecture.md#reviewed-allow-list-for-persistence-apis) is empty. Any future required persistence exception must be narrow, justified, reviewed and approved; never disable or broadly weaken the location guard to permit D1. D1 records must not contain coordinates, movement data or geographic history. Do not change Durable Object provisioning or use its storage for this foundation.

## Consent contract for review

Keep every optional purpose off until the subject takes an explicit affirmative action on the reviewed notice/version. Reject unknown, unapproved, obsolete or mismatched purpose/version values according to a reviewed transition policy. Withdrawal must be accessible and must stop dependent optional processing under an agreed enforcement policy; a ledger alone does not enforce withdrawal.

Authorize the subject for each record and action; a client-supplied subject ID is not proof of identity. Define duplicate/replay behavior and atomic grant/withdraw ordering before implementation. Do not replay a historical grant over a later withdrawal or resurrect consent from a backup without the approved restore policy. Capture no extra evidence, such as IP address or user agent, without an explicit necessity and privacy decision.

This proposal does not enable group/location, notification, payment, missing-person or child processing. The ledger may not be used to suggest those features have legal or operational approval. Notice language and lawful-basis conclusions remain human/counsel decisions; legal registers remain NEEDS REVIEW.

## Negative test and evidence plan

| Area                 | Required negative cases and expected invariant                                                                                                                                                                                   |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Access verification  | Missing/malformed/oversized/unsigned JWT; forged signature; disallowed algorithm; unknown or rotated key; wrong issuer/audience; expired/future token; key-service failure. None authenticates or leaks token details            |
| Routing              | Nested admin route, encoded/normalized path, unsupported method and static-asset fallback. None bypasses the admin boundary                                                                                                      |
| RBAC                 | Unassigned/revoked principal; unknown permission; client-injected role; self-promotion; cross-subject/resource access; list/bulk scope escape. Deny without unauthorized data or writes                                          |
| Sessions             | Fixation, expired/rotated/revoked credential, logout reuse, recovery replay, cookie/CSRF or bearer replay cases appropriate to the selected model. Rejection and propagation meet the reviewed contract                          |
| Validation and abuse | Oversized/truncated/invalid bodies; unexpected fields; SQL metacharacters; rate-limit exhaustion; forged proxy metadata; service failure. No unsafe query, personal log or silent fail-open                                      |
| Audit                | Unauthorized read; ordinary update/delete attempt; arbitrary metadata; write failure; concurrent events. No unauthorized access, mutation or secret/location persistence                                                         |
| Consent              | Unknown/unapproved notice; absent affirmative action; wrong subject; duplicate request; stale grant after withdrawal; concurrent grant/withdraw; revoked session; restored stale state. No inferred grant or cross-subject write |
| Privacy and caching  | Coordinates/secrets in nested inputs or errors; authenticated response through service worker/cache; persistence guard exceptions. No location storage/logging, secret exposure or caching of private responses                  |

Use synthetic fixtures without real personal data or credentials. Run worker integration and local D1 tests only after approved implementation exists. Report commands, test counts, failures/skips, exact commit and CI URLs; a static guard or health endpoint is not full auth/data verification.

## Proposed independent PR sequence

1. **This decision draft:** review unresolved choices and gate evidence. Documentation validation only; no claim of backend readiness.
2. **Decision PRs:** accepted standards/scope evidence, ADR 0008, ADR 0010, permission/data/retention contracts and threat-model updates. Human reviewers record decisions; agent authors cannot self-approve.
3. **Admin verification boundary:** after G0/G1 and Access configuration, implement verifier and admin route guard with negative tests. No pilgrim signup or automatic admin enrolment.
4. **Authorization:** implement the approved permission matrix and resource scopes independently, with escalation and cross-subject tests.
5. **Sessions:** implement only the selected ADR 0008 model and approved lifecycle, with expiry/revocation/CSRF or replay tests.
6. **Request/error/logging controls:** implement approved validation/abuse limits and scrubbed errors/logger, with failure and privacy tests. Do not add an unapproved log sink.
7. **D1 baseline:** local migration and tested audit/consent boundaries under approved data contracts and narrowly reviewed persistence exceptions. No remote migrations or provisioning without separate authorization.
8. **Consent enforcement:** subject-scoped grant/withdraw contract, approved notice versions, idempotency and optional-processing checks. Keep later feature APIs disabled/out of scope.
9. **Independent verification:** Security and QA review integration, browser caching, privacy invariants, staging function and rollback evidence after human-reviewed merges. No production launch.

Every implementation PR needs an issue, owner, explicit gate references, risk/privacy impact, test evidence and rollback plan. Parallel work must use separate branches and agreed interfaces. No agent merges its work, approves its own change or marks legal compliance from CI. Dependency order may be refined after human decisions; no blocked implementation is authorized by this sequence.
