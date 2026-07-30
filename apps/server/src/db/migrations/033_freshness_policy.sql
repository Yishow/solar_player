CREATE TABLE IF NOT EXISTS freshness_policy (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  realtime_delayed_after_ms INTEGER NOT NULL,
  realtime_stale_after_ms INTEGER NOT NULL,
  realtime_historical_after_ms INTEGER NOT NULL,
  daily_delayed_after_ms INTEGER NOT NULL,
  daily_stale_after_ms INTEGER NOT NULL,
  daily_historical_after_ms INTEGER NOT NULL,
  cumulative_delayed_after_ms INTEGER NOT NULL,
  cumulative_stale_after_ms INTEGER NOT NULL,
  cumulative_historical_after_ms INTEGER NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO freshness_policy (
  id,
  realtime_delayed_after_ms,
  realtime_stale_after_ms,
  realtime_historical_after_ms,
  daily_delayed_after_ms,
  daily_stale_after_ms,
  daily_historical_after_ms,
  cumulative_delayed_after_ms,
  cumulative_stale_after_ms,
  cumulative_historical_after_ms
) VALUES (
  1,
  30000,
  90000,
  1800000,
  93600000,
  172800000,
  604800000,
  600000,
  3600000,
  86400000
);
