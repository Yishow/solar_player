ALTER TABLE playback_settings
  ADD COLUMN enforce_fresh_runtime_data BOOLEAN DEFAULT 1;

UPDATE playback_settings
SET enforce_fresh_runtime_data = COALESCE(enforce_fresh_runtime_data, 1);
