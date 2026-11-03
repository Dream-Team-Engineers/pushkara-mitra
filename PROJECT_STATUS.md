# Pushkara Mitra: Status of V1 (as of 2026-11-02)

Repository: `Dream-Team-Engineers/pushkara-mitra` (private, Free org plan). Default branch: `main`.

V1, as defined by the Kickoff Prompt V1, is the repository scaffold only. No product features were in scope.

Engineering readiness and legal sign-off are reported separately. Nothing here is legal advice, and nothing is certified as compliant.

## 1. Summary

| Area                                                    | State                                     |
| ------------------------------------------------------- | ----------------------------------------- |
| Phase 0: read-only preflight                            | Done                                      |
| Phase 1: local scaffold and first push                  | Done, merged to `main`                    |
| First CI run fixes (PR 6)                               | Merged. All 12 PR checks passed           |
| Phase 2: GitHub settings via `scripts/setup-github.sh`  | **Not done**                              |
| Phase 3: project board linking and M0 issues            | **Not done**                              |
| Product features (location, directory, login, payments) | Not started. They belong to M1 to M4      |
| Legal and compliance sign-off                           | Not started. Every item is `NEEDS REVIEW` |

## 2. What was built

### Worker (runs locally, tested)

- `src/index.ts`: Cloudflare Worker. `GET /healthz` returns `{"status":"ok"}` with `Cache-Control: no-store`. Non-GET/HEAD returns 405 with `Allow: GET, HEAD`. Unknown paths return 404. Static files are served from `public/`.
- `src/security/headers.ts`: security headers on every response (CSP with `default-src 'none'` and `frame-ancestors 'none'`, HSTS, `nosniff`, `Referrer-Policy: no-referrer`, a Permissions-Policy that disables geolocation, camera, microphone and payment, COOP and CORP).
- `src/durable-objects/GroupLocation.ts`: stub only. It stores nothing.
- `src/flags.ts`: kill-switch stub that fails closed.
- `public/`: placeholder page (title and one disclaimer line, unstyled), web manifest, service worker. The manifest and service worker have not been tested in a browser.

### Tests and local gates

- 15 tests in 4 files: worker smoke and headers tests (run in workerd), and repo guards on Node.
- Privacy guard `tests/guards/no-location-persistence.test.ts`: a coarse static scan of `src/` for storage calls and coordinate fields in log calls. It is a safety net, not a proof.
- Lint (ESLint 10, strict type-checked), typecheck (TypeScript 6, strict), Prettier, licence check (336 packages) and SBOM all passed locally.
- The dev server was run (`npm run dev`) and these live results were observed: `/` renders the placeholder page, `/healthz` returns 200, POST returns 405, an unknown path returns 404, and the headers above are present.

### CI/CD (`.github/workflows/`, nine workflows)

`ci.yml`, `security.yml`, `supply-chain.yml`, `pr-hygiene.yml`, `preview.yml`, `deploy-staging.yml`, `release.yml`, `deploy-production.yml`, `scorecard.yml`.

- All use `permissions: {}` at top level, actions pinned to full commit SHAs, and `merge_group` triggers. None use `pull_request_target`.
- Required checks (eleven): `ci-lint`, `ci-typecheck`, `ci-test`, `sast`, `sca`, `secrets-scan`, `licence-check`, `sbom`, `workflow-security`, `pr-checklist`, `pr-title`. Names were diffed against `REQUIRED_CHECKS` in `scripts/setup-github.sh` with no mismatch.
- SAST: CodeQL on public repos, Semgrep CE on private ones.
- Secrets scan: gitleaks 8.30.1 with a pinned checksum. Dependency scan: `npm audit` and osv-scanner 2.7.0 with a pinned checksum, run on a production-only lockfile.
- Latest runs on `main`: CI, Security, Supply chain and Deploy staging succeeded. Scorecard was skipped. **Release failed** (see section 4).

### Governance and repo files

