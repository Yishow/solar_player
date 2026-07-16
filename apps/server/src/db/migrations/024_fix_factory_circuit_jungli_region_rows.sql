-- Migration 023 wrote the current Jungli rows to root-level keys, while the
-- persisted display-page envelope keeps runtime regions under $.regions.
-- Repair the nested runtime paths and remove only the two mistaken root keys.
UPDATE display_page_configs
SET
  config_json = json_remove(
    json_set(
      config_json,
      '$.regions.loadRows',
      json('{"stamping":{"height":84,"left":1392,"top":160,"width":470},"body":{"height":84,"left":1392,"top":255,"width":470},"painting":{"height":84,"left":1392,"top":350,"width":470},"assembly":{"height":84,"left":1392,"top":445,"width":470},"utility":{"height":84,"left":1392,"top":540,"width":470},"office":{"height":84,"left":1392,"top":635,"width":470}}'),
      '$.regions.loadRowStates',
      json('{"stamping":{},"body":{},"painting":{},"assembly":{},"utility":{},"office":{}}')
    ),
    '$.loadRows',
    '$.loadRowStates'
  ),
  updated_at = CURRENT_TIMESTAMP
WHERE page_key = 'factory-circuit'
  AND json_valid(config_json) = 1
  AND (
    json_type(config_json, '$.regions.loadRows.production') IS NOT NULL
    OR json_type(config_json, '$.regions.loadRows.hvac') IS NOT NULL
    OR json_type(config_json, '$.regions.loadRows.lighting') IS NOT NULL
    OR json_type(config_json, '$.regions.loadRows.ev') IS NOT NULL
    OR json_type(config_json, '$.regions.loadRows.infrastructure') IS NOT NULL
    OR json_type(config_json, '$.regions.loadRowStates.production') IS NOT NULL
    OR json_type(config_json, '$.regions.loadRowStates.hvac') IS NOT NULL
    OR json_type(config_json, '$.regions.loadRowStates.lighting') IS NOT NULL
    OR json_type(config_json, '$.regions.loadRowStates.ev') IS NOT NULL
    OR json_type(config_json, '$.regions.loadRowStates.infrastructure') IS NOT NULL
    OR json_extract(config_json, '$.regions.loadRows.stamping.top') IS NOT 160
    OR json_extract(config_json, '$.regions.loadRows.body.top') IS NOT 255
    OR json_extract(config_json, '$.regions.loadRows.painting.top') IS NOT 350
    OR json_extract(config_json, '$.regions.loadRows.assembly.top') IS NOT 445
    OR json_extract(config_json, '$.regions.loadRows.utility.top') IS NOT 540
    OR json_extract(config_json, '$.regions.loadRows.office.top') IS NOT 635
    OR json_type(config_json, '$.loadRows') IS NOT NULL
    OR json_type(config_json, '$.loadRowStates') IS NOT NULL
  );

UPDATE display_page_stage_configs
SET
  config_json = json_remove(
    json_set(
      config_json,
      '$.regions.loadRows',
      json('{"stamping":{"height":84,"left":1392,"top":160,"width":470},"body":{"height":84,"left":1392,"top":255,"width":470},"painting":{"height":84,"left":1392,"top":350,"width":470},"assembly":{"height":84,"left":1392,"top":445,"width":470},"utility":{"height":84,"left":1392,"top":540,"width":470},"office":{"height":84,"left":1392,"top":635,"width":470}}'),
      '$.regions.loadRowStates',
      json('{"stamping":{},"body":{},"painting":{},"assembly":{},"utility":{},"office":{}}')
    ),
    '$.loadRows',
    '$.loadRowStates'
  ),
  version = version + 1,
  updated_at = CURRENT_TIMESTAMP,
  published_by = CASE WHEN stage = 'live' THEN 'system-migration' ELSE published_by END
WHERE page_key = 'factory-circuit'
  AND json_valid(config_json) = 1
  AND (
    json_type(config_json, '$.regions.loadRows.production') IS NOT NULL
    OR json_type(config_json, '$.regions.loadRows.hvac') IS NOT NULL
    OR json_type(config_json, '$.regions.loadRows.lighting') IS NOT NULL
    OR json_type(config_json, '$.regions.loadRows.ev') IS NOT NULL
    OR json_type(config_json, '$.regions.loadRows.infrastructure') IS NOT NULL
    OR json_type(config_json, '$.regions.loadRowStates.production') IS NOT NULL
    OR json_type(config_json, '$.regions.loadRowStates.hvac') IS NOT NULL
    OR json_type(config_json, '$.regions.loadRowStates.lighting') IS NOT NULL
    OR json_type(config_json, '$.regions.loadRowStates.ev') IS NOT NULL
    OR json_type(config_json, '$.regions.loadRowStates.infrastructure') IS NOT NULL
    OR json_extract(config_json, '$.regions.loadRows.stamping.top') IS NOT 160
    OR json_extract(config_json, '$.regions.loadRows.body.top') IS NOT 255
    OR json_extract(config_json, '$.regions.loadRows.painting.top') IS NOT 350
    OR json_extract(config_json, '$.regions.loadRows.assembly.top') IS NOT 445
    OR json_extract(config_json, '$.regions.loadRows.utility.top') IS NOT 540
    OR json_extract(config_json, '$.regions.loadRows.office.top') IS NOT 635
    OR json_type(config_json, '$.loadRows') IS NOT NULL
    OR json_type(config_json, '$.loadRowStates') IS NOT NULL
  );
