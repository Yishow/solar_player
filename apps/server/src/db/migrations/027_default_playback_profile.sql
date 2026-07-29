CREATE TABLE IF NOT EXISTS playback_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT 0 CHECK (is_default IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_playback_profiles_single_default
  ON playback_profiles(is_default)
  WHERE is_default = 1;

CREATE TABLE IF NOT EXISTS playback_profile_settings (
  profile_id INTEGER PRIMARY KEY,
  autoplay BOOLEAN NOT NULL DEFAULT 1,
  loop BOOLEAN NOT NULL DEFAULT 1,
  start_page INTEGER NOT NULL DEFAULT 0,
  transition_type TEXT NOT NULL DEFAULT 'fade' CHECK (
    transition_type IN ('fade', 'slide', 'none')
  ),
  transition_speed INTEGER NOT NULL DEFAULT 250,
  schedule_enabled BOOLEAN NOT NULL DEFAULT 0,
  schedule_start TEXT,
  schedule_end TEXT,
  repeat_days TEXT NOT NULL DEFAULT '',
  idle_mode TEXT NOT NULL DEFAULT 'disabled' CHECK (
    idle_mode IN ('disabled', 'return-to-start')
  ),
  idle_timeout INTEGER NOT NULL DEFAULT 300,
  brightness INTEGER NOT NULL DEFAULT 100,
  orientation TEXT NOT NULL DEFAULT 'landscape' CHECK (
    orientation IN ('landscape', 'portrait')
  ),
  enforce_fresh_runtime_data BOOLEAN NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (profile_id) REFERENCES playback_profiles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS playback_profile_pages (
  profile_id INTEGER NOT NULL,
  page_id INTEGER NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT 1,
  display_order INTEGER NOT NULL,
  duration_seconds INTEGER NOT NULL DEFAULT 15,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (profile_id, page_id),
  FOREIGN KEY (profile_id) REFERENCES playback_profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (page_id) REFERENCES display_page_registry(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_playback_profile_pages_order
  ON playback_profile_pages(profile_id, display_order, page_id);

INSERT INTO playback_profiles (
  profile_key,
  name,
  is_default,
  created_at,
  updated_at
)
SELECT
  'default',
  'Default Playback Profile',
  1,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1
  FROM playback_profiles
  WHERE profile_key = 'default' OR is_default = 1
);

INSERT INTO playback_profile_settings (
  profile_id,
  autoplay,
  loop,
  start_page,
  transition_type,
  transition_speed,
  schedule_enabled,
  schedule_start,
  schedule_end,
  repeat_days,
  idle_mode,
  idle_timeout,
  brightness,
  orientation,
  enforce_fresh_runtime_data,
  updated_at
)
SELECT
  profile.id,
  COALESCE(settings.autoplay, 1),
  COALESCE(settings.loop, 1),
  COALESCE(settings.start_page, 0),
  CASE
    WHEN settings.transition_type IN ('fade', 'slide', 'none') THEN settings.transition_type
    ELSE 'fade'
  END,
  COALESCE(settings.transition_speed, 250),
  COALESCE(settings.schedule_enabled, 0),
  settings.schedule_start,
  settings.schedule_end,
  COALESCE(settings.repeat_days, ''),
  CASE
    WHEN settings.idle_mode = 'return-to-start' THEN 'return-to-start'
    ELSE 'disabled'
  END,
  COALESCE(settings.idle_timeout, 300),
  COALESCE(settings.brightness, 100),
  CASE
    WHEN settings.orientation = 'portrait' THEN 'portrait'
    ELSE 'landscape'
  END,
  COALESCE(settings.enforce_fresh_runtime_data, 1),
  COALESCE(settings.updated_at, CURRENT_TIMESTAMP)
FROM playback_profiles AS profile
LEFT JOIN (
  SELECT *
  FROM playback_settings
  ORDER BY id ASC
  LIMIT 1
) AS settings ON 1 = 1
WHERE profile.profile_key = 'default'
  AND NOT EXISTS (
    SELECT 1
    FROM playback_profile_settings AS existing
    WHERE existing.profile_id = profile.id
  );

INSERT INTO playback_profile_pages (
  profile_id,
  page_id,
  enabled,
  display_order,
  duration_seconds,
  created_at,
  updated_at
)
SELECT
  profile.id,
  registry.id,
  COALESCE(registry.enabled, 1),
  COALESCE(registry.display_order, registry.id),
  COALESCE(registry.duration_seconds, 15),
  CURRENT_TIMESTAMP,
  COALESCE(registry.updated_at, CURRENT_TIMESTAMP)
FROM playback_profiles AS profile
CROSS JOIN display_page_registry AS registry
WHERE profile.profile_key = 'default'
  AND registry.archived_at IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM playback_profile_pages AS existing
    WHERE existing.profile_id = profile.id
      AND existing.page_id = registry.id
  );
