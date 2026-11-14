# 0007. Repository visibility and GitHub plan

Status: **Owner selected public and sole-maintainer operation for now; protection provisioning and verification PENDING.**
Date: 2026-11-02

## Owner update — sole maintainer, 2026-11-14 (IST)

The requesting owner says `gkmraju` is now the sole available maintainer; the former LEAD and DEV2 moved to another project. This supersedes the independent-PR-review requirement for ordinary development while the team has one maintainer. The owner may still request outside review voluntarily. Do not claim an independent review occurred when it did not.

The intended public-repository ruleset requires a pull request, strict current required checks, resolved review threads, linear history, signed commits and no bypass, force pushes or deletion. It requires **zero approving reviews** and no code-owner or last-push approval, so `gkmraju` can merge a fully checked PR alone. [GitHub documents zero-approval PR rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets). A checked PR-body item is an owner attestation; GitHub's required checks are the enforceable gate. `CODEOWNERS` identifies `gkmraju` for ownership but does not require an impossible self-review. The production environment names `gkmraju` as its sole reviewer with self-review allowed; the production workflow remains fail-closed until a separate launch decision and implementation. Preview bootstrap remains manual, owner-dispatched, pinned to the exact merged main PR and subject to preflight and local checks.

Apply the updated `scripts/setup-github.sh` only after its code is on `main`, then read back effective rules and environment settings. The public-visibility decision remains in effect; reconsider privacy after project completion. Historical selections and review requirements below describe earlier states, not this current operating choice. Legal, privacy, content and production-launch decisions remain separate gates.

## Owner update — 2026-11-14 (IST)

The requesting owner explicitly selected **keep this repository public for now** and may reconsider private visibility after project completion. This supersedes the 5 Nov private selection below. The future private decision is open; do not change visibility without a new owner instruction. Public visibility does not itself enforce independent review or required checks.

Use the public-repository path of `scripts/setup-github.sh` after review, then read back effective `main` and release-tag rules, required checks, merge settings and deployment-environment controls. Keep merges requiring independent review until enforcement is verified. The historical private-plan analysis below records the previous decision context; it is not the current operating choice.

## Superseded owner selection — 2026-11-05 (IST)

The requesting user, identifying as LEAD, selected: **keep private; the owner will arrange a plan that supports enforced protections.** This choice supersedes the earlier public-first recommendation as a selection; it does not claim a purchased plan, enabled control or final independent approval. Do not make the source public or purchase a plan on the owner's behalf.

Before marking this ADR implemented, independently review the selected controls and read back their actual state: protected main/default branch; independent human/code-owner approval; no self-approval; stale-review dismissal and current final-head approval; resolved review threads; all required current checks; no unauthorized bypass, force pushes or branch deletion; signed commits and protected release tags as applicable. Re-verify capabilities for the actual selected plan; the historical matrix below is not authoritative proof of current capabilities.

Settings changes remain restricted to the reviewed setup script after plan availability and human approval. Existing production and preview credential stop gates remain. If required controls cannot be read or are unsupported, report BLOCKED/UNKNOWN and keep dependent merges blocked rather than silently substituting manual enforcement. No temporary manual bypass has been approved by the requesting user.

## Context

The `Dream-Team-Engineers` organisation is on the **Free** plan. On Free, rulesets, environments with required reviewers, code scanning and dependency review are available only for **public** repositories. `scripts/setup-github.sh` depends on rulesets and environments.

Interim state: the repository was created **private**, because a private repository can be made public later but a public one cannot be un-exposed. Until this ADR is decided, `main` has no enforced protection.

## Capability matrix (Free plan; from published limits, not yet tested against this repository)

| Capability                          | Public | Private                                |
| ----------------------------------- | ------ | -------------------------------------- |
| Rulesets on `main` and tags         | Yes    | No                                     |
| Environments and secrets            | Yes    | No                                     |
| Required reviewers on `production`  | Yes    | No                                     |
| Code scanning (CodeQL)              | Yes    | No (workflow falls back to Semgrep CE) |
| Dependency review                   | Yes    | No                                     |
| Secret scanning and push protection | Yes    | No                                     |

## Options

- **A. Public repository, "All rights reserved".** Every control is free. Source is visible, though secrets were never meant to be in it. Needs counsel's view on IP exposure.
- **B. Private repository on GitHub Team.** Rulesets and environments work. Production approval needs a compensating control, for example a release PR that needs CODEOWNER approval plus a `workflow_dispatch` deploy restricted to LEAD and DEV2.
- **C. Private repository on GitHub Enterprise or Code Security.** Every control is native. Highest cost.

## Recommendation

**Option A**, subject to counsel's IP view, because it is the only option where every control works at no cost. If counsel objects, choose B.

## Consequences

Whichever option is chosen, run `scripts/setup-github.sh` (dry run first). If B is chosen, implement the compensating control in `deploy-production.yml` instead of relying on environment reviewers.
