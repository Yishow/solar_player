import type { DisplayCircuitSlotKey } from "./displayReadiness.js";
import type { MetricKey } from "./types.js";

export type MonitoringFreshnessState = "fresh" | "fallback" | "stale";
export type MonitoringAlertTone = "danger" | "normal" | "warning";
export type MonitoringBindingState = "bound" | "conflict" | "missing";
export type MonitoringFallbackStrategy =
  | "derive-from-dependencies"
  | "placeholder"
  | "retain-last-reading";
export type MonitoringFallbackReason =
  | "attention-threshold-exceeded"
  | "comparison-target-missing"
  | "low-output"
  | "metric-unavailable"
  | "missing-live-power"
  | "missing-slot-binding"
  | "reduced-efficiency"
  | "socket-disconnected"
  | "stale-data"
  | "warning-threshold-exceeded";
export type MonitoringMetricProvenance =
  | "aggregate"
  | "cumulative"
  | "derived"
  | "fallback"
  | "live";
export type MonitoringMetricSourceClass =
  | "cumulative-counter"
  | "derived-metric"
  | "mqtt-live"
  | "slot-aggregate";

export type MonitoringStoryState = {
  alertTone: MonitoringAlertTone;
  bindingState: MonitoringBindingState;
  fallbackReason: MonitoringFallbackReason | null;
  freshnessState: MonitoringFreshnessState;
};

export type MonitoringMetricReading = {
  quality: string | null;
  timestamp: string;
  unit: string | null;
  value: number;
};

export type MonitoringMetricBinding<TMetric extends string = MetricKey> = {
  dependencyKeys?: string[];
  fallbackHelper?: string;
  fallbackIndex: number;
  fallbackStrategy?: MonitoringFallbackStrategy;
  fallbackValue?: string;
  label: string;
  metricKey: TMetric;
  sourceClass?: MonitoringMetricSourceClass;
  staleAfterMs?: number;
  unit: string;
};

export type ResolvedMonitoringMetricBinding<TMetric extends string = MetricKey> =
  MonitoringStoryState & {
    dependencyKeys: string[];
    fallbackStrategy: MonitoringFallbackStrategy;
    helper: string;
    label: string;
    metricKey: TMetric;
    provenance: MonitoringMetricProvenance;
    sourceClass: MonitoringMetricSourceClass;
    unit: string;
    value: string;
  };

export type MonitoringSummaryState = MonitoringStoryState;

export type FactoryCircuitKpiKey =
  | "flow"
  | "peak"
  | "selfConsumption"
  | "solarShare"
  | "totalPower";

export type FactoryCircuitStorySlot = MonitoringStoryState & {
  circuitId: number | null;
  label: string;
  livePowerKw: number | null;
  slotKey: DisplayCircuitSlotKey;
};

export type FactoryCircuitStoryPayload = {
  kpis: Array<ResolvedMonitoringMetricBinding<FactoryCircuitKpiKey>>;
  slots: FactoryCircuitStorySlot[];
  summary: MonitoringSummaryState;
};

export type SolarComparisonTarget = {
  label: string;
  unit: string;
  value: number;
};

export type SolarComparisonState = {
  delta: string | null;
  fallbackReason: MonitoringFallbackReason | null;
  label: string;
  state: "above-target" | "below-target" | "on-target" | "unavailable";
};

export type SolarFlowStoryState = {
  reason: "low-output" | "ready" | "reduced-efficiency" | "socket-disconnected";
  state: "degraded" | "normal" | "standby";
};

const defaultStaleAfterMs = 15 * 60 * 1000;

export function formatMonitoringValue(value: number, unit: string | null) {
  const digits = unit === "%" ? 1 : Math.abs(value) >= 100 ? 0 : Math.abs(value) >= 10 ? 1 : 2;

  return value.toLocaleString("zh-TW", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits === 0 ? 0 : 1
  });
}

function resolveFreshnessState(args: {
  isConnected: boolean;
  now?: string;
  reading: MonitoringMetricReading | null;
  staleAfterMs: number;
}): MonitoringStoryState {
  if (!args.isConnected) {
    return {
      alertTone: "warning",
      bindingState: "missing",
      fallbackReason: "socket-disconnected",
      freshnessState: "fallback"
    };
  }

  if (!args.reading) {
    return {
      alertTone: "warning",
      bindingState: "missing",
      fallbackReason: "metric-unavailable",
      freshnessState: "fallback"
    };
  }

  if (!args.now) {
    return {
      alertTone: "normal",
      bindingState: "bound",
      fallbackReason: null,
      freshnessState: "fresh"
    };
  }

  const nowValue = new Date(args.now).getTime();
  const readingValue = new Date(args.reading.timestamp).getTime();

  if (!Number.isFinite(nowValue) || !Number.isFinite(readingValue)) {
    return {
      alertTone: "normal",
      bindingState: "bound",
      fallbackReason: null,
      freshnessState: "fresh"
    };
  }

  if (nowValue - readingValue > args.staleAfterMs) {
    return {
      alertTone: "warning",
      bindingState: "bound",
      fallbackReason: "stale-data",
      freshnessState: "stale"
    };
  }

  return {
    alertTone: "normal",
    bindingState: "bound",
    fallbackReason: null,
    freshnessState: "fresh"
  };
}

