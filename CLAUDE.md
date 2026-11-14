# CLAUDE.md

Operational summary. The binding rules are in [docs/ENGINEERING_STANDARDS.md](docs/ENGINEERING_STANDARDS.md) (currently a placeholder, OQ-002) and the Kickoff Prompt V1.

## Fast Deployment Protocol (Solo/Rapid Mode)
- Do NOT create feature branches, pull requests, or trigger release-please unless explicitly asked.
- Work directly on the current branch and commit changes locally with clear messages.
- Before deploying, ALWAYS run npm run check to verify lint, typecheck, format, and ADR 0004 security guard tests.
- Deploy directly to Cloudflare from the terminal using npx wrangler deploy (or npx wrangler deploy --env staging if configured).
- 
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
3. **After the first push, never push to `main`.** Work goes through pull requests.
4. **No secrets** in code, logs, docs, commits or fixtures.
5. **Never use `pull_request_target`.** Pin every action to a full commit SHA with the version in a comment.
6. **Never fabricate** a legal citation, effective date, licence term or compliance status. Mark it `NEEDS REVIEW` and add it to `docs/decisions/OPEN_QUESTIONS.md`.
7. **Never claim a test ran** without the command and its actual output.
8. Engineering readiness and legal sign-off are always reported separately. Never certify legal compliance.

## Compliance record schema

`ID | Obligation | Applies? | Authoritative source (URL + date retrieved) | Effective date | Owner | Implementation | Verification method | Evidence ref | Legal review status | Status`. Default status is `NEEDS REVIEW`. `PASS` requires an evidence reference that exists.

## Phase report format

Objective, Files changed, Implementation, Security review, Privacy/DPDP review, Legal/IP review, Testing (commands and actual output), Compliance status, Risks and blockers, Engineering readiness vs legal sign-off, Next step.
