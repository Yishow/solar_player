import assert from "node:assert/strict";
import test from "node:test";
import type { LiveMetricsSnapshot } from "../../services/socket";
import { buildOverviewViewModel } from "./viewModel";

const snapshot: LiveMetricsSnapshot = {
  metrics: {
    realTimePower: {
      quality: "good",
      timestamp: "2026-05-13T10:00:00.000Z",
      unit: "kW",
      value: 612.4
    },
    todayGeneration: {
      quality: "good",
      timestamp: "2026-05-13T10:00:00.000Z",
      unit: "kWh",
      value: 3842
    }
  },
  timestamp: "2026-05-13T10:00:00.000Z"
};

function createResolvedStoryMetric(args: {
  alertTone?: "danger" | "normal" | "warning";
  bindingState?: "bound" | "conflict" | "missing";
  dependencyKeys?: string[];
  fallbackReason?: "metric-unavailable" | "stale-data" | null;
  fallbackStrategy?: "placeholder" | "retain-last-reading";
  freshnessState?: "fallback" | "fresh" | "stale";
  helper?: string;
  label: string;
  metricKey: string;
  provenance?: "cumulative" | "derived" | "fallback" | "live";
  sourceClass?: "cumulative-counter" | "derived-metric" | "mqtt-live";
  trendSeries?: number[];
  unit: string;
  value?: string;
}) {
  return {
    alertTone: args.alertTone ?? "normal",
    bindingState: args.bindingState ?? "bound",
    dependencyKeys: args.dependencyKeys ?? [args.metricKey],
    fallbackStrategy: args.fallbackStrategy ?? "placeholder",
    fallbackReason: args.fallbackReason ?? null,
    freshnessState: args.freshnessState ?? "fresh",
    helper: args.helper ?? `共享故事 ${args.label}`,
    label: args.label,
    metricKey: args.metricKey,
    provenance: args.provenance ?? "live",
    sourceClass: args.sourceClass ?? "mqtt-live",
    trendSeries: args.trendSeries,
    unit: args.unit,
    value: args.value ?? "--"
  };
}

test("buildOverviewViewModel prefers live metrics when socket data is available", () => {
  const model = buildOverviewViewModel({
    connectionState: "connected",
    isSocketConnected: true,
    snapshot
  });

  assert.equal(model.metrics.length, 5);
  assert.equal(model.metrics[0]?.value, "612");
  assert.equal(model.metrics[0]?.unit, "kW");
  assert.equal(model.metrics[0]?.iconKey, "bolt");
  assert.match(model.metrics[0]?.helper ?? "", /最後更新/);
  assert.equal(model.metrics[1]?.value, "3,842");
});

test("buildOverviewViewModel falls back to mock presentation when live metrics are unavailable", () => {
  const model = buildOverviewViewModel({
    connectionState: "disconnected",
    isSocketConnected: false,
    snapshot: {
      metrics: {},
      timestamp: null
    }
  });

  assert.equal(model.metrics[0]?.label, "即時發電功率");
  assert.equal(model.metrics[0]?.value, "586");
  assert.equal(model.metrics[4]?.iconKey, "leaf");
  assert.equal(model.summary.statusLabel, "Socket 未連線，顯示 mock 資料");
});

test("buildOverviewViewModel supports declarative KPI bindings and summary diagnostics", () => {
  const model = buildOverviewViewModel({
    connectionState: "connected",
    isSocketConnected: true,
    now: "2026-05-13T10:30:00.000Z",
    snapshot: {
      metrics: {
        totalGeneration: {
          quality: "good",
          timestamp: "2026-05-13T09:10:00.000Z",
          unit: "kWh",
          value: 18642
        },
        todayGeneration: {
          quality: "good",
          timestamp: "2026-05-13T10:28:00.000Z",
          unit: "kWh",
          value: 3842
        }
      },
      timestamp: "2026-05-13T10:28:00.000Z"
    },
    metricBindings: [
      {
        fallbackIndex: 2,
        iconKey: "bars",
        label: "累積發電量",
        metricKey: "totalGeneration",
        unit: "kWh"
      },
      {
        fallbackIndex: 1,
        iconKey: "sun",
        label: "今日發電量",
        metricKey: "todayGeneration",
        unit: "kWh"
      }
    ],
    summaryMetricKeys: ["totalGeneration", "todayGeneration"]
  });

  assert.equal(model.metrics.length, 2);
  assert.equal(model.metrics[0]?.label, "累積發電量");
  assert.equal(model.metrics[0]?.bindingState, "bound");
  assert.equal(model.metrics[0]?.freshnessState, "stale");
  assert.equal(model.metrics[0]?.fallbackReason, "stale-data");
  assert.equal(model.summary.alertTone, "warning");
  assert.equal(model.summary.fallbackReason, "stale-data");
  assert.equal(model.summary.statusLabel, "資料延遲，摘要使用最近一次有效讀值");
});

