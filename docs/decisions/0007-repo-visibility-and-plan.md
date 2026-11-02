# 0007. Repository visibility and GitHub plan

Status: **Proposed. The owners decide.**
Date: 2026-11-02

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
