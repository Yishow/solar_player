import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { WeatherDiagnostic, WeatherHeaderContract, WeatherOptionsResponse, WeatherSettings } from "@solar-display/shared";
import { DataHubWeatherContent } from "./Weather";

const weatherSource = readFileSync(new URL("./Weather.tsx", import.meta.url), "utf8");

const settings: WeatherSettings = {
  countyName: "臺北市",
  enabled: true,
  fieldKeys: ["weather", "airTemperature"],
  locationMode: "station",
  preset: "standard",
  stationId: "46692",
  updateIntervalMinutes: 30
};

const options: WeatherOptionsResponse = {
  counties: ["臺北市"],
  fetchState: "fresh",
  stations: [{ countyName: "臺北市", stationId: "46692", stationName: "臺北", townName: "中正區" }],
  updatedAt: "2026-08-31T03:00:00.000Z"
};

const preview: WeatherHeaderContract = {
  current: {
    airPressure: 1008,
    airTemperature: 28,
    countyName: "臺北市",
    dailyHigh: 30,
    dailyLow: 24,
    fetchState: "fresh",
    observationTime: "2026-08-31T03:00:00.000Z",
    precipitation: 0,
    relativeHumidity: 70,
    stationId: "46692",
    stationName: "臺北",
    staleAt: null,
    townName: "中正區",
    updatedAt: "2026-08-31T03:00:00.000Z",
    weather: "晴",
    windDirection: 0,
    windSpeed: 2
  },
  settings: {
    enabled: true,
    fieldKeys: settings.fieldKeys,
    locationMode: "station",
    preset: "standard",
    updateIntervalMinutes: 30
  }
};

function renderWeather(overrides: Partial<Parameters<typeof DataHubWeatherContent>[0]> = {}) {
  return renderToStaticMarkup(
    <DataHubWeatherContent
      errorMessage=""
      isDirty={true}
      isLoading={false}
      isSaving={false}
      message=""
      onChange={() => undefined}
      onSave={() => undefined}
      onToggleField={() => undefined}
      options={options}
      optionsErrorMessage=""
      preview={preview}
      previewErrorMessage=""
      settings={settings}
      {...overrides}
    />
  );
}

test("U1-R3-S02 weather with a site filter states shared non-applicability", () => {
  const html = renderWeather({ managementScope: "kn" });
  assert.match(html, /data-shared-infrastructure="weather"/);
  assert.match(html, /不會依廠區複製/);
  assert.match(html, /不只 KN/);
});

test("Weather content exposes enable, location, preset, custom-field, interval and preview controls", () => {
  const html = renderWeather({
    settings: { ...settings, fieldKeys: ["weather"], preset: "custom" }
  });

  assert.match(html, /data-data-hub-section="external-weather"/);
  assert.match(html, /啟用天氣顯示/);
  assert.match(html, /定位方式/);
  assert.match(html, /縣市/);
  assert.match(html, /測站/);
  assert.match(html, /精簡/);
  assert.match(html, /標準/);
  assert.match(html, /完整/);
  assert.match(html, /自訂/);
  assert.match(html, /自訂欄位/);
  assert.match(html, /天氣現象/);
  assert.match(html, /10 分鐘/);
  assert.match(html, /30 分鐘/);
  assert.match(html, /1 小時/);
  assert.match(html, /3 小時/);
  assert.match(html, /6 小時/);
  assert.match(html, /12 小時/);
  assert.match(html, /手動更新/);
  assert.match(html, /Header Preview/);
  assert.match(html, /臺北 晴 28°C/);
  assert.match(html, /儲存天氣設定/);
  assert.doesNotMatch(html, /\/api\/settings\/mqtt|Broker|Topic mappings/);
});

test("Weather content keeps save and section-local feedback visible", () => {
  const html = renderWeather({
    errorMessage: "儲存天氣設定失敗。",
    isDirty: false,
    message: "天氣設定已儲存。",
    optionsErrorMessage: "測站選項載入失敗。",
    previewErrorMessage: "Preview unavailable"
  });

  assert.match(html, /儲存天氣設定失敗/);
  assert.match(html, /天氣設定已儲存/);
  assert.match(html, /測站選項載入失敗/);
  assert.match(html, /Preview unavailable/);
  assert.match(html, /disabled=""/);
});

test("Weather content renders bounded diagnostics and fresh or stale current indicators", () => {
  const diagnostic = {
    code: "WEATHER_DNS_LOOKUP_FAILED",
    httpStatus: null,
    lastSuccessAt: "2026-08-31T03:00:00.000Z",
    occurredAt: "2026-08-31T03:01:00.000Z",
    operation: "current",
    retryable: true,
    safeSummary: "無法解析 CWA 主機名稱",
    source: "stale",
    state: "error",
    authorization: "Bearer secret-token",
    broker: "mqtt://broker.internal:1883",
    fullUrl: "https://cwa.example.invalid/v1/weather?authorization=secret-token",
    hostname: "weather.internal.example",
    rawException: "Error: raw upstream exception",
    stack: "Error: raw stack trace"
  } as WeatherDiagnostic & Record<string, unknown>;
  const html = renderWeather({
    preview: {
      ...preview,
      current: {
        ...preview.current,
        fetchState: "stale",
        staleAt: "2026-08-31T03:01:00.000Z"
      }
    },
    weatherDiagnostic: diagnostic
  } as never);

  assert.match(html, /data-weather-diagnostic-state="error"/);
  assert.match(html, /WEATHER_DNS_LOOKUP_FAILED/);
  assert.match(html, /目前顯示舊資料|使用舊資料/);
  assert.match(html, /data-weather-current-state="stale"/);
  assert.match(html, /data-weather-diagnostic-copy/);
  assert.doesNotMatch(html, /secret-token|broker\.internal|cwa\.example\.invalid|weather\.internal\.example/);

  const freshHtml = renderWeather({
    weatherDiagnostic: {
      code: null,
      httpStatus: null,
      lastSuccessAt: "2026-08-31T03:00:00.000Z",
      occurredAt: "2026-08-31T03:00:00.000Z",
      operation: "current",
      retryable: false,
      safeSummary: "CWA 天氣資料取得成功",
      source: "upstream",
      state: "ok"
    }
  } as never);
  assert.match(freshHtml, /data-weather-current-state="fresh"/);
  assert.match(freshHtml, /即時上游/);
});

test("Data Hub Weather reloads diagnostics after options and manual refresh settle", () => {
  assert.match(weatherSource, /getWeatherDiagnostics/);
  assert.match(weatherSource, /getWeatherOptions[\s\S]{0,1800}finally[\s\S]{0,300}reloadWeatherDiagnostic/);
  assert.match(weatherSource, /const refreshWeather[\s\S]{0,1800}finally[\s\S]{0,300}reloadWeatherDiagnostic/);
  assert.match(weatherSource, /requestJson<WeatherHeaderContract & \{ diagnostic: WeatherDiagnostic \}>\s*\(\s*"\/api\/weather\/refresh"/);
});
