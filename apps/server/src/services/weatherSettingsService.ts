import type Database from "better-sqlite3";
import {
  DEFAULT_WEATHER_SETTINGS,
  isWeatherFieldKey,
  isWeatherFieldPreset,
  isWeatherLocationMode,
  type WeatherFieldKey,
  type WeatherSettings
} from "@solar-display/shared";
import { getDatabase } from "../db/index.js";

type WeatherSettingsRow = {
  county_name: string | null;
  enabled: number;
  field_keys_json: string | null;
  location_mode: string;
  preset: string;
  station_id: string | null;
};

export class WeatherSettingsValidationError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "WeatherSettingsValidationError";
    this.statusCode = statusCode;
  }
}

function normalizeNullableText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeFieldKeys(value: unknown): WeatherFieldKey[] {
  if (!Array.isArray(value)) {
    return DEFAULT_WEATHER_SETTINGS.fieldKeys;
  }

  const normalized = Array.from(
    new Set(
      value
        .filter((entry): entry is string => typeof entry === "string")
        .map((entry) => entry.trim())
        .filter((entry): entry is WeatherFieldKey => isWeatherFieldKey(entry))
    )
  );

  return normalized.length > 0 ? normalized : DEFAULT_WEATHER_SETTINGS.fieldKeys;
}

export function normalizeWeatherSettingsInput(input: Partial<WeatherSettings>): WeatherSettings {
  const locationMode = typeof input.locationMode === "string" ? input.locationMode.trim() : "";
  if (!isWeatherLocationMode(locationMode)) {
    throw new WeatherSettingsValidationError("Weather locationMode is invalid");
  }

  const preset = typeof input.preset === "string" ? input.preset.trim() : "";
  if (!isWeatherFieldPreset(preset)) {
    throw new WeatherSettingsValidationError("Weather preset is invalid");
  }

  return {
    countyName: normalizeNullableText(input.countyName),
    enabled: input.enabled === true,
    fieldKeys: normalizeFieldKeys(input.fieldKeys),
    locationMode,
    preset,
    stationId: normalizeNullableText(input.stationId)
  };
}

function parseStoredFieldKeys(raw: string | null) {
  if (!raw) {
    return DEFAULT_WEATHER_SETTINGS.fieldKeys;
  }

  try {
    return normalizeFieldKeys(JSON.parse(raw));
  } catch {
    return DEFAULT_WEATHER_SETTINGS.fieldKeys;
  }
}

function serializeWeatherSettings(row: WeatherSettingsRow | undefined): WeatherSettings {
  if (!row) {
    return DEFAULT_WEATHER_SETTINGS;
  }

  return {
    countyName: row.county_name,
    enabled: row.enabled === 1,
    fieldKeys: parseStoredFieldKeys(row.field_keys_json),
    locationMode: isWeatherLocationMode(row.location_mode)
      ? row.location_mode
      : DEFAULT_WEATHER_SETTINGS.locationMode,
    preset: isWeatherFieldPreset(row.preset) ? row.preset : DEFAULT_WEATHER_SETTINGS.preset,
    stationId: row.station_id
  };
}

function readRow(database: Database.Database) {
  return database
    .prepare(
      `
        SELECT
          enabled,
          location_mode,
          county_name,
          station_id,
          preset,
          field_keys_json
        FROM weather_settings
        WHERE id = 1
      `
    )
    .get() as WeatherSettingsRow | undefined;
}

export function readWeatherSettings(database: Database.Database = getDatabase()) {
  return serializeWeatherSettings(readRow(database));
}

export function saveWeatherSettings(
  input: Partial<WeatherSettings>,
  database: Database.Database = getDatabase()
) {
  const normalized = normalizeWeatherSettingsInput(input);

  database
    .prepare(
      `
        INSERT INTO weather_settings (
          id,
          enabled,
          location_mode,
          county_name,
          station_id,
          preset,
          field_keys_json,
          updated_at
        ) VALUES (1, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(id) DO UPDATE SET
          enabled = excluded.enabled,
          location_mode = excluded.location_mode,
          county_name = excluded.county_name,
          station_id = excluded.station_id,
          preset = excluded.preset,
          field_keys_json = excluded.field_keys_json,
          updated_at = CURRENT_TIMESTAMP
      `
    )
    .run(
      normalized.enabled ? 1 : 0,
      normalized.locationMode,
      normalized.countyName,
      normalized.stationId,
      normalized.preset,
      JSON.stringify(normalized.fieldKeys)
    );

  return normalized;
}
