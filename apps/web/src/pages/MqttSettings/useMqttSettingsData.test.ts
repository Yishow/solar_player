import assert from "node:assert/strict";
import test from "node:test";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { JSDOM } from "jsdom";
import {
  DEFAULT_WEATHER_SETTINGS,
  type DisplaySyncEvent,
  type WeatherSettings
} from "@solar-display/shared";
import { getSocketClient } from "../../services/socket";
import {
  useMqttSettingsData,
  type MqttSettingsDataController
} from "./useMqttSettingsData";
import {
  useMqttSettingsRemoteSync,
  type MqttSettingsRemoteSyncController
} from "./useMqttSettingsRemoteSync";
import {
  useMqttSettingsWeather,
  type MqttSettingsWeatherController
} from "./useMqttSettingsWeather";
import type { MqttEditableModel, TopicMappingsResponse } from "./loadModel";
import type { MqttSettingsForm, MqttStatus } from "./viewModel";

type Deferred<T> = {
  promise: Promise<T>;
  reject: (reason?: unknown) => void;
  resolve: (value: T | PromiseLike<T>) => void;
};

type MqttSettingsSnapshot = {
  data: MqttSettingsDataController;
  remote: MqttSettingsRemoteSyncController;
  weather: MqttSettingsWeatherController;
};

type ApiResponse = {
  settings: {
    clientId: string;
    dataMode: MqttSettingsForm["dataMode"];
    host: string;
    messageTimeout: number;
    password: string;
    port: number;
    reconnectInterval: number;
    username: string;
  };
  status: MqttStatus;
};

type FakeApi = {
  count: (path: string) => number;
  fetch: typeof fetch;
  queueSettingsRead: (value: ApiResponse | Promise<ApiResponse>) => void;
  queueTopicRead: (value: TopicMappingsResponse | Promise<TopicMappingsResponse>) => void;
  queueWeatherRead: (value: WeatherSettings | Promise<WeatherSettings>) => void;
};

type MqttSettingsHarness = {
  api: FakeApi;
  dom: JSDOM;
  latest: () => MqttSettingsSnapshot;
  rootElement: HTMLElement;
  unmount: (options?: { restoreGlobals?: boolean }) => Promise<void>;
};

const displaySyncEvent: DisplaySyncEvent = {
  generatedAt: "2026-09-10T00:00:00.000Z",
  reason: "weather-sync-inflight-test",
  scope: "weather"
};

function deferred<T>(): Deferred<T> {
  let resolvePromise!: Deferred<T>["resolve"];
  let rejectPromise!: Deferred<T>["reject"];
  const promise = new Promise<T>((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });

  return {
    promise,
    reject: rejectPromise,
    resolve: resolvePromise
  };
}

function createWeatherSettings(overrides: Partial<WeatherSettings> = {}): WeatherSettings {
  return {
    ...DEFAULT_WEATHER_SETTINGS,
    countyName: "臺北市",
    enabled: true,
    fieldKeys: ["weather", "airTemperature", "relativeHumidity", "observationTime"],
    locationMode: "station",
    preset: "standard",
    stationId: "C0I080",
    updateIntervalMinutes: 30,
    ...overrides
  };
}

function createEditableModel(
  weatherSettings: WeatherSettings = createWeatherSettings()
): MqttEditableModel {
  return {
    settings: {
      clientId: "solar-display-player",
      dataMode: "mqtt",
      host: "localhost",
      messageTimeout: "30",
      password: "",
      port: "1883",
      reconnectInterval: "5000",
      username: ""
    },
    status: {
      broker: "mqtt://localhost:1883",
      clientId: "solar-display-player",
      connected: true,
      reason: null,
      updatedAt: "2026-09-10T00:00:00.000Z"
    },
    topics: [],
    weatherSettings
  };
}

function createSettingsResponse(model: MqttEditableModel): ApiResponse {
  return {
    settings: {
      clientId: model.settings.clientId,
      dataMode: model.settings.dataMode,
      host: model.settings.host,
      messageTimeout: Number(model.settings.messageTimeout),
      password: model.settings.password,
      port: Number(model.settings.port),
      reconnectInterval: Number(model.settings.reconnectInterval),
      username: model.settings.username
    },
    status: model.status
  };
}

function jsonResponse(value: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: async () => value,
    text: async () => JSON.stringify(value)
  } as Response;
}

