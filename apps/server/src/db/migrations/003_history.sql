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

CREATE INDEX IF NOT EXISTS idx_metric_snapshots_captured_at
  ON metric_snapshots (captured_at);

CREATE INDEX IF NOT EXISTS idx_daily_energy_summaries_date
  ON daily_energy_summaries (date);

CREATE INDEX IF NOT EXISTS idx_cumulative_counters_last_updated
  ON cumulative_counters (last_updated);
