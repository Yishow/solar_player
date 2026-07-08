UPDATE circuit_configs
SET page_key = 'factory-circuit-guanyin'
WHERE display_slot IN ('heavy_vehicle', 'ed_coating')
  AND page_key = 'factory-circuit'
  AND (
    mqtt_topic IN ('factory/power/heavy_vehicle', 'factory/power/ed_coating')
    OR name_zh IN ('大車工程', 'ED電著')
  );
