ALTER TABLE derived_metric_definitions ADD COLUMN site_scopes_json TEXT;

UPDATE derived_metric_definitions
SET site_scopes_json = '["cl"]'
WHERE metric_key = 'factoryCircuit.jungliTotalPower'
  AND managed = 1
  AND site_scopes_json IS NULL;

UPDATE derived_metric_definitions
SET site_scopes_json = '["kn"]'
WHERE metric_key = 'factoryCircuit.guanyinTotalPower'
  AND managed = 1
  AND site_scopes_json IS NULL;
