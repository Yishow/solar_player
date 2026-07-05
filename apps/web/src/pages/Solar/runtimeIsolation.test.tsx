import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import {
  replaceLiveMetricsConnectionState,
  replaceLiveMetricsSnapshot
} from "../../hooks/liveMetricsStore";
import { SolarRuntimeContent } from "./runtimeContent";
import { createSolarDisplayPageSeedConfig } from "./displayPageConfig";

const connectedState = {
  lastError: null,
  lastHeartbeatAt: "2026-07-05T10:00:00.000Z",
  status: "connected" as const,
  transport: "websocket"
};

function createReading(value: number, unit: string, timestamp: string) {
  return {
    quality: null,
    timestamp,
    unit,
    value
  };
}

test("solar runtime output stays stable when an unrelated metric changes", () => {
  const seedConfig = createSolarDisplayPageSeedConfig();

  replaceLiveMetricsConnectionState(connectedState);
  replaceLiveMetricsSnapshot({
    metrics: {
      phaseRVoltage: createReading(220.5, "V", "2026-07-05T10:00:00.000Z"),
      realTimePower: createReading(812.4, "kW", "2026-07-05T10:00:00.000Z"),
      selfConsumptionRatio: createReading(58.2, "%", "2026-07-05T10:00:00.000Z"),
      systemEfficiency: createReading(92.4, "%", "2026-07-05T10:00:00.000Z"),
      todayCo2Reduction: createReading(12.3, "t", "2026-07-05T10:00:00.000Z"),
      todayGeneration: createReading(456.7, "kWh", "2026-07-05T10:00:00.000Z"),
      totalCo2Reduction: createReading(9800.1, "t", "2026-07-05T10:00:00.000Z")
    },
    timestamp: "2026-07-05T10:00:00.000Z"
  });

  const before = renderToStaticMarkup(
    <SolarRuntimeContent
      resolvedConfig={seedConfig}
      seedConfig={seedConfig}
      solarStoryPayload={undefined}
    />
  );

  replaceLiveMetricsSnapshot({
    metrics: {
      phaseRVoltage: createReading(224.1, "V", "2026-07-05T10:00:05.000Z"),
      realTimePower: createReading(812.4, "kW", "2026-07-05T10:00:00.000Z"),
      selfConsumptionRatio: createReading(58.2, "%", "2026-07-05T10:00:00.000Z"),
      systemEfficiency: createReading(92.4, "%", "2026-07-05T10:00:00.000Z"),
      todayCo2Reduction: createReading(12.3, "t", "2026-07-05T10:00:00.000Z"),
      todayGeneration: createReading(456.7, "kWh", "2026-07-05T10:00:00.000Z"),
      totalCo2Reduction: createReading(9800.1, "t", "2026-07-05T10:00:00.000Z")
    },
    timestamp: "2026-07-05T10:00:05.000Z"
  });

  const after = renderToStaticMarkup(
    <SolarRuntimeContent
      resolvedConfig={seedConfig}
      seedConfig={seedConfig}
      solarStoryPayload={undefined}
    />
  );

  assert.equal(after, before);
});
