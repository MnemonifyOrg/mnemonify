CREATE TABLE IF NOT EXISTS course_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  organisation_id UUID REFERENCES organisations(id),
  version_number INTEGER NOT NULL,
  publish_mode TEXT NOT NULL DEFAULT 'push_all',
  course_json JSONB NOT NULL,
  published_by UUID REFERENCES users(id),
  published_at TIMESTAMPTZ DEFAULT now()
);
