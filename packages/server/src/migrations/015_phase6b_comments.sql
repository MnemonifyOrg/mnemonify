-- Phase 6b: authenticated review comments.
-- Comments intentionally live outside course_json so they do not create
-- autosave conflicts or require a content-document migration.
BEGIN;

CREATE TABLE IF NOT EXISTS course_comments (
  comment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  parent_comment_id UUID REFERENCES course_comments(comment_id) ON DELETE CASCADE,
  block_id TEXT,
  page_id TEXT,
  fallback_label TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (block_id IS NOT NULL OR page_id IS NOT NULL),
  CHECK (length(body) > 0),
  CHECK (length(fallback_label) > 0)
);

CREATE INDEX IF NOT EXISTS course_comments_course_created_idx
  ON course_comments (course_id, created_at ASC);
CREATE INDEX IF NOT EXISTS course_comments_course_status_idx
  ON course_comments (course_id, status);
CREATE INDEX IF NOT EXISTS course_comments_block_idx
  ON course_comments (course_id, block_id)
  WHERE block_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS course_comments_page_idx
  ON course_comments (course_id, page_id)
  WHERE page_id IS NOT NULL;

COMMIT;
