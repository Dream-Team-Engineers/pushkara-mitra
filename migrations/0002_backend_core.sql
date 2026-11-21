-- Backend core (Cloudflare D1 / SQLite). Forward-only. Applied by `wrangler d1 migrations apply`.
-- Stack: D1 per docs "Pushkara Mitra Tech Stack Overview" (owner, 2026-11-21). ADR 0013 (Supabase)
-- is a different proposal; this file follows the owner's later stack sheet. NEEDS REVIEW (OQ-026,
-- OQ-027: D1 has no India region and Time Travel restores in place). Nothing here is applied to any
-- environment until an owner creates the D1 database and binds it as DB.
--
-- Rules baked in (ADR 0004, ADR 0006, docs/proposals/DATABASE_DESIGN.md):
--   * Opaque ids, hashes instead of tokens or join codes, UTC ISO-8601 times set by the server.
--   * NEVER stored: coordinates, location history, phone numbers, emails, names, free text from the
--     public, child or missing-person records, card data, OTPs, secrets.
--   * Separate each statement with a blank line (the tests apply this file statement by statement).

CREATE TABLE session (
  id_hash     TEXT NOT NULL PRIMARY KEY,
  subject_ref TEXT NOT NULL,
  created_at  TEXT NOT NULL,
  expires_at  TEXT NOT NULL,
  revoked_at  TEXT
) STRICT;

CREATE INDEX idx_session_subject ON session (subject_ref);

CREATE INDEX idx_session_expiry ON session (expires_at);

CREATE TABLE consent_ledger (
  id             TEXT NOT NULL PRIMARY KEY,
  subject_ref    TEXT NOT NULL,
  purpose_id     TEXT NOT NULL CHECK (purpose_id IN ('sign-in','group','pass','notifications')),
  notice_version TEXT NOT NULL CHECK (length(notice_version) BETWEEN 1 AND 40),
  locale         TEXT NOT NULL CHECK (locale IN ('te','en','hi')),
  decision       TEXT NOT NULL CHECK (decision IN ('granted','withdrawn')),
  at             TEXT NOT NULL
) STRICT;

CREATE INDEX idx_consent_subject ON consent_ledger (subject_ref, at);

CREATE TRIGGER consent_ledger_no_update BEFORE UPDATE ON consent_ledger BEGIN SELECT RAISE(ABORT, 'consent_ledger is append-only'); END;

-- Group metadata only. Positions never live here; they stay in Durable Object memory (ADR 0004).
CREATE TABLE group_ (
  id         TEXT NOT NULL PRIMARY KEY,
  state      TEXT NOT NULL DEFAULT 'active' CHECK (state IN ('active','closed')),
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
) STRICT;

CREATE TABLE membership (
  group_id    TEXT NOT NULL REFERENCES group_(id) ON DELETE CASCADE,
  subject_ref TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner','member')),
  joined_at   TEXT NOT NULL,
  PRIMARY KEY (group_id, subject_ref)
) STRICT;

CREATE INDEX idx_membership_subject ON membership (subject_ref);

CREATE TABLE invitation (
  code_hash  TEXT NOT NULL PRIMARY KEY,
  group_id   TEXT NOT NULL REFERENCES group_(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  uses_left  INTEGER NOT NULL CHECK (uses_left >= 0)
) STRICT;

-- SOS intake (ADR 0015). No login, no coordinates, no free text, no contact details.
-- request_hash is the hash of the client-generated request id, so a retry is idempotent.
CREATE TABLE sos_request (
  id              TEXT NOT NULL PRIMARY KEY,
  request_hash    TEXT NOT NULL UNIQUE,
  category        TEXT NOT NULL CHECK (category IN ('medical','lost','crowd','other')),
  status          TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received','acknowledged')),
  created_at      TEXT NOT NULL,
  acknowledged_at TEXT
) STRICT;

CREATE INDEX idx_sos_status ON sos_request (status, created_at);
