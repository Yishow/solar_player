-- Normalize installed Jungli editor configs that still use the original
-- production/hvac/lighting/office/ev/infrastructure row keys. Keep every
-- unrelated editor-authored field intact and leave Guanyin untouched.
UPDATE display_page_configs
SET
  config_json = json_set(
    config_json,
    '$.loadRows',
    json('{"stamping":{"height":84,"left":1392,"top":160,"width":470},"body":{"height":84,"left":1392,"top":255,"width":470},"painting":{"height":84,"left":1392,"top":350,"width":470},"assembly":{"height":84,"left":1392,"top":445,"width":470},"utility":{"height":84,"left":1392,"top":540,"width":470},"office":{"height":84,"left":1392,"top":635,"width":470}}'),
    '$.loadRowStates',
    json('{"stamping":{},"body":{},"painting":{},"assembly":{},"utility":{},"office":{}}')
  ),
  updated_at = CURRENT_TIMESTAMP
WHERE page_key = 'factory-circuit'
  AND json_valid(config_json) = 1
  AND (
    json_type(config_json, '$.loadRows.production') IS NOT NULL
    OR json_type(config_json, '$.loadRows.hvac') IS NOT NULL
    OR json_type(config_json, '$.loadRows.lighting') IS NOT NULL
    OR json_type(config_json, '$.loadRows.ev') IS NOT NULL
    OR json_type(config_json, '$.loadRows.infrastructure') IS NOT NULL
    OR json_type(config_json, '$.loadRowStates.production') IS NOT NULL
    OR json_type(config_json, '$.loadRowStates.hvac') IS NOT NULL
    OR json_type(config_json, '$.loadRowStates.lighting') IS NOT NULL
    OR json_type(config_json, '$.loadRowStates.ev') IS NOT NULL
    OR json_type(config_json, '$.loadRowStates.infrastructure') IS NOT NULL
    OR json_extract(config_json, '$.loadRows.stamping.top') IS NOT 160
    OR json_extract(config_json, '$.loadRows.body.top') IS NOT 255
    OR json_extract(config_json, '$.loadRows.painting.top') IS NOT 350
    OR json_extract(config_json, '$.loadRows.assembly.top') IS NOT 445
    OR json_extract(config_json, '$.loadRows.utility.top') IS NOT 540
    OR json_extract(config_json, '$.loadRows.office.top') IS NOT 635
  );

UPDATE display_page_stage_configs
SET
  config_json = json_set(
    config_json,
    '$.loadRows',
    json('{"stamping":{"height":84,"left":1392,"top":160,"width":470},"body":{"height":84,"left":1392,"top":255,"width":470},"painting":{"height":84,"left":1392,"top":350,"width":470},"assembly":{"height":84,"left":1392,"top":445,"width":470},"utility":{"height":84,"left":1392,"top":540,"width":470},"office":{"height":84,"left":1392,"top":635,"width":470}}'),
    '$.loadRowStates',
    json('{"stamping":{},"body":{},"painting":{},"assembly":{},"utility":{},"office":{}}')
  ),
  version = version + 1,
  updated_at = CURRENT_TIMESTAMP,
  published_by = CASE WHEN stage = 'live' THEN 'system-migration' ELSE published_by END
WHERE page_key = 'factory-circuit'
  AND json_valid(config_json) = 1
  AND (
    json_type(config_json, '$.loadRows.production') IS NOT NULL
    OR json_type(config_json, '$.loadRows.hvac') IS NOT NULL
    OR json_type(config_json, '$.loadRows.lighting') IS NOT NULL
    OR json_type(config_json, '$.loadRows.ev') IS NOT NULL
    OR json_type(config_json, '$.loadRows.infrastructure') IS NOT NULL
    OR json_type(config_json, '$.loadRowStates.production') IS NOT NULL
    OR json_type(config_json, '$.loadRowStates.hvac') IS NOT NULL
    OR json_type(config_json, '$.loadRowStates.lighting') IS NOT NULL
    OR json_type(config_json, '$.loadRowStates.ev') IS NOT NULL
    OR json_type(config_json, '$.loadRowStates.infrastructure') IS NOT NULL
    OR json_extract(config_json, '$.loadRows.stamping.top') IS NOT 160
    OR json_extract(config_json, '$.loadRows.body.top') IS NOT 255
    OR json_extract(config_json, '$.loadRows.painting.top') IS NOT 350
    OR json_extract(config_json, '$.loadRows.assembly.top') IS NOT 445
    OR json_extract(config_json, '$.loadRows.utility.top') IS NOT 540
    OR json_extract(config_json, '$.loadRows.office.top') IS NOT 635
  );

UPDATE circuit_configs
SET enabled = 0, updated_at = CURRENT_TIMESTAMP
WHERE page_key = 'factory-circuit'
  AND display_slot IN ('production', 'hvac', 'lighting', 'ev', 'infrastructure')
  AND enabled <> 0;

UPDATE circuit_configs
SET
  name_zh = '事務系',
  name_en = 'Office & Administration',
  icon = 'settings-2',
  mqtt_topic = 'factory/power/office',
  rated_capacity = 200,
  normal_min = 0,
  normal_max = 140,
  attention_min = 140,
  attention_max = 180,
  warning_min = 180,
  warning_max = 200,
  display_order = 6,
  enabled = 1,
  updated_at = CURRENT_TIMESTAMP
WHERE page_key = 'factory-circuit'
  AND display_slot = 'office'
  AND (
    name_zh IS NOT '事務系'
    OR name_en IS NOT 'Office & Administration'
    OR icon IS NOT 'settings-2'
    OR mqtt_topic IS NOT 'factory/power/office'
    OR rated_capacity IS NOT 200
    OR normal_min IS NOT 0
    OR normal_max IS NOT 140
    OR attention_min IS NOT 140
    OR attention_max IS NOT 180
    OR warning_min IS NOT 180
    OR warning_max IS NOT 200
    OR display_order IS NOT 6
    OR enabled IS NOT 1
  );

UPDATE topic_mappings
SET name_zh = '事務系', name_en = 'Office & Administration'
WHERE metric_key = 'factoryOfficePower'
  AND (name_zh IS NOT '事務系' OR name_en IS NOT 'Office & Administration');
