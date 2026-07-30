import type Database from "better-sqlite3";
import {
  createHouseholdEquivalenceCalcProfile,
  deriveHouseholdEquivalenceCard,
  type SiteScope
} from "@solar-display/shared";
import { getDatabase } from "../db/index.js";
import { readLiveMetricsSnapshot } from "../metrics/liveMetrics.js";
import { readCalculationSettings } from "./calculationSettingsService.js";
import {
  evaluateFactoryGenerationScope,
  resolveFactoryGenerationScope
} from "./factoryGenerationAggregateService.js";
import { readPlaybackPages } from "./displayRotationService.js";

type DailySummaryRow = {
  date: string;
  self_consumption_total: number | null;
};

type ReadHouseholdEquivalenceCardsOptions = {
  database?: Database.Database;
  now?: Date;
  siteScope?: SiteScope;
};

function toDateKey(date: Date) {
  const pad = (value: number) => `${value}`.padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function normalizeUnit(unit: string | null | undefined) {
  return unit?.trim().toLowerCase() ?? "";
}

function normalizeEnergyToKwh(value: number, unit: string | null | undefined) {
  switch (normalizeUnit(unit)) {
    case "gwh":
      return value * 1_000_000;
    case "mwh":
      return value * 1_000;
    case "wh":
      return value / 1_000;
    default:
      return value;
  }
}

export function readHouseholdEquivalenceCards(options: ReadHouseholdEquivalenceCardsOptions = {}) {
  const database = options.database ?? getDatabase();
  const now = options.now ?? new Date();
  const todayDate = toDateKey(now);
  const calculationSettings = readCalculationSettings(database);
  const calcProfile = createHouseholdEquivalenceCalcProfile({
    averageDailyUsageKwh: calculationSettings.householdDailyUsageKwh,
    averageMonthlyUsageKwh: calculationSettings.householdMonthlyUsageKwh,
    estimatedTariffPerKwh: calculationSettings.estimatedTariffPerKwh
  });
  const dailySummary = database
    .prepare(
      `
        SELECT date, self_consumption_total
        FROM daily_energy_summaries
        WHERE date <= ?
        ORDER BY date DESC
        LIMIT 1
      `
    )
    .get(todayDate) as DailySummaryRow | undefined;
  const liveMetrics = readLiveMetricsSnapshot(database).metrics;
  const liveTodayGeneration = liveMetrics.todayGeneration;
  const factoryScope = options.siteScope
    ? options.siteScope === "cl"
      ? "CL"
      : "KN"
    : resolveFactoryGenerationScope(readPlaybackPages());
  const factoryGeneration =
    factoryScope === "none"
      ? null
      : evaluateFactoryGenerationScope(database, factoryScope, now);
  const cumulativeGenerationValue =
    factoryGeneration?.state === "ready" && "values" in factoryGeneration
      ? (factoryGeneration.values as { totalGeneration: number }).totalGeneration * 1_000
      : null;
  const cumulativeGenerationUpdatedAt = factoryGeneration?.updatedAt ?? null;
  const cumulativeGenerationSource =
    factoryScope === "none"
      ? "未選擇廠區"
      : factoryScope === "CL+KN"
        ? "CL + KN MQTT aggregate"
        : `${factoryScope} MQTT`;
  const dailySelfConsumptionValue =
    typeof dailySummary?.self_consumption_total === "number"
      ? dailySummary.self_consumption_total
      : null;
  const liveTodayGenerationValue =
    typeof liveTodayGeneration?.value === "number"
      ? normalizeEnergyToKwh(liveTodayGeneration.value, liveTodayGeneration.unit)
      : null;
  const siteTodayGenerationValue =
    options.siteScope &&
    factoryGeneration?.state === "ready" &&
    "values" in factoryGeneration
      ? (factoryGeneration.values as { todayGeneration: number }).todayGeneration *
        1_000
      : null;
  const shouldUseDailySelfConsumption =
    !options.siteScope &&
    dailySelfConsumptionValue !== null &&
    (dailySummary?.date === todayDate
      ? dailySelfConsumptionValue > 0 || liveTodayGenerationValue === null
      : liveTodayGenerationValue === null);
  const todayBasisValue = options.siteScope
    ? siteTodayGenerationValue
    : shouldUseDailySelfConsumption
      ? dailySelfConsumptionValue
      : liveTodayGenerationValue;
  const todayBasisSourceLabel = "今日發電量";
  const todayBasisSource = options.siteScope
    ? `${factoryScope} MQTT`
    : shouldUseDailySelfConsumption
      ? "daily-self-consumption"
      : "live-today-generation-fallback";
  const todayBasisUpdatedAt = options.siteScope
    ? factoryGeneration?.updatedAt ?? null
    : shouldUseDailySelfConsumption
      ? dailySummary
        ? `${dailySummary.date}T00:00:00.000Z`
        : null
      : liveTodayGeneration?.timestamp ?? null;

  return {
    cumulative: deriveHouseholdEquivalenceCard({
      basisSourceLabel: "累積發電量",
      calcProfile,
      cardKey: "cumulative",
      provenance: {
        label: "累積發電量",
        source: cumulativeGenerationSource,
        sourceClass: "derived-metric",
        syncState:
          cumulativeGenerationValue !== null ? "fresh" : "missing",
        updatedAt: cumulativeGenerationUpdatedAt
      },
      selfConsumptionKwh: cumulativeGenerationValue
    }),
    today: deriveHouseholdEquivalenceCard({
      basisSourceLabel: todayBasisSourceLabel,
      calcProfile,
      cardKey: "today",
      provenance: {
        label: todayBasisSourceLabel,
        source: todayBasisSource,
        sourceClass: "derived-metric",
        syncState: todayBasisValue !== null ? "fresh" : "missing",
        updatedAt: todayBasisUpdatedAt
      },
      selfConsumptionKwh: todayBasisValue
    })
  };
}
