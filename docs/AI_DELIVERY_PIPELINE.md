# Supervised AI delivery pipeline — proposal (2026-11-04)

**Status:** proposed; not an authorization to launch production or enable high-risk features. Target: staging prototype by 2026-11-10; completion is not guaranteed.

## Six isolated roles.

1. **Orchestrator/architect (LEAD):** maintain issue dependency graph, scope, interfaces and daily integration; never self-approve.
2. **Frontend agent (DEV2):** Telugu-first accessible PWA, multilingual UI, offline static assets; no API/personal-data caching.
3. **Backend agent (DEV3):** Workers APIs, D1, sessions/RBAC, input validation; never store or log location.
4. **Feature agent (DEV2):** groups, directory, lost-and-found and guarded prototypes; no public missing-person exposure.
5. **Security/privacy reviewer (independent):** threat models, secret/dependency scans, tests, privacy data-flow review; cannot provide legal sign-off.
6. **QA/DevOps reviewer (independent):** integration/E2E, staging smoke tests, accessibility, performance, CI and release safety.

## Execution contract

- Each agent uses a separate worktree/branch and narrowly scoped GitHub issue. No shared credentials, direct main writes, self-merges, production secrets or paid actions.
- Open small PRs with issue, owner, risk level, tests, screenshots/logs, rollback and privacy impact. No untrusted PR code with deployment secrets.
- CI must pass lint, typecheck, unit/coverage, format, dependency/license/secret scans, security guards and smoke tests. Staging deploy only from reviewed main with scoped staging credentials; staging /healthz alone does not validate functionality.
- **Manual human approval gates:** (G0) standards v3.0/ADR 0007/scope; (G1) auth, privacy, retention and location threat model; (G2) child safety, missing-person moderation, real-world contact and public directory; (G3) payment/donation legal/payment-provider authorization; (G4) production release, DNS, spending, access/permissions changes.
- AI legal agent may prepare evidence and questions; only qualified counsel/authorized owner may approve legal matters. AI security reviewer must be separate from code author, with human review for high-risk changes.
- GitHub private Free does not enforce required reviews or rulesets: LEAD must manually verify approvals/checks before merge. CODEOWNERS alone is not enforcement.
- No automatic merges, production deployment, location persistence, live payments or public child/missing-person reports.
- Keep issue and PR status truthful: **UNKNOWN** if not verified; never mark a gate passed based only on CI.

## Daily cadence (IST)

09:00 assign 4 parallel tasks; 13:00 integration checkpoint; 18:00 security/QA evidence; 19:00 status PR and next-day blockers. Agent orchestration requires a persistent external runner (Codex/Claude Code or similar); GitHub Actions alone does not create autonomous coding agents. Start runner only after owner configures credentials, usage caps and approval controls.

## 7-day delivery sequence

Nov 4: CI/release safety and approvals. Nov 5: auth and PWA shell. Nov 6: consent-based group/location prototype. Nov 7: directory and safety features behind disabled flags. Nov 8: moderated listings and payment sandbox only. Nov 9: integration/security/QA. Nov 10: staging UAT, audit and handover. Anything failing gates remains disabled, even if implemented.

## Definition of done

PR merged after independent review, tests green, privacy/security evidence recorded, staging smoke and E2E tests passing, rollback documented; legal and production approvals separately recorded. No claim of full compliance from automated scans.
