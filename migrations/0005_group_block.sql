-- People the group leader removed (Cloudflare D1 / SQLite). Forward-only. Applied by `wrangler d1 migrations apply`.
-- Expand-only: adds a table the previous Worker never reads. NEEDS REVIEW with 0002 (OQ-026, OQ-027).
--
-- Owner decision 2026-11-23: a group keeps one join code from creation until it ends. Removing a
-- member therefore no longer changes the code; instead the removed person's pseudonym is kept here
-- so the same code cannot bring them back. Deleted with the group; deleted on the person's erasure.
-- Separate each statement with a blank line (the tests apply this file statement by statement).

CREATE TABLE group_block (
  group_id    TEXT NOT NULL REFERENCES group_(id) ON DELETE CASCADE,
  subject_ref TEXT NOT NULL,
  blocked_at  TEXT NOT NULL,
  PRIMARY KEY (group_id, subject_ref)
) STRICT;
