import type Database from "better-sqlite3";
import {
  createHouseholdEquivalenceCalcProfile,
  deriveHouseholdEquivalenceCard
} from "@solar-display/shared";
import { getDatabase } from "../db/index.js";
import { readLiveMetricsSnapshot } from "../metrics/liveMetrics.js";
import { readCalculationSettings } from "./calculationSettingsService.js";

type DailySummaryRow = {
  date: string;
  self_consumption_total: number | null;
};

type CounterRow = {
  last_updated: string | null;
  total_value: number | null;
};

type ReadHouseholdEquivalenceCardsOptions = {
  database?: Database.Database;
  now?: Date;
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
  const cumulativeGeneration = database
    .prepare(
      `
        SELECT total_value, last_updated
        FROM cumulative_counters
        WHERE metric_key = 'generation'
      `
    )
    .get() as CounterRow | undefined;
  const liveGeneration = liveMetrics.totalGeneration;
  const liveTodayGeneration = liveMetrics.todayGeneration;
  const cumulativeGenerationValue =
    typeof cumulativeGeneration?.total_value === "number"
      ? cumulativeGeneration.total_value
      : typeof liveGeneration?.value === "number"
        ? normalizeEnergyToKwh(liveGeneration.value, liveGeneration.unit)
        : null;
  const cumulativeGenerationUpdatedAt =
    cumulativeGeneration?.last_updated ??
    liveGeneration?.timestamp ??
    null;
  const cumulativeGenerationSource =
    typeof cumulativeGeneration?.total_value === "number"
      ? "cumulative-generation"
      : typeof liveGeneration?.value === "number"
        ? "live-generation-fallback"
        : "cumulative-generation";
  const dailySelfConsumptionValue =
    typeof dailySummary?.self_consumption_total === "number"
      ? dailySummary.self_consumption_total
      : null;
  const liveTodayGenerationValue =
    typeof liveTodayGeneration?.value === "number"
      ? normalizeEnergyToKwh(liveTodayGeneration.value, liveTodayGeneration.unit)
      : null;
  const shouldUseDailySelfConsumption =
    dailySelfConsumptionValue !== null &&
    (dailySummary?.date === todayDate
      ? dailySelfConsumptionValue > 0 || liveTodayGenerationValue === null
      : liveTodayGenerationValue === null);
  const todayBasisValue = shouldUseDailySelfConsumption
    ? dailySelfConsumptionValue
    : liveTodayGenerationValue;
  const todayBasisSourceLabel = shouldUseDailySelfConsumption ? "今日自發自用量" : "今日發電量";
  const todayBasisSource = shouldUseDailySelfConsumption
    ? "daily-self-consumption"
    : "live-today-generation-fallback";
  const todayBasisUpdatedAt = shouldUseDailySelfConsumption
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
