CREATE TABLE profile_preview_tokens (
  preview_token TEXT PRIMARY KEY,
  metric_scope TEXT NOT NULL,
  expected_revision INTEGER NOT NULL,
  draft_json TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE TABLE profile_apply_receipts (
  idempotency_key TEXT PRIMARY KEY,
  request_json TEXT NOT NULL,
  result_json TEXT NOT NULL
);
