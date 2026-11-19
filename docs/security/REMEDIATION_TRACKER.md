# Security remediation closure tracker

Audited main: `6ae4ba05ece4138bc5c74045273340a3739b298e`. This tracker does not certify zero risk or legal compliance.

| Finding                                                 | Candidate                                                   | Closure evidence still required                                                                                                                                              | Accountable owner       |
| ------------------------------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| H-01 Unreviewed preview credential execution            | PR #41 pauses current privileged path                       | Human approval/merge and externally enforced credential isolation; prove an unreviewed branch cannot request credentials through another workflow                            | LEAD / security owner   |
| H-02 Unprotected main and unrestricted environments     | This setup-hardening PR; live controls unchanged            | Owner's ADR0007 decision, supported enforced controls or separately controlled operator boundary; verify live read-back. Never change visibility or buy a plan automatically | LEAD                    |
| M-01 Static asset policy bypass                         | PR #42 enables Worker-first routing with80 local HTTP cases | Human review/merge and authorized staging behavior verification; monitor Free invocation quota                                                                               | DEV3 / DEV2             |
| M-02 Audit operational failures hidden                  | PR #43 scanner-result validation                            | Reviewed Security workflow on final head must fail simulated outage                                                                                                          | DEV3                    |
| M-03 OSV scans re-resolved rather than shipped versions | PR #43 committed-lock inventory                             | Exact locked graph fixtures plus final-head CI; unsupported dependency sources fail closed                                                                                   | DEV3                    |
| M-04 Setup reports rejected controls as present         | This setup-hardening PR, 24 mocked regressions              | Failure fixtures and explicit owner-authorized live read-back; do not run whole setup blindly                                                                                | LEAD / DevOps           |
| M-05 Development advisories                             | No compatible upstream fix as rechecked5 November2026       | Compatible upstream adoption/backport or separately tested toolchain migration; never dismiss or force major overrides                                                       | DEV3 / dependency owner |

## Dependency evidence and limits

`minimatch@10.2.6` remains below first patched11.0.1; current ESLint10.14.0, config-array0.23.5 and typescript-estree8.72.1 require the vulnerable major. `glob@13.0.6` remains below first patched14.0.2 through licence-checker5.0.1's npmcli dependency tree. Registry latest11.0.4/14.0.3 do not make those changes semver-compatible.

Minimatch amplification needs hostile patterns with optimizationLevel>=2; glob13 enables that setting. Glob cancellation bypass concerns async traversal using AbortSignal. No direct application/script calls or root workspaces were found, but toolchain/PR inputs remain a risk. Isolated jobs with process timeouts and no deployment credentials reduce impact. Full audit27 moderate dependency-tree entries fromtwo advisories; zero runtime dependencies, production audit0. No risk waiver inferred.

## Release and legal gates

No source change resolves missing human review, authoritative engineering standards, identity/role/session/retention contracts, DPDP/CERT-In applicability/effective-date review, IP clearance, accessibility/UAT, rollback/deletion drills or production authorization. Existing v1.x tags are preserved; a tag or green CI is not launch readiness. No paid dependency is introduced by these fixes. GitHub Free/private plan limits require a verified owner decision; do not make source public as a workaround without approval.

All candidates are unmerged. No live GitHub settings, Cloudflare resources, billing, credential values or production deployment are changed by this work.

## Owner-controlled closure steps (not executed)

1. Do not merge #34 unchanged. Review #41's exact final head and the credential-isolation threat model first.
2. Inspect actual Cloudflare token scope without disclosing the value. Use only dedicated non-production resources; remove unused permissions. If exposure is confirmed, revoke/rotate under the incident process; this audit found no proof of theft.
3. Verify current GitHub plan entitlements for this private organization repository. ADR0007's old statement that private Free has no environments/secrets is contradicted by the live environments; existence alone does not mean branch/reviewer controls are supported or enforced. An upgrade does not automatically provide every security feature or required reviewer capability.
4. Prefer no-cost scanners already present. For deployment isolation where native controls cannot enforce approval, use a separately controlled trusted operator/deployment boundary with no credentials accessible to unreviewed repository workflows. Merely adding workflow approval checks inside an unprotected branch is insufficient.
5. Any public-repository decision requires explicit owner/IP approval. Any subscription requires explicit owner budget approval and verified feature entitlement. Exact paid costs remain UNKNOWN; none were purchased.
6. After the setup-script correction is independently reviewed, an authorized owner may inspect a dry run and approve only the necessary live settings. The whole script also changes labels, milestones and project settings; do not run it blindly as a security-only operation. API denial or mismatched read-back is a blocker, not success.
7. Record actual independent named-human approval on final commit, perform human-controlled merge, then verify staging's real headers/methods and rollback behavior. Only externally verified enforcement and negative credential-access tests can close H-01/H-02.

## Repository audit of 18 Nov 2026: sign-in remediation (engineering only)

Source: "Pushkara Mitra Repository Audit (18 Nov 2026)". Engineering status only; no legal sign-off is implied and nothing here is deployed until `npm run ship:staging` is run and `/healthz` is verified.

| Audit ID | Change                                                                                                                                                                                                                                                                                     | Evidence                                          |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------- |
| H1       | `googleKeyFetcher` now fails closed: 1 h hard TTL, no stale keys, unknown `kid` refetches at most once per 60 s, 3 s timeout, no redirects, 64 KB body cap                                                                                                                                 | `tests/worker/auth-hardening.test.ts` (H1)        |
| H2       | `/api/auth/*` rate limited per client IP (30 per 60 s, 429 with `Retry-After`). Uses `env.AUTH_RATE_LIMIT` (Workers rate-limit binding) if configured, else a per-isolate counter. The binding itself is NOT configured in `wrangler.toml` (NEEDS REVIEW: confirm binding syntax and plan) | same file (H2)                                    |
| H3, M1   | Cookie holds only `{s, iat, exp}`; `s` is an HMAC pseudonym of the Google `sub`. No email, name or raw `sub`. `/api/auth/me` returns `{remembered: true}` only; the page keeps name and email in memory from the sign-in response                                                          | same file (H3/M1), `tests/worker/session.test.ts` |
| M2       | `GET /api/auth/nonce` sets a signed 10 min cookie; the ID token's `nonce` must match it. Enforced only when `SESSION_SECRET` is set. Not single-use server-side (needs the database)                                                                                                       | same file (M2)                                    |
| M4       | POST requires an `Origin` header equal to the request origin                                                                                                                                                                                                                               | same file (M4), `google-auth.test.ts`             |
| M6       | `npm audit --omit=dev` run 2026-11-18 locally: 0 vulnerabilities                                                                                                                                                                                                                           | command output in the session                     |

Still open (owner or counsel decisions, not engineering): ADR 0008 approval (sign-in is already off wherever `GOOGLE_CLIENT_ID` is unset), data fiduciary and nodal officer, counsel, database ADR choice, licence choice (OQ-008), server-side session revocation (M3, needs the database), M5 (account 2FA and secret scoping), and WCAG device testing.
