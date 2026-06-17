import type {
  DisplayReadinessFinding,
  MonitoringAlertTone,
  MonitoringBindingState,
  MonitoringFallbackStrategy,
  MonitoringFallbackReason,
  MonitoringFreshnessState,
  MonitoringMetricBinding,
  MonitoringMetricProvenance,
  MonitoringMetricSourceClass,
  ResolvedMonitoringMetricBinding
} from "@solar-display/shared";
import {
  resolveMonitoringMetricBinding,
  resolveMonitoringSummaryState
} from "@solar-display/shared";
import type { WeatherCurrentSnapshot } from "@solar-display/shared";
import { liveMetrics } from "../../mocks/metrics";
import { mockWeatherSnapshot } from "../../mocks/weather";
import type { LiveMetricsSnapshot, SocketConnectionState } from "../../services/socket";

const DENSITY_VALUE_PLACEHOLDER = "--";

// In mock data mode the backend streams demo generation metrics but the weather
// route stays unconfigured, so fall back to a demo weather snapshot to keep the
// card populated. Real snapshots always win when available.
export function resolveOverviewWeatherSnapshot(
  weatherSnapshot: WeatherCurrentSnapshot | undefined,
  isMockDataMode: boolean
): WeatherCurrentSnapshot | undefined {
  if (weatherSnapshot && weatherSnapshot.fetchState === "fresh" && weatherSnapshot.airTemperature !== null) {
    return weatherSnapshot;
  }

  return isMockDataMode ? mockWeatherSnapshot : weatherSnapshot;
}

type OverviewPhaseId = "R" | "S" | "T";

export type OverviewPhaseRow = {
  available: boolean;
  current: string;
  id: OverviewPhaseId;
  power: string;
  voltage: string;
};

const overviewPhaseIds: OverviewPhaseId[] = ["R", "S", "T"];

export type OverviewWeatherViewModel = {
  available: boolean;
  condition: string;
  humidity: string;
  location: string;
  observedAt: string;
  precipitation: string;
  temperature: string;
  windSpeed: string;
};

export type OverviewPhasePowerViewModel = {
  available: boolean;
  phases: OverviewPhaseRow[];
};

function readFiniteMetric(snapshot: LiveMetricsSnapshot, key: string): number | null {
  const reading = snapshot.metrics[key];
  if (!reading || typeof reading.value !== "number" || !Number.isFinite(reading.value)) {
    return null;
  }

  return reading.value;
}

function formatPhaseValue(value: number | null, fractionDigits: number): string {
  if (value === null) {
    return DENSITY_VALUE_PLACEHOLDER;
  }

  return value.toFixed(fractionDigits);
}

function buildOverviewPhasePower(snapshot: LiveMetricsSnapshot) {
  const phases = overviewPhaseIds.map<OverviewPhaseRow>((id) => {
    const voltage = readFiniteMetric(snapshot, `phase${id}Voltage`);
    const current = readFiniteMetric(snapshot, `phase${id}Current`);
    const power = readFiniteMetric(snapshot, `phase${id}Power`);

    return {
      available: voltage !== null || current !== null || power !== null,
      current: formatPhaseValue(current, 1),
      id,
      power: formatPhaseValue(power, 2),
      voltage: formatPhaseValue(voltage, 1)
    };
  });

  return {
    available: phases.some((phase) => phase.available),
    phases
  };
}

function buildOverviewWeather(weatherSnapshot?: WeatherCurrentSnapshot) {
  if (
    weatherSnapshot === undefined ||
    weatherSnapshot.fetchState !== "fresh" ||
    weatherSnapshot.airTemperature === null
  ) {
    return {
      available: false as const,
      condition: DENSITY_VALUE_PLACEHOLDER,
      humidity: DENSITY_VALUE_PLACEHOLDER,
      location: "",
      observedAt: "",
      precipitation: DENSITY_VALUE_PLACEHOLDER,
      temperature: DENSITY_VALUE_PLACEHOLDER,
      windSpeed: DENSITY_VALUE_PLACEHOLDER
    };
  }

  const precipitation = weatherSnapshot.precipitation;
  const windSpeed = weatherSnapshot.windSpeed;

  return {
    available: true as const,
    condition: weatherSnapshot.weather ?? DENSITY_VALUE_PLACEHOLDER,
    humidity:
      weatherSnapshot.relativeHumidity === null
        ? DENSITY_VALUE_PLACEHOLDER
        : `${Math.round(weatherSnapshot.relativeHumidity)}%`,
    location: weatherSnapshot.stationName ?? weatherSnapshot.countyName ?? "",
    observedAt: weatherSnapshot.observationTime ?? "",
    precipitation:
      typeof precipitation === "number" && Number.isFinite(precipitation)
        ? `${Math.round(precipitation)} mm`
        : DENSITY_VALUE_PLACEHOLDER,
    temperature: `${Math.round(weatherSnapshot.airTemperature)}°C`,
    windSpeed:
      typeof windSpeed === "number" && Number.isFinite(windSpeed)
        ? `${windSpeed.toFixed(1)} m/s`
        : DENSITY_VALUE_PLACEHOLDER
  };
}

