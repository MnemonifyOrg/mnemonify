-- Phase 6a follow-up: do not invalidate an earlier unexpired invite when an
-- owner sends another invite to the same address. Each token is independently
-- single-use and expires on its own schedule.
BEGIN;

ALTER TABLE organisation_invitations
  DROP CONSTRAINT IF EXISTS organisation_invitations_organisation_id_email_key;

COMMIT;
