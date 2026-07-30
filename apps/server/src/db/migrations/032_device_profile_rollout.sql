ALTER TABLE device_groups ADD COLUMN desired_profile_version_id INTEGER
  REFERENCES playback_profile_versions(id) ON DELETE RESTRICT;

ALTER TABLE devices ADD COLUMN applied_profile_version_id INTEGER
  REFERENCES playback_profile_versions(id) ON DELETE RESTRICT;

ALTER TABLE devices ADD COLUMN profile_update_state TEXT NOT NULL DEFAULT 'waiting'
  CHECK (profile_update_state IN ('waiting', 'applied', 'failed'));

ALTER TABLE devices ADD COLUMN profile_update_error TEXT;
ALTER TABLE devices ADD COLUMN profile_update_at TEXT;

CREATE INDEX device_groups_desired_profile_version_idx
  ON device_groups(desired_profile_version_id);

CREATE INDEX devices_applied_profile_version_idx
  ON devices(applied_profile_version_id);

UPDATE device_groups
SET desired_profile_version_id = (
  SELECT versions.id
  FROM playback_profile_versions AS versions
  WHERE versions.profile_id = device_groups.playback_profile_id
  ORDER BY versions.version_number DESC
  LIMIT 1
);
