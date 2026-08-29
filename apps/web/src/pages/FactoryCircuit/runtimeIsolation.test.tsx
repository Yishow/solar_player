import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import type { CircuitConfig } from "@solar-display/shared";
import type { ReactNode } from "react";
import {
  replaceLiveMetricsConnectionState,
  replaceLiveMetricsSnapshot
} from "../../hooks/liveMetricsStore";
import { createFactoryCircuitDisplayPageSeedConfig } from "./displayPageConfig";
import { FactoryCircuitRuntimeContent } from "./runtimeContent";
import { buildFactoryCircuitRuntimes } from "./viewModel";

const connectedState = {
  lastError: null,
  lastHeartbeatAt: "2026-07-05T10:00:00.000Z",
  status: "connected" as const,
  transport: "websocket"
};

const circuitConfigs: CircuitConfig[] = [
  {
    attentionMax: 620,
    attentionMin: 434,
    displayOrder: 2,
    displaySlot: "body",
    enabled: true,
    icon: "wind",
    id: 2,
    mqttTopic: "factory/power/body",
    nameEn: "Body Shop",
    nameZh: "車身工程",
    normalMax: 434,
    normalMin: 0,
    ratedCapacity: 620,
    unit: "kW",
    warningMax: 620,
    warningMin: 558
  },
  {
    attentionMax: 850,
    attentionMin: 595,
    displayOrder: 1,
    displaySlot: "stamping",
    enabled: true,
    icon: "factory",
    id: 1,
    mqttTopic: "factory/power/stamping",
    nameEn: "Stamping Shop",
    nameZh: "沖壓工程",
    normalMax: 595,
    normalMin: 0,
    ratedCapacity: 850,
    unit: "kW",
    warningMax: 850,
    warningMin: 765
  }
];

function createReading(value: number, unit: string, timestamp: string) {
  return {
    quality: "good",
    timestamp,
    unit,
    value
  };
}

test("factory circuit runtime output stays stable when an unrelated metric changes", () => {
  const seedConfig = createFactoryCircuitDisplayPageSeedConfig();
  const runtimes = buildFactoryCircuitRuntimes(circuitConfigs).map((circuit) =>
    circuit.id === 1
      ? { ...circuit, livePowerKw: 790 }
      : circuit.id === 2
        ? { ...circuit, livePowerKw: 440 }
        : circuit
  );
  const emptyIcons = Object.fromEntries(
    Object.keys(seedConfig.loadRows).map((key) => [key, null])
  ) as Record<string, ReactNode>;

  replaceLiveMetricsConnectionState(connectedState);
  replaceLiveMetricsSnapshot({
    metricScope: "cl",
    metrics: {
      phaseRVoltage: createReading(220.5, "V", "2026-07-05T10:00:00.000Z"),
      realTimePower: createReading(410, "kW", "2026-07-05T10:00:00.000Z"),
      selfConsumptionEnergy: createReading(2430, "kWh", "2026-07-05T10:00:00.000Z")
    },
    timestamp: "2026-07-05T10:00:00.000Z"
  });

  const before = renderToStaticMarkup(
    <FactoryCircuitRuntimeContent
      circuits={runtimes}
      factoryCircuitStory={undefined}
      loadRowIcons={emptyIcons}
      loadState="ready"
      resolvedConfig={seedConfig}
      seedConfig={seedConfig}
    />
  );

  replaceLiveMetricsSnapshot({
    metricScope: "cl",
    metrics: {
      phaseRVoltage: createReading(224.1, "V", "2026-07-05T10:00:05.000Z"),
      realTimePower: createReading(410, "kW", "2026-07-05T10:00:00.000Z"),
      selfConsumptionEnergy: createReading(2430, "kWh", "2026-07-05T10:00:00.000Z")
    },
    timestamp: "2026-07-05T10:00:05.000Z"
  });

  const after = renderToStaticMarkup(
    <FactoryCircuitRuntimeContent
      circuits={runtimes}
      factoryCircuitStory={undefined}
      loadRowIcons={emptyIcons}
      loadState="ready"
      resolvedConfig={seedConfig}
      seedConfig={seedConfig}
    />
  );

  assert.equal(after, before);
});
