# 0013. Database: Supabase Postgres via Hyperdrive, Drizzle ORM — owner-stated direction

Status: **PROPOSED — owner direction recorded 2026-11-15 (chat); formal approval, security review and counsel input PENDING.** Creates no database, binding, migration or processing purpose. Engineering analysis only; legal and privacy conclusions stay with counsel (OQ-024).

Related: [ADR 0004](0004-ephemeral-location.md), [0005](0005-log-residency-and-minimisation.md), [0008](0008-user-authentication.md), [0012](0012-backend-architecture-and-d1.md), [0014](0014-auth-clerk-anonymous-first.md).

## Context

ADR 0012 recommended D1 (its option A) and said to re-open option B (external managed Postgres in an Indian region via Hyperdrive) if residency, or write scale, requires it. D1 has no India location hint (OQ-026) and Time Travel restores in place (OQ-027). The owner has chosen Supabase Postgres and Drizzle ORM.

## Decision (proposed)

1. **System of record for stored data is Supabase Postgres**, reached from the Worker through **Cloudflare Hyperdrive**. D1 is not used for personal data. It may remain only for nothing at all; no D1 database is created by this ADR.
2. **Drizzle ORM** defines the schema in TypeScript and generates forward-only SQL migrations, committed to the repo. Drizzle migrations are applied by the ship script to staging after `npm run check` passes.
3. **Project region must be India (Mumbai) if available.** Whether Supabase offers it on our plan, and its contractual terms, are NOT VERIFIED and are tracked as OQ-029.
4. **Location is never stored in Postgres** (ADR 0004, CLAUDE.md rule 1). No coordinate column may exist. A schema guard test must fail the build if a column name matches a location pattern.
5. The Worker talks to the database only through a repository module. Routes never contain SQL.
6. Access: Worker connects with a least-privilege role (no superuser, no DDL at runtime). Migrations use a separate role held only by the deploy process. Row-level security is enabled as defence in depth, with deny-by-default policies. Authorisation remains enforced in the Worker.
7. Four environments (development, preview, staging, production) each get a separate Supabase project and credentials. No production secret in preview.
8. Backups, point-in-time recovery and their retention differ from D1 Time Travel. They must still be reconciled with deletion commitments (OQ-027 applies in spirit). Crypto-shredding and post-restore erasure replay stay proposals.

## Consequences

- Stronger transactions, relational integrity and mature tooling than D1; a second vendor and data processor agreement; Postgres credentials become a network-reachable secret; an extra network hop per query (Hyperdrive pooling mitigates).
- Reverses ADR 0012 section 3 recommendation. ADR 0012 should be marked superseded once this ADR is accepted.

## Not verified (do not rely on until checked against official pages)

Supabase region availability and plan limits, Hyperdrive supported-provider details and limits, connection-pool behaviour under festival load. Load test required before any scalability claim.