test("buildOverviewViewModel prefers display-story overview bindings when story data is fresh enough", () => {
  const model = buildOverviewViewModel({
    connectionState: "connected",
    isSocketConnected: true,
    snapshot: {
      metrics: {
        realTimePower: {
          quality: "good",
          timestamp: "2026-05-13T10:00:00.000Z",
          unit: "kW",
          value: 612.4
        },
        todayGeneration: {
          quality: "good",
          timestamp: "2026-05-13T10:00:00.000Z",
          unit: "kWh",
          value: 3842
        },
        totalGeneration: {
          quality: "good",
          timestamp: "2026-05-13T10:00:00.000Z",
          unit: "MWh",
          value: 18.6
        }
      },
      timestamp: "2026-05-13T10:00:00.000Z"
    },
    storyOverview: {
      metrics: [
        createResolvedStoryMetric({
          label: "故事版累積發電量",
          metricKey: "totalGeneration",
          provenance: "cumulative",
          sourceClass: "cumulative-counter",
          unit: "MWh",
          value: "18.6"
        }),
        createResolvedStoryMetric({ label: "故事版即時功率", metricKey: "realTimePower", unit: "kW", value: "612" }),
        createResolvedStoryMetric({ label: "故事版今日發電量", metricKey: "todayGeneration", unit: "kWh", value: "3,842" })
      ],
      summary: {
        alertTone: "normal",
        bindingState: "bound",
        fallbackReason: null,
        freshnessState: "fresh"
      }
    }
  });

  assert.equal(model.metrics.length, 5);
  assert.equal(model.metrics[0]?.label, "故事版即時功率");
  assert.equal(model.metrics[0]?.iconKey, "bolt");
  assert.equal(model.metrics[0]?.provenance, "live");
  assert.equal(model.metrics[1]?.label, "故事版今日發電量");
  assert.equal(model.metrics[2]?.label, "故事版累積發電量");
  assert.equal(model.metrics[2]?.provenance, "cumulative");
  assert.equal(model.metrics[2]?.unit, "MWh");
  assert.equal(model.metrics[3]?.label, "今日 CO₂ 減量");
  assert.equal(model.summary.alertTone, "normal");
  assert.equal(model.summary.statusLabel, "共享故事資料同步中");
});

test("buildOverviewViewModel keeps display-story overview bindings when story summary is stale", () => {
  const model = buildOverviewViewModel({
    connectionState: "connected",
    isSocketConnected: true,
    snapshot,
    storyOverview: {
      metrics: [
        createResolvedStoryMetric({ label: "故事版即時功率", metricKey: "realTimePower", unit: "kW", value: "612" }),
        createResolvedStoryMetric({ label: "故事版今日發電量", metricKey: "todayGeneration", unit: "kWh", value: "3,842" }),
        createResolvedStoryMetric({
          alertTone: "warning",
          fallbackReason: "stale-data",
          freshnessState: "stale",
          label: "故事版累積發電量",
          metricKey: "totalGeneration",
          unit: "GWh",
          value: "--"
        })
      ],
      summary: {
        alertTone: "warning",
        bindingState: "bound",
        fallbackReason: "stale-data",
        freshnessState: "stale"
      }
    }
  });

  assert.equal(model.metrics[0]?.label, "故事版即時功率");
  assert.equal(model.metrics[2]?.label, "故事版累積發電量");
  assert.equal(model.summary.alertTone, "warning");
  assert.equal(model.summary.fallbackReason, "stale-data");
  assert.equal(model.summary.statusLabel, "共享故事資料延遲，摘要使用最近一次有效讀值");
});

