CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  value_type TEXT NOT NULL DEFAULT 'string',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS mqtt_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  enabled INTEGER NOT NULL DEFAULT 1,
  mode TEXT NOT NULL DEFAULT 'mqtt',
  broker_url TEXT NOT NULL,
  port INTEGER NOT NULL DEFAULT 1883,
  username TEXT,
  password_encrypted TEXT,
  client_id TEXT NOT NULL,
  reconnect_interval_sec INTEGER NOT NULL DEFAULT 30,
  message_timeout_sec INTEGER NOT NULL DEFAULT 60,
  last_connection_status TEXT NOT NULL DEFAULT 'disconnected',
  last_message_at TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS topic_mappings (
  id TEXT PRIMARY KEY,
  metric_key TEXT NOT NULL UNIQUE,
  label_zh TEXT NOT NULL,
  label_en TEXT NOT NULL,
  topic TEXT NOT NULL,
  unit TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS live_metric_values (
  metric_key TEXT PRIMARY KEY,
  value REAL NOT NULL,
  unit TEXT NOT NULL,
  source_topic TEXT,
  quality TEXT NOT NULL DEFAULT 'good',
  received_at TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS metric_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  metric_key TEXT NOT NULL,
  value REAL NOT NULL,
  unit TEXT NOT NULL,
  captured_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_metric_snapshots_key_time
ON metric_snapshots(metric_key, captured_at);

CREATE TABLE IF NOT EXISTS daily_energy_summaries (
  date TEXT PRIMARY KEY,
  generation_kwh REAL NOT NULL DEFAULT 0,
  self_consumption_kwh REAL NOT NULL DEFAULT 0,
  consumption_kwh REAL NOT NULL DEFAULT 0,
  co2_reduction_t REAL NOT NULL DEFAULT 0,
  peak_generation_kw REAL,
  peak_generation_at TEXT,
  peak_consumption_kw REAL,
  peak_consumption_at TEXT,
  self_consumption_ratio REAL,
  system_efficiency REAL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cumulative_counters (
  counter_key TEXT PRIMARY KEY,
  value REAL NOT NULL DEFAULT 0,
  unit TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'mqtt',
  last_source_value REAL,
  last_updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS circuit_configs (
  id TEXT PRIMARY KEY,
  display_order INTEGER NOT NULL,
  name_zh TEXT NOT NULL,
  name_en TEXT NOT NULL,
  icon TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'kW',
  mqtt_topic TEXT NOT NULL,
  rated_capacity REAL NOT NULL DEFAULT 100,
  normal_min REAL NOT NULL DEFAULT 0,
  normal_max REAL NOT NULL DEFAULT 70,
  attention_min REAL NOT NULL DEFAULT 70,
  attention_max REAL NOT NULL DEFAULT 90,
  warning_min REAL NOT NULL DEFAULT 90,
  warning_max REAL NOT NULL DEFAULT 100,
  show INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS image_assets (
  id TEXT PRIMARY KEY,
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  width INTEGER,
  height INTEGER,
  title TEXT,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  duration_sec INTEGER NOT NULL DEFAULT 10,
  include_in_slideshow INTEGER NOT NULL DEFAULT 1,
  is_cover INTEGER NOT NULL DEFAULT 0,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS playback_pages (
  page_key TEXT PRIMARY KEY,
  title_zh TEXT NOT NULL,
  title_en TEXT NOT NULL,
  display_order INTEGER NOT NULL,
  duration_sec INTEGER NOT NULL DEFAULT 10,
  enabled INTEGER NOT NULL DEFAULT 1,
  thumbnail_url TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS playback_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  autoplay INTEGER NOT NULL DEFAULT 1,
  loop_mode INTEGER NOT NULL DEFAULT 1,
  start_page_key TEXT NOT NULL DEFAULT 'overview',
  transition_type TEXT NOT NULL DEFAULT 'fade',
  transition_speed TEXT NOT NULL DEFAULT 'medium',
  schedule_enabled INTEGER NOT NULL DEFAULT 0,
  schedule_start TEXT NOT NULL DEFAULT '08:00',
  schedule_end TEXT NOT NULL DEFAULT '18:00',
  repeat_days TEXT NOT NULL DEFAULT '[1,2,3,4,5]',
  idle_mode TEXT NOT NULL DEFAULT 'static-page',
  idle_minutes INTEGER NOT NULL DEFAULT 5,
  brightness INTEGER NOT NULL DEFAULT 70,
  orientation TEXT NOT NULL DEFAULT 'landscape',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS device_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  level TEXT NOT NULL,
  event_type TEXT NOT NULL,
  message TEXT NOT NULL,
  payload TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