type OverviewMetricKey =
  | "realTimePower"
  | "todayGeneration"
  | "totalGeneration"
  | "todayCo2Reduction"
  | "totalCo2Reduction";

type OverviewStatus = "connected" | "connecting" | "disconnected";
type OverviewMetricIconKey = "bars" | "bolt" | "co2" | "leaf" | "sun";

type OverviewMetricCard = {
  accentColor?: boolean;
  iconKey: OverviewMetricIconKey;
  trendHours?: number[];
  trendSeries?: number[];
  trendUnit?: string;
} & MonitoringMetricBinding<OverviewMetricKey>;

type OverviewResolvedStoryMetric = ResolvedMonitoringMetricBinding<string> & {
  trendHours?: number[];
  trendSeries?: number[];
  trendUnit?: string;
};

type OverviewStorySummary = {
  alertTone: MonitoringAlertTone;
  bindingState: MonitoringBindingState;
  fallbackReason: MonitoringFallbackReason | null;
  freshnessState: MonitoringFreshnessState;
};

export type OverviewAlertItem = {
  detail: string;
  id: string;
  title: string;
  tone: Exclude<MonitoringAlertTone, "normal">;
};

type BuildOverviewViewModelArgs = {
  connectionState: SocketConnectionState["status"];
  isSocketConnected: boolean;
  metricBindings?: OverviewMetricCard[];
  now?: string;
  snapshot: LiveMetricsSnapshot;
  storyOverview?: {
    metrics: Array<ResolvedMonitoringMetricBinding<string> & {
      trendHours?: number[];
      trendSeries?: number[];
      trendUnit?: string;
    }>;
    readinessFindings?: DisplayReadinessFinding[];
    summary: {
      alertTone: MonitoringAlertTone;
      bindingState: MonitoringBindingState;
      fallbackReason: MonitoringFallbackReason | null;
      freshnessState: MonitoringFreshnessState;
    };
  };
  summaryMetricKeys?: OverviewMetricKey[];
  weatherSnapshot?: WeatherCurrentSnapshot;
};

export type OverviewViewModel = ReturnType<typeof buildOverviewViewModel>;

const metricCards: OverviewMetricCard[] = [
  {
    accentColor: false,
    dependencyKeys: ["realTimePower"],
    fallbackIndex: 0,
    iconKey: "bolt",
    metricKey: "realTimePower",
    label: "即時發電功率",
    sourceClass: "mqtt-live",
    unit: "kW"
  },
  {
    accentColor: true,
    dependencyKeys: ["todayGeneration"],
    fallbackIndex: 1,
    iconKey: "sun",
    metricKey: "todayGeneration",
    label: "今日發電量",
    sourceClass: "mqtt-live",
    unit: "kWh"
  },
  {
    accentColor: false,
    dependencyKeys: ["totalGeneration"],
    fallbackIndex: 2,
    iconKey: "bars",
    metricKey: "totalGeneration",
    label: "累積發電量",
    sourceClass: "cumulative-counter",
    unit: "GWh"
  },
  {
    accentColor: false,
    dependencyKeys: ["todayCo2Reduction"],
    fallbackIndex: 3,
    iconKey: "co2",
    metricKey: "todayCo2Reduction",
    label: "今日 CO₂ 減量",
    sourceClass: "mqtt-live",
    unit: "t"
  },
  {
    accentColor: false,
    dependencyKeys: ["totalCo2Reduction"],
    fallbackIndex: 4,
    iconKey: "leaf",
    metricKey: "totalCo2Reduction",
    label: "累積 CO₂ 減量",
    sourceClass: "cumulative-counter",
    unit: "t"
  }
];

