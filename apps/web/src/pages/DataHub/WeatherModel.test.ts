import assert from "node:assert/strict";
import test from "node:test";
import type {
  WeatherDiagnostic,
  WeatherHeaderContract,
  WeatherOptionsResponse,
  WeatherSettings
} from "@solar-display/shared";
import { weatherFieldKeys } from "@solar-display/shared";
import { buildWeatherDiagnosticModel } from "../MqttSettings/weatherFieldPresets";
import {
  buildWeatherViewModel,
  loadDataHubWeatherRoute,
  saveDataHubWeatherSettings,
  weatherUpdateIntervalOptions
} from "./WeatherModel";

const settings: WeatherSettings = {
  countyName: "臺北市",
  enabled: true,
  fieldKeys: ["weather", "airTemperature"],
  locationMode: "station",
  preset: "compact",
  stationId: "46692",
  updateIntervalMinutes: 30
};

const options: WeatherOptionsResponse = {
  counties: ["臺北市", "高雄市"],
  fetchState: "fresh",
  stations: [
    {
      countyName: "臺北市",
      stationId: "46692",
      stationName: "臺北",
      townName: "中正區"
    },
    {
      countyName: "高雄市",
      stationId: "46744",
      stationName: "高雄",
      townName: "前鎮區"
    }
  ],
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
    fieldKeys: ["weather"],
    locationMode: "station",
    preset: "compact",
    updateIntervalMinutes: 30
  }
};

test("Weather view model exposes the exact supported update intervals", () => {
  assert.deepEqual(
    weatherUpdateIntervalOptions.map(({ label, value }) => ({ label, value })),
    [
      { label: "10 分鐘", value: "10" },
      { label: "30 分鐘", value: "30" },
      { label: "1 小時", value: "60" },
      { label: "3 小時", value: "180" },
      { label: "6 小時", value: "360" },
      { label: "12 小時", value: "720" },
      { label: "手動更新", value: "0" }
    ]
  );
});

test("Weather view model filters stations by county and projects pending preview fields", () => {
  const model = buildWeatherViewModel({
    options,
    preview,
    previewErrorMessage: "",
    settings
  });

  assert.deepEqual(model.stationOptions.map(({ stationId }) => stationId), ["46692"]);
  assert.deepEqual(model.customFieldOptions, []);
  assert.equal(model.preview.primaryText, "臺北 晴 28°C");
  assert.equal(model.preview.secondaryText, "");

  const custom = buildWeatherViewModel({
    options,
    preview,
    previewErrorMessage: "",
    settings: {
      ...settings,
      fieldKeys: ["airTemperature"],
      preset: "custom"
    }
  });

  assert.equal(custom.customFieldOptions.find(({ value }) => value === "airTemperature")?.checked, true);
  assert.equal(custom.customFieldOptions.find(({ value }) => value === "weather")?.checked, false);
  assert.equal(custom.preview.primaryText, "臺北 晴 28°C");
});

test("Weather custom fields preserve the canonical field order and labels", () => {
  const model = buildWeatherViewModel({
    options,
    preview,
    previewErrorMessage: "",
    settings: { ...settings, preset: "custom", fieldKeys: [] }
  });

  assert.deepEqual(
    model.customFieldOptions.map(({ label, value }) => ({ label, value })),
    weatherFieldKeys.map((value) => ({
      label: {
        airPressure: "氣壓",
        airTemperature: "溫度",
        dailyHigh: "最高溫",
        dailyLow: "最低溫",
        observationTime: "觀測時間",
        precipitation: "降雨量",
        relativeHumidity: "相對濕度",
        weather: "天氣現象",
        windDirection: "風向",
        windSpeed: "風速"
      }[value],
      value
    }))
  );
});

test("Weather view model keeps validation and preview failures local", () => {
  const model = buildWeatherViewModel({
    options,
    preview: null,
    previewErrorMessage: "weather preview unavailable",
    settings: { ...settings, countyName: null }
  });

  assert.match(model.localValidationFeedback, /選擇縣市/);
  assert.equal(model.previewFeedback, "weather preview unavailable");
});

