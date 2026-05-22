CREATE TABLE IF NOT EXISTS brand_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  brand_name_zh TEXT NOT NULL DEFAULT '',
  brand_name_en TEXT NOT NULL DEFAULT '',
  product_title_zh TEXT NOT NULL DEFAULT '',
  product_title_en TEXT NOT NULL DEFAULT '',
  slogan_zh TEXT NOT NULL DEFAULT '',
  slogan_en TEXT NOT NULL DEFAULT '',
  logo_filename TEXT,
  logo_mime_type TEXT,
  logo_width INTEGER,
  logo_height INTEGER,
  logo_file_size INTEGER,
  is_active INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_brand_profiles_active ON brand_profiles(is_active);

INSERT INTO brand_profiles (
  name, brand_name_zh, brand_name_en, product_title_zh, product_title_en,
  slogan_zh, slogan_en, is_active
)
SELECT
  '預設品牌', '國瑞汽車', 'KUOZUI MOTORS',
  '國瑞汽車綠能展示播放器', 'KUOZUI GREEN ENERGY DISPLAY PLAYER',
  '永續，從現在開始', '/ Sustainability Starts with Us', 1
WHERE NOT EXISTS (SELECT 1 FROM brand_profiles);
