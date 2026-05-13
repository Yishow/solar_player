CREATE TABLE IF NOT EXISTS mqtt_settings (
  broker_host TEXT,
  broker_port INTEGER,
  username TEXT,
  password TEXT,
  client_id TEXT,
  reconnect_interval INTEGER,
  message_timeout INTEGER,
  data_mode TEXT DEFAULT 'mqtt'
);

CREATE TABLE IF NOT EXISTS topic_mappings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  metric_key TEXT NOT NULL,
  topic TEXT NOT NULL,
  unit TEXT,
  value_path TEXT,
  multiplier REAL DEFAULT 1,
  offset REAL DEFAULT 0,
  decimal_places INTEGER DEFAULT 2,
  enabled BOOLEAN DEFAULT 1,
  created_at DATETIME,
  updated_at DATETIME
);

CREATE TABLE IF NOT EXISTS live_metric_values (
  metric_key TEXT PRIMARY KEY,
  value REAL,
  unit TEXT,
  timestamp DATETIME,
  quality TEXT,
  raw_payload TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_topic_mappings_metric_key
  ON topic_mappings(metric_key);

CREATE INDEX IF NOT EXISTS idx_topic_mappings_topic
  ON topic_mappings(topic);

UPDATE mqtt_settings
SET
  broker_host = COALESCE(NULLIF(TRIM(broker_host), ''), 'localhost'),
  broker_port = COALESCE(broker_port, 1883),
  username = COALESCE(username, ''),
  password = COALESCE(password, ''),
  client_id = COALESCE(NULLIF(TRIM(client_id), ''), 'solar-display-player'),
  reconnect_interval = COALESCE(reconnect_interval, 5000),
  message_timeout = COALESCE(message_timeout, 30),
  data_mode = CASE
    WHEN data_mode = 'mock' THEN 'mock'
    ELSE 'mqtt'
  END;
