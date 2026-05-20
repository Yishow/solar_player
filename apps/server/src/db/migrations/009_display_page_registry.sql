CREATE TABLE IF NOT EXISTS display_page_registry (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  page_key TEXT NOT NULL UNIQUE,
  template_key TEXT NOT NULL CHECK (
    template_key IN ('overview', 'solar', 'factory-circuit', 'images', 'sustainability')
  ),
  route_slug TEXT NOT NULL UNIQUE,
  label_zh TEXT NOT NULL,
  label_en TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT 1,
  archived_at TEXT,
  display_order INTEGER NOT NULL,
  duration_seconds INTEGER NOT NULL DEFAULT 15,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_display_page_registry_display_order
  ON display_page_registry(display_order);

INSERT INTO display_page_registry (
  page_key,
  template_key,
  route_slug,
  label_zh,
  label_en,
  enabled,
  archived_at,
  display_order,
  duration_seconds,
  created_at,
  updated_at
)
SELECT
  playback_pages.page_key,
  playback_pages.page_key,
  CASE
    WHEN TRIM(COALESCE(playback_pages.route, '')) = '' THEN playback_pages.page_key
    WHEN SUBSTR(TRIM(playback_pages.route), 1, 1) = '/' THEN
      COALESCE(NULLIF(SUBSTR(TRIM(playback_pages.route), 2), ''), playback_pages.page_key)
    ELSE TRIM(playback_pages.route)
  END,
  COALESCE(NULLIF(TRIM(playback_pages.label_zh), ''), playback_pages.page_key),
  COALESCE(NULLIF(TRIM(playback_pages.label_en), ''), playback_pages.page_key),
  COALESCE(playback_pages.enabled, 1),
  NULL,
  COALESCE(playback_pages.display_order, playback_pages.id),
  COALESCE(playback_pages.duration_seconds, 15),
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM playback_pages
WHERE playback_pages.page_key IN ('overview', 'solar', 'factory-circuit', 'images', 'sustainability')
  AND NOT EXISTS (
    SELECT 1
    FROM display_page_registry AS registry
    WHERE registry.page_key = playback_pages.page_key
  );
