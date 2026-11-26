-- My Group: each member's first name, shown to the other members of that group only (owner request
-- 2026-11-26, ADR 0017 item 1 amended, data inventory DI-17). Taken from the person's Google sign-in
-- (first word, at most 20 characters); never typed, never shown outside the group. Deleted with the
-- membership row: on leave, removal, group end and account erasure. NEEDS REVIEW (OQ-024).
-- Separate each statement with a blank line (the tests apply this file statement by statement).

ALTER TABLE membership ADD COLUMN display_name TEXT CHECK (display_name IS NULL OR length(display_name) <= 20);
