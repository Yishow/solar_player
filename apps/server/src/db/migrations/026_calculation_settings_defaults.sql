UPDATE calculation_settings
SET
  carbon_emission_factor = 0.467,
  tree_equivalent_factor = 0.16,
  household_daily_usage_kwh = 13,
  household_monthly_usage_kwh = 400,
  estimated_tariff_per_kwh = 4.5,
  updated_at = CURRENT_TIMESTAMP
WHERE id = 1;
