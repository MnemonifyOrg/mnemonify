CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID REFERENCES organisations(id),
  title TEXT NOT NULL DEFAULT 'Untitled Course',
  is_template BOOLEAN DEFAULT false,
  template_scope TEXT,
  status TEXT DEFAULT 'draft',
  course_json JSONB NOT NULL DEFAULT '{}',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
