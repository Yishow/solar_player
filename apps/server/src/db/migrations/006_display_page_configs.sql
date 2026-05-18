CREATE TABLE IF NOT EXISTS display_page_configs (
  page_key TEXT PRIMARY KEY,
  config_json TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