function createFakeApi(model: MqttEditableModel): FakeApi {
  const calls: string[] = [];
  const settingsReads: Array<Promise<ApiResponse>> = [];
  const topicReads: Array<Promise<TopicMappingsResponse>> = [];
  const weatherReads: Array<Promise<WeatherSettings>> = [];
  const settingsResponse = createSettingsResponse(model);

  const fetchImpl: typeof fetch = async (input, init) => {
    const requestLike = input as Request;
    const rawUrl = typeof input === "string"
      ? input
      : "url" in requestLike
        ? requestLike.url
        : String(input);
    const url = new URL(rawUrl, "http://127.0.0.1/");
    calls.push(url.pathname);

    switch (url.pathname) {
      case "/api/settings/mqtt": {
        const next = settingsReads.shift();
        return jsonResponse(next ? await next : settingsResponse);
      }
      case "/api/settings/mqtt/topics": {
        const next = topicReads.shift();
        return jsonResponse(next ? await next : { status: model.status, topics: model.topics });
      }
      case "/api/weather/settings": {
        const next = weatherReads.shift();
        const settings = next ? await next : model.weatherSettings;
        return jsonResponse({ settings });
      }
      case "/api/weather/options":
        return jsonResponse({
          counties: ["臺北市"],
          fetchState: "fresh",
          stations: [{
            countyName: "臺北市",
            stationId: "C0I080",
            stationName: "內湖",
            townName: "內湖區"
          }],
          updatedAt: "2026-09-10T00:00:00.000Z"
        });
      case "/api/weather/diagnostics":
        return jsonResponse({ diagnostic: {
          code: null,
          httpStatus: null,
          lastSuccessAt: null,
          occurredAt: null,
          operation: null,
          retryable: false,
          safeSummary: "test",
          source: "unavailable",
          state: "never-attempted"
        } });
      case "/api/weather/preview":
        return jsonResponse({});
      case "/api/playback/pages":
        return jsonResponse({ pages: [] });
      default:
        void init;
        throw new Error(`Unexpected request: ${url.pathname}`);
    }
  };

  return {
    count: (path) => calls.filter((call) => call === path).length,
    fetch: fetchImpl,
    queueSettingsRead: (value) => settingsReads.push(Promise.resolve(value)),
    queueTopicRead: (value) => topicReads.push(Promise.resolve(value)),
    queueWeatherRead: (value) => weatherReads.push(Promise.resolve(value))
  };
}

function installDom(dom: JSDOM, fetchImpl: typeof fetch) {
  const names = ["window", "document", "navigator", "fetch", "IS_REACT_ACT_ENVIRONMENT"] as const;
  const previous = new Map<string, PropertyDescriptor | undefined>();

  for (const name of names) {
    previous.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
  }

  Object.defineProperty(globalThis, "window", { configurable: true, value: dom.window, writable: true });
  Object.defineProperty(globalThis, "document", { configurable: true, value: dom.window.document, writable: true });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: dom.window.navigator, writable: true });
  Object.defineProperty(globalThis, "fetch", { configurable: true, value: fetchImpl, writable: true });
  Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", { configurable: true, value: true, writable: true });

  return () => {
    for (const name of names) {
      const descriptor = previous.get(name);
      if (descriptor) {
        Object.defineProperty(globalThis, name, descriptor);
      } else {
        delete (globalThis as Record<string, unknown>)[name];
      }
    }
  };
}

async function flushReact() {
  Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", {
    configurable: true,
    value: true,
    writable: true
  });
  try {
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
  } finally {
    Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", {
      configurable: true,
      value: false,
      writable: true
    });
  }
}

async function waitFor(condition: () => boolean, message: string) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (condition()) {
      return;
    }
    await flushReact();
  }

  assert.fail(message);
}

async function mountHarness({
  apiModel,
  initialModel = createEditableModel(),
  initialWeatherRead
}: {
  apiModel?: MqttEditableModel;
  initialModel?: MqttEditableModel | null;
  initialWeatherRead?: WeatherSettings | Promise<WeatherSettings>;
} = {}): Promise<MqttSettingsHarness> {
  const resolvedApiModel = apiModel ?? initialModel ?? createEditableModel();
  const api = createFakeApi(resolvedApiModel);
  if (initialWeatherRead !== undefined) {
    api.queueWeatherRead(initialWeatherRead);
  }

  const dom = new JSDOM(
    "<!doctype html><html><body><div id=\"root\"></div></body></html>",
    { pretendToBeVisual: true, url: "http://127.0.0.1/" }
  );
  const restoreGlobals = installDom(dom, api.fetch);
  const rootElement = dom.window.document.getElementById("root")!;
  let root: Root | null = createRoot(rootElement);
  let snapshot: MqttSettingsSnapshot | null = null;

  function TestHarness() {
    const data = useMqttSettingsData({
      connectionsOnly: false,
      initialConnectionModel: null,
      initialEditableModel: initialModel
    });
    const weather = useMqttSettingsWeather({ data });
    const remote = useMqttSettingsRemoteSync({
      connectionsOnly: false,
      data,
      reloadReadiness: async () => {}
    });
    snapshot = { data, remote, weather };

    return React.createElement("output", {
      "data-loading-settings": String(data.actionState.isLoadingSettings),
      "data-pending": String(remote.syncDraftGuard.hasPendingRemoteChange),
      "data-weather-interval": String(data.weatherSettings.updateIntervalMinutes)
    });
  }

  await act(async () => {
    root!.render(React.createElement(TestHarness));
    await Promise.resolve();
    await Promise.resolve();
  });
  await waitFor(
    () => api.count("/api/settings/mqtt") >= 1 && api.count("/api/weather/settings") >= 1,
    "initial MqttSettings full-model request did not start"
  );
  await flushReact();

  return {
    api,
    dom,
    latest: () => {
      assert.ok(snapshot, "MqttSettings hook harness has not rendered");
      return snapshot;
    },
    rootElement,
    unmount: async ({ restoreGlobals: shouldRestoreGlobals = true } = {}) => {
      Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", {
        configurable: true,
        value: true,
        writable: true
      });
      await act(async () => {
        root?.unmount();
        root = null;
        await Promise.resolve();
      });
      Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", {
        configurable: true,
        value: false,
        writable: true
      });
      if (shouldRestoreGlobals) {
        getSocketClient().disconnect();
        restoreGlobals();
        dom.window.close();
      }
    }
  };
}

