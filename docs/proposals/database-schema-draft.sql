-- Pushkara Mitra: DRAFT database schema (SQLite / Cloudflare D1).
-- STATUS: PROPOSED. NOT A MIGRATION. NOT APPROVED. Not applied to any database.
-- Lives in docs/proposals on purpose: the checks in DATA_MODEL_PROPOSAL.md ("Checks before any
-- migration is written") are not met yet. Move to migrations/ only after they are.
--
-- Rules baked in:
--   * Opaque random text ids (26-char base32), never sequential, never derived from a person.
--   * Times are UTC ISO-8601 text set by the server.
--   * STRICT tables, NOT NULL by default, CHECK constraints for enums.
--   * NEVER stored: coordinates, location history, card data, OTPs, secrets, child or
--     missing-person records, phone numbers, emails (ADR 0004, ADR 0006).
--   * Foreign keys must be enabled per connection: PRAGMA foreign_keys = ON.

-- ===== Tier 1: public content (no personal data) =====

CREATE TABLE content_item (
  id                    TEXT NOT NULL PRIMARY KEY,
  kind                  TEXT NOT NULL CHECK (kind IN
                          ('ghats','stays','travel','updates','helplines','help-points')),
  locale                TEXT NOT NULL CHECK (locale IN ('te','en','hi')),
  slug                  TEXT NOT NULL CHECK (length(slug) BETWEEN 1 AND 80),
  current_revision_id   TEXT,            -- latest draft or reviewed revision
  published_revision_id TEXT,            -- the ONLY revision ever served publicly
  created_at            TEXT NOT NULL,
  UNIQUE (kind, locale, slug)
) STRICT;

CREATE TABLE content_revision (
  id            TEXT NOT NULL PRIMARY KEY,
  item_id       TEXT NOT NULL REFERENCES content_item(id),
  revision      INTEGER NOT NULL CHECK (revision >= 1),
  title         TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 200),
  body          TEXT NOT NULL CHECK (length(body) <= 8000),
  attributes    TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(attributes)),  -- district, facilities...
  source_name   TEXT NOT NULL,
  source_url    TEXT NOT NULL,
  retrieved_on  TEXT NOT NULL,
  synthetic     INTEGER NOT NULL DEFAULT 1 CHECK (synthetic IN (0,1)),      -- 1 = labelled sample
  status        TEXT NOT NULL DEFAULT 'draft' CHECK (status IN
                  ('draft','in_review','approved','withdrawn')),
  author_ref    TEXT NOT NULL,           -- opaque staff ref (principal.id), not a name
  reviewer_ref  TEXT,
  reviewed_on   TEXT,
  created_at    TEXT NOT NULL,
  UNIQUE (item_id, revision),
  -- four-eyes: the author can never approve their own revision
  CHECK (reviewer_ref IS NULL OR reviewer_ref <> author_ref),
  -- approved means a reviewer and a review date exist
  CHECK (status <> 'approved' OR (reviewer_ref IS NOT NULL AND reviewed_on IS NOT NULL))
) STRICT;

CREATE INDEX idx_content_revision_item ON content_revision (item_id, revision DESC);
CREATE INDEX idx_content_item_public ON content_item (kind, locale)
  WHERE published_revision_id IS NOT NULL;

-- ===== Tier 2: staff, roles, audit (staff personal data) =====

CREATE TABLE principal (
  id                TEXT NOT NULL PRIMARY KEY,
  issuer            TEXT NOT NULL,       -- verified Access issuer, not an email string
  subject           TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'active' CHECK (status IN
                      ('active','suspended','removed')),
  created_at        TEXT NOT NULL,
  status_changed_at TEXT NOT NULL,
  UNIQUE (issuer, subject)
) STRICT;

CREATE TABLE role_assignment (
  id             TEXT NOT NULL PRIMARY KEY,
  principal_id   TEXT NOT NULL REFERENCES principal(id),
  role           TEXT NOT NULL CHECK (role IN
                   ('content_operator','safety_moderator','operations_staff','approver')),
  scope          TEXT NOT NULL DEFAULT 'all' CHECK (length(scope) <= 80),
  granted_by_ref TEXT NOT NULL REFERENCES principal(id),
  granted_on     TEXT NOT NULL,
  expires_on     TEXT NOT NULL,          -- every assignment has an end date
  revoked_on     TEXT,
  -- nobody grants a role to themselves
  CHECK (granted_by_ref <> principal_id)
) STRICT;

CREATE INDEX idx_role_assignment_active ON role_assignment (principal_id, role)
  WHERE revoked_on IS NULL;

CREATE TABLE admin_audit_log (
  id          TEXT NOT NULL PRIMARY KEY,
  at          TEXT NOT NULL,
  actor_ref   TEXT NOT NULL,
  action      TEXT NOT NULL CHECK (length(action) <= 60),
  target_kind TEXT NOT NULL CHECK (length(target_kind) <= 40),
  target_id   TEXT NOT NULL,
  outcome     TEXT NOT NULL CHECK (outcome IN ('allowed','denied','error')),
  request_id  TEXT NOT NULL              -- no free text, no request bodies, no coordinates
) STRICT;

CREATE INDEX idx_audit_at ON admin_audit_log (at);
CREATE INDEX idx_audit_actor ON admin_audit_log (actor_ref, at);

