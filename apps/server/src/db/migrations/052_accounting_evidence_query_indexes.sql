-- Bounded accounting evidence reads (bound-accounting-evidence-window-reads).
-- Both indexes are keyed on the same evidence-instant expression the service
-- queries use, so period, daily and projection-fingerprint reads seek a
-- channel's window instead of scanning a scope's whole history. They are
-- non-unique and purely additive: no row value, uniqueness contract or retention
-- changes, and older code that does not use them is unaffected.
CREATE INDEX IF NOT EXISTS meter_readings_accepted_channel_instant
  ON meter_readings_accepted (
    metric_scope,
    channel_id,
    CAST(ROUND(unixepoch(COALESCE(source_timestamp, received_at), 'subsec') * 1000) AS INTEGER)
  );

CREATE INDEX IF NOT EXISTS meter_readings_accepted_identity_instant
  ON meter_readings_accepted (
    metric_scope,
    channel_id,
    meter_id,
    source_revision,
    epoch_id,
    CAST(ROUND(unixepoch(COALESCE(source_timestamp, received_at), 'subsec') * 1000) AS INTEGER)
  );