const validMonitoringAlertTones = new Set<MonitoringAlertTone>(["danger", "normal", "warning"]);
const validMonitoringBindingStates = new Set<MonitoringBindingState>(["bound", "conflict", "missing"]);
const validMonitoringFreshnessStates = new Set<MonitoringFreshnessState>(["fresh", "fallback", "stale"]);
const validMonitoringFallbackReasons = new Set<MonitoringFallbackReason>([
  "attention-threshold-exceeded",
  "comparison-target-missing",
  "low-output",
  "metric-unavailable",
  "missing-live-power",
  "missing-slot-binding",
  "reduced-efficiency",
  "socket-disconnected",
  "stale-data",
  "warning-threshold-exceeded"
]);
const validMonitoringFallbackStrategies = new Set<MonitoringFallbackStrategy>([
  "derive-from-dependencies",
  "placeholder",
  "retain-last-reading"
]);
const validMonitoringProvenances = new Set<MonitoringMetricProvenance>([
  "cumulative",
  "derived",
  "fallback",
  "live"
]);
const validMonitoringSourceClasses = new Set<MonitoringMetricSourceClass>([
  "cumulative-counter",
  "derived-metric",
  "mqtt-live"
]);
const overviewRequirementLabels: Record<string, string> = {
  realTimePower: "即時發電功率",
  todayCo2Reduction: "今日 CO₂ 減量",
  todayGeneration: "今日發電量",
  totalCo2Reduction: "累積 CO₂ 減量",
  totalGeneration: "累積發電量"
};

function resolveSummaryStatus(connectionState: SocketConnectionState["status"]): OverviewStatus {
  if (connectionState === "connected") {
    return "connected";
  }

  if (connectionState === "connecting") {
    return "connecting";
  }

  return "disconnected";
}

function resolveSummaryLabel(args: {
  isSocketConnected: boolean;
  usesSharedStory: boolean;
  summaryState: {
    bindingState: MonitoringBindingState;
    fallbackReason: MonitoringFallbackReason | null;
    freshnessState: MonitoringFreshnessState;
  };
}) {
  if (args.usesSharedStory) {
    if (args.summaryState.fallbackReason === "stale-data" || args.summaryState.freshnessState === "stale") {
      return "共享故事資料延遲，摘要使用最近一次有效讀值";
    }

    if (args.summaryState.bindingState === "missing" || args.summaryState.freshnessState === "fallback") {
      return "共享故事部分缺值，缺少 KPI 會回退顯示";
    }

    return "共享故事資料同步中";
  }

  if (!args.isSocketConnected) {
    return "Socket 未連線，顯示 mock 資料";
  }

  if (args.summaryState.fallbackReason === "stale-data" || args.summaryState.freshnessState === "stale") {
    return "資料延遲，摘要使用最近一次有效讀值";
  }

  if (args.summaryState.bindingState === "missing" || args.summaryState.freshnessState === "fallback") {
    return "部分 KPI 缺資料，使用 fallback 顯示";
  }

  return "Socket 即時更新中";
}

function resolveStoryMetricCards(
  metricBindings: OverviewMetricCard[],
  storyMetrics: OverviewResolvedStoryMetric[]
) {
  const storyMetricByKey = new Map(storyMetrics.map((metric) => [metric.metricKey, metric]));

  return metricBindings.map((metricCard) => {
    const storyMetric = storyMetricByKey.get(metricCard.metricKey);

    if (!storyMetric) {
      return metricCard;
    }

    return {
      accentColor: metricCard.accentColor,
      alertTone: storyMetric.alertTone,
      bindingState: storyMetric.bindingState,
      dependencyKeys: storyMetric.dependencyKeys,
      fallbackStrategy: storyMetric.fallbackStrategy,
      fallbackReason: storyMetric.fallbackReason,
      freshnessState: storyMetric.freshnessState,
      helper: storyMetric.helper,
      iconKey: metricCard.iconKey,
      label: storyMetric.label,
      metricKey: metricCard.metricKey,
      provenance: storyMetric.provenance,
      sourceClass: storyMetric.sourceClass,
      trendHours:
        Array.isArray(storyMetric.trendHours) &&
        storyMetric.trendHours.every((value) => typeof value === "number" && Number.isFinite(value))
          ? storyMetric.trendHours
          : undefined,
      trendSeries: Array.isArray(storyMetric.trendSeries) ? storyMetric.trendSeries : undefined,
      trendUnit: typeof storyMetric.trendUnit === "string" ? storyMetric.trendUnit : undefined,
      unit: storyMetric.unit,
      value: storyMetric.value
    };
  });
}