test("uncached initial full-model apply cannot bypass the Weather draft gate", async () => {
  const bootstrapWeather = deferred<WeatherSettings>();
  const harness = await mountHarness({
    apiModel: createEditableModel(),
    initialModel: null,
    initialWeatherRead: bootstrapWeather.promise
  });

  try {
    changeWeatherInterval(harness, 10);
    bootstrapWeather.resolve(createWeatherSettings({ updateIntervalMinutes: 60 }));
    await waitFor(
      () => harness.api.count("/api/playback/pages") >= 1,
      "uncached initial full-model apply did not finish"
    );
    await flushReact();

    assert.equal(harness.latest().data.weatherSettings.updateIntervalMinutes, 10);
    assert.equal(
      harness.latest().data.lastSyncedWeatherSettings.updateIntervalMinutes,
      DEFAULT_WEATHER_SETTINGS.updateIntervalMinutes
    );
    assert.equal(harness.latest().remote.syncDraftGuard.hasPendingRemoteChange, true);
  } finally {
    bootstrapWeather.resolve(createWeatherSettings({ updateIntervalMinutes: 60 }));
    await harness.unmount();
  }
});

test("a stale full-model Weather result still applies the broker and topic model", async () => {
  const initialModel = createEditableModel();
  const apiModel = createEditableModel();
  apiModel.settings = {
    ...apiModel.settings,
    host: "authoritative-broker.local"
  };
  apiModel.topics = [{
    enabled: true,
    id: 1,
    lastReceivedAt: null,
    lastValue: null,
    metricKey: "todayPower",
    metricScope: "global",
    multiplier: 1,
    nameEn: "Today Power",
    nameZh: "今日功率",
    quality: null,
    rawPayload: null,
    topic: "solar/today-power",
    unit: "kW",
    updatedAt: null,
    valuePath: "value"
  }];
  const bootstrapWeather = deferred<WeatherSettings>();
  const directWeather = deferred<WeatherSettings>();
  const harness = await mountHarness({
    apiModel,
    initialModel,
    initialWeatherRead: bootstrapWeather.promise
  });
  let directLoad: ReturnType<MqttSettingsDataController["loadWeatherSettings"]> | undefined;

  try {
    const expectedReadCount = harness.api.count("/api/weather/settings") + 1;
    harness.api.queueWeatherRead(directWeather.promise);
    directLoad = harness.latest().data.loadWeatherSettings();
    await waitFor(
      () => harness.api.count("/api/weather/settings") >= expectedReadCount,
      "newer direct Weather request did not start"
    );
    directWeather.resolve(createWeatherSettings({ updateIntervalMinutes: 45 }));
    assert.equal((await directLoad).outcome, "committed");

    bootstrapWeather.resolve(createWeatherSettings({ updateIntervalMinutes: 60 }));
    await waitFor(
      () => harness.api.count("/api/playback/pages") >= 1,
      "stale full-model Weather request did not finish"
    );
    await flushReact();

    assert.equal(harness.latest().data.settings.host, "authoritative-broker.local");
    assert.equal(harness.latest().data.lastSyncedSettings.host, "authoritative-broker.local");
    assert.equal(harness.latest().data.topics[0]?.metricKey, "todayPower");
    assert.equal(harness.latest().data.lastSyncedTopics[0]?.metricKey, "todayPower");
    assert.equal(harness.latest().data.weatherSettings.updateIntervalMinutes, 45);
    assert.equal(harness.latest().data.lastSyncedWeatherSettings.updateIntervalMinutes, 45);
  } finally {
    bootstrapWeather.resolve(createWeatherSettings({ updateIntervalMinutes: 60 }));
    directWeather.resolve(createWeatherSettings({ updateIntervalMinutes: 45 }));
    await directLoad?.catch(() => {});
    await harness.unmount();
  }
});

async function beginDisplaySync(
  harness: MqttSettingsHarness,
  expectedWeatherReadCount: number
) {
  const reloadPromise = harness.latest().remote.syncDraftGuard.handleDisplaySync(displaySyncEvent);
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (harness.api.count("/api/weather/settings") >= expectedWeatherReadCount) {
      return { reloadPromise };
    }
    await Promise.resolve();
  }
  assert.fail(`display-sync Weather request ${expectedWeatherReadCount} did not start`);
}

function changeWeatherInterval(harness: MqttSettingsHarness, value: number) {
  harness.latest().weather.handleWeatherSettingChange("updateIntervalMinutes", value);
}

