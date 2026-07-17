INSERT INTO topic_mappings (
  metric_key,
  topic,
  unit,
  value_path,
  multiplier,
  offset,
  decimal_places,
  enabled,
  name_zh,
  name_en,
  created_at,
  updated_at
)
VALUES
  ('factoryGeneration.cl.todayMwh', 'solar/CL/summary', 'MWh', '$.today_mwh', 1, 0, 3, 1, '中壢今日發電量', 'Jungli Today Generation', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('factoryGeneration.cl.monthMwh', 'solar/CL/summary', 'MWh', '$.month_mwh', 1, 0, 3, 1, '中壢本月發電量', 'Jungli Month Generation', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('factoryGeneration.cl.totalMwh', 'solar/CL/summary', 'MWh', '$.total_mwh', 1, 0, 3, 1, '中壢累積發電量', 'Jungli Total Generation', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('factoryGeneration.kn.todayMwh', 'solar/KN/summary', 'MWh', '$.today_mwh', 1, 0, 3, 1, '觀音今日發電量', 'Guanyin Today Generation', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('factoryGeneration.kn.monthMwh', 'solar/KN/summary', 'MWh', '$.month_mwh', 1, 0, 3, 1, '觀音本月發電量', 'Guanyin Month Generation', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('factoryGeneration.kn.totalMwh', 'solar/KN/summary', 'MWh', '$.total_mwh', 1, 0, 3, 1, '觀音累積發電量', 'Guanyin Total Generation', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT(metric_key) DO UPDATE SET
  topic = excluded.topic,
  unit = excluded.unit,
  value_path = excluded.value_path,
  multiplier = excluded.multiplier,
  offset = excluded.offset,
  decimal_places = excluded.decimal_places,
  enabled = excluded.enabled,
  name_zh = excluded.name_zh,
  name_en = excluded.name_en,
  updated_at = CURRENT_TIMESTAMP;

UPDATE topic_mappings
SET enabled = 0, updated_at = CURRENT_TIMESTAMP
WHERE metric_key IN (
  'todayGeneration',
  'monthGeneration',
  'totalGeneration',
  'todayCo2Reduction',
  'totalCo2Reduction'
);
