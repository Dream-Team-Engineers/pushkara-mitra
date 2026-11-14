# CLAUDE.md

**NEVER create feature branches, Pull Requests, or use release-please. Always work directly on the active branch, run `npm run check` locally to enforce all security/ADR tests, and deploy directly via `npx wrangler deploy`.**

Operational summary. The binding rules are in [docs/ENGINEERING_STANDARDS.md](docs/ENGINEERING_STANDARDS.md) (currently a placeholder, OQ-002) and the Kickoff Prompt V1.

## Direct deployment (owner-approved workflow)

The owner allowed a direct Cloudflare deployment workflow on 2026-11-14. Use it only when a task explicitly calls for deployment to a named environment. This is a deployment path, not permission to push to protected `main`, merge a PR, or treat a release as deployed.

1. Identify the exact source commit and destination account/environment. Keep credentials in the local credential store or private prompt.
2. Run `npm ci`, `npm run check`, and `npm run build:web` from that source. The deployment scripts also run the last two checks and build steps before upload.
3. Use `npm run ship:staging` for staging. Use `npm run ship:production` only after the owner explicitly approves that production release and its outstanding legal and operational gates; the production CI workflow remains disabled until separately reviewed.
4. Verify the deployed URL and `/healthz`, then record the source commit, environment, time, result, and rollback route. Do not claim a successful deployment from a passing local command alone.

Owner direction (2026-11-14, supersedes the earlier PR-only wording): work directly on the active branch and push to `main` without PRs. This only succeeds once an admin has disabled the `protect-main` ruleset (see PROJECT_STATUS). Deploy with `npm run ship` (staging) or the explicit `ship:*` scripts, which build the web assets first; a bare `npx wrangler deploy` targets the top-level Worker, not a named environment, and does not build `dist/web`.

## Commands

| Task            | Command                                                             |
| --------------- | ------------------------------------------------------------------- |
| Install         | `npm ci`                                                            |
| All gates       | `npm run check` (lint, typecheck, test, format:check)               |
| Tests           | `npm test` (worker project in workerd, repo-guards project on Node) |
| Coverage        | `npm run test:coverage`                                             |
| Licences / SBOM | `npm run licence-check`, `npm run sbom`                             |
| Local dev       | `npm run dev`                                                       |

## Required check names

`ci-lint`, `ci-typecheck`, `ci-test`, `sast`, `sca`, `secrets-scan`, `licence-check`, `sbom`, `workflow-security`, `pr-checklist`, `pr-title`. Each job's `name:` equals its ID and must match `REQUIRED_CHECKS` in `scripts/setup-github.sh`. Required workflows run on `pull_request` and `merge_group` with no path filters.

## Hard rules

1. **Location is never persisted or logged.** No `ctx.storage`, `state.storage`, `serializeAttachment`, KV or R2 `put` for location, and no coordinate fields in log calls. Guard: `tests/guards/no-location-persistence.test.ts`.
2. **GitHub settings change only through `scripts/setup-github.sh`.** No ad-hoc `gh api` writes.
3. ~~After the first push, never push to `main`.~~ Superseded by the owner's 2026-11-14 direction at the top of this file: no branches or PRs; the safety rules below still apply.
4. **No secrets** in code, logs, docs, commits or fixtures.
5. **Never use `pull_request_target`.** Pin every action to a full commit SHA with the version in a comment.
6. **Never fabricate** a legal citation, effective date, licence term or compliance status. Mark it `NEEDS REVIEW` and add it to `docs/decisions/OPEN_QUESTIONS.md`.
7. **Never claim a test ran** without the command and its actual output.
8. Engineering readiness and legal sign-off are always reported separately. Never certify legal compliance.

## Compliance record schema

`ID | Obligation | Applies? | Authoritative source (URL + date retrieved) | Effective date | Owner | Implementation | Verification method | Evidence ref | Legal review status | Status`. Default status is `NEEDS REVIEW`. `PASS` requires an evidence reference that exists.

## Phase report format

Objective, Files changed, Implementation, Security review, Privacy/DPDP review, Legal/IP review, Testing (commands and actual output), Compliance status, Risks and blockers, Engineering readiness vs legal sign-off, Next step.
