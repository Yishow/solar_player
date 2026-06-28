-- Allow operators to author custom Chinese/English display names per topic
-- mapping so the Topic workspace name becomes the source of truth for playback
-- metric labels. NULL means "no custom name" and falls back to built-in defaults.
ALTER TABLE topic_mappings ADD COLUMN name_zh TEXT;
ALTER TABLE topic_mappings ADD COLUMN name_en TEXT;
