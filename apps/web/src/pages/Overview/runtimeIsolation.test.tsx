import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import {
  replaceLiveMetricsConnectionState,
  replaceLiveMetricsSnapshot
} from "../../hooks/liveMetricsStore";
import { OverviewRuntimeContent } from "./runtimeContent";
import {
  createOverviewDisplayPageSeedConfig,
  resolveOverviewModernDefaultConfig
} from "./displayPageConfig";

const connectedState = {
  lastError: null,
  lastHeartbeatAt: "2026-07-05T10:00:00.000Z",
  status: "connected" as const,
  transport: "websocket"
};

function createReading(value: number, timestamp: string) {
  return {
    quality: null,
    timestamp,
    unit: "kW",
    value
  };
}

test("overview runtime output stays stable when an unrelated metric changes", () => {
  const seedConfig = createOverviewDisplayPageSeedConfig();
  const resolvedConfig = resolveOverviewModernDefaultConfig(
    {
      ...seedConfig,
      dashboardWidgets: {
        ...seedConfig.dashboardWidgets,
        alertNotifications: { ...seedConfig.dashboardWidgets.alertNotifications, visible: false },
        generationTrend: { ...seedConfig.dashboardWidgets.generationTrend, visible: false },
        phasePower: { ...seedConfig.dashboardWidgets.phasePower, visible: false },
        weather: { ...seedConfig.dashboardWidgets.weather, visible: false }
      }
    },
    seedConfig
  );

  replaceLiveMetricsConnectionState(connectedState);
  replaceLiveMetricsSnapshot({
    metricScope: "cl",
    metrics: {
      factoryCircuitHeavyVehiclePower: createReading(91.2, "2026-07-05T10:00:00.000Z"),
      realTimePower: createReading(812.4, "2026-07-05T10:00:00.000Z"),
      todayCo2Reduction: createReading(12.3, "2026-07-05T10:00:00.000Z"),
      todayGeneration: createReading(456.7, "2026-07-05T10:00:00.000Z"),
      totalCo2Reduction: createReading(9800.1, "2026-07-05T10:00:00.000Z"),
      totalGeneration: createReading(21500.8, "2026-07-05T10:00:00.000Z")
    },
    timestamp: "2026-07-05T10:00:00.000Z"
  });

  const before = renderToStaticMarkup(
    <OverviewRuntimeContent
      allowUnscopedMetrics
      resolvedConfig={resolvedConfig}
      resolvedWeatherSnapshot={undefined}
      seedConfig={seedConfig}
      storyOverviewPayload={undefined}
    />
  );

  replaceLiveMetricsSnapshot({
    metricScope: "cl",
    metrics: {
      factoryCircuitHeavyVehiclePower: createReading(108.6, "2026-07-05T10:00:05.000Z"),
      realTimePower: createReading(812.4, "2026-07-05T10:00:00.000Z"),
      todayCo2Reduction: createReading(12.3, "2026-07-05T10:00:00.000Z"),
      todayGeneration: createReading(456.7, "2026-07-05T10:00:00.000Z"),
      totalCo2Reduction: createReading(9800.1, "2026-07-05T10:00:00.000Z"),
      totalGeneration: createReading(21500.8, "2026-07-05T10:00:00.000Z")
    },
    timestamp: "2026-07-05T10:00:05.000Z"
  });

  const after = renderToStaticMarkup(
    <OverviewRuntimeContent
      allowUnscopedMetrics
      resolvedConfig={resolvedConfig}
      resolvedWeatherSnapshot={undefined}
      seedConfig={seedConfig}
      storyOverviewPayload={undefined}
    />
  );

  assert.equal(after, before);
});
