# Repository audit and final-delivery readiness

**Audit snapshot:** main `cc26ee271e7b961bcd90900c0e8a043774cde406`, 2026-11-04 (IST). Prepared by DEV3 coordinator with independent release_review, delivery_plan and qa_governance agents. Proposed architecture and open PRs are not counted as implemented. No merge, production deployment, paid setting or location handling was performed during this audit.

> **Update after snapshot (2026-11-05):** this audit describes main `cc26ee2` and is kept as written. Since then: PRs #35 and #36 were merged; PR #41 paused automatic PR preview uploads (preview credentials are no longer exposed to PR code); PR #34 was closed as superseded by #41. The static-asset header bypass (issue #38) is addressed only in open, unmerged PR #42 and is **not** fixed on main. Re-verify the table below against current main before relying on it.

## Outcome

**Ready for scaffold development; not ready for feature UAT or final delivery.** Main CI, security/supply checks and staging health pass, but none of the eight original product areas has an implemented-and-tested end-to-end user journey. There is no meaningful percentage to assign to a project whose real screens, auth/data contracts and integrations are absent.

Recommended target: [one modular Worker + original mobile PWA](architecture.md), with the [original product blueprint](proposals/PRODUCT_BLUEPRINT.md). The benchmark is functional research only; the user explicitly prohibited copying its code, imagery, icons, colors and text. No permission-to-reuse question remains on this chosen original-implementation path.

## What is actually present versus required

| Capability                      | Verified on main                                                        | Missing to satisfy delivery                                                                                                                        |
| ------------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public Worker                   | `/healthz`, GET/HEAD dispatch and asset fallback                        | Typed public/user/staff API dispatch, body/error/rate controls and real route integration tests                                                    |
| Security headers                | Worker responses have wrapper headers; imported-handler unit tests pass | Actual static assets bypass middleware; issue #38 is first remediation                                                                             |
| Original mobile UI              | One heading/disclaimer page                                             | Original design system, navigation, all product screens/states, reviewed te/en/hi/mr catalogs, browser/device evidence                             |
| PWA/offline                     | Linked minimal manifest; unregistered install/activate-only SW file     | Icons, registration, install/update tests, explicit static cache allow-list and offline UI; no private cache                                       |
| Pilgrim/staff identity          | No implementation                                                       | Google and separate Access verification, sessions, CSRF, role assignment/revocation and resource ownership tests                                   |
| Data APIs                       | Empty migration file exists; no D1/R2 binding                           | Reviewed minimal schemas/retention, local D1 tests, transaction/idempotency, restore/erasure contracts; media separately gated                     |
| Consent and audit               | Documents only                                                          | Approved purpose/notice/lifecycle and minimal event contracts, real enforcement and failure tests                                                  |
| Groups/location                 | DO class returns 501; flags off                                         | Approved bounded ephemeral protocol, membership/consent, expiry/replay/fan-out/disconnect and SOS/operator behavior; no persisted positions        |
| Help/moderation/media           | No runtime feature                                                      | Qualified operators, redaction, private quarantine/scanning/moderation, contact/child-safety and lifecycle evidence before exposure                |
| Public information/integrations | No feature API or provider                                              | Verified Godavari sources, published DTOs, provider quotas/timeouts, honest stale/unavailable states; no invented event/medical facts              |
| Product quality                 | Smoke, header and static-guard tests                                    | Browser/mobile/offline/accessibility/feature/security integration, original screenshots, independent native-language and UAT review                |
| Capacity/operations             | Proposed budgets and draft runbooks                                     | Enforced bundle/query budgets, synthetic load/fan-out, quota headroom, alert ownership, recovery/revocation/withdrawal drills and measured RTO/RPO |
| Release control                 | Production callable job fails; release metadata is separate             | Keep stop gate; actual independent reviews and exact standards/contract decisions still required; launch separately authorized                     |

## Reproduced findings and priorities

