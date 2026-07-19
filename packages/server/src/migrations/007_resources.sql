-- Manually-attached course resources (P1-19 Resources utility item, Phase
-- 4 usability-fix session Step 2) -- distinct from the `assets` table
-- (image/video/audio blocks) and distinct from the Phase 5 auto-generated
-- PDF pipeline (P1-18). A resource is any author-uploaded document
-- (PDF/Word/Excel/PowerPoint/ZIP/plain text) offered for download from the
-- player's Resources modal. See DECISIONS.md.
CREATE TABLE IF NOT EXISTS resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID REFERENCES organisations(id),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  resource_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT '',
  size_bytes BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
