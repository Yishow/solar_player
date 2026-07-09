INSERT INTO topic_mappings (
  metric_key,
  topic,
  unit,
  value_path,
  multiplier,
  offset,
  decimal_places,
  enabled,
  created_at,
  updated_at
)
SELECT
  'factoryPeakMultiplier',
  'factory/peak_multiplier',
  'x',
  '$.value',
  1,
  0,
  2,
  1,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1 FROM topic_mappings WHERE metric_key = 'factoryPeakMultiplier'
);