| Priority                        | Finding and evidence                                                                                                                                                                                                                                                                                                    | Required next acceptance                                                                                                                                                                           |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1 — before app/private routes  | **Assets-first bypass observed.** Local Wrangler main: `/`, `/sw.js`, `/manifest.webmanifest` 200 and `/index.html` 307 lack CSP/HSTS/nosniff/referrer/permissions headers; `/healthz` has them. `POST /` lacks Worker headers/Allow, while `POST /healthz` has both. Existing header tests call Worker with empty env. | Issue #38: reviewed Worker-first policy for each environment, actual asset/API/admin/method integration tests and no fallback recursion. No private-data leak established in the current scaffold. |
| P1 — deployment evidence        | At snapshot time main preview could return green without credentials/URL or hide a pipeline failure (since superseded: PR #41 paused uploads).                                                                                                                                                                          | PR #34 proposed outcome handling but was closed as superseded by #41. Any future re-enablement needs a reviewed credential-isolation design and must report NOT DEPLOYED honestly.                 |
| P1 — guard reliability          | Main comment stripping can let comment-looking strings hide forbidden code.                                                                                                                                                                                                                                             | PR #36 fixes actual comment recognition; regression/independent assertions pass. Guard remains coarse rather than full data-flow proof.                                                            |
| P1 — release regression defense | Main production stop gate is active, but original regex checks miss differently named/inline deployment changes.                                                                                                                                                                                                        | PR #35 strengthens invariants with 13 hostile mutations; workflows themselves unchanged.                                                                                                           |
| Before auth/data exposure       | Auth, sessions, permissions, ownership, cache/abuse/input limits and data contracts do not exist.                                                                                                                                                                                                                       | Implement and independently verify approved G0/G1 contracts before exposing protected operations or collecting personal data.                                                                      |
| Before operational claims       | No feature flow, load/capacity, full offline, restore or human safety/UAT evidence.                                                                                                                                                                                                                                     | Verify each relevant journey and operational failure mode; do not substitute `/healthz` or green scaffold CI.                                                                                      |
| Known development-tool risk     | Two base advisories produce 27 moderate tree entries; production dependencies clean. Known licence-checker Node≥24 declaration conflicts with project Node22 despite baseline passing.                                                                                                                                  | Track issue #23; compatible upstream fix or reviewed migration. No forced upgrades, dismissals, version resets or risk-waiver claim.                                                               |
| Later SCA accuracy              | Production-only OSV workflow re-resolves rather than deriving the shipped locked tree; informational audit masks tool/network errors as advisories. No runtime dependencies today, so no active missed production dependency established.                                                                               | Separate fixtures for frozen production inventory and scanner errors before runtime dependencies are introduced.                                                                                   |

## Local remedy experiment — evidence, not a deployed fix

QA kept a byte-identical frozen main snapshot and a separate experimental configuration. Adding `run_worker_first=true` to the isolated asset tables restored all five header families across ten actual local HTTP request cases across eight distinct paths, including redirects, unknown/API/admin paths and POST cases. Both POST cases returned 405 with `Allow: GET, HEAD`; assets returned promptly with no recursion. Both owned local servers were stopped.

Evidence retained for this session: `/tmp/dev3-architecture-headers.json` and `/tmp/dev3-architecture-remedy-headers.json`. These temporary files are not promised durable repository artifacts. The implementation PR must include a reproducible automated test/evidence path. Nothing here proves the current deployed assets have been fixed.

## Executed checks on frozen main

| Command / check                           | Actual outcome                                                                        |
| ----------------------------------------- | ------------------------------------------------------------------------------------- |
| `npm ci`                                  | Passed; 445 packages, known engine warning above                                      |
| `npm run check`                           | Lint/typecheck/format passed; **26 tests in 6 files passed**                          |
| `npm run test:coverage`                   | 26 passed; statements/lines 78.94% (15/19), branches 87.5% (7/8), functions 50% (3/6) |
| `npm run licence-check`                   | 405 packages passed with existing reviewed exceptions                                 |
| `npm run sbom`                            | Generated                                                                             |
| `npm audit --omit=dev --audit-level=high` | Zero vulnerabilities                                                                  |
| Full `npm audit --audit-level=high`       | 27 moderate tree entries, no high/critical; not an all-dependency clean claim         |
| Explicit-path actionlint / offline zizmor | Passed / no findings                                                                  |
| Gitleaks main history                     | 40 commits scanned, no leaks                                                          |
| Actual local asset/Worker requests        | Defect reproduced; separate local remedy passed ten cases                             |

QA verified zero tracked-source differences from the frozen main baseline. These tests do not prove product auth/data flows, browser accessibility, capacity or legal compliance. The earlier combined 48-test stabilization snapshot is separate evidence for PRs #34–36 together, not a test count on main or this documentation branch.

## GitHub delivery state

At audit time PRs #34–#37 were open/draft with no submitted human reviews. #34 has failing preview (missing configuration now surfaced) and checklist; #35–#37 have failing checklist for pending human review. Technical checks otherwise reported success; inconsistent intermediate job/check metadata must not be silently treated as completed. A green legacy preview check is not proof of a deployed preview.

Main workflow evidence on this snapshot:

- [CI](https://github.com/Dream-Team-Engineers/pushkara-mitra/actions/runs/41854260512), [Security](https://github.com/Dream-Team-Engineers/pushkara-mitra/actions/runs/41854260764), [Supply chain](https://github.com/Dream-Team-Engineers/pushkara-mitra/actions/runs/41854260537), [Release](https://github.com/Dream-Team-Engineers/pushkara-mitra/actions/runs/41854260870): success.
- [Staging](https://github.com/Dream-Team-Engineers/pushkara-mitra/actions/runs/41854260473): deployment and deployed-URL health succeeded; full feature staging/UAT not demonstrated.
- Scorecard skipped. The release workflow has only release-please; production remains blocked. No automatic production reinstatement is proposed.

## Decision and delivery gates

| Gate                               | Current disposition                                                        | Evidence needed / accountable owner                                                                                                                                    |
| ---------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G0 standards/governance            | Placeholder remains; corrected candidate/checklist in PR #37 are proposals | LEAD and qualified independent humans record exact normative revision, reconciliation/ADR 0007 and scope disposition; merging a proposal is not approval metadata      |
| Architecture/build                 | This is the concrete recommendation, not a repository refactor             | LEAD/DEV2/DEV3 review the module/import/build/runtime boundaries; first slice proves them                                                                              |
| G1 identity/privacy/data           | Google/Access and minimal D1 contracts proposed, not operational           | Identity/security/privacy owners record roles, lifetimes, assignment/revocation, notice/purpose, retention/restore, audit failure and provider configuration decisions |
| G2 safety/directory/children/media | No activation authorized by architecture                                   | Qualified safety/privacy/legal owners and real operators approve applicable safeguards and procedures                                                                  |
| G3 payment/provider                | No operational checkout proven by benchmark, no authorization inferred     | Separate approved scope/provider/legal/budget decisions if added                                                                                                       |
| G4 production/spend/access         | Production blocked; no agent authority                                     | Explicit authorized human process; no paid settings, store launch or production deploy bundled here                                                                    |

## Next buildable step and proof of progress

1. **Security remediation PR:** issue #38, Worker-first headers/dispatch and real asset integration tests. This stabilizes the boundary without collecting personal data or moving the repo into a new architecture prematurely.
2. **Original public-shell slice after actual scope/standards disposition:** original mobile navigation/tokens, reviewed language infrastructure, manifest/icons/SW registration and safe static offline fallback. Prove mobile/keyboard/zoom/cache exclusion in a real browser. No sign-in or personal data needed for this first visible UI slice.
3. **First complete business slice after G1:** authorized staff publishes one source-reviewed event via approved local D1/API → anonymous Telugu-first schedule reads a published DTO. Include denial/ownership/validation/SQL, empty/loading/error and real asset/API tests. Start synthetic, then approved real content.
4. **Full original workflows:** deliver all blueprint/acceptance items in dependency-aligned PRs, keeping blocked rows visible. Add actual provider/operator, browser/offline/security/load/recovery/UAT evidence before marking a flow complete.

A final delivery decision requires the accepted journeys to work, independent human/security review, operations and reviewed content, and explicit legal/launch dispositions. No final date or percentage is defensible from current scaffold evidence. The next milestone is a working tested slice, not “full app complete.”
