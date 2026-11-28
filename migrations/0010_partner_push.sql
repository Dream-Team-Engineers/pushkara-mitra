-- Partner phone notifications (Web Push), ADR 0020, data inventory DI-26, consent CON-08. NEEDS REVIEW (OQ-024, OQ-048).
--
-- One row per approved partner who opted in: the browser's push address and send counters. The push
-- address is a credential: never logged, never returned by any API, never shown on admin pages.
-- Messages are empty (no payload), so no browser encryption keys are stored. No device model, IP
-- address, user agent or location is stored anywhere here (Hard Rule 1).
--
-- consent_ledger is rebuilt only so its purpose list gains 'partner_push' (SQLite cannot change a
-- CHECK in place). Rows and the append-only trigger are kept.
-- Separate each statement with a blank line (the tests apply this file statement by statement).

CREATE TABLE consent_ledger_new (
  id             TEXT NOT NULL PRIMARY KEY,
  subject_ref    TEXT NOT NULL,
  purpose_id     TEXT NOT NULL CHECK (purpose_id IN ('sign-in','group','pass','notifications','partner','partner_push')),
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

CREATE TABLE partner_push (
  subject_ref TEXT NOT NULL PRIMARY KEY,
  endpoint    TEXT NOT NULL CHECK (endpoint LIKE 'https://%' AND length(endpoint) <= 600),
  created_at  TEXT NOT NULL,
  last_ok_at  TEXT,
  failed_at   TEXT,
  hour_start  TEXT,
  hour_count  INTEGER NOT NULL DEFAULT 0,
  day_start   TEXT,
  day_count   INTEGER NOT NULL DEFAULT 0
) STRICT;
