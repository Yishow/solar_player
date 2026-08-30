ALTER TABLE calculation_settings ADD COLUMN revision INTEGER NOT NULL DEFAULT 1;

UPDATE topic_mappings
SET enabled = 0, updated_at = CURRENT_TIMESTAMP
WHERE (
  metric_scope IN ('cl', 'kn')
  AND metric_key IN ('selfConsumptionRatio', 'todayCo2Reduction', 'totalCo2Reduction', 'totalPower')
) OR (
  metric_scope = 'global'
  AND metric_key IN ('todayGeneration', 'monthGeneration', 'totalGeneration')
);

CREATE TABLE IF NOT EXISTS derived_metric_registry_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  revision INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO derived_metric_registry_state (id, revision) VALUES (1, 1);

CREATE TABLE IF NOT EXISTS derived_metric_definitions (
  metric_key TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  output_scope_policy TEXT NOT NULL CHECK (output_scope_policy IN ('site', 'global')),
  expression TEXT NOT NULL,
  output_unit TEXT NOT NULL,
  precision INTEGER NOT NULL CHECK (precision BETWEEN 0 AND 6),
  fallback_policy TEXT NOT NULL CHECK (fallback_policy IN ('unavailable', 'retain-last-good')),
  acceptance_policy TEXT,
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  managed INTEGER NOT NULL DEFAULT 0 CHECK (managed IN (0, 1)),
  revision INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS derived_metric_inputs (
  derived_metric_key TEXT NOT NULL,
  alias TEXT NOT NULL,
  input_kind TEXT NOT NULL CHECK (input_kind IN ('metric', 'calculation-setting')),
  metric_key TEXT,
  scope_selector TEXT CHECK (scope_selector IN ('output-site', 'cl', 'kn', 'global')),
  setting_key TEXT,
  unit TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  PRIMARY KEY (derived_metric_key, alias),
  FOREIGN KEY (derived_metric_key) REFERENCES derived_metric_definitions(metric_key) ON DELETE CASCADE,
  CHECK (
    (input_kind = 'metric' AND metric_key IS NOT NULL AND scope_selector IS NOT NULL AND setting_key IS NULL)
    OR
    (input_kind = 'calculation-setting' AND setting_key IS NOT NULL AND metric_key IS NULL AND scope_selector IS NULL)
  )
);

CREATE TABLE IF NOT EXISTS derived_metric_evaluations (
  metric_scope TEXT NOT NULL CHECK (metric_scope IN ('cl', 'kn', 'global')),
  metric_key TEXT NOT NULL,
  definition_revision INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('ready', 'degraded', 'unavailable')),
  failure_code TEXT,
  retained_last_good INTEGER NOT NULL DEFAULT 0 CHECK (retained_last_good IN (0, 1)),
  value REAL,
  unit TEXT NOT NULL,
  source_timestamp TEXT,
  evaluated_at TEXT NOT NULL,
  provenance_json TEXT NOT NULL DEFAULT '{}',
  PRIMARY KEY (metric_scope, metric_key),
  FOREIGN KEY (metric_key) REFERENCES derived_metric_definitions(metric_key) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_derived_metric_inputs_metric
  ON derived_metric_inputs (metric_key, scope_selector);

CREATE INDEX IF NOT EXISTS idx_derived_metric_inputs_setting
  ON derived_metric_inputs (setting_key);
