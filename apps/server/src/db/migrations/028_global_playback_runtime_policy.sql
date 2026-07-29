CREATE TABLE IF NOT EXISTS playback_runtime_policy (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  transition_type TEXT NOT NULL DEFAULT 'fade' CHECK (
    transition_type IN ('fade', 'slide', 'none')
  ),
  transition_speed INTEGER NOT NULL DEFAULT 250,
  enforce_fresh_runtime_data BOOLEAN NOT NULL DEFAULT 1 CHECK (
    enforce_fresh_runtime_data IN (0, 1)
  ),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO playback_runtime_policy (
  id,
  transition_type,
  transition_speed,
  enforce_fresh_runtime_data,
  updated_at
)
SELECT
  1,
  CASE
    WHEN profile_settings.transition_type IN ('fade', 'slide', 'none')
      THEN profile_settings.transition_type
    ELSE 'fade'
  END,
  COALESCE(profile_settings.transition_speed, 250),
  COALESCE(profile_settings.enforce_fresh_runtime_data, 1),
  COALESCE(profile_settings.updated_at, CURRENT_TIMESTAMP)
FROM playback_profile_settings AS profile_settings
INNER JOIN playback_profiles AS profile
  ON profile.id = profile_settings.profile_id
WHERE profile.profile_key = 'default'
  AND profile.is_default = 1
  AND NOT EXISTS (
    SELECT 1
    FROM playback_runtime_policy
    WHERE id = 1
  )
LIMIT 1;
