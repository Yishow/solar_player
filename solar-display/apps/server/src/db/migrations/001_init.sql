CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at DATETIME
);

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

CREATE TABLE IF NOT EXISTS metric_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  generation REAL,
  consumption REAL,
  self_consumption REAL,
  co2 REAL,
  ratio REAL,
  efficiency REAL,
  captured_at DATETIME
);

CREATE TABLE IF NOT EXISTS daily_energy_summaries (
  date TEXT PRIMARY KEY,
  generation_total REAL,
  consumption_total REAL,
  self_consumption_total REAL,
  co2_total REAL,
  peak_generation REAL,
  peak_generation_time DATETIME,
  peak_consumption REAL,
  peak_consumption_time DATETIME
);

CREATE TABLE IF NOT EXISTS cumulative_counters (
  metric_key TEXT PRIMARY KEY,
  total_value REAL,
  last_updated DATETIME,
  reset_count INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS circuit_configs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name_zh TEXT,
  name_en TEXT,
  icon TEXT,
  unit TEXT,
  mqtt_topic TEXT,
  rated_capacity REAL,
  normal_min REAL,
  normal_max REAL,
  attention_min REAL,
  attention_max REAL,
  warning_min REAL,
  warning_max REAL,
  display_order INTEGER,
  enabled BOOLEAN DEFAULT 1,
  created_at DATETIME,
  updated_at DATETIME
);

CREATE TABLE IF NOT EXISTS image_assets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filename TEXT,
  original_name TEXT,
  title TEXT,
  description TEXT,
  mime_type TEXT,
  file_size INTEGER,
  width INTEGER,
  height INTEGER,
  aspect_ratio REAL,
  included_in_slideshow BOOLEAN DEFAULT 0,
  is_cover BOOLEAN DEFAULT 0,
  display_duration INTEGER DEFAULT 10,
  display_order INTEGER,
  created_at DATETIME,
  updated_at DATETIME
);

CREATE TABLE IF NOT EXISTS playback_pages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  page_key TEXT,
  route TEXT,
  label_zh TEXT,
  label_en TEXT,
  enabled BOOLEAN DEFAULT 1,
  display_order INTEGER,
  duration_seconds INTEGER DEFAULT 15
);

CREATE TABLE IF NOT EXISTS playback_settings (
  id INTEGER PRIMARY KEY,
  autoplay BOOLEAN DEFAULT 1,
  loop BOOLEAN DEFAULT 1,
  start_page INTEGER DEFAULT 0,
  transition_type TEXT DEFAULT 'fade',
  transition_speed INTEGER DEFAULT 1000,
  schedule_enabled BOOLEAN DEFAULT 0,
  schedule_start TEXT,
  schedule_end TEXT,
  repeat_days TEXT,
  idle_mode BOOLEAN DEFAULT 0,
  idle_timeout INTEGER DEFAULT 300,
  brightness INTEGER DEFAULT 100,
  orientation TEXT DEFAULT 'landscape',
  updated_at DATETIME
);

CREATE TABLE IF NOT EXISTS device_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT,
  severity TEXT,
  message TEXT,
  resolved BOOLEAN DEFAULT 0,
  created_at DATETIME,
  resolved_at DATETIME
);
