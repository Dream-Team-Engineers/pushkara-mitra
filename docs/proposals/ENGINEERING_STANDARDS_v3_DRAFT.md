# Engineering Standards v3.0 — PROPOSED

**Project:** Dream-Team-Engineers/pushkara-mitra  
**Original proposal date:** 2026-11-03  
**Correction candidate date:** 2026-11-04 (IST)  
**Status:** DRAFT — NOT APPROVED. Human adoption and scope decisions pending.

> Newly authored replacement candidate, **not** the missing original Master Engineering Instructions v3.0. This correction candidate intentionally differs from the [archived source](sources/Pushkara_Mitra_Engineering_Standards_v3_DRAFT.docx); preserve that source unchanged. Do not replace `docs/ENGINEERING_STANDARDS.md` or lift G0/G1 or the V2 stop gate through this draft. Adoption requires the [human decision checklist](STANDARDS_ADOPTION_CHECKLIST.md), reconciled references and ADRs, and a separate reviewed change. No approval or compliance certification is asserted.

## 1. Scope and precedence

Applies to all source code, documentation, infrastructure, CI/CD, integrations, assets, releases and operations. Applicable law and signed legal advice take precedence; approved ADRs record decisions. Conflicts require documented review; never silently override safety gates.

## 2. Mission and product boundaries

Independent Telugu-first, offline-capable pilgrim assistance PWA for Godavari Pushkaralu 2027. Prominently state that it is not an official government application. V2 is the foundation sequencing phase and excludes live location, groups, missing persons, directory, payments, donations, children/dependents, SMS, push notifications and production launch from that phase. The full product target, per clarified user direction, is an original Pushkara Mitra mobile experience using Kumbh-Sathi only as a functional benchmark. No benchmark code, images, icons, colors, text or branded presentation may be copied. The original product blueprint and architecture record the current workflow structure; the reference inventory remains evidence of functional coverage, not a visual template. V2 is not a reduction of that full target. Later features stay in the target backlog while implementation and activation await the applicable G1–G4 decisions. No reuse rights in reference code, text, assets or branding are inferred.

## 3. Repository governance

Trunk-based development; all changes via small PRs; squash merge only; no direct main pushes. Require independent human approval for security, privacy, infrastructure and compliance changes; authors and their agents cannot approve their own work. CODEOWNERS must name at least two active human reviewers for critical paths. Require signed commits, including valid platform-signed commits; lack of local signing configuration is not an unsigned-commit exemption. Any signing exception requires explicit human approval, narrow scope, risk rationale, compensating controls, owner and expiry before use. Never weaken branch rules merely to pass CI.

Where the selected GitHub plan does not enforce rulesets or required reviews, do not claim CODEOWNERS or green checks enforce approval. Until ADR 0007 is resolved, the human integrator must verify independent review, exact head SHA, current checks and applicable gate evidence before any merge, and record those links. Agents never merge. Document the residual risk and owner acceptance; this draft does not authorize a paid-plan, visibility, access or settings change.

## 4. CI, dependencies and supply chain

Pin GitHub Actions to full commit SHAs; least-privilege workflow permissions; no pull_request_target; do not expose secrets to untrusted PRs. Mandatory lint, typecheck, tests, formatting, SAST, dependency audit, secret scan, license review, SBOM and workflow analysis. Pin runtime/tool versions compatibly; fail on real failures. Document exceptions with owner, expiry and compensating controls.

## 5. Identity, access and authorization

Deny by default. Administrative routes require Cloudflare Access JWT verification (signature, issuer, audience, expiration) and MFA policy. Centralize RBAC authorization; enforce server-side permissions per operation. Sessions require expiry, rotation, revocation, CSRF protections where relevant and secure cookies. Never treat a client role as authority. Log access decisions without secrets or personal location.

## 6. Privacy by design and DPDP

Data minimization and explicit purpose specification; publish clear notices in appropriate languages. Collect optional consent only with an affirmative action; enable withdrawal and rights-handling workflows where applicable. Maintain data inventory, processor register, retention schedule and deletion verification. Verify applicability and effective dates against authoritative sources; counsel must approve legal conclusions. No claim of DPDP compliance without evidence.

## 7. Ephemeral location and child safety

