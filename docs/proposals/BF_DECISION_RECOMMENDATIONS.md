# BF-01 to BF-10: recommendations for human decision

Status: **PROPOSED — recommendations only. Every BF decision remains PENDING HUMAN DECISION.** Prepared 2026-11-11 (IST). Owner answers recorded on 11 Nov: data fiduciary and nodal officer not confirmed; persistent accounts not required for public browsing; counsel not confirmed; Workers Free for development and preview only. Nothing here activates sign-in, admin routes, accounts or roles. Decision register: [BACKEND_FOUNDATION_DECISIONS](BACKEND_FOUNDATION_DECISIONS.md). Facts about Cloudflare Access are from official docs retrieved 2026-11-11 (see ADR 0012 section 4).

## Fully prepared: BF-01 to BF-04

### BF-01 Pilgrim identity and account need

- **Recommendation:** no persistent account. Public browsing needs none (owner answer). For group sharing, use accountless, short-lived invitations and a server-issued anonymous session scoped to the group. Defer phone OTP and passkeys; reconsider only if the Pass or a safety workflow needs a durable identity, and then after counsel.
- **Why:** collects the least personal data, avoids account recovery and enumeration surface, and matches DPDP minimisation. It also keeps an OTP provider out of the data-flow.
- **Cost:** no recovery across devices; a lost phone loses group membership (invite again). Impersonation inside a group is limited by invitation secrecy and expiry only, so the stalking/coercion threat model must cover it.
- **Open:** whether the Pass needs identity (blocked, no contract); child/dependent handling (ADR 0006).
- **Reviewers:** LEAD, security reviewer, counsel (not engaged, OQ-024).

### BF-02 Admin identity and Access trust boundary

- **Recommendation:** staff sign in only through Cloudflare Access with MFA enforced at the identity provider. The Worker verifies the `Cf-Access-Jwt-Assertion` header itself (do not trust network position): verify signature with keys fetched from `https://<team>.cloudflareaccess.com/cdn-cgi/access/certs`, choose key by `kid`, check `iss` equals the configured team domain and `aud` equals the configured application AUD tag, check expiry. Use a maintained library (`jose`), never custom crypto. Cache keys with a short TTL and refetch on unknown `kid`; fail closed if keys are unavailable.
- **Principal mapping:** key on (`iss`, `sub`) stored in `principal`, not on an email string. Email is display only and may change.
- **Why:** reuses a managed MFA/identity layer instead of building staff authentication; keeps a small attack surface.
- **Cost/risks:** dependency on Access availability; key rotation must be tested; Access policy misconfiguration is an owner-side control, so the Worker's own RBAC remains mandatory.
- **Open:** which identity provider the owners use; Access plan limits for the team size (not retrieved; verify).
- **Reviewers:** LEAD, security reviewer, owners (who operate the Cloudflare account).

### BF-03 Roles, permissions, assignment authority

- **Recommendation:** adopt [RBAC_MATRIX](RBAC_MATRIX.md) as the starting point: six actors, deny by default, separation of duties, time-boxed assignments, emergency revoke by any approver. Bootstrap of the first approver is a documented owner action, not code.
- **Reviewers:** LEAD, security reviewer, safety owner.

### BF-04 Sessions, expiry, rotation, revocation, CSRF/replay, recovery

- **Staff:** session is the Access session; the Worker re-checks the JWT and the role assignment on every request. No separate Worker-issued staff cookie.
- **Pilgrim (only if BF-01 approves any session):** opaque random token, 256-bit, stored hashed; `HttpOnly`, `Secure`, `SameSite=Strict` cookie scoped to the API host; idle expiry and absolute expiry set to the shortest workable values chosen by the reviewers (numbers are not proposed here without usability testing); rotate on privilege change; revoke on stop-sharing and on user request; one active session per device.
- **CSRF:** state-changing routes require a custom header plus an Origin check against an allow-list; `SameSite=Strict`; no state change on GET.
- **Replay:** idempotency keys on create operations; webhooks verified by signature and recorded once (`webhook_event`).
- **Recovery:** staff recover through the identity provider, never through the app; pilgrims have none (re-invite).
- **Reviewers:** LEAD, security reviewer. Needs the ADR 0008 threat model before any code.

## Recommendations: BF-05 to BF-10

| ID                           | Recommendation                                                                                                                                                                                                                                                  | Why                                                  | Trade-off / open point                                                                                                            |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| BF-05 Subject reference      | Random opaque 128-bit `subject_ref`, generated server-side, not derived from phone, email or device. Never reused across purposes where avoidable                                                                                                               | Avoids a global identifier and eases erasure         | Linking records for a rights request needs the reference; no recovery if lost                                                     |
| BF-06 Audit                  | Append-only `admin_audit_log` with fixed fields (actor_ref, action, target, outcome, request_id, time); no free text or bodies; copy to the India-resident sink                                                                                                 | Accountability without extra personal data           | Retention period depends on unverified CERT-In/DPDP duties (OQ-007); restore can drop recent rows, hence the copy                 |
| BF-07 Consent                | Purpose-specific `consent_ledger` rows (subject_ref, purpose, notice_version, locale, decision, time); withdrawal writes a new row and stops processing; no pre-ticked options                                                                                  | Evidence without bundling                            | Which processing is consent-based versus another ground needs counsel                                                             |
| BF-08 Retention and restores | Delete group/session/invitation data at event end plus a short documented tail; per-subject key crypto-shredding for personal fields; erasure and withdrawal list replayed after any restore; disclose the backup window                                        | Time Travel restores in place and cannot be disabled | Crypto-shredding adds key management; needs review; legal-hold and authority-request process needs a named nodal officer (OQ-023) |
| BF-09 Logging                | Allow-listed fields only (timestamp, event type, request id, status, coarse error class); no coordinates, bodies, tokens or full identifiers; sink in India if required, decision OQ-017                                                                        | Matches ADR 0005 and the location rule               | CERT-In log duties unverified; error-tracking provider (ADR 0010) not chosen                                                      |
| BF-10 Abuse controls         | Per-route budgets using the Worker rate-limit mechanism or Durable Object counters (verify limits in official docs first); size and schema caps; uniform errors to prevent enumeration; lockouts for invitation guessing; no limits until a binding is approved | Protects availability and prevents enumeration       | Limit numbers need a load test; on Free the daily request cap dominates                                                           |

## Authority requests and legal hold (proposal)

1. A named nodal officer (not yet appointed) receives requests in writing and records them in `legal_request_register`.
2. Counsel confirms the legal basis before anything is disclosed.
3. Export is an admin-only, dual-approved, MFA-gated, audited action limited to named records.
4. A legal hold suspends deletion for named records and is re-applied after any restore.
5. Live location is not stored, so there is nothing to produce; counsel to confirm any interception or technical-assistance duty.

No statute section is cited because none has been verified (OQ-003, OQ-007).

## Decisions needing named reviewers

| Decision                      | Reviewers needed                              | Blocks                  |
| ----------------------------- | --------------------------------------------- | ----------------------- |
| BF-01 accountless model       | LEAD, security reviewer, counsel              | Group sessions, Pass    |
| BF-02 Access boundary and IdP | LEAD, security reviewer, owners               | Any admin route         |
| BF-03 roles and bootstrap     | LEAD, security reviewer, safety owner         | Any role assignment     |
| BF-04 session numbers         | LEAD, security reviewer                       | Any cookie              |
| BF-05 to BF-10                | LEAD, security reviewer, counsel for 07/08/09 | Any personal-data table |
