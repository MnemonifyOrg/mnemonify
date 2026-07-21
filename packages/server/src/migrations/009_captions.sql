CREATE TABLE IF NOT EXISTS captions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID REFERENCES organisations(id),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  asset_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('caption', 'transcript')),
  content TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL CHECK (source IN ('whisper', 'manual')),
  review_status TEXT NOT NULL DEFAULT 'draft' CHECK (review_status IN ('draft', 'reviewed')),
  status TEXT NOT NULL DEFAULT 'generating' CHECK (status IN ('generating', 'ready', 'failed')),
  error_message TEXT DEFAULT '',
  generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (organisation_id, course_id, asset_id, kind)
);

CREATE INDEX IF NOT EXISTS captions_asset_lookup
  ON captions (organisation_id, asset_id, kind);
