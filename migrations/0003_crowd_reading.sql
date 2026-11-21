-- Crowd level per ghat (Cloudflare D1 / SQLite). Forward-only. Applied by `wrangler d1 migrations apply`.
-- Expand-only: adds a table, changes nothing the previous Worker reads. NEEDS REVIEW with 0002 (OQ-026, OQ-027).
--
-- One row per ghat holding only the LATEST reported level. No history, no coordinates, no person,
-- no free text, no device or reporter identifier. A reading is trusted only while it is recent; the
-- Worker reports "noData" for an older one (the app must never show a stale level as current).
-- Separate each statement with a blank line (the tests apply this file statement by statement).

CREATE TABLE crowd_reading (
  ghat_id     TEXT NOT NULL PRIMARY KEY CHECK (length(ghat_id) BETWEEN 1 AND 64),
  level       TEXT NOT NULL CHECK (level IN ('low','moderate','high')),
  reported_at TEXT NOT NULL
) STRICT;
