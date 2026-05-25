-- Shared shell decoration draft/live channels (global, not per-page)
CREATE TABLE IF NOT EXISTS shell_decoration_stage_configs (
  stage TEXT PRIMARY KEY,
  config_json TEXT NOT NULL DEFAULT '{"headerObjects":[],"footerObjects":[]}',
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  published_at TEXT,
  published_by TEXT
);
