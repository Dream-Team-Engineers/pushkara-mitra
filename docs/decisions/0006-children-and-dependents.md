# 0006. Children and dependents

Status: **Proposed. Implementation is blocked until counsel approves at the M0 gate.**
Date: 2026-11-02

## Context

Master Prompt v2 treated adult-managed dependents as decided and put registration with dependents in M1. Standards v3.0 section 5 requires legal review of child workflows before implementation (reconciliation item C2).

## Proposal (not a decision)

Adults register only themselves. A feature that lets an adult add or manage a child or dependent is not built until counsel answers the questions in [children-data-safety](../compliance/children-data-safety.md). M1 no longer includes dependents.

## Consequences

- No child-related schema, UI or API exists until this ADR is Accepted.
- Missing-child workflows are blocked by the same gate ([DPIA](../compliance/dpia.md) 3.2 and 3.3).
- Label `children` marks work that needs counsel review.
