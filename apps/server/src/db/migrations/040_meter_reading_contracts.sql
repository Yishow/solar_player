CREATE TABLE IF NOT EXISTS meter_sources (
  meter_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  metric_scope TEXT NOT NULL CHECK (metric_scope IN ('cl', 'kn')),
  metric_key TEXT NOT NULL,
  measurement_kind TEXT NOT NULL CHECK (measurement_kind IN ('power-gauge', 'cumulative-energy', 'interval-energy')),
  energy_flow_role TEXT NOT NULL CHECK (energy_flow_role IN ('consumption', 'generation', 'grid-import', 'grid-export')),
  input_unit TEXT NOT NULL,
  scale_decimal TEXT NOT NULL,
  source_revision INTEGER NOT NULL,
  epoch_id TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  review_status TEXT NOT NULL CHECK (review_status IN ('reviewed', 'needs-review')),
  source_timestamp_time_zone TEXT,
  timestamp_policy TEXT NOT NULL DEFAULT 'source-required' CHECK (timestamp_policy IN ('source-required', 'allow-receive-time-estimate')),
  expected_cadence_seconds INTEGER,
  display_name_zh TEXT,
  display_name_en TEXT,
  created_at TEXT NOT NULL,
  PRIMARY KEY (metric_scope, meter_id, channel_id, source_revision, epoch_id)
);

CREATE TABLE IF NOT EXISTS meter_readings_accepted (
  reading_id TEXT PRIMARY KEY,
  metric_scope TEXT NOT NULL,
  meter_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  source_revision INTEGER NOT NULL,
  epoch_id TEXT NOT NULL,
  raw_value_decimal TEXT NOT NULL,
  normalized_value_kwh TEXT NOT NULL,
  source_timestamp TEXT,
  received_at TEXT NOT NULL,
  timestamp_quality TEXT NOT NULL,
  origin TEXT NOT NULL,
  retain INTEGER,
  dup INTEGER,
  qos INTEGER,
  payload_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS meter_readings_accepted_identity
  ON meter_readings_accepted (
    metric_scope,
    meter_id,
    channel_id,
    source_revision,
    epoch_id,
    source_timestamp,
    payload_hash
  );

CREATE TABLE IF NOT EXISTS meter_readings_quarantine (
  quarantine_id TEXT PRIMARY KEY,
  metric_scope TEXT NOT NULL,
  meter_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  source_revision INTEGER NOT NULL,
  epoch_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  raw_value_decimal TEXT,
  source_timestamp TEXT,
  received_at TEXT NOT NULL,
  retain INTEGER,
  dup INTEGER,
  qos INTEGER,
  origin TEXT NOT NULL,
  payload_hash TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS meter_live_state (
  metric_scope TEXT NOT NULL,
  meter_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  source_revision INTEGER NOT NULL,
  epoch_id TEXT NOT NULL,
  live_value_kwh TEXT,
  last_accepted_at TEXT,
  last_source_timestamp TEXT,
  baseline_kwh TEXT,
  PRIMARY KEY (metric_scope, meter_id, channel_id, source_revision, epoch_id)
);