function isResolvedStoryMetric(value: unknown): value is OverviewResolvedStoryMetric {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<OverviewResolvedStoryMetric>;
  return (
    typeof candidate.alertTone === "string" &&
    validMonitoringAlertTones.has(candidate.alertTone as MonitoringAlertTone) &&
    typeof candidate.bindingState === "string" &&
    validMonitoringBindingStates.has(candidate.bindingState as MonitoringBindingState) &&
    (candidate.fallbackReason === null || (
      typeof candidate.fallbackReason === "string" &&
      validMonitoringFallbackReasons.has(candidate.fallbackReason as MonitoringFallbackReason)
    )) &&
    typeof candidate.freshnessState === "string" &&
    validMonitoringFreshnessStates.has(candidate.freshnessState as MonitoringFreshnessState) &&
    typeof candidate.metricKey === "string" &&
    typeof candidate.label === "string" &&
    typeof candidate.unit === "string" &&
    typeof candidate.value === "string" &&
    typeof candidate.helper === "string" &&
    typeof candidate.fallbackStrategy === "string" &&
    validMonitoringFallbackStrategies.has(candidate.fallbackStrategy as MonitoringFallbackStrategy) &&
    typeof candidate.provenance === "string" &&
    validMonitoringProvenances.has(candidate.provenance as MonitoringMetricProvenance) &&
    typeof candidate.sourceClass === "string" &&
    validMonitoringSourceClasses.has(candidate.sourceClass as MonitoringMetricSourceClass) &&
    (candidate.trendHours === undefined || (
      Array.isArray(candidate.trendHours) &&
      candidate.trendHours.every((value: number) => typeof value === "number" && Number.isFinite(value))
    )) &&
    (candidate.trendUnit === undefined || typeof candidate.trendUnit === "string") &&
    Array.isArray(candidate.dependencyKeys)
  );
}

function isOverviewStorySummary(value: unknown): value is OverviewStorySummary {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<OverviewStorySummary>;
  return (
    typeof candidate.alertTone === "string" &&
    validMonitoringAlertTones.has(candidate.alertTone as MonitoringAlertTone) &&
    typeof candidate.bindingState === "string" &&
    validMonitoringBindingStates.has(candidate.bindingState as MonitoringBindingState) &&
    (candidate.fallbackReason === null || (
      typeof candidate.fallbackReason === "string" &&
      validMonitoringFallbackReasons.has(candidate.fallbackReason as MonitoringFallbackReason)
    )) &&
    typeof candidate.freshnessState === "string" &&
    validMonitoringFreshnessStates.has(candidate.freshnessState as MonitoringFreshnessState)
  );
}

function isAlertTone(tone: MonitoringAlertTone): tone is Exclude<MonitoringAlertTone, "normal"> {
  return tone === "danger" || tone === "warning";
}

function buildOverviewAlertItems(args: {
  metrics: OverviewResolvedStoryMetric[];
  readinessFindings: DisplayReadinessFinding[];
  summaryState: OverviewStorySummary;
}): OverviewAlertItem[] {
  const metricAlerts = args.metrics.flatMap((metric) => {
    if (!isAlertTone(metric.alertTone) || metric.fallbackReason === null) {
      return [];
    }

    return [{
      detail: metric.helper,
      id: `metric-${metric.metricKey}`,
      title: metric.label,
      tone: metric.alertTone
    }];
  });
  const readinessAlerts = args.readinessFindings
    .filter((finding) => finding.pageId === "overview" && finding.status !== "ready")
    .map((finding) => ({
      detail: finding.reason,
      id: `readiness-${finding.requirementKey}`,
      title: overviewRequirementLabels[finding.requirementKey] ?? finding.requirementKey,
      tone: finding.status === "blocking" ? "danger" as const : "warning" as const
    }));

  if (
    metricAlerts.length === 0 &&
    readinessAlerts.length === 0 &&
    isAlertTone(args.summaryState.alertTone) &&
    args.summaryState.fallbackReason !== null
  ) {
    return [{
      detail: args.summaryState.fallbackReason,
      id: `summary-${args.summaryState.fallbackReason}`,
      title: "Overview runtime",
      tone: args.summaryState.alertTone
    }];
  }

  return [...metricAlerts, ...readinessAlerts];
}

