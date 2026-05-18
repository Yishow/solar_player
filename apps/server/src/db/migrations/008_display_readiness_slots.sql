ALTER TABLE circuit_configs ADD COLUMN display_slot TEXT;

UPDATE circuit_configs
SET display_slot = CASE
  WHEN mqtt_topic = 'factory/power/production' THEN 'production'
  WHEN mqtt_topic = 'factory/power/hvac' THEN 'hvac'
  WHEN mqtt_topic = 'factory/power/lighting' THEN 'lighting'
  WHEN mqtt_topic = 'factory/power/office' THEN 'office'
  WHEN mqtt_topic = 'factory/power/ev_green' THEN 'ev'
  WHEN mqtt_topic = 'factory/power/infrastructure' THEN 'infrastructure'
  ELSE display_slot
END
WHERE display_slot IS NULL;