test("actual owner preserves a local Weather edit after a clean in-flight reload", async () => {
  const harness = await mountHarness();
  const remoteWeather = deferred<WeatherSettings>();
  let reloadPromise: Promise<void> | undefined;

  try {
    assert.equal(harness.latest().remote.draftSections.weather, false);
    harness.api.queueWeatherRead(remoteWeather.promise);
    reloadPromise = (await beginDisplaySync(harness, 2)).reloadPromise;

    changeWeatherInterval(harness, 10);
    remoteWeather.resolve(createWeatherSettings({ updateIntervalMinutes: 60 }));
    await reloadPromise;
    await flushReact();

    assert.equal(harness.latest().data.weatherSettings.updateIntervalMinutes, 10);
    assert.equal(harness.latest().data.lastSyncedWeatherSettings.updateIntervalMinutes, 30);
    assert.equal(harness.latest().remote.draftSections.weather, true);
    assert.equal(harness.latest().remote.syncDraftGuard.hasPendingRemoteChange, true);
  } finally {
    remoteWeather.resolve(createWeatherSettings({ updateIntervalMinutes: 60 }));
    await reloadPromise?.catch(() => {});
    await harness.unmount();
  }
});

test("direct Weather reads use the same local-mutation commit gate", async () => {
  const harness = await mountHarness();
  const remoteWeather = deferred<WeatherSettings>();
  const expectedReadCount = harness.api.count("/api/weather/settings") + 1;
  let loadPromise: ReturnType<MqttSettingsDataController["loadWeatherSettings"]> | undefined;

  try {
    harness.api.queueWeatherRead(remoteWeather.promise);
    loadPromise = harness.latest().data.loadWeatherSettings({ propagateError: true });
    for (let attempt = 0; attempt < 20 && harness.api.count("/api/weather/settings") < expectedReadCount; attempt += 1) {
      await Promise.resolve();
    }
    changeWeatherInterval(harness, 10);
    remoteWeather.resolve(createWeatherSettings({ updateIntervalMinutes: 60 }));
    const outcome = await loadPromise;
    await flushReact();

    assert.equal(outcome.outcome, "deferred");
    assert.equal(harness.latest().data.weatherSettings.updateIntervalMinutes, 10);
    assert.equal(harness.latest().data.lastSyncedWeatherSettings.updateIntervalMinutes, 30);
    assert.equal(harness.latest().remote.syncDraftGuard.hasPendingRemoteChange, true);
  } finally {
    remoteWeather.resolve(createWeatherSettings({ updateIntervalMinutes: 60 }));
    await loadPromise?.catch(() => {});
    await harness.unmount();
  }
});

test("edit-and-revert and field toggles still defer the in-flight Weather response", async () => {
  const revertedHarness = await mountHarness();
  const revertedResponse = deferred<WeatherSettings>();
  let revertedReload: Promise<void> | undefined;

  try {
    revertedHarness.api.queueWeatherRead(revertedResponse.promise);
    revertedReload = (await beginDisplaySync(revertedHarness, 2)).reloadPromise;
    changeWeatherInterval(revertedHarness, 10);
    changeWeatherInterval(revertedHarness, 30);

    assert.equal(revertedHarness.latest().remote.draftSections.weather, false);
    revertedResponse.resolve(createWeatherSettings({ updateIntervalMinutes: 60 }));
    await revertedReload;
    await flushReact();

    assert.equal(revertedHarness.latest().data.weatherSettings.updateIntervalMinutes, 30);
    assert.equal(revertedHarness.latest().data.lastSyncedWeatherSettings.updateIntervalMinutes, 30);
    assert.equal(revertedHarness.latest().remote.draftSections.weather, false);
    assert.equal(revertedHarness.latest().remote.syncDraftGuard.hasPendingRemoteChange, true);

    const recoveryOutcome = await revertedHarness.latest().data.loadWeatherSettings();
    await flushReact();
    assert.equal(recoveryOutcome.outcome, "committed");
    assert.equal(revertedHarness.latest().remote.syncDraftGuard.hasPendingRemoteChange, false);
  } finally {
    revertedResponse.resolve(createWeatherSettings({ updateIntervalMinutes: 60 }));
    await revertedReload?.catch(() => {});
    await revertedHarness.unmount();
  }

  const toggleHarness = await mountHarness({
    initialModel: createEditableModel(createWeatherSettings({
      fieldKeys: ["weather", "airTemperature"],
      preset: "custom"
    }))
  });
  const toggleResponse = deferred<WeatherSettings>();
  let toggleReload: Promise<void> | undefined;

  try {
    toggleHarness.api.queueWeatherRead(toggleResponse.promise);
    toggleReload = (await beginDisplaySync(toggleHarness, 2)).reloadPromise;
    toggleHarness.latest().weather.toggleWeatherField("observationTime", true);
    toggleResponse.resolve(createWeatherSettings({
      fieldKeys: ["weather", "airTemperature", "relativeHumidity"]
    }));
    await toggleReload;
    await flushReact();

    assert.deepEqual(
      toggleHarness.latest().data.weatherSettings.fieldKeys,
      ["weather", "airTemperature", "observationTime"]
    );
    assert.deepEqual(
      toggleHarness.latest().data.lastSyncedWeatherSettings.fieldKeys,
      ["weather", "airTemperature"]
    );
    assert.equal(toggleHarness.latest().remote.syncDraftGuard.hasPendingRemoteChange, true);
  } finally {
    toggleResponse.resolve(createWeatherSettings({ updateIntervalMinutes: 60 }));
    await toggleReload?.catch(() => {});
    await toggleHarness.unmount();
  }
});

