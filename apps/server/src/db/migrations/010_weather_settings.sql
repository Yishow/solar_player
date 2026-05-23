CREATE TABLE IF NOT EXISTS weather_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  enabled INTEGER NOT NULL DEFAULT 0,
  location_mode TEXT NOT NULL DEFAULT 'station',
  county_name TEXT,
  station_id TEXT,
  preset TEXT NOT NULL DEFAULT 'standard',
  field_keys_json TEXT NOT NULL DEFAULT '["weather","airTemperature","relativeHumidity","observationTime"]',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