test("Weather current source stays neutral when the latest diagnostic is for options", () => {
  const model = buildWeatherViewModel({
    options,
    preview,
    previewErrorMessage: "",
    settings,
    weatherDiagnostic: {
      code: null,
      httpStatus: null,
      lastSuccessAt: "2026-08-31T03:00:00.000Z",
      occurredAt: "2026-08-31T03:01:00.000Z",
      operation: "options",
      retryable: false,
      safeSummary: "測站選項取得成功",
      source: "upstream",
      state: "ok"
    }
  });

  assert.equal(model.currentStatus.fetchState, "fresh");
  assert.equal(model.currentStatus.sourceLabel, "來源未明");
});

test("Weather current source reflects current diagnostics for cache, stale, and upstream", () => {
  const diagnostics = [
    { fetchState: "fresh", source: "cache", sourceLabel: "快取資料" },
    { fetchState: "stale", source: "stale", sourceLabel: "使用舊資料" },
    { fetchState: "fresh", source: "upstream", sourceLabel: "即時上游" }
  ] as const;

  for (const { fetchState, source, sourceLabel } of diagnostics) {
    const model = buildWeatherViewModel({
      options,
      preview: {
        ...preview,
        current: {
          ...preview.current,
          fetchState,
          staleAt: fetchState === "stale" ? "2026-08-31T03:01:00.000Z" : null
        }
      },
      previewErrorMessage: "",
      settings,
      weatherDiagnostic: {
        code: null,
        httpStatus: null,
        lastSuccessAt: "2026-08-31T03:00:00.000Z",
        occurredAt: "2026-08-31T03:01:00.000Z",
        operation: "current",
        retryable: false,
        safeSummary: "目前天氣資料取得成功",
        source,
        state: "ok"
      }
    });

    assert.equal(model.currentStatus.sourceLabel, sourceLabel);
  }
});

test("Weather diagnostics expose only bounded safe allowlisted fields", () => {
  const diagnostic = {
    code: "WEATHER_DNS_LOOKUP_FAILED",
    httpStatus: null,
    lastSuccessAt: "2026-08-31T03:00:00.000Z",
    occurredAt: "2026-08-31T03:01:00.000Z",
    operation: "options",
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

  const model = buildWeatherDiagnosticModel(diagnostic);

  assert.equal(model.state, "error");
  assert.equal(model.source, "stale");
  assert.equal(model.stage, "dns");
  assert.match(model.copyText, /WEATHER_DNS_LOOKUP_FAILED/);
  assert.match(model.copyText, /無法解析 CWA 主機名稱/);
  assert.ok(model.copyText.length <= 512);
  for (const secret of [
    "secret-token",
    "broker.internal",
    "cwa.example.invalid",
    "weather.internal.example",
    "raw upstream exception",
    "raw stack trace"
  ]) {
    assert.equal(model.copyText.includes(secret), false, `diagnostic copy leaked ${secret}`);
  }
});

test("Weather route loader fetches only the weather settings endpoint", async () => {
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = (async (input) => {
    calls.push(String(input));
    return new Response(JSON.stringify({ settings }), {
      headers: { "content-type": "application/json" },
      status: 200
    });
  }) as typeof fetch;

  try {
    const result = await loadDataHubWeatherRoute({
      request: new Request("https://display.local/settings/data-hub/external")
    } as never);

    assert.deepEqual(result.settings, settings);
    assert.equal(result.errorMessage, "");
    assert.equal(calls.length, 1);
    assert.match(calls[0] ?? "", /\/api\/weather\/settings$/);
    assert.doesNotMatch(calls.join("\n"), /\/api\/settings\/mqtt/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Weather save stays independent when the MQTT endpoint would fail", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ body: string; method: string; url: string }> = [];
  globalThis.fetch = (async (input, init) => {
    const url = String(input);
    if (/\/api\/settings\/mqtt/.test(url)) {
      throw new Error("MQTT broker unavailable");
    }
    calls.push({ body: String(init?.body), method: init?.method ?? "GET", url });
    return new Response(JSON.stringify({ settings }), {
      headers: { "content-type": "application/json" },
      status: 200
    });
  }) as typeof fetch;

  try {
    const saved = await saveDataHubWeatherSettings(settings);
    assert.deepEqual(saved, settings);
    assert.deepEqual(calls.map(({ method, url }) => ({ method, url: url.split("?")[0] })), [
      { method: "PUT", url: "http://localhost:3000/api/weather/settings" }
    ]);
    assert.match(calls[0]?.body ?? "", /updateIntervalMinutes/);
    assert.doesNotMatch(calls[0]?.body ?? "", /broker|mqtt/i);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
