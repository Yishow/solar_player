import { clearInterval, setInterval } from "node:timers";
import type { MetricScope } from "@solar-display/shared";
import type Database from "better-sqlite3";
import { getDatabase } from "../db/index.js";
import {
  computeSolarGenerationPowerAt,
  SOLAR_GENERATION_PROFILE_KW
} from "../metrics/solarGenerationProfile.js";
import { evaluateDerivedMetrics } from "./derivedMetricRegistryService.js";

const DEFAULT_INTERVAL_MS = 60_000;
const TOTAL_GENERATION_BASELINE_GWH = 18_642;
const TOTAL_CONSUMPTION_BASELINE_KWH = 28_400_000;
const TOTAL_SELF_CONSUMPTION_BASELINE_KWH = 19_600_000;
const MOCK_ACCUMULATION_EPOCH = new Date(2026, 0, 1);
const FACTORY_SLOT_WEIGHTS = [
  ["factoryCircuit.stampingPower", 0.18],
  ["factoryCircuit.bodyPower", 0.16],
  ["factoryCircuit.paintingPower", 0.15],
  ["factoryCircuit.assemblyPower", 0.16],
  ["factoryCircuit.utilityPower", 0.12],
  ["factoryCircuit.officePower", 0.08],
  ["factoryCircuit.heavyVehiclePower", 0.08],
  ["factoryCircuit.edCoatingPower", 0.07]
] as const;

type MockMetricReading = {
  metricKey: string;
  rawPayload: string;
  unit: string;
  value: number;
};

// Simulated instantaneous solar generation power for the given moment. Delegates
// to the shared daily profile so the mock feed and the seed history render the
// same realistic curve (steep morning ramp, early-afternoon peak, gentle decline).
export function computeMockSolarPowerAt(date: Date): number {
  return computeSolarGenerationPowerAt(date);
}

function roundTo(value: number, digits: number) {
  return Number(value.toFixed(digits));
}

function computeTodayGenerationKwh(date: Date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  let totalKwh = 0;
  for (let cursor = new Date(startOfDay); cursor < date; cursor.setMinutes(cursor.getMinutes() + 1)) {
    totalKwh += computeMockSolarPowerAt(cursor) / 60;
  }

  return roundTo(totalKwh, 0);
}

function localDayNumber(date: Date) {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000);
}

const MOCK_DAILY_GENERATION_KWH = computeTodayGenerationKwh(new Date(2026, 0, 1, 23, 59, 59));

function computeDailyConsumptionKwh(generationKwh: number) {
  return roundTo(Math.max(generationKwh * 1.22 + 380, 420), 0);
}

function computeDailySelfConsumptionKwh(generationKwh: number, consumptionKwh: number) {
  const daylightShare = Math.min(1, generationKwh / 26_000);
  return roundTo(
    Math.min(consumptionKwh * 0.74, generationKwh * (0.58 + daylightShare * 0.14)),
    0
  );
}

