# 0004. Ephemeral location

Status: Proposed (base ADR; Amendment 1 approved for staging only on 2026-11-03)
Date: 2026-11-02

## Context

Real-time group location is the highest-risk feature: stalking, coercion and mass surveillance are real harms. Master Prompt v2 said location is kept in "Durable Object memory only". Standards v3.0 section 6 goes further and also forbids Durable Object storage, WebSocket attachments and hibernation serialisation (reconciliation item C3).

## Decision

1. Location lives only in the memory of a `GroupLocation` Durable Object.
2. We never call `ctx.storage` or `state.storage`, never use `serializeAttachment`, and never write location to KV, R2, D1, logs or error reports.
3. `wrangler.toml` declares the class with `new_classes`, not `new_sqlite_classes`, so no SQLite-backed storage exists for it. _Superseded for staging by Amendment 1._
4. `tests/guards/no-location-persistence.test.ts` is a coarse static guard. Behavioural tests arrive in M2.

## Trade-off we are accepting

A hibernating Durable Object can be evicted, which loses in-memory state. That is **privacy-positive** (location disappears) but means clients must reconnect and re-share after eviction. The alternative is a non-hibernating Durable Object, which keeps state in memory but costs more because it bills for duration while connections are open. Choosing between them is deferred to M2 with measurements.

## Consequences

- The UX must show clearly when sharing has dropped and let people resume with one tap.
- No history, replay or "last seen" feature is possible without a new ADR and counsel approval.
- Any exception needs an entry in the reviewed allow-list and CODEOWNER approval.

## Amendment 1: SQLite-backed class on Workers Free (2026-11-03)

Status: **Approved for staging only** through merge of [PR #12](https://github.com/Dream-Team-Engineers/pushkara-mitra/pull/12) on 2026-11-03 (merge commit `2bca94161311715ecf7d6a8c9b322d2e40339de8`). This approval does not authorize preview or production changes, nor approval of the base ADR's other pending M0 criteria.

### Context

The staging deploy failed with Cloudflare error 10097: "In order to use Durable Objects with a free plan, you must create a namespace using a `new_sqlite_classes` migration." Cloudflare's documentation (retrieved 2026-11-03) states:

- [Durable Objects pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/): "Workers Free plan: Only Durable Objects with SQLite storage backend are available." It also notes that an empty SQLite database consumes about 12 KB of storage.
- [Durable Objects migrations](https://developers.cloudflare.com/durable-objects/reference/durable-objects-migrations/): the storage backend is fixed once a namespace is provisioned. Changing it means deleting and re-provisioning the namespace.

### Decision (replaces item 3)

1. **Staging** declares `GroupLocation` with `new_sqlite_classes`. **Preview and production** keep `new_classes` until each environment's Cloudflare plan is decided (OQ-020).
2. **A provisioned SQLite store is allowed; using it is forbidden.** Item 2 is unchanged and now explicitly covers the SQLite backend: no `ctx.storage` of any kind (including `storage.sql`, `sql.exec`, `storage.kv` and `setAlarm`), no `serializeAttachment` or `deserializeAttachment`, no state persisted for hibernation, no coordinates in logs, and no location history.
3. Location still lives only in Durable Object memory. Nothing else in this ADR changes.

### Guards

- `tests/guards/scan.ts` also flags SQL access, the KV storage API, alarms and attachment deserialisation.
- `tests/guards/wrangler-config.test.ts` checks that `GroupLocation` is the only Durable Object class in every environment, and that only staging uses `new_sqlite_classes`. Any other change fails the test and needs a new amendment.

### Consequences

- Cloudflare keeps a small empty SQLite database for each staging object. It holds no location because nothing writes to it.
- The staging backend cannot be switched back without deleting the namespace. Staging holds no data, so this is acceptable.
- At M10, the class is removed with a `deleted_classes` migration (docs/operations/post-event-deletion.md).
- If production also moves to the Free plan, or to SQLite on Paid, that needs a further amendment with owner approval before its first deploy.
