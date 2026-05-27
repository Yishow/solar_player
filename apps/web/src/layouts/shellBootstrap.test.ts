import assert from "node:assert/strict";
import test from "node:test";
import type { WeatherHeaderContract } from "@solar-display/shared";
import { defaultBrandView, type BrandView } from "../hooks/useBrandAssets";
import type { MqttConnectionStatus } from "../services/socket";
import { createShellBootstrapLoader, resolveShellBootstrap } from "./shellBootstrap";

const brandView: BrandView = {
  ...defaultBrandView,
  productTitleZh: "首屏 Shell"
};

const mqttStatus: MqttConnectionStatus = {
  broker: "mqtt.example:1883",
  clientId: "display-client",
  connected: true,
  reason: "connected",
  updatedAt: "2026-05-27T00:00:00.000Z"
};

const weatherContract: WeatherHeaderContract = {
  current: {
    airPressure: null,
    airTemperature: 29,
    countyName: "桃園市",
    dailyHigh: null,
    dailyLow: null,
    fetchState: "fresh",
    observationTime: "2026-05-27T00:00:00.000Z",
    precipitation: null,
    relativeHumidity: 70,
    staleAt: null,
    stationId: "C0C480",
    stationName: "東眼山",
    townName: "復興區",
    updatedAt: "2026-05-27T00:00:00.000Z",
    weather: "晴",
    windDirection: null,
    windSpeed: null
  },
  settings: {
    enabled: true,
    fieldKeys: ["weather", "airTemperature", "relativeHumidity", "observationTime"],
    preset: "standard"
  }
};

test("resolveShellBootstrap collects brand weather and mqtt state before first paint", async () => {
  const bootstrap = await resolveShellBootstrap({
    loadBrandView: async () => brandView,
    loadMqttStatus: async () => mqttStatus,
    loadWeatherContract: async () => weatherContract
  });

  assert.deepEqual(bootstrap, {
    brandView,
    mqttStatus,
    weatherContract
  });
});

test("resolveShellBootstrap keeps brand fallback while making unavailable shell status explicit", async () => {
  const bootstrap = await resolveShellBootstrap({
    loadBrandView: async () => brandView,
    loadMqttStatus: async () => {
      throw new Error("mqtt unavailable");
    },
    loadWeatherContract: async () => {
      throw new Error("weather unavailable");
    }
  });

  assert.deepEqual(bootstrap, {
    brandView,
    mqttStatus: null,
    weatherContract: null
  });
});

test("createShellBootstrapLoader reuses the first shell bootstrap across shell route transitions", async () => {
  let brandLoadCount = 0;
  const loader = createShellBootstrapLoader({
    loadBrandView: async () => {
      brandLoadCount += 1;
      return {
        ...brandView,
        productTitleZh: `Shell ${brandLoadCount}`
      };
    },
    loadMqttStatus: async () => mqttStatus,
    loadWeatherContract: async () => weatherContract
  });

  const firstBootstrap = await loader();
  const secondBootstrap = loader();

  assert.deepEqual(secondBootstrap, firstBootstrap);
  assert.equal(brandLoadCount, 1);
});
