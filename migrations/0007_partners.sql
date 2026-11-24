-- Partners: priests and volunteers (Cloudflare D1 / SQLite). Forward-only. Applied by `wrangler d1 migrations apply`.
-- ADR 0019, data inventory DI-20 to DI-23, consent CON-07. NEEDS REVIEW (OQ-024, OQ-045, OQ-046).
--
-- Expand-only for the tables the previous Worker reads, with one exception: consent_ledger is rebuilt so
-- its purpose list gains 'partner' (SQLite cannot change a CHECK in place). Rows and the append-only
-- trigger are kept. No coordinates, no free text, no phone number, no photo, no link anywhere here.
-- The applicant's name and email are the first place the app stores either: only for applicants and
-- partners, shown to admins only, deleted 30 days after a rejection and on erasure.
-- Separate each statement with a blank line (the tests apply this file statement by statement).

CREATE TABLE consent_ledger_new (
  id             TEXT NOT NULL PRIMARY KEY,
  subject_ref    TEXT NOT NULL,
  purpose_id     TEXT NOT NULL CHECK (purpose_id IN ('sign-in','group','pass','notifications','partner')),
  notice_version TEXT NOT NULL CHECK (length(notice_version) BETWEEN 1 AND 40),
  locale         TEXT NOT NULL CHECK (locale IN ('te','en','hi')),
  decision       TEXT NOT NULL CHECK (decision IN ('granted','withdrawn')),
  at             TEXT NOT NULL
) STRICT;

INSERT INTO consent_ledger_new (id, subject_ref, purpose_id, notice_version, locale, decision, at)
  SELECT id, subject_ref, purpose_id, notice_version, locale, decision, at FROM consent_ledger ORDER BY rowid;

DROP TABLE consent_ledger;

ALTER TABLE consent_ledger_new RENAME TO consent_ledger;

CREATE INDEX idx_consent_subject ON consent_ledger (subject_ref, at);

CREATE TRIGGER consent_ledger_no_update BEFORE UPDATE ON consent_ledger BEGIN SELECT RAISE(ABORT, 'consent_ledger is append-only'); END;

-- One row per person: the application, the profile and the availability switch.
CREATE TABLE partner (
  subject_ref     TEXT NOT NULL PRIMARY KEY,
  role            TEXT NOT NULL CHECK (role IN ('priest','volunteer')),
  ghat_id         TEXT CHECK (ghat_id IS NULL OR length(ghat_id) BETWEEN 1 AND 64),
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','suspended')),
  name            TEXT CHECK (name IS NULL OR length(name) <= 60),
  email           TEXT CHECK (email IS NULL OR length(email) <= 254),
  applied_at      TEXT NOT NULL,
  decided_at      TEXT,
  decided_by      TEXT,
  available_until TEXT
) STRICT;

CREATE INDEX idx_partner_status ON partner (status, applied_at);

-- A nudge from the staff: fixed kind, optional ghat, no text. Everyone who qualifies sees it until it expires.
CREATE TABLE partner_nudge (
  id         TEXT NOT NULL PRIMARY KEY,
  kind       TEXT NOT NULL CHECK (kind IN ('crowd','river','food')),
  ghat_id    TEXT CHECK (ghat_id IS NULL OR length(ghat_id) BETWEEN 1 AND 64),
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_by TEXT NOT NULL
) STRICT;

CREATE INDEX idx_partner_nudge_expiry ON partner_nudge (expires_at);

CREATE TABLE partner_nudge_read (
  nudge_id    TEXT NOT NULL REFERENCES partner_nudge(id) ON DELETE CASCADE,
  subject_ref TEXT NOT NULL,
  PRIMARY KEY (nudge_id, subject_ref)
) STRICT;

-- What a partner reports: fixed kind, ghat and value only. Pilgrim responses never include subject_ref.
CREATE TABLE partner_update (
  id          TEXT NOT NULL PRIMARY KEY,
  subject_ref TEXT NOT NULL,
  kind        TEXT NOT NULL CHECK (kind IN ('crowd','river','food')),
  ghat_id     TEXT NOT NULL CHECK (length(ghat_id) BETWEEN 1 AND 64),
  value       TEXT NOT NULL CHECK (value IN ('low','moderate','high','normal','rising','available','finished')),
  created_at  TEXT NOT NULL,
  hidden_at   TEXT
) STRICT;

CREATE INDEX idx_partner_update_shown ON partner_update (kind, ghat_id, created_at);

CREATE INDEX idx_partner_update_subject ON partner_update (subject_ref, created_at);

-- Accountability for staff decisions. Holds the admin's Access subject, never an email.
CREATE TABLE partner_audit (
  id          TEXT NOT NULL PRIMARY KEY,
  admin       TEXT NOT NULL,
  action      TEXT NOT NULL CHECK (action IN ('approve','reject','suspend','hide','unhide','nudge')),
  target      TEXT NOT NULL,
  at          TEXT NOT NULL
) STRICT;
