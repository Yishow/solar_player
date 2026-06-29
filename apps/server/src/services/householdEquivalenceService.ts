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
  return date.toISOString().slice(0, 10);
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
  const cumulativeSelfConsumption = database
    .prepare(
      `
        SELECT total_value, last_updated
        FROM cumulative_counters
        WHERE metric_key = 'selfConsumption'
      `
    )
    .get() as CounterRow | undefined;
  const liveSelfConsumption = readLiveMetricsSnapshot(database).metrics.selfConsumptionEnergy;
  const cumulativeSelfConsumptionValue =
    typeof cumulativeSelfConsumption?.total_value === "number"
      ? cumulativeSelfConsumption.total_value
      : typeof liveSelfConsumption?.value === "number"
        ? normalizeEnergyToKwh(liveSelfConsumption.value, liveSelfConsumption.unit)
        : null;
  const cumulativeSelfConsumptionUpdatedAt =
    cumulativeSelfConsumption?.last_updated ??
    liveSelfConsumption?.timestamp ??
    null;
  const cumulativeSelfConsumptionSource =
    typeof cumulativeSelfConsumption?.total_value === "number"
      ? "cumulative-self-consumption"
      : typeof liveSelfConsumption?.value === "number"
        ? "live-self-consumption-fallback"
        : "cumulative-self-consumption";

  return {
    cumulative: deriveHouseholdEquivalenceCard({
      basisSourceLabel: "累積自發自用量",
      calcProfile,
      cardKey: "cumulative",
      provenance: {
        label: "累積自發自用量",
        source: cumulativeSelfConsumptionSource,
        sourceClass: "derived-metric",
        syncState:
          cumulativeSelfConsumptionValue !== null ? "fresh" : "missing",
        updatedAt: cumulativeSelfConsumptionUpdatedAt
      },
      selfConsumptionKwh: cumulativeSelfConsumptionValue
    }),
    today: deriveHouseholdEquivalenceCard({
      basisSourceLabel: "今日自發自用量",
      calcProfile,
      cardKey: "today",
      provenance: {
        label: "今日自發自用量",
        source: "daily-self-consumption",
        sourceClass: "derived-metric",
        syncState:
          typeof dailySummary?.self_consumption_total === "number" ? "fresh" : "missing",
        updatedAt: dailySummary ? `${dailySummary.date}T00:00:00.000Z` : null
      },
      selfConsumptionKwh: dailySummary?.self_consumption_total ?? null
    })
  };
}
