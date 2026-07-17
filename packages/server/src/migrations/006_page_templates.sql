CREATE TABLE IF NOT EXISTS page_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID REFERENCES organisations(id),
  name TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT 'personal',
  created_by UUID REFERENCES users(id),
  page_json JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
