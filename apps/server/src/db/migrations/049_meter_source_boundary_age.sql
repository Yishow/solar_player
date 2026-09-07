ALTER TABLE meter_sources
  ADD COLUMN boundary_max_age_seconds INTEGER NOT NULL DEFAULT 300
  CHECK (boundary_max_age_seconds > 0);