export function buildOverviewViewModel({
  connectionState,
  isSocketConnected,
  metricBindings = metricCards,
  now,
  snapshot,
  storyOverview,
  summaryMetricKeys,
  weatherSnapshot
}: BuildOverviewViewModelArgs) {
  const hasStoryOverview = storyOverview !== undefined;
  const storyMetrics = hasStoryOverview ? storyOverview.metrics.filter(isResolvedStoryMetric) : [];
  const resolvedMetricBindings = hasStoryOverview
    ? resolveStoryMetricCards(metricBindings, storyMetrics)
    : metricBindings;

  const metrics = resolvedMetricBindings.map((metricCard) => {
    const { accentColor = false, iconKey } = metricCard;

    if ("helper" in metricCard) {
      return {
        accentColor,
        alertTone: metricCard.alertTone,
        bindingState: metricCard.bindingState,
        dependencyKeys: metricCard.dependencyKeys,
        fallbackStrategy: metricCard.fallbackStrategy,
        fallbackReason: metricCard.fallbackReason,
        freshnessState: metricCard.freshnessState,
        helper: metricCard.helper,
        iconKey,
        label: metricCard.label,
        metricKey: metricCard.metricKey,
        provenance: metricCard.provenance,
        sourceClass: metricCard.sourceClass,
        trendHours: metricCard.trendHours,
        trendSeries: metricCard.trendSeries,
        trendUnit: metricCard.trendUnit,
        unit: metricCard.unit,
        value: metricCard.value
      };
    }

    const binding = metricCard;
    const fallbackMetric = liveMetrics[binding.fallbackIndex]!;
    const resolved = resolveMonitoringMetricBinding({
      binding: {
        ...binding,
        fallbackHelper: fallbackMetric.helper,
        fallbackValue: fallbackMetric.value
      },
      isConnected: isSocketConnected,
      now,
      reading: snapshot.metrics[binding.metricKey] ?? null
    });

    return {
      accentColor,
      alertTone: resolved.alertTone,
      bindingState: resolved.bindingState,
      dependencyKeys: resolved.dependencyKeys,
      fallbackStrategy: resolved.fallbackStrategy,
      fallbackReason: resolved.fallbackReason,
      freshnessState: resolved.freshnessState,
      helper: resolved.helper,
      iconKey,
      label: resolved.label,
      metricKey: resolved.metricKey,
      provenance: resolved.provenance,
      sourceClass: resolved.sourceClass,
      trendHours: metricCard.trendHours,
      trendSeries: metricCard.trendSeries,
      trendUnit: metricCard.trendUnit,
      unit: resolved.unit,
      value: resolved.value
    };
  });
  const summaryState = hasStoryOverview
    ? isOverviewStorySummary(storyOverview.summary)
      ? storyOverview.summary
      : resolveMonitoringSummaryState(
        metrics.filter((metric) =>
          (summaryMetricKeys ?? resolvedMetricBindings.map((binding) => binding.metricKey)).includes(
            metric.metricKey as OverviewMetricKey
          )
        )
      )
    : resolveMonitoringSummaryState(
      metrics.filter((metric) =>
        (summaryMetricKeys ?? resolvedMetricBindings.map((binding) => binding.metricKey)).includes(
          metric.metricKey as OverviewMetricKey
        )
      )
    );
  const alerts = buildOverviewAlertItems({
    metrics: storyMetrics,
    readinessFindings: storyOverview?.readinessFindings ?? [],
    summaryState
  });

  return {
    alerts,
    hero: {
      eyebrow: "綠能驅動・永續未來",
      subtitleLines: ["Driving a Better Future with", "Green Manufacturing"],
      titleLines: ["以綠色製造", "驅動美好生活"]
    },
    metrics,
    phasePower: buildOverviewPhasePower(snapshot),
    summary: {
      alertTone: summaryState.alertTone,
      fallbackReason: summaryState.fallbackReason,
      status: resolveSummaryStatus(connectionState),
      statusLabel: resolveSummaryLabel({
        isSocketConnected,
        usesSharedStory: hasStoryOverview,
        summaryState
      })
    },
    weather: buildOverviewWeather(weatherSnapshot)
  };
}
