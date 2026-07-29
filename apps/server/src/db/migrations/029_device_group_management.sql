CREATE TABLE IF NOT EXISTS device_groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  site_scope TEXT NOT NULL CHECK (site_scope IN ('cl', 'kn')),
  playback_profile_id INTEGER NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (playback_profile_id) REFERENCES playback_profiles(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS devices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  group_id INTEGER,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (enabled = 0 OR group_id IS NOT NULL),
  FOREIGN KEY (group_id) REFERENCES device_groups(id) ON DELETE RESTRICT
);

CREATE TRIGGER IF NOT EXISTS devices_require_active_group_on_insert
BEFORE INSERT ON devices
FOR EACH ROW
WHEN NEW.enabled = 1
  AND EXISTS (
    SELECT 1
    FROM device_groups
    WHERE id = NEW.group_id AND enabled = 0
  )
BEGIN
  SELECT RAISE(ABORT, 'enabled_device_requires_active_group');
END;

CREATE TRIGGER IF NOT EXISTS devices_require_active_group_on_update
BEFORE UPDATE OF enabled, group_id ON devices
FOR EACH ROW
WHEN NEW.enabled = 1
  AND (
    OLD.enabled <> 1
    OR NEW.group_id IS NOT OLD.group_id
  )
  AND EXISTS (
    SELECT 1
    FROM device_groups
    WHERE id = NEW.group_id AND enabled = 0
  )
BEGIN
  SELECT RAISE(ABORT, 'enabled_device_requires_active_group');
END;
