# Engineering Standards v3.0 — PROPOSED

**Project:** Dream-Team-Engineers/pushkara-mitra  
**Date:** 2026-11-03  
**Status:** DRAFT — NOT APPROVED. Owner review required.

> Newly authored proposal transcribed from the uploaded draft, **not** the missing original Master Engineering Instructions v3.0. Do not replace `docs/ENGINEERING_STANDARDS.md` or lift the V2 stop gate until owners approve and reconcile ADRs. Not a compliance certification.

## 1. Scope and precedence
Applies to all source code, documentation, infrastructure, CI/CD, integrations, assets, releases and operations. Applicable law and signed legal advice take precedence; approved ADRs record decisions. Conflicts require documented review; never silently override safety gates.

## 2. Mission and product boundaries
Independent Telugu-first, offline-capable pilgrim assistance PWA for Godavari Pushkaralu 2027. Prominently state that it is not an official government application. V2 excludes live location, groups, missing persons, directory, payments, donations, children/dependents, SMS, push notifications and production launch.

## 3. Repository governance
Trunk-based development; all changes via small PRs; squash merge only; no direct main pushes. Require independent approval for security, privacy, infrastructure and compliance changes. CODEOWNERS must name two active reviewers for critical paths. Require signed commits when team signing is configured; record exceptions. Never weaken branch rules merely to pass CI.

## 4. CI, dependencies and supply chain
Pin GitHub Actions to full commit SHAs; least-privilege workflow permissions; no pull_request_target; do not expose secrets to untrusted PRs. Mandatory lint, typecheck, tests, formatting, SAST, dependency audit, secret scan, license review, SBOM and workflow analysis. Pin runtime/tool versions compatibly; fail on real failures. Document exceptions with owner, expiry and compensating controls.

## 5. Identity, access and authorization
Deny by default. Administrative routes require Cloudflare Access JWT verification (signature, issuer, audience, expiration) and MFA policy. Centralize RBAC authorization; enforce server-side permissions per operation. Sessions require expiry, rotation, revocation, CSRF protections where relevant and secure cookies. Never treat a client role as authority. Log access decisions without secrets or personal location.

## 6. Privacy by design and DPDP
Data minimization and explicit purpose specification; publish clear notices in appropriate languages. Collect optional consent only with an affirmative action; enable withdrawal and rights-handling workflows where applicable. Maintain data inventory, processor register, retention schedule and deletion verification. Verify applicability and effective dates against authoritative sources; counsel must approve legal conclusions. No claim of DPDP compliance without evidence.

## 7. Ephemeral location and child safety
Location must never be persisted or logged, including Durable Object storage, KV, R2, D1, telemetry, analytics, attachments or crash reports. Fail closed if ephemeral controls fail. Do not enable children/dependents features without specific legal review and documented safeguards. Test privacy invariants automatically.

## 8. Application and API security
Validate all inputs with explicit schemas and size limits. Apply authentication, authorization, rate limiting, abuse controls, output encoding, safe error responses, CSP and secure headers. Use parameterized SQL and least-privilege D1 access. Protect against injection, XSS, CSRF, SSRF and replay where applicable. No secrets in source, artifacts, logs or fixtures.

## 9. Data stores, audit and retention
Schema migrations must be versioned, reviewed, reversible where feasible and tested against staging. Admin audit records should be append-only with minimal fields, access controls and defined retention. Consent ledger requires provenance and withdrawal handling. Reconcile backup/time-travel behavior with deletion commitments before personal data processing.

## 10. Offline-first PWA and accessibility
Telugu default with reviewed English/Hindi translations. Self-host licensed fonts; support screen readers, keyboard access, 200% zoom and WCAG 2.2 AA targets. Service worker caches versioned public static assets only; never cache authenticated /api, /admin, secrets or personal data. Provide an honest offline fallback and degraded-network tests.

## 11. Observability, incidents and operations
Structured, scrubbed logs; never include secrets, coordinates, personal identifiers beyond approved minimal operational needs. Define alert ownership, incident severity, rollback, kill switch, restore drills and evidence retention. CERT-In applicability and reporting obligations require verified legal review and a tested incident runbook.

## 12. Cloudflare environments and deployment
Separate preview, staging and production bindings and scoped credentials. Configure secrets only through approved secret stores. A deployment job must fail when required credentials are missing; it must never report a successful deployment after skipping. Smoke-test the actual deployed /healthz and record deployed URL, commit SHA and result. Production requires independent approval and an explicit release decision.

## 13. Legal, intellectual property and branding
Maintain a license register, asset permissions, attribution, trademark review and copyright provenance. Do not use government insignia or imply endorsement. No payment, donation, vendor listing or missing-person launch until counsel approves applicable legal and safety controls. Record sources, dates, owner and evidence for legal claims.

## 14. Testing and security verification
Test unit, integration, worker, browser, offline, accessibility and security behaviors. Include negative tests for admin authorization, rate limits, consent, location non-persistence, and secret handling. Run ZAP baseline and independent review before V2 release. Report exact commands, CI run URLs and results; never claim tests passed without execution evidence.

## 15. Decisions, exceptions and change control
Maintain ADRs, open questions and an evidence index. Every exception needs documented risk, owner, approval and expiry. Block dependent work when mandatory standards, credentials or legal decisions are missing. Do not invent decisions or approval signatures.

## 16. V2 acceptance criteria
Approve this standard; resolve blocking ADRs; establish effective code review and release automation; verify live staging deploy; implement admin auth, sessions, RBAC, rate limits, safe logging, D1 baseline, multilingual PWA and notices; pass all required tests and independent reviews. Release v0.2.0 to staging only with evidence. Engineering readiness and legal sign-off are separate decisions.

## 17. Approval record
Document owner: TBD | Technical reviewer: TBD | Security/privacy reviewer: TBD | Legal reviewer: TBD | Approval date: TBD | Approved repository commit: TBD. Until completed, status remains DRAFT and repository stop gate remains active.
