CREATE TABLE IF NOT EXISTS calculation_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  carbon_emission_factor REAL NOT NULL DEFAULT 0.467,
  tree_equivalent_factor REAL NOT NULL DEFAULT 0.16,
  household_daily_usage_kwh REAL NOT NULL DEFAULT 13,
  household_monthly_usage_kwh REAL NOT NULL DEFAULT 400,
  estimated_tariff_per_kwh REAL NOT NULL DEFAULT 4.5,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