test("buildOverviewViewModel keeps shared story metrics when the summary is in fallback state", () => {
  const model = buildOverviewViewModel({
    connectionState: "connected",
    isSocketConnected: true,
    snapshot,
    storyOverview: {
      metrics: [
        createResolvedStoryMetric({ label: "故事版即時功率", metricKey: "realTimePower", unit: "kW", value: "612" }),
        createResolvedStoryMetric({
          alertTone: "warning",
          bindingState: "missing",
          fallbackReason: "metric-unavailable",
          freshnessState: "fallback",
          helper: "共享故事缺少今日發電量",
          label: "故事版今日發電量",
          metricKey: "todayGeneration",
          unit: "kWh",
          value: "--"
        })
      ],
      summary: {
        alertTone: "warning",
        bindingState: "missing",
        fallbackReason: "metric-unavailable",
        freshnessState: "fallback"
      }
    }
  });

  assert.equal(model.metrics[0]?.label, "故事版即時功率");
  assert.equal(model.metrics[1]?.label, "故事版今日發電量");
  assert.equal(model.metrics[2]?.label, "累積發電量");
  assert.equal(model.summary.fallbackReason, "metric-unavailable");
  assert.equal(model.summary.statusLabel, "共享故事部分缺值，缺少 KPI 會回退顯示");
});

test("buildOverviewViewModel accepts resolved display-story overview metrics without fallback bindings", () => {
  const model = buildOverviewViewModel({
    connectionState: "connected",
    isSocketConnected: true,
    snapshot,
    storyOverview: {
      metrics: [
        {
          alertTone: "normal",
          bindingState: "bound",
          dependencyKeys: ["realTimePower"],
          fallbackStrategy: "placeholder",
          fallbackReason: null,
          freshnessState: "fresh",
          helper: "共享故事即時功率",
          label: "故事版即時功率",
          metricKey: "realTimePower",
          provenance: "live",
          sourceClass: "mqtt-live",
          unit: "kW",
          value: "601"
        },
        {
          alertTone: "warning",
          bindingState: "missing",
          dependencyKeys: ["todayGeneration"],
          fallbackStrategy: "placeholder",
          fallbackReason: "metric-unavailable",
          freshnessState: "fallback",
          helper: "共享故事缺少今日發電量",
          label: "故事版今日發電量",
          metricKey: "todayGeneration",
          provenance: "fallback",
          sourceClass: "mqtt-live",
          unit: "kWh",
          value: "--"
        }
      ],
      summary: {
        alertTone: "warning",
        bindingState: "missing",
        fallbackReason: "metric-unavailable",
        freshnessState: "fallback"
      }
    }
  });

  assert.equal(model.metrics[0]?.label, "故事版即時功率");
  assert.equal(model.metrics[0]?.value, "601");
  assert.equal(model.metrics[0]?.helper, "共享故事即時功率");
  assert.equal(model.metrics[1]?.bindingState, "missing");
  assert.equal(model.metrics[1]?.helper, "共享故事缺少今日發電量");
  assert.equal(model.metrics[2]?.label, "累積發電量");
});

