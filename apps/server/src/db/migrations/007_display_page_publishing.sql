-- Draft/live stage configs with version tracking
CREATE TABLE IF NOT EXISTS display_page_stage_configs (
  page_key TEXT NOT NULL,
  stage TEXT NOT NULL DEFAULT 'draft',
  config_json TEXT NOT NULL DEFAULT '{}',
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  published_at TEXT,
  published_by TEXT,
  PRIMARY KEY (page_key, stage)
);

-- Publish history for audit and rollback
CREATE TABLE IF NOT EXISTS display_page_publish_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  page_key TEXT NOT NULL,
  version INTEGER NOT NULL,
  stage TEXT NOT NULL DEFAULT 'live',
  action TEXT NOT NULL,
  config_json TEXT NOT NULL DEFAULT '{}',
  published_by TEXT,
  source_version INTEGER,
  published_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Seed existing configs into draft stage for backward compatibility
INSERT OR IGNORE INTO display_page_stage_configs (page_key, stage, config_json, version, updated_at)
SELECT page_key, 'draft', config_json, 1, updated_at
FROM display_page_configs;
