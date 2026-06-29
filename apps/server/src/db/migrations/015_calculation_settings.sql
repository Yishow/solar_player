CREATE TABLE IF NOT EXISTS calculation_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  carbon_emission_factor REAL NOT NULL DEFAULT 0.495,
  tree_equivalent_factor REAL NOT NULL DEFAULT 2.6,
  household_daily_usage_kwh REAL NOT NULL DEFAULT 4,
  household_monthly_usage_kwh REAL NOT NULL DEFAULT 120,
  estimated_tariff_per_kwh REAL NOT NULL DEFAULT 5,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
