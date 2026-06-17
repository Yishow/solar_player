import type { WeatherCurrentSnapshot } from "@solar-display/shared";

// Demo weather snapshot used when the backend runs in mock data mode but no
// CWA weather source is configured. Keeps the Overview weather card populated
// alongside the mock generation KPIs instead of showing the empty state.
export const mockWeatherSnapshot: WeatherCurrentSnapshot = {
  airPressure: 1012,
  airTemperature: 27,
  countyName: "桃園市",
  dailyHigh: 31,
  dailyLow: 24,
  fetchState: "fresh",
  observationTime: "2026-06-17T11:30:00+08:00",
  precipitation: 0,
  relativeHumidity: 68,
  staleAt: null,
  stationId: "C0C480",
  stationName: "中壢",
  townName: "中壢區",
  updatedAt: "2026-06-17T11:30:00+08:00",
  weather: "多雲",
  windDirection: 120,
  windSpeed: 2.4
};
