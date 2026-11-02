# 0002. Trunk-based delivery

Status: Accepted (adopted by Kickoff Prompt V1)
Date: 2026-11-02

## Context

A small team must ship safely against a fixed, immovable event date.

## Decision

- Short-lived branches (`feat/`, `fix/`, `chore/`, `docs/`, `sec/`), squash-merged to `main` through pull requests under 400 lines.
- `main` is protected: linear history, one code-owner approval, all required checks, resolved threads, signed commits.
- Every merge to `main` deploys to staging. A release PR from release-please deploys to production.
- Required check names are tool-agnostic (`ci-lint`, `sast`, and so on) so swapping a tool never breaks the ruleset.
- Required workflows run on `pull_request` and `merge_group` with no path filters, so the merge queue never waits forever.

## Consequences

- Rulesets need a public repository or a paid plan ([ADR 0007](0007-repo-visibility-and-plan.md)).
- The first push to `main` is the only direct push. Everything after goes through pull requests.
- release-please PRs created by `GITHUB_TOKEN` do not trigger required checks. See OQ-009.
