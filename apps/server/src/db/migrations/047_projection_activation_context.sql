ALTER TABLE consumption_projections ADD COLUMN context_key TEXT NOT NULL DEFAULT '';
ALTER TABLE consumption_projections ADD COLUMN result_json TEXT;
ALTER TABLE consumption_projections ADD COLUMN expected_active_id TEXT;
ALTER TABLE consumption_projections ADD COLUMN previous_active_id TEXT;
ALTER TABLE consumption_projections ADD COLUMN input_checksum TEXT;
CREATE INDEX consumption_projection_context ON consumption_projections (metric_scope, range, context_key, active);
