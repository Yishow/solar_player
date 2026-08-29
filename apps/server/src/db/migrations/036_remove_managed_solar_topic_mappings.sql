DELETE FROM topic_mappings
WHERE (
    metric_scope = 'cl'
    AND topic = 'solar/CL/summary'
    AND (
      (metric_key = 'factoryGeneration.todayMwh' AND value_path = '$.today_mwh')
      OR (metric_key = 'factoryGeneration.monthMwh' AND value_path = '$.month_mwh')
      OR (metric_key = 'factoryGeneration.totalMwh' AND value_path = '$.total_mwh')
    )
  )
  OR (
    metric_scope = 'kn'
    AND topic = 'solar/KN/summary'
    AND (
      (metric_key = 'factoryGeneration.todayMwh' AND value_path = '$.today_mwh')
      OR (metric_key = 'factoryGeneration.monthMwh' AND value_path = '$.month_mwh')
      OR (metric_key = 'factoryGeneration.totalMwh' AND value_path = '$.total_mwh')
    )
  );

UPDATE topic_mappings
SET enabled = 0
WHERE metric_scope IN ('cl', 'kn')
  AND enabled = 1
  AND (
    metric_key LIKE 'factoryGeneration.%'
    OR metric_key LIKE 'solarZone.%'
  );
