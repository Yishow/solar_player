import type Database from "better-sqlite3";
import {
  createDefaultHouseholdEquivalenceCalcProfile,
  deriveHouseholdEquivalenceCard
} from "@solar-display/shared";
import { getDatabase } from "../db/index.js";

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

export function readHouseholdEquivalenceCards(options: ReadHouseholdEquivalenceCardsOptions = {}) {
  const database = options.database ?? getDatabase();
  const now = options.now ?? new Date();
  const todayDate = toDateKey(now);
  const calcProfile = createDefaultHouseholdEquivalenceCalcProfile();
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

  return {
    cumulative: deriveHouseholdEquivalenceCard({
      basisSourceLabel: "累積自發自用量",
      calcProfile,
      cardKey: "cumulative",
      provenance: {
        label: "累積自發自用量",
        source: "cumulative-self-consumption",
        sourceClass: "derived-metric",
        syncState:
          typeof cumulativeSelfConsumption?.total_value === "number" ? "fresh" : "missing",
        updatedAt: cumulativeSelfConsumption?.last_updated ?? null
      },
      selfConsumptionKwh: cumulativeSelfConsumption?.total_value ?? null
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
