-- Generated publish artifacts use the same resource storage and modal as
-- manually attached resources, but remain distinguishable and replaceable.
ALTER TABLE resources ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE resources ADD COLUMN IF NOT EXISTS resource_kind TEXT NOT NULL DEFAULT 'attachment';
CREATE INDEX IF NOT EXISTS resources_course_generated_idx ON resources (course_id, source, resource_kind);