export function resolveMonitoringMetricBinding<TMetric extends string>(args: {
  binding: MonitoringMetricBinding<TMetric>;
  isConnected: boolean;
  now?: string;
  reading: MonitoringMetricReading | null;
}) {
  const dependencyKeys = args.binding.dependencyKeys ?? [args.binding.metricKey];
  const fallbackStrategy = args.binding.fallbackStrategy ?? "placeholder";
  const sourceClass = args.binding.sourceClass ?? "mqtt-live";
  const state = resolveFreshnessState({
    isConnected: args.isConnected,
    now: args.now,
    reading: args.reading,
    staleAfterMs: args.binding.staleAfterMs ?? defaultStaleAfterMs
  });

  if (state.bindingState !== "bound" || !args.reading) {
    return {
      ...state,
      dependencyKeys,
      fallbackStrategy,
      helper: args.binding.fallbackHelper ?? "顯示 fallback 資料",
      label: args.binding.label,
      metricKey: args.binding.metricKey,
      provenance: "fallback",
      sourceClass,
      unit: args.binding.unit,
      value: args.binding.fallbackValue ?? "--"
    } satisfies ResolvedMonitoringMetricBinding<TMetric>;
  }

  return {
    ...state,
    dependencyKeys,
    fallbackStrategy,
    helper: `最後更新 ${args.reading.timestamp}`,
    label: args.binding.label,
    metricKey: args.binding.metricKey,
    provenance:
      sourceClass === "cumulative-counter"
        ? "cumulative"
        : sourceClass === "slot-aggregate"
          ? "aggregate"
          : "live",
    sourceClass,
    unit: args.reading.unit ?? args.binding.unit,
    value: formatMonitoringValue(args.reading.value, args.reading.unit ?? args.binding.unit)
  } satisfies ResolvedMonitoringMetricBinding<TMetric>;
}

export function resolveMonitoringSummaryState(states: MonitoringStoryState[]) {
  const fallbackReason =
    states.find((state) => state.fallbackReason === "stale-data")?.fallbackReason ??
    states.find((state) => state.fallbackReason)?.fallbackReason ??
    null;

  return {
    alertTone: states.some((state) => state.alertTone === "danger")
      ? "danger"
      : states.some((state) => state.alertTone === "warning")
        ? "warning"
        : "normal",
    bindingState: states.some((state) => state.bindingState === "missing")
      ? "missing"
      : states.some((state) => state.bindingState === "conflict")
        ? "conflict"
        : "bound",
    fallbackReason,
    freshnessState: states.some((state) => state.freshnessState === "stale")
      ? "stale"
      : states.some((state) => state.freshnessState === "fallback")
        ? "fallback"
        : "fresh"
  } satisfies MonitoringSummaryState;
}

export function resolveMonitoringSlotBinding(args: {
  circuitId: number | null;
  conflictingCircuitIds?: number[];
  slotKey: DisplayCircuitSlotKey;
}) {
  if ((args.conflictingCircuitIds?.length ?? 0) > 1) {
    return {
      alertTone: "danger",
      bindingState: "conflict",
      fallbackReason: "missing-slot-binding",
      freshnessState: "fallback",
      slotKey: args.slotKey
    };
  }

  if (args.circuitId === null) {
    return {
      alertTone: "warning",
      bindingState: "missing",
      fallbackReason: "missing-slot-binding",
      freshnessState: "fallback",
      slotKey: args.slotKey
    };
  }

  return {
    alertTone: "normal",
    bindingState: "bound",
    fallbackReason: null,
    freshnessState: "fresh",
    slotKey: args.slotKey
  };
}

export function resolveSolarComparison(args: {
  actualUnit: string;
  actualValue: number | null;
  target?: SolarComparisonTarget;
}) {
  if (args.actualValue === null || !args.target) {
    return {
      delta: null,
      fallbackReason: "comparison-target-missing",
      label: args.target?.label ?? "未設定對標",
      state: "unavailable"
    } satisfies SolarComparisonState;
  }

  const deltaValue = args.actualValue - args.target.value;
  return {
    delta: `${deltaValue > 0 ? "+" : ""}${formatMonitoringValue(deltaValue, args.target.unit)}`,
    fallbackReason: null,
    label: `${args.target.label} ${formatMonitoringValue(args.target.value, args.target.unit)} ${args.target.unit}`.trim(),
    state: deltaValue > 0 ? "above-target" : deltaValue < 0 ? "below-target" : "on-target"
  } satisfies SolarComparisonState;
}

export function resolveSolarFlowState(args: {
  efficiencyPercent: number | null;
  isConnected: boolean;
  powerKw: number | null;
}) {
  if (!args.isConnected) {
    return {
      reason: "socket-disconnected",
      state: "standby"
    } satisfies SolarFlowStoryState;
  }

  if (args.efficiencyPercent !== null && args.efficiencyPercent < 90) {
    return {
      reason: "reduced-efficiency",
      state: "degraded"
    } satisfies SolarFlowStoryState;
  }

  if (args.powerKw !== null && args.powerKw < 100) {
    return {
      reason: "low-output",
      state: "degraded"
    } satisfies SolarFlowStoryState;
  }

  return {
    reason: "ready",
    state: "normal"
  } satisfies SolarFlowStoryState;
}
