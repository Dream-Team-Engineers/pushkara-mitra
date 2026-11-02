# 0004. Ephemeral location

Status: Proposed (acceptance is an M0 exit criterion)
Date: 2026-11-02

## Context

Real-time group location is the highest-risk feature: stalking, coercion and mass surveillance are real harms. Master Prompt v2 said location is kept in "Durable Object memory only". Standards v3.0 section 6 goes further and also forbids Durable Object storage, WebSocket attachments and hibernation serialisation (reconciliation item C3).

## Decision

1. Location lives only in the memory of a `GroupLocation` Durable Object.
2. We never call `ctx.storage` or `state.storage`, never use `serializeAttachment`, and never write location to KV, R2, D1, logs or error reports.
3. `wrangler.toml` declares the class with `new_classes`, not `new_sqlite_classes`, so no SQLite-backed storage exists for it.
4. `tests/guards/no-location-persistence.test.ts` is a coarse static guard. Behavioural tests arrive in M2.

## Trade-off we are accepting

A hibernating Durable Object can be evicted, which loses in-memory state. That is **privacy-positive** (location disappears) but means clients must reconnect and re-share after eviction. The alternative is a non-hibernating Durable Object, which keeps state in memory but costs more because it bills for duration while connections are open. Choosing between them is deferred to M2 with measurements.

## Consequences

- The UX must show clearly when sharing has dropped and let people resume with one tap.
- No history, replay or "last seen" feature is possible without a new ADR and counsel approval.
- Any exception needs an entry in the reviewed allow-list and CODEOWNER approval.