test("newest Weather response wins over an obsolete success", async () => {
  const harness = await mountHarness();
  const firstResponse = deferred<WeatherSettings>();
  const secondResponse = deferred<WeatherSettings>();
  let firstReload: Promise<void> | undefined;
  let secondReload: Promise<void> | undefined;

  try {
    harness.api.queueWeatherRead(firstResponse.promise);
    harness.api.queueWeatherRead(secondResponse.promise);
    firstReload = (await beginDisplaySync(harness, 2)).reloadPromise;
    secondReload = (await beginDisplaySync(harness, 3)).reloadPromise;

    secondResponse.resolve(createWeatherSettings({ updateIntervalMinutes: 60 }));
    await secondReload;
    await flushReact();
    firstResponse.resolve(createWeatherSettings({ updateIntervalMinutes: 45 }));
    await firstReload;
    await flushReact();

    assert.equal(harness.latest().data.weatherSettings.updateIntervalMinutes, 60);
    assert.equal(harness.latest().data.lastSyncedWeatherSettings.updateIntervalMinutes, 60);
    assert.equal(harness.latest().remote.syncDraftGuard.hasPendingRemoteChange, false);
  } finally {
    firstResponse.resolve(createWeatherSettings({ updateIntervalMinutes: 45 }));
    secondResponse.resolve(createWeatherSettings({ updateIntervalMinutes: 60 }));
    await firstReload?.catch(() => {});
    await secondReload?.catch(() => {});
    await harness.unmount();
  }
});

test("a committed Weather read cannot clear pending owned by a broker draft", async () => {
  const harness = await mountHarness();

  try {
    harness.latest().data.setSettings((current) => ({
      ...current,
      host: "draft-broker.local"
    }));
    await flushReact();
    await harness.latest().remote.syncDraftGuard.handleDisplaySync(displaySyncEvent);
    await flushReact();

    assert.equal(harness.latest().remote.draftSections.broker, true);
    assert.equal(harness.latest().remote.syncDraftGuard.hasPendingRemoteChange, true);

    const outcome = await harness.latest().data.loadWeatherSettings();
    await flushReact();

    assert.equal(outcome.outcome, "committed");
    assert.equal(harness.latest().remote.draftSections.broker, true);
    assert.equal(harness.latest().remote.syncDraftGuard.hasPendingRemoteChange, true);
  } finally {
    await harness.unmount();
  }
});

test("a late Weather success cannot clear pending after another reload lane fails", async () => {
  const harness = await mountHarness();
  const failedSettings = deferred<ApiResponse>();
  const lateWeather = deferred<WeatherSettings>();
  let reloadPromise: Promise<void> | undefined;

  try {
    harness.api.queueSettingsRead(failedSettings.promise);
    harness.api.queueWeatherRead(lateWeather.promise);
    reloadPromise = (await beginDisplaySync(harness, 2)).reloadPromise;

    failedSettings.reject(new Error("current settings failure"));
    await flushReact();
    lateWeather.resolve(createWeatherSettings({ updateIntervalMinutes: 60 }));
    await assert.rejects(reloadPromise, /current settings failure/);
    await flushReact();

    assert.equal(harness.latest().data.weatherReloadResult?.outcome, "failed");
    assert.equal(harness.latest().data.errorMessage, "current settings failure");
    assert.equal(harness.latest().remote.syncDraftGuard.hasPendingRemoteChange, true);
  } finally {
    failedSettings.reject(new Error("current settings failure"));
    lateWeather.resolve(createWeatherSettings({ updateIntervalMinutes: 60 }));
    await reloadPromise?.catch(() => {});
    await harness.unmount();
  }
});