- `README.md`, `CLAUDE.md`, `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, `CHANGELOG.md`, `LICENSE` (an "All rights reserved" placeholder).
- `.github/`: `CODEOWNERS` (one owner), PR template, issue templates (feature, bug, compliance, security, IP and licence review), Dependabot config, zizmor config.
- `scripts/setup-github.sh` (the user-supplied file, copied unchanged), `scripts/check-pr-checklist.mjs`, `scripts/licence-check.mjs`.

### Documentation

- `docs/architecture.md`, `docs/i18n.md`, `docs/performance-budget.md`.
- `docs/security/` (5 files), `docs/operations/` (5 files).
- `docs/decisions/`: ADRs 0001 to 0007 and `OPEN_QUESTIONS.md` (OQ-001 to OQ-019).
- `docs/legal/`: licence register, licence exceptions, copyright policy, trademark review, asset permissions, third-party attributions, government disclaimer.
- `docs/compliance/` (13 files): legal register, DPDP checklist, DPIA, data inventory, consent register, CERT-In checklist, payments, donations, e-commerce, children's data safety, accessibility and evidence index. All use the 11-column record schema, and **every status is `NEEDS REVIEW`**.

## 3. Key decisions already recorded

- **Location is never persisted or logged** (ADR 0004): memory only, no Durable Object storage, no WebSocket attachments.
- **No dependents or children features** until counsel answers the questions in `docs/compliance/children-data-safety.md` (ADR 0006).
- **Repo visibility** (ADR 0007): the repo is private on the Free plan, so rulesets, environments and CodeQL are unavailable. Recommendation recorded: make it public. **Not yet decided.**
- Reviewed licence exceptions (dev tooling only, none are runtime dependencies) are in `docs/legal/licence-exceptions.json`, all `NEEDS REVIEW`.

## 4. Open issues

1. **Release workflow fails on `main`.** release-please reports "GitHub Actions is not permitted to create or approve pull requests". A repo setting needs to be turned on. Per `CLAUDE.md` rule 2, GitHub settings change only through `scripts/setup-github.sh`, so this needs a decision on how to apply it. A release-please branch was also created on the remote by that run.
2. **Release PRs and required checks (OQ-009).** PRs opened with the default `GITHUB_TOKEN` do not trigger checks, so release PRs need a separate token.
3. **Phase 2 not run.** Needs `GH_REPO=pushkara-mitra`, `LEAD=amruthamudunuru39`, and the usernames `DEV2` and `DEV3`. Branch protection and environments cannot be enforced on a private Free repo until ADR 0007 is decided.
4. **Phase 3 not run.** M0 issues, milestone, labels and board fields.
5. **Not verified:** osv-scanner and gitleaks were never run locally (they ran in GitHub Actions only). The osv-scanner step skips the scan today because there are zero production dependencies.

## 5. Inputs needed from the owners

- `DEV2` and `DEV3` GitHub usernames.
- `SECURITY_EMAIL` and `GRIEVANCE_EMAIL`.
- The real `docs/ENGINEERING_STANDARDS.md` (v3.0). The current file is a placeholder, and Standards sections 5, 9, 14 and 18 need reconciling against it (OQ-002).
- Decision on ADR 0007 (repo visibility).
- Git identity: the global git identity is `Amrutha-MIG`, while the repo-local one is `amruthamudunuru39` with a noreply email. Choose which to use.
- The V2 kickoff prompt (or Master Prompt v2). It is not in the repo or Downloads. It is only referred to in ADRs 0004 and 0006.

## 6. Engineering readiness vs legal sign-off

- **Engineering readiness:** the V1 scaffold is built, tested locally and green on `main` for CI, Security and Supply chain. Release is red, and Phases 2 and 3 are open.
- **Legal sign-off:** none. No legal citation, effective date or compliance status has been verified by counsel. All items stay `NEEDS REVIEW` until reviewed.

## 7. Next steps

1. Receive the V2 file.
2. Decide how to fix the Release workflow, and the visibility question (ADR 0007).
3. Run Phase 3 (M0 issues). Run Phase 2 after ADR 0007 and the DEV2 and DEV3 usernames are settled.

---

## Daily progress — 2026-11-03 (IST)

**Completed / verified**

- Cloudflare Free staging configured; staging Worker deployed; homepage and `/healthz` (`{"status":"ok"}`) verified live. No production deployment.
- Staging deployment fixes merged in PR #12: SQLite-backed Durable Object namespace for **staging only** (no storage API use permitted), privacy/config guards, reliable Wrangler failure propagation and URL smoke test. CI checks reported passing.
- ADR 0004 staging-only amendment approval recorded via merged PR #13; base ADR's other acceptance criteria remain pending.
- CODEOWNERS updated with LEAD `amruthamudunuru39`, DEV2 `siddhu949`, DEV3 `gkmraju` via merged PR #14.
- GitHub setup script completed a **dry run only**; live Phase 2 setup not executed.
- Dependabot dependency graph, alerts and security updates enabled (user-confirmed); Actions default token read-only with PR creation permission enabled.
- `release-please` rerun succeeded after permission correction; production deploy correctly skipped. Release PR #15 opened **but must not be merged** until release readiness.
- Security and Supply chain workflows green on `main` (user-verified screenshots).

**Open / risks**

- Private GitHub Free: branch ruleset enforcement and native secret scanning/push protection unavailable; CODEOWNERS/CI are not enforced PR gates. Keep manual independent review and CI secret scans.
- GitHub security configuration **partially complete**; live setup script, project board/milestones, and remaining access/2FA checks pending.
- Engineering Standards v3.0 still placeholder; owner approval required before V2 implementation. Legal/DPDP reviews remain `NEEDS REVIEW`.
- Staging SQLite Durable Object migration is effectively irreversible without namespace replacement; preview/production unchanged. No claim of production readiness.

**Next:** Approve engineering standards; reconcile GitHub Free governance risks; complete M0/Phase 2-3 setup safely; begin V2 secure foundation only after prerequisites.

**Daily update rule:** Append a dated IST entry with verified changes, PR links, checks, blockers and next action. Preserve earlier entries; use a reviewed PR rather than direct edits to `main`.

## Audit and fix — 2026-11-03 (IST, later entry)

**Verified (commands run 2026-11-03)**

- `main` at `052bc50`: `CI` and `Deploy staging` runs concluded `failure`; `Security`, `Supply chain` and `Release` concluded `success`. Two Dependabot update runs (`glob`, `minimatch`) also concluded `failure`; cause not yet investigated.
- `prettier --check .` failed on `.release-please-manifest.json` and `PROJECT_STATUS.md` (whitespace only). Fixed in PR #18; `npm run check` passed locally (lint, typecheck, 23 tests, format) and all 12 PR checks passed.
- GitHub release `v1.0.0` exists (published 2026-11-03T17:14:17Z), created by merging release PR #15. Whether it started a production deploy is **not** verified here.
- The `production` environment has no protection rules (no required reviewers).
- PR #17 (Engineering Standards v3.0 proposal) is open and unreviewed.

**Reported by the audit, not independently verified**

- The `v1.0.0` release started a production deploy that stopped only because `npm run check` failed. Check the production Worker and workflow runs before relying on this.
- All recent PRs (#9 to #16) merged without approvals.
- Dependabot alerts and code scanning are not viewable; `license-checker` needs Node 24 or later while the repo pins Node 22.

**Open / risks**

- Releases are not gated: a release can reach the production deploy job with no approval. Reset to 0.x and decouple release from production deploy (owner: LEAD).
- Staging deploy and Dependabot runs failing on `main` need investigation.
- No branch protection on private GitHub Free; independent review is manual.
- Legal/DPDP rows remain `NEEDS REVIEW`; engineering readiness and legal sign-off are reported separately. No production-readiness claim.

**Next:** merge PR #18 after independent review; stop releases deploying production; decide ADR 0007; review PR #17; run `setup-github.sh` dry run first.
