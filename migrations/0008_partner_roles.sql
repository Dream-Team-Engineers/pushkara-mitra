-- Partners: two more kinds of partner, vendor and moderator (Cloudflare D1 / SQLite). Forward-only.
-- SQLite cannot change a CHECK in place, so the partner table is rebuilt with the wider role list.
-- Same columns, same checks, same data; nothing new is collected. NEEDS REVIEW (OQ-024, OQ-045).
-- Separate each statement with a blank line (the tests apply this file statement by statement).

CREATE TABLE partner_new (
  subject_ref     TEXT NOT NULL PRIMARY KEY,
  role            TEXT NOT NULL CHECK (role IN ('priest','volunteer','vendor','moderator')),
  ghat_id         TEXT CHECK (ghat_id IS NULL OR length(ghat_id) BETWEEN 1 AND 64),
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','suspended')),
  name            TEXT CHECK (name IS NULL OR length(name) <= 60),
  email           TEXT CHECK (email IS NULL OR length(email) <= 254),
  applied_at      TEXT NOT NULL,
  decided_at      TEXT,
  decided_by      TEXT,
  available_until TEXT
) STRICT;

INSERT INTO partner_new (subject_ref, role, ghat_id, status, name, email, applied_at, decided_at, decided_by, available_until)
  SELECT subject_ref, role, ghat_id, status, name, email, applied_at, decided_at, decided_by, available_until FROM partner;

DROP TABLE partner;

ALTER TABLE partner_new RENAME TO partner;

CREATE INDEX idx_partner_status ON partner (status, applied_at);
