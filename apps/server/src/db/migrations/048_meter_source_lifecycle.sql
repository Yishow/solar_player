CREATE TABLE IF NOT EXISTS meter_source_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  metric_scope TEXT NOT NULL CHECK (metric_scope IN ('cl', 'kn')),
  channel_id TEXT NOT NULL,
  meter_id TEXT NOT NULL,
  source_revision INTEGER NOT NULL,
  epoch_id TEXT NOT NULL,
  actor TEXT NOT NULL,
  reason TEXT NOT NULL,
  before_json TEXT,
  after_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS meter_source_audit_lineage
  ON meter_source_audit (metric_scope, channel_id, created_at);