-- Append-only: nobody (including the application) can edit or delete audit rows.
CREATE TRIGGER admin_audit_log_no_update BEFORE UPDATE ON admin_audit_log
BEGIN SELECT RAISE(ABORT, 'admin_audit_log is append-only'); END;
CREATE TRIGGER admin_audit_log_no_delete BEFORE DELETE ON admin_audit_log
BEGIN SELECT RAISE(ABORT, 'admin_audit_log is append-only'); END;

-- Kill switches. Absent row or enabled = 0 means OFF (fails closed).
CREATE TABLE feature_flag (
  name           TEXT NOT NULL PRIMARY KEY CHECK (name IN
                   ('group-location','payments','donations','missing-person-reports')),
  enabled        INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0,1)),
  changed_by_ref TEXT NOT NULL REFERENCES principal(id),
  changed_at     TEXT NOT NULL
) STRICT;

-- ===== Tier 3: pilgrim records (user personal data) =====
-- BLOCKED on BF-01, BF-05, BF-07, BF-08 and counsel. pass_record is intentionally absent:
-- no field list exists until the Pass contract and notice exist.

CREATE TABLE pilgrim (
  id           TEXT NOT NULL PRIMARY KEY,
  subject_hash TEXT NOT NULL UNIQUE,     -- hash of issuer+subject; no email, phone or name
  created_at   TEXT NOT NULL,
  deleted_at   TEXT
) STRICT;

CREATE TABLE session (
  id_hash             TEXT NOT NULL PRIMARY KEY,  -- hash only, never the token
  pilgrim_id          TEXT NOT NULL REFERENCES pilgrim(id),
  created_at          TEXT NOT NULL,
  idle_expires_at     TEXT NOT NULL,
  absolute_expires_at TEXT NOT NULL,
  revoked_at          TEXT
) STRICT;

CREATE INDEX idx_session_pilgrim ON session (pilgrim_id);
CREATE INDEX idx_session_expiry ON session (absolute_expires_at);

CREATE TABLE consent_ledger (
  id             TEXT NOT NULL PRIMARY KEY,
  pilgrim_id     TEXT NOT NULL REFERENCES pilgrim(id),
  purpose_id     TEXT NOT NULL,
  notice_version TEXT NOT NULL,
  locale         TEXT NOT NULL CHECK (locale IN ('te','en','hi')),
  decision       TEXT NOT NULL CHECK (decision IN ('granted','withdrawn')),
  at             TEXT NOT NULL
) STRICT;

CREATE INDEX idx_consent_pilgrim ON consent_ledger (pilgrim_id, purpose_id, at);

CREATE TRIGGER consent_ledger_no_update BEFORE UPDATE ON consent_ledger
BEGIN SELECT RAISE(ABORT, 'consent_ledger is append-only'); END;

-- Group metadata only. Membership positions NEVER live here; they stay in Durable Object memory.
CREATE TABLE group_ (
  id         TEXT NOT NULL PRIMARY KEY,
  state      TEXT NOT NULL DEFAULT 'active' CHECK (state IN ('active','closed')),
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL               -- expires with the event window
) STRICT;

CREATE TABLE membership (
  group_id   TEXT NOT NULL REFERENCES group_(id),
  pilgrim_id TEXT NOT NULL REFERENCES pilgrim(id),
  role       TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner','member')),
  joined_at  TEXT NOT NULL,
  PRIMARY KEY (group_id, pilgrim_id)
) STRICT;

CREATE INDEX idx_membership_pilgrim ON membership (pilgrim_id);

CREATE TABLE invitation (
  id_hash    TEXT NOT NULL PRIMARY KEY,  -- hash of the join code
  group_id   TEXT NOT NULL REFERENCES group_(id),
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  uses_left  INTEGER NOT NULL CHECK (uses_left >= 0)
) STRICT;

-- ===== Tier 4: operational and legal (blocked on counsel) =====
-- payment_reference and webhook_event are deferred: blocked on payments and donations review.

CREATE TABLE partner_inquiry (
  id            TEXT NOT NULL PRIMARY KEY,
  business_name TEXT NOT NULL CHECK (length(business_name) <= 120),
  contact_ref   TEXT NOT NULL,           -- reference into an approved contact store, not raw data
  message       TEXT NOT NULL CHECK (length(message) <= 1000),
  status        TEXT NOT NULL DEFAULT 'new' CHECK (status IN
                  ('new','triaged','approved','rejected','closed')),
  received_at   TEXT NOT NULL,
  closed_at     TEXT
) STRICT;

CREATE INDEX idx_partner_status ON partner_inquiry (status, received_at);

CREATE TABLE legal_request_register (
  id              TEXT NOT NULL PRIMARY KEY,
  received_on     TEXT NOT NULL,
  authority_ref   TEXT NOT NULL,
  basis_note      TEXT NOT NULL CHECK (length(basis_note) <= 500),
  approved_by_ref TEXT REFERENCES principal(id),
  outcome         TEXT
) STRICT;

CREATE TABLE legal_hold (
  id            TEXT NOT NULL PRIMARY KEY,
  target_kind   TEXT NOT NULL,
  target_id     TEXT NOT NULL,
  placed_by_ref TEXT NOT NULL REFERENCES principal(id),
  placed_on     TEXT NOT NULL,
  released_on   TEXT
) STRICT;

-- Proof that retention and deletion jobs ran (also re-run after any restore).
CREATE TABLE retention_run (
  id           TEXT NOT NULL PRIMARY KEY,
  table_name   TEXT NOT NULL,
  ran_at       TEXT NOT NULL,
  rows_deleted INTEGER NOT NULL CHECK (rows_deleted >= 0)
) STRICT;
