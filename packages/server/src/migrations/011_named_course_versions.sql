-- P1-70: extend the existing publish-version table for immutable, manually
-- named course snapshots. Existing publish rows remain valid and are given
-- the published defaults below; named snapshots use kind = named_snapshot.
ALTER TABLE course_versions
  ADD COLUMN IF NOT EXISTS version_id UUID DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'published',
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS restored_from_version_id UUID,
  ADD COLUMN IF NOT EXISTS asset_manifest JSONB NOT NULL DEFAULT '[]'::jsonb;

UPDATE course_versions
SET created_by = COALESCE(created_by, published_by),
    created_at = COALESCE(created_at, published_at, now()),
    asset_manifest = COALESCE(asset_manifest, '[]'::jsonb)
WHERE created_by IS NULL OR created_at IS NULL OR asset_manifest IS NULL;

ALTER TABLE course_versions
  ALTER COLUMN version_id SET NOT NULL,
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN created_at SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS course_versions_version_id_idx
  ON course_versions (version_id);

CREATE INDEX IF NOT EXISTS course_versions_course_named_created_idx
  ON course_versions (course_id, kind, created_at DESC);