function buildMockMetricReadings(date: Date): MockMetricReading[] {
  const realTimePower = computeMockSolarPowerAt(date);
  const todayGeneration = computeTodayGenerationKwh(date);
  const completedDays = Math.max(0, localDayNumber(date) - localDayNumber(MOCK_ACCUMULATION_EPOCH));
  const cumulativeGeneration = completedDays * MOCK_DAILY_GENERATION_KWH + todayGeneration;
  const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
  const completedMonthDays = Math.max(0, localDayNumber(date) - localDayNumber(monthStart));
  const monthGeneration = completedMonthDays * MOCK_DAILY_GENERATION_KWH + todayGeneration;
  const totalGeneration = roundTo(TOTAL_GENERATION_BASELINE_GWH + cumulativeGeneration / 1_000_000, 6);
  const solarPeakPower = Math.max(...SOLAR_GENERATION_PROFILE_KW);
  const powerIntensity = solarPeakPower > 0 ? realTimePower / solarPeakPower : 0;
  const todayConsumption = computeDailyConsumptionKwh(todayGeneration);
  const todaySelfConsumption = computeDailySelfConsumptionKwh(todayGeneration, todayConsumption);
  const dailyConsumption = computeDailyConsumptionKwh(MOCK_DAILY_GENERATION_KWH);
  const dailySelfConsumption = computeDailySelfConsumptionKwh(
    MOCK_DAILY_GENERATION_KWH,
    dailyConsumption
  );
  const consumptionEnergy = TOTAL_CONSUMPTION_BASELINE_KWH + completedDays * dailyConsumption + todayConsumption;
  const selfConsumptionEnergy =
    TOTAL_SELF_CONSUMPTION_BASELINE_KWH + completedDays * dailySelfConsumption + todaySelfConsumption;
  const systemEfficiency = roundTo(92 + powerIntensity * 6.5, 1);
  const factoryLoadPower = roundTo(Math.max(realTimePower * 1.18, 460), 0);
  const sourceTimestamp = date.toISOString();
  const sourceReading = (metricKey: string, value: number): MockMetricReading => ({
    metricKey,
    rawPayload: JSON.stringify({ timestamp: sourceTimestamp, value }),
    unit: "MWh",
    value
  });

  return [
    { metricKey: "realTimePower", rawPayload: JSON.stringify({ value: realTimePower }), unit: "kW", value: realTimePower },
    { metricKey: "todayGeneration", rawPayload: JSON.stringify({ value: todayGeneration }), unit: "kWh", value: todayGeneration },
    { metricKey: "totalGeneration", rawPayload: JSON.stringify({ value: totalGeneration }), unit: "GWh", value: totalGeneration },
    sourceReading("factoryGeneration.todayMwh", todayGeneration / 1_000),
    sourceReading("factoryGeneration.monthMwh", monthGeneration / 1_000),
    sourceReading("factoryGeneration.totalMwh", totalGeneration * 1_000),
    {
      metricKey: "consumptionEnergy",
      rawPayload: JSON.stringify({ value: consumptionEnergy }),
      unit: "kWh",
      value: consumptionEnergy
    },
    {
      metricKey: "selfConsumptionEnergy",
      rawPayload: JSON.stringify({ value: selfConsumptionEnergy }),
      unit: "kWh",
      value: selfConsumptionEnergy
    },
    {
      metricKey: "systemEfficiency",
      rawPayload: JSON.stringify({ value: systemEfficiency }),
      unit: "%",
      value: systemEfficiency
    },
    ...FACTORY_SLOT_WEIGHTS.map(([metricKey, weight]) => ({
      metricKey,
      rawPayload: JSON.stringify({ value: roundTo(factoryLoadPower * weight, 0) }),
      unit: "kW",
      value: roundTo(factoryLoadPower * weight, 0)
    }))
  ];
}

type MockMetricsFeedServiceOptions = {
  database?: Database.Database;
  intervalMs?: number;
  metricScope: MetricScope;
  now?: () => Date;
};

// Development-only feed: in mock mode the MQTT client never connects, so the
// live-metrics store stays empty and the snapshot pipeline would flatten the
// Overview trend. This service periodically upserts a simulated instantaneous
// `realTimePower` reading into `live_metric_values`, letting the existing
// accumulator + snapshot-writer pipeline build the trend history from runtime
// data without bypassing it.
export class MockMetricsFeedService {
  private readonly database: Database.Database;
  private readonly intervalMs: number;
  private readonly metricScope: MetricScope;
  private readonly now: () => Date;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(options: MockMetricsFeedServiceOptions) {
    this.database = options.database ?? getDatabase();
    this.intervalMs = options.intervalMs ?? DEFAULT_INTERVAL_MS;
    this.metricScope = options.metricScope;
    this.now = options.now ?? (() => new Date());
  }

  start() {
    if (this.timer) {
      return;
    }

    this.writeReading();
    this.timer = setInterval(() => this.writeReading(), this.intervalMs);
    this.timer.unref?.();
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  writeReading() {
    const readings = buildMockMetricReadings(this.now());
    const upsert = this.database.prepare(
      `
        INSERT INTO live_metric_values (
          metric_scope,
          metric_key,
          value,
          unit,
          timestamp,
          quality,
          raw_payload
        ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?)
        ON CONFLICT(metric_scope, metric_key) DO UPDATE SET
          value = excluded.value,
          unit = excluded.unit,
          timestamp = CURRENT_TIMESTAMP,
          quality = excluded.quality,
          raw_payload = excluded.raw_payload
      `
    );

    const transaction = this.database.transaction((metricReadings: MockMetricReading[]) => {
      for (const reading of metricReadings) {
        upsert.run(
          this.metricScope,
          reading.metricKey,
          reading.value,
          reading.unit,
          "good",
          reading.rawPayload
        );
      }
    });

    transaction(readings);
    // evaluateDerivedMetrics initialises the registry lazily when no compiled
    // snapshot is cached, so a tick never needs to recompile it explicitly.
    evaluateDerivedMetrics(this.database, this.now());
  }
}