test("an aggregate success becomes stale when a newer Weather operation starts", async () => {
  const harness = await mountHarness();
  const aggregateSettings = deferred<ApiResponse>();
  const aggregateWeather = deferred<WeatherSettings>();
  const newerWeather = deferred<WeatherSettings>();
  let aggregateLoad: ReturnType<MqttSettingsDataController["loadMqttEditableModel"]> | undefined;
  let newerLoad: ReturnType<MqttSettingsDataController["loadWeatherSettings"]> | undefined;

  try {
    const aggregateReadCount = harness.api.count("/api/weather/settings") + 1;
    harness.api.queueSettingsRead(aggregateSettings.promise);
    harness.api.queueWeatherRead(aggregateWeather.promise);
    aggregateLoad = harness.latest().data.loadMqttEditableModel({ topicsAsPolling: true });
    await waitFor(
      () => harness.api.count("/api/weather/settings") >= aggregateReadCount,
      "aggregate Weather request did not start"
    );
    aggregateWeather.resolve(createWeatherSettings({ updateIntervalMinutes: 60 }));
    await flushReact();

    const newerReadCount = harness.api.count("/api/weather/settings") + 1;
    harness.api.queueWeatherRead(newerWeather.promise);
    newerLoad = harness.latest().data.loadWeatherSettings();
    await waitFor(
      () => harness.api.count("/api/weather/settings") >= newerReadCount,
      "newer Weather request did not start"
    );
    changeWeatherInterval(harness, 10);
    newerWeather.resolve(createWeatherSettings({ updateIntervalMinutes: 45 }));
    const newerOutcome = await newerLoad;
    await flushReact();
    assert.equal(newerOutcome.outcome, "deferred");
    assert.equal(harness.latest().remote.syncDraftGuard.hasPendingRemoteChange, true);

    aggregateSettings.resolve(createSettingsResponse(createEditableModel()));
    const aggregateOutcome = await aggregateLoad;
    await flushReact();

    assert.equal(aggregateOutcome.outcome, "stale");
    assert.equal(harness.latest().data.weatherReloadResult?.operationToken, newerOutcome.operationToken);
    assert.equal(harness.latest().data.weatherReloadResult?.outcome, "deferred");
    assert.equal(harness.latest().data.weatherSettings.updateIntervalMinutes, 10);
    assert.equal(harness.latest().data.lastSyncedWeatherSettings.updateIntervalMinutes, 60);
    assert.equal(harness.latest().remote.syncDraftGuard.hasPendingRemoteChange, true);
  } finally {
    aggregateSettings.resolve(createSettingsResponse(createEditableModel()));
    aggregateWeather.resolve(createWeatherSettings({ updateIntervalMinutes: 60 }));
    newerWeather.resolve(createWeatherSettings({ updateIntervalMinutes: 45 }));
    await aggregateLoad?.catch(() => {});
    await newerLoad?.catch(() => {});
    await harness.unmount();
  }
});

test("a polling topic failure produces a visible aggregate failed outcome", async () => {
  const harness = await mountHarness();

  try {
    harness.api.queueTopicRead(Promise.reject(new Error("current topic failure")));
    const outcome = await harness.latest().data.loadMqttEditableModel({ topicsAsPolling: true });
    await flushReact();

    assert.equal(outcome.outcome, "failed");
    assert.equal(harness.latest().data.weatherReloadResult?.outcome, "failed");
    assert.equal(harness.latest().data.errorMessage, "current topic failure");
  } finally {
    await harness.unmount();
  }
});

test("a later settings success cannot erase an aggregate Weather failure", async () => {
  const harness = await mountHarness();
  const lateSettings = deferred<ApiResponse>();
  const failedWeather = deferred<WeatherSettings>();
  let aggregateLoad: ReturnType<MqttSettingsDataController["loadMqttEditableModel"]> | undefined;

  try {
    harness.api.queueSettingsRead(lateSettings.promise);
    harness.api.queueWeatherRead(failedWeather.promise);
    aggregateLoad = harness.latest().data.loadMqttEditableModel({ topicsAsPolling: true });
    failedWeather.reject(new Error("current Weather failure"));
    await flushReact();
    lateSettings.resolve(createSettingsResponse(createEditableModel()));

    const outcome = await aggregateLoad;
    await flushReact();
    assert.equal(outcome.outcome, "failed");
    assert.equal(harness.latest().data.weatherReloadResult?.outcome, "failed");
    assert.equal(harness.latest().data.errorMessage, "current Weather failure");
  } finally {
    lateSettings.resolve(createSettingsResponse(createEditableModel()));
    failedWeather.reject(new Error("current Weather failure"));
    await aggregateLoad?.catch(() => {});
    await harness.unmount();
  }
});

test("an obsolete discard completion cannot restore pending after the newest discard commits", async () => {
  const harness = await mountHarness();
  const obsoleteResponse = deferred<WeatherSettings>();
  const currentResponse = deferred<WeatherSettings>();
  let obsoleteDiscard: Promise<void> | undefined;
  let currentDiscard: Promise<void> | undefined;

  try {
    changeWeatherInterval(harness, 10);
    await harness.latest().remote.syncDraftGuard.handleDisplaySync(displaySyncEvent);
    await flushReact();
    assert.equal(harness.latest().remote.syncDraftGuard.hasPendingRemoteChange, true);

    const initialReadCount = harness.api.count("/api/weather/settings");
    harness.api.queueWeatherRead(obsoleteResponse.promise);
    harness.api.queueWeatherRead(currentResponse.promise);
    obsoleteDiscard = harness.latest().remote.syncDraftGuard.discardAndReload();
    await waitFor(
      () => harness.api.count("/api/weather/settings") >= initialReadCount + 1,
      "obsolete discard reload did not start"
    );
    currentDiscard = harness.latest().remote.syncDraftGuard.discardAndReload();
    await waitFor(
      () => harness.api.count("/api/weather/settings") >= initialReadCount + 2,
      "current discard reload did not start"
    );

    currentResponse.resolve(createWeatherSettings({ updateIntervalMinutes: 60 }));
    await currentDiscard;
    await flushReact();
    obsoleteResponse.resolve(createWeatherSettings({ updateIntervalMinutes: 45 }));
    await obsoleteDiscard;
    await flushReact();

    assert.equal(harness.latest().data.weatherSettings.updateIntervalMinutes, 60);
    assert.equal(harness.latest().data.lastSyncedWeatherSettings.updateIntervalMinutes, 60);
    assert.equal(harness.latest().remote.syncDraftGuard.hasPendingRemoteChange, false);
  } finally {
    obsoleteResponse.resolve(createWeatherSettings({ updateIntervalMinutes: 45 }));
    currentResponse.resolve(createWeatherSettings({ updateIntervalMinutes: 60 }));
    await obsoleteDiscard?.catch(() => {});
    await currentDiscard?.catch(() => {});
    await harness.unmount();
  }
});

