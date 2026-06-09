-- Record instantaneous generation power alongside cumulative generation energy
-- so the Overview generation trend can render a daily solar power profile.
ALTER TABLE metric_snapshots ADD COLUMN generation_power REAL;
