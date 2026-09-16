CREATE TABLE IF NOT EXISTS engineering_source_definitions (
  source_ref TEXT PRIMARY KEY,
  configuration_revision INTEGER NOT NULL DEFAULT 1,
  site TEXT NOT NULL DEFAULT 'kn',
  engineering_id TEXT NOT NULL,
  engineering_name TEXT NOT NULL,
  purpose TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'unconfigured',
  exact_topic TEXT NOT NULL,
  approved_publisher_id TEXT,
  definition_revision INTEGER NOT NULL DEFAULT 1,
  definition_summary TEXT,
  scope_coverage TEXT,
  unit TEXT,
  scale_decimal REAL NOT NULL DEFAULT 1.0,
  quality_policy TEXT,
  calendar_revision INTEGER DEFAULT 1,
  expected_delivery_json TEXT,
  replay_window_days INTEGER NOT NULL DEFAULT 93,
  enabled INTEGER NOT NULL DEFAULT 0,
  review_status TEXT NOT NULL DEFAULT 'draft',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_kn_eng_site_id_purpose UNIQUE (site, engineering_id, purpose)
);

CREATE TABLE IF NOT EXISTS engineering_report_revisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site TEXT NOT NULL DEFAULT 'kn',
  engineering_id TEXT NOT NULL,
  measurement_kind TEXT NOT NULL DEFAULT 'interval-energy',
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  data_revision INTEGER NOT NULL,
  publisher_id TEXT NOT NULL,
  definition_revision INTEGER NOT NULL,
  calendar_revision INTEGER DEFAULT 1,
  unit TEXT NOT NULL,
  value TEXT,
  period_status TEXT NOT NULL,
  coverage TEXT NOT NULL,
  quality TEXT NOT NULL,
  published_at TEXT NOT NULL,
  reason TEXT,
  content_digest TEXT NOT NULL,
  received_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_kn_eng_report_rev UNIQUE (site, engineering_id, measurement_kind, period_start, period_end, data_revision)
);

CREATE TABLE IF NOT EXISTS engineering_report_heads (
  site TEXT NOT NULL DEFAULT 'kn',
  engineering_id TEXT NOT NULL,
  measurement_kind TEXT NOT NULL DEFAULT 'interval-energy',
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  current_data_revision INTEGER NOT NULL,
  current_revision_id INTEGER NOT NULL REFERENCES engineering_report_revisions(id),
  period_status TEXT NOT NULL,
  coverage TEXT NOT NULL,
  quality TEXT NOT NULL,
  value TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (site, engineering_id, measurement_kind, period_start, period_end)
);

CREATE TABLE IF NOT EXISTS engineering_projection_invalidations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site TEXT NOT NULL,
  engineering_id TEXT NOT NULL,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  caused_by_revision INTEGER NOT NULL,
  processed INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_eng_rep_rev_query ON engineering_report_revisions (site, engineering_id, period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_eng_rep_heads_range ON engineering_report_heads (site, period_start, period_end);
