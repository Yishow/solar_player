ALTER TABLE playback_profiles ADD COLUMN archived_at TEXT;

CREATE TABLE playback_profile_drafts (
  profile_id INTEGER PRIMARY KEY,
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
  settings_json TEXT NOT NULL CHECK (json_valid(settings_json)),
  pages_json TEXT NOT NULL CHECK (json_valid(pages_json)),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (profile_id) REFERENCES playback_profiles(id) ON DELETE CASCADE
);

CREATE TABLE playback_profile_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id INTEGER NOT NULL,
  version_number INTEGER NOT NULL CHECK (version_number > 0),
  schema_version INTEGER NOT NULL DEFAULT 1 CHECK (schema_version = 1),
  snapshot_json TEXT NOT NULL CHECK (json_valid(snapshot_json)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT NOT NULL CHECK (length(trim(created_by)) > 0),
  rollback_from_version_id INTEGER,
  UNIQUE (profile_id, version_number),
  FOREIGN KEY (profile_id) REFERENCES playback_profiles(id) ON DELETE RESTRICT,
  FOREIGN KEY (rollback_from_version_id) REFERENCES playback_profile_versions(id)
    ON DELETE RESTRICT
);

CREATE INDEX playback_profile_versions_profile_idx
  ON playback_profile_versions(profile_id, version_number);

CREATE TRIGGER playback_profile_versions_immutable_update
BEFORE UPDATE ON playback_profile_versions
BEGIN
  SELECT RAISE(ABORT, 'playback_profile_versions are immutable');
END;

CREATE TRIGGER playback_profile_versions_immutable_delete
BEFORE DELETE ON playback_profile_versions
BEGIN
  SELECT RAISE(ABORT, 'playback_profile_versions are immutable');
END;
