CREATE TABLE IF NOT EXISTS display_value_overrides (
  target_id TEXT PRIMARY KEY,
  page_id TEXT NOT NULL,
  card_id TEXT NOT NULL,
  metric_key TEXT NOT NULL,
  display_value REAL NOT NULL,
  unit TEXT,
  enabled INTEGER NOT NULL DEFAULT 1,
  reason TEXT,
  expires_at DATETIME,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
