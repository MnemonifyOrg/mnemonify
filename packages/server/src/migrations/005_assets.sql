CREATE TABLE IF NOT EXISTS assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID REFERENCES organisations(id),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  asset_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  alt TEXT DEFAULT '',
  caption TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);
