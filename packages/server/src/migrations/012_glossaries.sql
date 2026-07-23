-- P1-71: organisation-scoped shared glossary library.
CREATE TABLE IF NOT EXISTS glossaries (
  glossary_id TEXT PRIMARY KEY,
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS glossary_terms (
  term_id TEXT PRIMARY KEY,
  glossary_id TEXT NOT NULL REFERENCES glossaries(glossary_id) ON DELETE CASCADE,
  term TEXT NOT NULL,
  normalized_term TEXT NOT NULL,
  definition JSONB NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (glossary_id, normalized_term)
);

CREATE INDEX IF NOT EXISTS glossaries_organisation_name_idx
  ON glossaries (organisation_id, name);

CREATE INDEX IF NOT EXISTS glossary_terms_glossary_term_idx
  ON glossary_terms (glossary_id, normalized_term);
