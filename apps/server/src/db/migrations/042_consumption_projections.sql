CREATE TABLE IF NOT EXISTS consumption_projections (
  projection_id TEXT PRIMARY KEY,
  metric_scope TEXT NOT NULL CHECK (metric_scope IN ('cl', 'kn')),
  range TEXT NOT NULL CHECK (range IN ('day', 'month', 'year')),
  profile_revision INTEGER NOT NULL,
  algorithm_version TEXT NOT NULL,
  quality TEXT NOT NULL,
  site_time_zone TEXT NOT NULL,
  value_kwh TEXT,
  watermark TEXT,
  sample_checksum TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS consumption_projections_scope_range
  ON consumption_projections (metric_scope, range, created_at);

ALTER TABLE topic_mappings ADD COLUMN selector_json TEXT;
