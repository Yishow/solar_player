ALTER TABLE meter_readings_accepted ADD COLUMN selector_version INTEGER;
ALTER TABLE meter_readings_accepted ADD COLUMN selector_timestamp_path TEXT;
ALTER TABLE meter_readings_accepted ADD COLUMN source_timestamp_raw TEXT;
ALTER TABLE meter_readings_accepted ADD COLUMN measurement_kind TEXT;

ALTER TABLE meter_readings_quarantine ADD COLUMN selector_version INTEGER;
ALTER TABLE meter_readings_quarantine ADD COLUMN selector_timestamp_path TEXT;
ALTER TABLE meter_readings_quarantine ADD COLUMN source_timestamp_raw TEXT;
ALTER TABLE meter_readings_quarantine ADD COLUMN measurement_kind TEXT;
