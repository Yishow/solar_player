export const weatherFieldKeys = [
  "weather",
  "airTemperature",
  "relativeHumidity",
  "observationTime",
  "windSpeed",
  "windDirection",
  "airPressure",
  "precipitation",
  "dailyHigh",
  "dailyLow"
] as const;

export type WeatherFieldKey = (typeof weatherFieldKeys)[number];

export const weatherFieldPresets = ["standard", "custom"] as const;
export type WeatherFieldPreset = (typeof weatherFieldPresets)[number];

export const weatherLocationModes = ["station", "county"] as const;
export type WeatherLocationMode = (typeof weatherLocationModes)[number];

export const weatherFetchStates = ["fresh", "stale", "unconfigured", "unavailable"] as const;
export type WeatherFetchState = (typeof weatherFetchStates)[number];

export type WeatherSettings = {
  countyName: string | null;
  enabled: boolean;
  fieldKeys: WeatherFieldKey[];
  locationMode: WeatherLocationMode;
  preset: WeatherFieldPreset;
  stationId: string | null;
};

export type WeatherStationOption = {
  countyName: string;
  stationId: string;
  stationName: string;
  townName: string;
};

export type WeatherOptionsResponse = {
  counties: string[];
  fetchState: WeatherFetchState;
  stations: WeatherStationOption[];
  updatedAt: string | null;
};

export type WeatherCurrentSnapshot = {
  airPressure: number | null;
  airTemperature: number | null;
  countyName: string | null;
  dailyHigh: number | null;
  dailyLow: number | null;
  fetchState: WeatherFetchState;
  observationTime: string | null;
  precipitation: number | null;
  relativeHumidity: number | null;
  staleAt: string | null;
  stationId: string | null;
  stationName: string | null;
  townName: string | null;
  updatedAt: string | null;
  weather: string | null;
  windDirection: number | null;
  windSpeed: number | null;
};

export const DEFAULT_WEATHER_FIELD_KEYS: WeatherFieldKey[] = [
  "weather",
  "airTemperature",
  "relativeHumidity",
  "observationTime"
];

export const DEFAULT_WEATHER_SETTINGS: WeatherSettings = {
  countyName: null,
  enabled: false,
  fieldKeys: DEFAULT_WEATHER_FIELD_KEYS,
  locationMode: "station",
  preset: "standard",
  stationId: null
};

export function isWeatherFieldKey(value: string): value is WeatherFieldKey {
  return weatherFieldKeys.includes(value as WeatherFieldKey);
}

export function isWeatherFieldPreset(value: string): value is WeatherFieldPreset {
  return weatherFieldPresets.includes(value as WeatherFieldPreset);
}

export function isWeatherLocationMode(value: string): value is WeatherLocationMode {
  return weatherLocationModes.includes(value as WeatherLocationMode);
}
