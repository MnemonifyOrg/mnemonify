-- Phase 6c: anonymous share links.
-- The raw token is never stored. token_hash authenticates public requests and
-- token_ciphertext lets authenticated editors copy existing links without
-- putting the bearer credential in plaintext at rest.
BEGIN;

-- Older courses may already be marked published from before immutable publish
-- snapshots were wired into the publish action. Treat that existing published
-- state as the first published version so the new link feature has a safe,
-- explicit snapshot to serve.
INSERT INTO course_versions
  (course_id, organisation_id, version_number, publish_mode, course_json,
   published_by, published_at, kind, created_by, created_at, asset_manifest)
SELECT c.id,
       c.organisation_id,
       COALESCE((
         SELECT MAX(previous.version_number)
         FROM course_versions previous
         WHERE previous.course_id = c.id
       ), 0) + 1,
       'push_all',
       c.course_json,
       c.created_by,
       COALESCE(c.updated_at, now()),
       'published',
       c.created_by,
       COALESCE(c.updated_at, now()),
       COALESCE(c.course_json->'assets', '[]'::jsonb)
FROM courses c
WHERE c.status = 'published'
  AND NOT EXISTS (
    SELECT 1
    FROM course_versions existing
    WHERE existing.course_id = c.id AND existing.kind = 'published'
  );

CREATE TABLE IF NOT EXISTS course_share_links (
  share_link_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  token_ciphertext TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  revoked BOOLEAN NOT NULL DEFAULT false,
  revoked_at TIMESTAMPTZ,
  CHECK ((revoked = false AND revoked_at IS NULL) OR (revoked = true AND revoked_at IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS course_share_links_course_created_idx
  ON course_share_links (course_id, created_at DESC);

CREATE INDEX IF NOT EXISTS course_share_links_course_active_idx
  ON course_share_links (course_id, revoked, expires_at);

COMMIT;
