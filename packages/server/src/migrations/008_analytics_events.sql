CREATE TABLE IF NOT EXISTS analytics_events (
  event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID REFERENCES organisations(id),
  event_version INTEGER NOT NULL DEFAULT 1,
  event_type TEXT NOT NULL,
  course_id TEXT NOT NULL,
  course_version TEXT,
  page_id TEXT,
  block_id TEXT,
  session_id TEXT,
  actor_hash TEXT,
  payload JSONB NOT NULL DEFAULT '{}',
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS analytics_events_course_time_idx
  ON analytics_events (organisation_id, course_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS analytics_events_type_time_idx
  ON analytics_events (organisation_id, event_type, occurred_at DESC);
