-- App-open and install counters (Cloudflare D1 / SQLite). Forward-only. Applied by `wrangler d1 migrations apply`.
-- Expand-only: adds a table the previous Worker never reads. NEEDS REVIEW with 0002 (OQ-026, OQ-027).
--
-- ADR 0018, data inventory DI-19. Counts only: one row per India-time day (or hour), event and
-- language, holding a number. No IP address, device identifier, cookie, user agent or path.
-- Separate each statement with a blank line (the tests apply this file statement by statement).

CREATE TABLE daily_metric (
  period TEXT NOT NULL CHECK (length(period) BETWEEN 10 AND 13),
  metric TEXT NOT NULL CHECK (metric IN ('open','install')),
  locale TEXT NOT NULL CHECK (locale IN ('te','en','hi')),
  n      INTEGER NOT NULL CHECK (n >= 0),
  PRIMARY KEY (period, metric, locale)
) STRICT;
