ALTER TABLE image_assets
  ADD COLUMN category TEXT NOT NULL DEFAULT 'background'
  CHECK (category IN ('background', 'object', 'icon'));

ALTER TABLE image_assets
  ADD COLUMN usage_scope TEXT NOT NULL DEFAULT 'both'
  CHECK (usage_scope IN ('both', 'page-only', 'shell-only'));