test("buildOverviewViewModel tolerates incomplete shared story payloads and falls back to derived summary", () => {
  const model = buildOverviewViewModel({
    connectionState: "connected",
    isSocketConnected: true,
    snapshot,
    storyOverview: {
      metrics: [
        createResolvedStoryMetric({ label: "故事版即時功率", metricKey: "realTimePower", unit: "kW", value: "601" }),
        undefined
      ] as unknown as Array<{
        alertTone: "danger" | "normal" | "warning";
        bindingState: "bound" | "conflict" | "missing";
        dependencyKeys: string[];
        fallbackReason: "metric-unavailable" | "stale-data" | null;
        fallbackStrategy: "derive-from-dependencies" | "placeholder" | "retain-last-reading";
        freshnessState: "fallback" | "fresh" | "stale";
        helper: string;
        label: string;
        metricKey: string;
        provenance: "cumulative" | "derived" | "fallback" | "live";
        sourceClass: "cumulative-counter" | "derived-metric" | "mqtt-live";
        unit: string;
        value: string;
      }>,
      summary: undefined as never
    }
  });

  assert.equal(model.metrics[0]?.label, "故事版即時功率");
  assert.equal(model.metrics[1]?.label, "今日發電量");
  assert.equal(model.summary.alertTone, "warning");
  assert.equal(model.summary.statusLabel, "共享故事部分缺值，缺少 KPI 會回退顯示");
});

test("buildOverviewViewModel rejects invalid shared story state enums and falls back to socket bindings", () => {
  const model = buildOverviewViewModel({
    connectionState: "connected",
    isSocketConnected: true,
    snapshot,
    storyOverview: {
      metrics: [{
        ...createResolvedStoryMetric({ label: "不合法故事版即時功率", metricKey: "realTimePower", unit: "kW", value: "601" }),
        alertTone: "invalid-tone"
      }] as unknown as Array<{
        alertTone: "danger" | "normal" | "warning";
        bindingState: "bound" | "conflict" | "missing";
        dependencyKeys: string[];
        fallbackReason: "metric-unavailable" | "stale-data" | null;
        fallbackStrategy: "derive-from-dependencies" | "placeholder" | "retain-last-reading";
        freshnessState: "fallback" | "fresh" | "stale";
        helper: string;
        label: string;
        metricKey: string;
        provenance: "cumulative" | "derived" | "fallback" | "live";
        sourceClass: "cumulative-counter" | "derived-metric" | "mqtt-live";
        unit: string;
        value: string;
      }>,
      summary: {
        alertTone: "invalid-tone",
        bindingState: "bound",
        fallbackReason: null,
        freshnessState: "fresh"
      } as never
    }
  });

  assert.equal(model.metrics[0]?.label, "即時發電功率");
  assert.equal(model.summary.alertTone, "warning");
  assert.equal(model.summary.statusLabel, "共享故事部分缺值，缺少 KPI 會回退顯示");
});

test("buildOverviewViewModel keeps socket bindings when display-story request failed", () => {
  const model = buildOverviewViewModel({
    connectionState: "connected",
    isSocketConnected: true,
    snapshot
  });

  assert.equal(model.metrics[0]?.label, "即時發電功率");
  assert.equal(model.metrics[1]?.label, "今日發電量");
  assert.equal(model.summary.statusLabel, "部分 KPI 缺資料，使用 fallback 顯示");
});

test("buildOverviewViewModel leaves trendSeries undefined when runtime story metrics do not provide sequences", () => {
  const model = buildOverviewViewModel({
    connectionState: "connected",
    isSocketConnected: true,
    snapshot
  });

  assert.equal(model.metrics.every((metric) => metric.trendSeries === undefined), true);
});

test("buildOverviewViewModel exposes runtime trendSeries from story metrics when available", () => {
  const model = buildOverviewViewModel({
    connectionState: "connected",
    isSocketConnected: true,
    snapshot,
    storyOverview: {
      metrics: [
        createResolvedStoryMetric({
          label: "故事版即時功率",
          metricKey: "realTimePower",
          trendSeries: [82, 95, 101, 108],
          unit: "kW",
          value: "612"
        }),
        createResolvedStoryMetric({
          label: "故事版今日發電量",
          metricKey: "todayGeneration",
          unit: "kWh",
          value: "3,842"
        })
      ],
      summary: {
        alertTone: "normal",
        bindingState: "bound",
        fallbackReason: null,
        freshnessState: "fresh"
      }
    }
  });

  assert.deepEqual(model.metrics.find((metric) => metric.metricKey === "realTimePower")?.trendSeries, [
    82,
    95,
    101,
    108
  ]);
  assert.equal(model.metrics.find((metric) => metric.metricKey === "todayGeneration")?.trendSeries, undefined);
});
