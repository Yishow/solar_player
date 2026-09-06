CREATE TABLE IF NOT EXISTS mapping_preview_tokens (
  preview_token TEXT PRIMARY KEY,
  canonical_draft_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS publish_preflight_tokens (
  preflight_token TEXT PRIMARY KEY,
  page_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
