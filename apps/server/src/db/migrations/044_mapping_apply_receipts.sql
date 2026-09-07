ALTER TABLE mapping_preview_tokens ADD COLUMN target_snapshot_json TEXT;

CREATE TABLE mapping_apply_receipts (
  idempotency_key TEXT PRIMARY KEY,
  request_json TEXT NOT NULL,
  result_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
