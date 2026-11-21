# Backend gap analysis and build record

Status: **PROPOSED, not approved.** Prepared 2026-11-21. Engineering readiness only; no legal sign-off, no counsel review (OQ-024). Stack follows the owner's "Pushkara Mitra Tech Stack Overview" sheet (D1 with Drizzle, Hono and zod planned, R2 with PMTiles, Access for staff). ADR 0013 (Supabase) is a different proposal and is not followed here; the owner should record which one stands.

## Where each item stands

| Item                                             | State after this change                                                                                                           | Still needed before it can be switched on                                                                                             |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Kill switches                                    | **Built.** `src/flags.ts` reads `FLAG_*` Worker variables; only the exact value `enabled` turns one on                            | Set per environment by the owner                                                                                                      |
| Real database                                    | **Built (code + migration, tested).** `migrations/0002_backend_core.sql`, `src/db/repository.ts`, D1 binding `DB`                 | Owner creates a D1 database per environment, adds the `[[d1_databases]]` binding, runs `wrangler d1 migrations apply`. OQ-026, OQ-027 |
| Server-side sign-in revocation                   | **Built.** Cookie carries a session id; the server keeps a hashed row; sign-out and erasure revoke it; no row means not signed in | Same D1 binding. Without `DB` the old stateless cookie still works                                                                    |
| Consent ledger, erase-my-data                    | **Built.** Append-only (trigger), `GET/POST /api/v1/me/consents`, `DELETE /api/v1/me`                                             | Counsel: whether erasure may delete consent evidence (OQ-024, OQ-030); notice text                                                    |
| Group (metadata, invite codes, membership)       | **Built behind `FLAG_GROUPS`.** Create, join by code, list, invite (owner only), leave                                            | Live location is **not** built: `GroupLocation` stays a 501 stub (ADR 0004, OQ-035)                                                   |
| SOS intake                                       | **Built behind `FLAG_SOS`.** No sign-in, no coordinates, no free text, idempotent, rate limited, replies only `received`          | Staff alert, SMS and staff console are **not** built (provider undecided; OQ-035). The page must not say "confirmed" from this reply  |
| Pilgrim Pass                                     | **Not built.** Docs say no field list until the Pass contract and notice exist                                                    | Pass contract, notice, data-inventory rows                                                                                            |
| Missing-person listings                          | **Deliberately not built.** ADR 0006 blocks it for every actor; no table proposed                                                 | Dedicated review and counsel                                                                                                          |
| Donations and payments                           | **Not built.** Blocked on the payments and donations legal review; no payment tables                                              | Legal review, Razorpay onboarding                                                                                                     |
| Photo upload                                     | **Not built.** No contract, storage or moderation design exists in the docs                                                       | Design, moderation and child-safety review                                                                                            |
| Published-information feed from official sources | **Not built.** Needs the staff workflow (Access JWT, roles, four-eyes) first; contracts exist in `docs/contracts/`                | RBAC decisions (BF-02, BF-03, BF-05), staff console                                                                                   |
| Hono, zod, Drizzle                               | **Not adopted yet.** Routes use the existing hand-written router and plain parameterised SQL                                      | Owner approval of the new dependencies and a `budget:web` check (ADR 0016)                                                            |

## Owner steps (not done by this change)

1. Create a D1 database for staging, then add to `wrangler.toml` under `[env.staging]` a `[[env.staging.d1_databases]]` entry with binding `DB`, its name and id.
2. Apply the migration to that database. Nothing exists remotely yet.
3. Set `SESSION_SECRET` (already needed) and, only when ready to test, `FLAG_GROUPS` or `FLAG_SOS` to `enabled` on staging.
4. Record the D1 versus Supabase decision as an ADR and tell counsel which one holds personal data.

## Privacy checks that are in code

- No table has a coordinate, name, email, phone or free-text column; a test inspects the live schema.
- Session ids, join codes and SOS request ids are stored only as SHA-256 hashes.
- Unknown paths answer 404 before any flag, limiter or database is consulted. A missing database answers 503, never "received".
