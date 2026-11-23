-- Group name (Cloudflare D1 / SQLite). Forward-only. Applied by `wrangler d1 migrations apply`.
-- Expand-only: adds a nullable column the previous Worker never reads. NEEDS REVIEW with 0002 (OQ-026, OQ-027).
--
-- Owner decision 2026-11-23: the group leader types a short name for the group, shown to its members.
-- At most 16 characters, letters and digits (any script) and single spaces only, checked by the Worker.
-- Data inventory DI-17. Deleted with the group; cleared when the leader erases their account.
-- Separate each statement with a blank line (the tests apply this file statement by statement).

ALTER TABLE group_ ADD COLUMN name TEXT CHECK (name IS NULL OR length(name) BETWEEN 1 AND 16);