test("an obsolete Weather rejection cannot replace the newest success", async () => {
  const harness = await mountHarness();
  const obsoleteResponse = deferred<WeatherSettings>();
  const currentResponse = deferred<WeatherSettings>();
  let obsoleteReload: Promise<void> | undefined;
  let currentReload: Promise<void> | undefined;

  try {
    harness.api.queueWeatherRead(obsoleteResponse.promise);
    harness.api.queueWeatherRead(currentResponse.promise);
    obsoleteReload = (await beginDisplaySync(harness, 2)).reloadPromise;
    currentReload = (await beginDisplaySync(harness, 3)).reloadPromise;

    currentResponse.resolve(createWeatherSettings({ updateIntervalMinutes: 60 }));
    await currentReload;
    await flushReact();
    obsoleteResponse.reject(new Error("obsolete Weather failure"));
    await obsoleteReload;
    await flushReact();

    assert.equal(harness.latest().data.weatherSettings.updateIntervalMinutes, 60);
    assert.equal(harness.latest().data.lastSyncedWeatherSettings.updateIntervalMinutes, 60);
    assert.equal(harness.latest().data.errorMessage, "");
    assert.equal(harness.latest().remote.syncDraftGuard.hasPendingRemoteChange, false);
  } finally {
    obsoleteResponse.resolve(createWeatherSettings());
    currentResponse.resolve(createWeatherSettings({ updateIntervalMinutes: 60 }));
    await obsoleteReload?.catch(() => {});
    await currentReload?.catch(() => {});
    await harness.unmount();
  }
});

test("obsolete error/finally cannot release loading owned by a newer reload", async () => {
  const harness = await mountHarness();
  const obsoleteSettings = deferred<ApiResponse>();
  const currentSettings = deferred<ApiResponse>();
  const currentWeather = deferred<WeatherSettings>();
  let obsoleteReload: Promise<void> | undefined;
  let currentReload: Promise<void> | undefined;

  try {
    harness.api.queueSettingsRead(obsoleteSettings.promise);
    harness.api.queueSettingsRead(currentSettings.promise);
    harness.api.queueWeatherRead(createWeatherSettings());
    harness.api.queueWeatherRead(currentWeather.promise);
    obsoleteReload = (await beginDisplaySync(harness, 2)).reloadPromise;
    currentReload = (await beginDisplaySync(harness, 3)).reloadPromise;

    obsoleteSettings.reject(new Error("obsolete settings failure"));
    await obsoleteReload.catch(() => {});
    await flushReact();

    assert.equal(harness.latest().data.actionState.isLoadingSettings, true);
    assert.equal(harness.latest().data.errorMessage, "");

    currentSettings.resolve(createSettingsResponse(createEditableModel()));
    currentWeather.resolve(createWeatherSettings({ updateIntervalMinutes: 60 }));
    await currentReload;
    await flushReact();
    assert.equal(harness.latest().data.actionState.isLoadingSettings, false);
  } finally {
    obsoleteSettings.reject(new Error("obsolete settings failure"));
    currentSettings.resolve(createSettingsResponse(createEditableModel()));
    currentWeather.resolve(createWeatherSettings({ updateIntervalMinutes: 60 }));
    await obsoleteReload?.catch(() => {});
    await currentReload?.catch(() => {});
    await harness.unmount();
  }
});

test("unmounted Weather owner ignores a late reload response", async () => {
  const harness = await mountHarness();
  const lateResponse = deferred<WeatherSettings>();
  harness.api.queueWeatherRead(lateResponse.promise);
  const reloadPromise = (await beginDisplaySync(harness, 2)).reloadPromise;
  const beforeUnmount = harness.latest();

  await harness.unmount({ restoreGlobals: false });
  try {
    lateResponse.resolve(createWeatherSettings({ updateIntervalMinutes: 60 }));
    await reloadPromise;
    assert.equal(harness.rootElement.innerHTML, "");
    assert.equal(harness.latest().data.weatherSettings, beforeUnmount.data.weatherSettings);
    assert.equal(
      harness.latest().data.lastSyncedWeatherSettings,
      beforeUnmount.data.lastSyncedWeatherSettings
    );
    assert.equal(harness.latest().remote.syncDraftGuard.hasPendingRemoteChange, false);
  } finally {
    lateResponse.resolve(createWeatherSettings({ updateIntervalMinutes: 60 }));
    await reloadPromise.catch(() => {});
    await harness.unmount();
  }
});

