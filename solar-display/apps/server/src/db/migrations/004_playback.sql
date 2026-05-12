CREATE TABLE IF NOT EXISTS playback_pages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  page_key TEXT,
  route TEXT,
  label_zh TEXT,
  label_en TEXT,
  enabled BOOLEAN DEFAULT 1,
  display_order INTEGER,
  duration_seconds INTEGER DEFAULT 15
);

CREATE TABLE IF NOT EXISTS playback_settings (
  id INTEGER PRIMARY KEY,
  autoplay BOOLEAN DEFAULT 1,
  loop BOOLEAN DEFAULT 1,
  start_page INTEGER DEFAULT 0,
  transition_type TEXT DEFAULT 'fade',
  transition_speed INTEGER DEFAULT 1000,
  schedule_enabled BOOLEAN DEFAULT 0,
  schedule_start TEXT,
  schedule_end TEXT,
  repeat_days TEXT,
  idle_mode BOOLEAN DEFAULT 0,
  idle_timeout INTEGER DEFAULT 300,
  brightness INTEGER DEFAULT 100,
  orientation TEXT DEFAULT 'landscape',
  updated_at DATETIME
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_playback_pages_page_key
  ON playback_pages(page_key);

CREATE INDEX IF NOT EXISTS idx_playback_pages_display_order
  ON playback_pages(display_order);

INSERT INTO playback_settings (
  id,
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
  updated_at
)
SELECT
  1,
  1,
  1,
  0,
  'fade',
  1000,
  0,
  '08:00',
  '18:00',
  '1,2,3,4,5',
  0,
  300,
  100,
  'landscape',
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1 FROM playback_settings WHERE id = 1
);

UPDATE playback_pages
SET
  page_key = COALESCE(NULLIF(TRIM(page_key), ''), 'page-' || id),
  route = COALESCE(NULLIF(TRIM(route), ''), '/overview'),
  label_zh = COALESCE(NULLIF(TRIM(label_zh), ''), '未命名頁面'),
  label_en = COALESCE(NULLIF(TRIM(label_en), ''), 'Untitled Page'),
  enabled = COALESCE(enabled, 1),
  display_order = COALESCE(display_order, id),
  duration_seconds = COALESCE(duration_seconds, 15);

UPDATE playback_settings
SET
  autoplay = COALESCE(autoplay, 1),
  loop = COALESCE(loop, 1),
  start_page = COALESCE(start_page, 0),
  transition_type = CASE
    WHEN transition_type IN ('fade', 'slide', 'none') THEN transition_type
    ELSE 'fade'
  END,
  transition_speed = COALESCE(transition_speed, 1000),
  schedule_enabled = COALESCE(schedule_enabled, 0),
  schedule_start = COALESCE(schedule_start, '08:00'),
  schedule_end = COALESCE(schedule_end, '18:00'),
  repeat_days = COALESCE(repeat_days, '1,2,3,4,5'),
  idle_mode = COALESCE(idle_mode, 0),
  idle_timeout = COALESCE(idle_timeout, 300),
  brightness = COALESCE(brightness, 100),
  orientation = CASE
    WHEN orientation = 'portrait' THEN 'portrait'
    ELSE 'landscape'
  END,
  updated_at = COALESCE(updated_at, CURRENT_TIMESTAMP);
