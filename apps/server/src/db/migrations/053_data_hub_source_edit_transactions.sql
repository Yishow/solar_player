-- Migration 053: Additive stable source references, revisions, and idempotency receipts for Data Hub generic source editing

ALTER TABLE topic_mappings ADD COLUMN source_ref TEXT;
ALTER TABLE topic_mappings ADD COLUMN config_revision INTEGER NOT NULL DEFAULT 1;

-- Backfill source_ref for existing rows deterministically
UPDATE topic_mappings
SET source_ref = 'src_' || metric_scope || '_' || REPLACE(REPLACE(metric_key, '.', '_'), ':', '_')
WHERE source_ref IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_topic_mappings_source_ref
  ON topic_mappings(source_ref);

-- Trigger to automatically populate source_ref for any subsequent inserts that omit it
CREATE TRIGGER IF NOT EXISTS trg_topic_mappings_source_ref
AFTER INSERT ON topic_mappings
FOR EACH ROW
WHEN NEW.source_ref IS NULL
BEGIN
  UPDATE topic_mappings
  SET source_ref = 'src_' || NEW.metric_scope || '_' || REPLACE(REPLACE(NEW.metric_key, '.', '_'), ':', '_')
  WHERE rowid = NEW.rowid;
END;


-- Store collection revision in system_settings if not present
INSERT OR IGNORE INTO system_settings (key, value, updated_at)
VALUES ('data_hub_topics_collection_revision', '1', CURRENT_TIMESTAMP);

-- Receipts for idempotency recovery (DHT-R3)
CREATE TABLE IF NOT EXISTS data_hub_source_mutation_receipts (
  idempotency_key TEXT PRIMARY KEY,
  source_ref TEXT NOT NULL,
  canonical_request_hash TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  response_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_data_hub_source_mutation_receipts_source_ref
  ON data_hub_source_mutation_receipts (source_ref);