test("unmounted Weather owner ignores a late reload rejection", async () => {
  const harness = await mountHarness();
  const lateResponse = deferred<WeatherSettings>();
  harness.api.queueWeatherRead(lateResponse.promise);
  const reloadPromise = (await beginDisplaySync(harness, 2)).reloadPromise;
  const beforeUnmount = harness.latest();

  await harness.unmount({ restoreGlobals: false });
  try {
    lateResponse.reject(new Error("late unmounted Weather failure"));
    await reloadPromise;
    assert.equal(harness.latest().data.errorMessage, beforeUnmount.data.errorMessage);
    assert.equal(harness.latest().remote.syncDraftGuard.hasPendingRemoteChange, false);
  } finally {
    lateResponse.resolve(createWeatherSettings());
    await reloadPromise.catch(() => {});
    await harness.unmount();
  }
});

test("initial cached full-model apply cannot bypass the Weather draft gate", async () => {
  const initialModel = createEditableModel();
  const bootstrapWeather = deferred<WeatherSettings>();
  const harness = await mountHarness({
    initialModel,
    initialWeatherRead: bootstrapWeather.promise
  });

  try {
    changeWeatherInterval(harness, 10);
    bootstrapWeather.resolve(createWeatherSettings({ updateIntervalMinutes: 60 }));
    await waitFor(
      () => harness.api.count("/api/playback/pages") >= 1,
      "initial cached full-model apply did not finish"
    );
    await flushReact();

    assert.equal(harness.latest().data.weatherSettings.updateIntervalMinutes, 10);
    assert.equal(harness.latest().data.lastSyncedWeatherSettings.updateIntervalMinutes, 30);
    assert.equal(harness.latest().remote.draftSections.weather, true);
    assert.equal(harness.latest().remote.syncDraftGuard.hasPendingRemoteChange, true);
  } finally {
    bootstrapWeather.resolve(createWeatherSettings({ updateIntervalMinutes: 60 }));
    await harness.unmount();
  }
});

test("discard authorizes only the draft present at click and keep-editing does not fetch", async () => {
  const harness = await mountHarness();
  const discardResponse = deferred<WeatherSettings>();
  const successfulDiscardResponse = deferred<WeatherSettings>();
  const failedDiscardResponse = deferred<WeatherSettings>();
  let discardReload: Promise<void> | undefined;

  try {
    changeWeatherInterval(harness, 10);
    await harness.latest().remote.syncDraftGuard.handleDisplaySync(displaySyncEvent);
    await flushReact();
    assert.equal(harness.latest().remote.syncDraftGuard.hasPendingRemoteChange, true);
    const countBeforeKeepEditing = harness.api.count("/api/weather/settings");

    harness.latest().remote.syncDraftGuard.keepEditing();
    await flushReact();
    assert.equal(harness.api.count("/api/weather/settings"), countBeforeKeepEditing);

    harness.api.queueWeatherRead(discardResponse.promise);
    discardReload = harness.latest().remote.syncDraftGuard.discardAndReload();
    await waitFor(
      () => harness.api.count("/api/weather/settings") >= countBeforeKeepEditing + 1,
      "discard reload did not start"
    );
    changeWeatherInterval(harness, 20);
    changeWeatherInterval(harness, 10);
    discardResponse.resolve(createWeatherSettings({ updateIntervalMinutes: 60 }));
    await discardReload;
    await flushReact();

    assert.equal(harness.latest().data.weatherSettings.updateIntervalMinutes, 10);
    assert.equal(harness.latest().data.lastSyncedWeatherSettings.updateIntervalMinutes, 30);
    assert.equal(harness.latest().remote.syncDraftGuard.hasPendingRemoteChange, true);

    harness.api.queueWeatherRead(successfulDiscardResponse.promise);
    discardReload = harness.latest().remote.syncDraftGuard.discardAndReload();
    successfulDiscardResponse.resolve(createWeatherSettings({ updateIntervalMinutes: 60 }));
    await discardReload;
    await flushReact();
    assert.equal(harness.latest().data.weatherSettings.updateIntervalMinutes, 60);
    assert.equal(harness.latest().data.lastSyncedWeatherSettings.updateIntervalMinutes, 60);
    assert.equal(harness.latest().remote.syncDraftGuard.hasPendingRemoteChange, false);

    changeWeatherInterval(harness, 10);
    await harness.latest().remote.syncDraftGuard.handleDisplaySync(displaySyncEvent);
    await flushReact();
    harness.api.queueWeatherRead(failedDiscardResponse.promise);
    discardReload = harness.latest().remote.syncDraftGuard.discardAndReload();
    failedDiscardResponse.reject(new Error("latest Weather reload failed"));
    await assert.rejects(discardReload, /latest Weather reload failed/);
    await flushReact();
    assert.equal(harness.latest().data.weatherSettings.updateIntervalMinutes, 10);
    assert.equal(harness.latest().data.lastSyncedWeatherSettings.updateIntervalMinutes, 60);
    assert.equal(harness.latest().remote.syncDraftGuard.hasPendingRemoteChange, true);
    assert.equal(harness.latest().data.errorMessage, "latest Weather reload failed");
  } finally {
    discardResponse.resolve(createWeatherSettings({ updateIntervalMinutes: 60 }));
    successfulDiscardResponse.resolve(createWeatherSettings({ updateIntervalMinutes: 60 }));
    failedDiscardResponse.reject(new Error("latest Weather reload failed"));
    await discardReload?.catch(() => {});
    await harness.unmount();
  }
});
