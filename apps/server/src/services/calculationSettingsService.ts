import type Database from "better-sqlite3";
import { getDatabase } from "../db/index.js";

type CalculationSettingsRow = {
  carbon_emission_factor: number | null;
  estimated_tariff_per_kwh: number | null;
  household_daily_usage_kwh: number | null;
  household_monthly_usage_kwh: number | null;
  tree_equivalent_factor: number | null;
};

export type CalculationSettings = {
  carbonEmissionFactor: number;
  estimatedTariffPerKwh: number;
  householdDailyUsageKwh: number;
  householdMonthlyUsageKwh: number;
  treeEquivalentFactor: number;
};

export const DEFAULT_CALCULATION_SETTINGS: CalculationSettings = {
  carbonEmissionFactor: 0.495,
  estimatedTariffPerKwh: 5,
  householdDailyUsageKwh: 4,
  householdMonthlyUsageKwh: 120,
  treeEquivalentFactor: 2.6
};

export class CalculationSettingsValidationError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "CalculationSettingsValidationError";
    this.statusCode = statusCode;
  }
}

function normalizePositiveNumber(value: unknown, fieldName: keyof CalculationSettings) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new CalculationSettingsValidationError(
      `Calculation ${fieldName} must be a positive number`
    );
  }

  return value;
}

function resolveStoredNumber(
  value: number | null | undefined,
  fallback: keyof typeof DEFAULT_CALCULATION_SETTINGS
) {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : DEFAULT_CALCULATION_SETTINGS[fallback];
}

function serializeCalculationSettings(
  row: CalculationSettingsRow | undefined
): CalculationSettings {
  if (!row) {
    return DEFAULT_CALCULATION_SETTINGS;
  }

  return {
    carbonEmissionFactor: resolveStoredNumber(row.carbon_emission_factor, "carbonEmissionFactor"),
    estimatedTariffPerKwh: resolveStoredNumber(
      row.estimated_tariff_per_kwh,
      "estimatedTariffPerKwh"
    ),
    householdDailyUsageKwh: resolveStoredNumber(
      row.household_daily_usage_kwh,
      "householdDailyUsageKwh"
    ),
    householdMonthlyUsageKwh: resolveStoredNumber(
      row.household_monthly_usage_kwh,
      "householdMonthlyUsageKwh"
    ),
    treeEquivalentFactor: resolveStoredNumber(
      row.tree_equivalent_factor,
      "treeEquivalentFactor"
    )
  };
}

function readRow(database: Database.Database) {
  return database
    .prepare(
      `
        SELECT
          carbon_emission_factor,
          tree_equivalent_factor,
          household_daily_usage_kwh,
          household_monthly_usage_kwh,
          estimated_tariff_per_kwh
        FROM calculation_settings
        WHERE id = 1
      `
    )
    .get() as CalculationSettingsRow | undefined;
}

export function readCalculationSettings(database: Database.Database = getDatabase()) {
  return serializeCalculationSettings(readRow(database));
}

export function normalizeCalculationSettingsInput(
  input: Partial<CalculationSettings>
): CalculationSettings {
  return {
    carbonEmissionFactor: normalizePositiveNumber(
      input.carbonEmissionFactor,
      "carbonEmissionFactor"
    ),
    estimatedTariffPerKwh: normalizePositiveNumber(
      input.estimatedTariffPerKwh,
      "estimatedTariffPerKwh"
    ),
    householdDailyUsageKwh: normalizePositiveNumber(
      input.householdDailyUsageKwh,
      "householdDailyUsageKwh"
    ),
    householdMonthlyUsageKwh: normalizePositiveNumber(
      input.householdMonthlyUsageKwh,
      "householdMonthlyUsageKwh"
    ),
    treeEquivalentFactor: normalizePositiveNumber(
      input.treeEquivalentFactor,
      "treeEquivalentFactor"
    )
  };
}

export function saveCalculationSettings(
  input: Partial<CalculationSettings>,
  database: Database.Database = getDatabase()
) {
  const normalized = normalizeCalculationSettingsInput(input);

  database
    .prepare(
      `
        INSERT INTO calculation_settings (
          id,
          carbon_emission_factor,
          tree_equivalent_factor,
          household_daily_usage_kwh,
          household_monthly_usage_kwh,
          estimated_tariff_per_kwh,
          created_at,
          updated_at
        ) VALUES (1, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT(id) DO UPDATE SET
          carbon_emission_factor = excluded.carbon_emission_factor,
          tree_equivalent_factor = excluded.tree_equivalent_factor,
          household_daily_usage_kwh = excluded.household_daily_usage_kwh,
          household_monthly_usage_kwh = excluded.household_monthly_usage_kwh,
          estimated_tariff_per_kwh = excluded.estimated_tariff_per_kwh,
          updated_at = CURRENT_TIMESTAMP
      `
    )
    .run(
      normalized.carbonEmissionFactor,
      normalized.treeEquivalentFactor,
      normalized.householdDailyUsageKwh,
      normalized.householdMonthlyUsageKwh,
      normalized.estimatedTariffPerKwh
    );

  return normalized;
}