Location must never be persisted or logged, including Durable Object storage, KV, R2, D1, telemetry, analytics, attachments or crash reports. Fail closed if ephemeral controls fail. [ADR 0004 Amendment 1](../decisions/0004-ephemeral-location.md#amendment-1-sqlite-backed-class-on-workers-free-2026-11-03) permits a provisioned-but-unused SQLite-backed `GroupLocation` Durable Object namespace in staging only. Provisioning is not permission to call storage, SQL, KV, alarm or WebSocket attachment serialization APIs. Preview and production provisioning remain unchanged until separately approved; this standard is not that approval. No D1 location table or history is permitted.

Children/dependents implementation remains blocked under [ADR 0006](../decisions/0006-children-and-dependents.md) until counsel and the required human safety reviewers approve scope and safeguards. Test privacy invariants automatically; guards are safety nets, not proof of privacy compliance. This section does not bring location or child features into V2 scope.

## 8. Application and API security

Validate all inputs with explicit schemas and size limits. Apply authentication, authorization, rate limiting, abuse controls, output encoding, safe error responses, CSP and secure headers. Use parameterized SQL and least-privilege D1 access. Protect against injection, XSS, CSRF, SSRF and replay where applicable. No secrets in source, artifacts, logs or fixtures.

## 9. Data stores, audit and retention

Schema migrations must be versioned, reviewed, reversible where feasible and tested against staging. Admin audit records should be append-only with minimal fields, access controls and defined retention. Consent ledger requires provenance and withdrawal handling. Reconcile backup/time-travel behavior with deletion commitments before personal data processing.

## 10. Offline-first PWA and accessibility

Telugu default with reviewed English/Hindi translations. Self-host licensed fonts; support screen readers, keyboard access, 200% zoom and WCAG 2.2 AA targets. Service worker caches versioned public static assets only; never cache authenticated /api, /admin, secrets or personal data. Provide an honest offline fallback and degraded-network tests.

## 11. Observability, incidents and operations

Structured, scrubbed logs; never include secrets, coordinates, personal identifiers beyond approved minimal operational needs. Define alert ownership, incident severity, rollback, kill switch, restore drills and evidence retention. CERT-In applicability and reporting obligations require verified legal review and a tested incident runbook.

## 12. Cloudflare environments and deployment

Separate preview, staging and production bindings and scoped credentials. Configure secrets only through approved secret stores. A required deployment must fail when required credentials, upload or deployment steps fail; never suppress the underlying failure. An intentionally optional preview may report a successful orchestration check after skipping, but must explicitly record **NOT DEPLOYED**, its reason and `deployed=false`, omit any preview URL claim, and never count that check as deployment or functional evidence.

Report uploaded Worker versions separately from running deployments. Claim a preview or staging deployment only after verifying its actual deployed URL, exact commit SHA, relevant functional request and smoke-test result. `/healthz` alone is not feature validation. Test missing-credential, failed-upload and missing-URL paths as well as success paths.

Preserve the current production stop gate: release-please may create release PRs, tags and release metadata, but must not trigger production deployment. The retained callable production workflow must fail closed without accessing production credentials or running deployment commands. Neither adopting this standard nor creating a release lifts that gate. Re-enabling any production path requires a separate human-approved change and explicit release authorization, verified independent approval controls, approved immutable release artifact, test/rollback evidence and applicable G4 approval. Agents do not merge or deploy production; no DNS, spending or access change is authorized here.

## 13. Legal, intellectual property and branding

Maintain a license register, asset permissions, attribution, trademark review and copyright provenance. Do not use government insignia or imply endorsement. No payment, donation, vendor listing or missing-person launch until counsel approves applicable legal and safety controls. Record sources, dates, owner and evidence for legal claims.

## 14. Testing and security verification

Test unit, integration, worker, browser, offline, accessibility and security behaviors. Include negative tests for admin authorization, rate limits, consent, location non-persistence, and secret handling. Run ZAP baseline and independent review before V2 release. Report exact commands, CI run URLs and results; never claim tests passed without execution evidence.

## 15. Decisions, exceptions and change control

Maintain ADRs, open questions and an evidence index. Every exception needs documented risk, owner, approval and expiry. Block dependent work when mandatory standards, credentials or legal decisions are missing. Do not invent decisions or approval signatures.

## 16. V2 acceptance criteria

After explicit G0 adoption and scope decisions and G1 contract approval, resolve blocking ADRs; establish effective code review and release automation; verify live staging function; implement the approved admin auth, sessions, RBAC, abuse controls, safe logging, D1 baseline, multilingual PWA and notices; pass required tests and independent reviews. Resolve the pending choices in [BACKEND_FOUNDATION_DECISIONS.md](BACKEND_FOUNDATION_DECISIONS.md) before dependent implementation; broad principles do not select identity, role, session, retention, notice or logging contracts.

The first implementation tranche remains the foundation-only V2 boundary in section 2; the full product target is the reference feature/user-flow parity described there. Reconcile the separate parity acceptance matrix with human-reviewed threat models, data contracts and relevant G1–G4 decisions before dependent implementation or activation; user direction on the full target does not supply missing safety, privacy, legal or production approvals. Do not remove later features from the target merely because their approvals are pending; a calendar target or merged proposal is not approval. Select a prospective staging foundation version consistent with the existing release history only through an owner-approved release decision. Do not reset versions, recreate existing tags, rewrite release history or prescribe a stale fixed version target. Production remains blocked under section 12. Engineering readiness and legal sign-off are separate decisions; legal registers remain NEEDS REVIEW until the required evidence and human review exist.

## 17. Approval record

**Actual state: not approved.** No human adoption decision, approval date or approved content revision is recorded in this candidate. Proposed reviewers below are nominations for humans to confirm, not assignments already accepted or signatures. Agent analysis does not satisfy any row.

| Review responsibility                                       | Proposed human owner / reviewer                                                                                      | Actual decision and evidence                                              |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Document ownership, authority, scope and G0                 | LEAD `@amruthamudunuru39`                                                                                            | PENDING; role acceptance, decision, date and review link not recorded     |
| Technical review                                            | DEV2 `@siddhu949`                                                                                                    | PENDING; must be independent of the change being reviewed                 |
| Backend technical contribution                              | DEV3 `@gkmraju`                                                                                                      | Contributor nomination only; cannot self-approve authored backend changes |
| Independent security/privacy review and G1                  | LEAD to nominate an independent qualified human; DEV2 only if the relevant independence and competence are confirmed | PENDING; reviewer identity and decision not recorded                      |
| Legal review of applicability, notices, retention and scope | Qualified counsel nominated by LEAD; no counsel identity is asserted                                                 | PENDING; legal items remain NEEDS REVIEW                                  |

Human reviewers must record the exact reviewed content revision, decision, scope, conditions, date and durable evidence link using [STANDARDS_ADOPTION_CHECKLIST.md](STANDARDS_ADOPTION_CHECKLIST.md). Outstanding conditions remain blockers. Until the adoption change explicitly records G0 and the dependent G1 decisions, the authoritative placeholder and V2 stop gate remain unchanged.

## Reference reconciliation proposal (not recovered original numbering)

The original instructions are unavailable. This candidate retains 17 numbered sections and does **not** invent section 18 or assert that its numbering is equivalent to the missing original. The following is an audit mapping proposal for human review, not an automatic rewrite of historical references.

| Historical reference / affected record                                                                                                            | Known subject in the repository                      | Candidate destination for reviewer evaluation                                        | Required disposition                                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| Original section 5: [children safety](../compliance/children-data-safety.md), [ADR 0006](../decisions/0006-children-and-dependents.md) and OQ-002 | Child/dependent legal review                         | Candidate sections 6, 7 and 13                                                       | Reconcile counsel's questions and ADR scope; do not claim verbatim recovery                                                           |
| Original section 6: [ADR 0004](../decisions/0004-ephemeral-location.md)                                                                           | Location non-persistence and storage prohibitions    | Candidate section 7 and the staging-only amendment                                   | Preserve approved provisioning exception without allowing storage use                                                                 |
| Original section 9: [legal register](../compliance/legal-register.md) and OQ-002                                                                  | Applicable law/instrument inventory                  | Candidate sections 6, 11 and 13                                                      | Counsel verifies completeness/applicability; this draft is not a legal-source list                                                    |
| Original section 14: placeholder and historical status reference                                                                                  | Original content not available for comparison        | No equivalence asserted; candidate section 14 independently covers test verification | Owner recovers intended requirement or approves an explicit documented replacement                                                    |
| Original section 18: placeholder and historical status reference                                                                                  | Original content absent; candidate has no section 18 | No invented destination or equivalence                                               | Owner recovers intended requirement or explicitly accepts and documents the unresolved-source limitation and replacement requirements |

The adoption PR must inventory current references, record a disposition for each, and update affected normative documents in its approved scope. Preserve historical status entries as history; prepend a newer timestamped clarification rather than make past approval claims. The archived source and [audit findings](ENGINEERING_STANDARDS_v3_AUDIT.md) remain provenance; corrections in this candidate are not edits to the original upload.
