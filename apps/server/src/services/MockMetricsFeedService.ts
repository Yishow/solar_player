import { clearInterval, setInterval } from "node:timers";
import type Database from "better-sqlite3";
import { getDatabase } from "../db/index.js";
import {
  computeSolarGenerationPowerAt,
  SOLAR_GENERATION_PROFILE_KW
} from "../metrics/solarGenerationProfile.js";

const DEFAULT_INTERVAL_MS = 60_000;
const CO2_FACTOR_TON_PER_KWH = 0.494 / 1000;
const TOTAL_GENERATION_BASELINE_GWH = 18_642;
const TOTAL_CO2_BASELINE_TONS = 9_842;
const FACTORY_SLOT_WEIGHTS = [
  ["factoryProductionPower", 0.38],
  ["factoryHvacPower", 0.2],
  ["factoryLightingPower", 0.11],
  ["factoryOfficePower", 0.09],
  ["factoryEvGreenPower", 0.07],
  ["factoryInfrastructurePower", 0.15]
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

function buildMockMetricReadings(date: Date): MockMetricReading[] {
  const realTimePower = computeMockSolarPowerAt(date);
  const todayGeneration = computeTodayGenerationKwh(date);
  const totalGeneration = roundTo(TOTAL_GENERATION_BASELINE_GWH + todayGeneration / 1_000_000, 3);
  const todayCo2Reduction = roundTo(todayGeneration * CO2_FACTOR_TON_PER_KWH, 2);
  const totalCo2Reduction = roundTo(TOTAL_CO2_BASELINE_TONS + todayCo2Reduction, 2);
  const solarPeakPower = Math.max(...SOLAR_GENERATION_PROFILE_KW);
  const powerIntensity = solarPeakPower > 0 ? realTimePower / solarPeakPower : 0;
  const daylightShare = Math.min(1, todayGeneration / 26_000);
  const consumptionEnergy = roundTo(Math.max(todayGeneration * 1.22 + 380, 420), 0);
  const selfConsumptionEnergy = roundTo(
    Math.min(consumptionEnergy * 0.74, todayGeneration * (0.58 + daylightShare * 0.14)),
    0
  );
  const systemEfficiency = roundTo(92 + powerIntensity * 6.5, 1);
  const factoryLoadPower = roundTo(Math.max(realTimePower * 1.18, 460), 0);

  return [
    { metricKey: "realTimePower", rawPayload: JSON.stringify({ value: realTimePower }), unit: "kW", value: realTimePower },
    { metricKey: "todayGeneration", rawPayload: JSON.stringify({ value: todayGeneration }), unit: "kWh", value: todayGeneration },
    { metricKey: "totalGeneration", rawPayload: JSON.stringify({ value: totalGeneration }), unit: "GWh", value: totalGeneration },
    {
      metricKey: "todayCo2Reduction",
      rawPayload: JSON.stringify({ value: todayCo2Reduction }),
      unit: "t",
      value: todayCo2Reduction
    },
    {
      metricKey: "totalCo2Reduction",
      rawPayload: JSON.stringify({ value: totalCo2Reduction }),
      unit: "t",
      value: totalCo2Reduction
    },
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
  private readonly now: () => Date;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(options: MockMetricsFeedServiceOptions = {}) {
    this.database = options.database ?? getDatabase();
    this.intervalMs = options.intervalMs ?? DEFAULT_INTERVAL_MS;
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
          metric_key,
          value,
          unit,
          timestamp,
          quality,
          raw_payload
        ) VALUES (?, ?, ?, CURRENT_TIMESTAMP, ?, ?)
        ON CONFLICT(metric_key) DO UPDATE SET
          value = excluded.value,
          unit = excluded.unit,
          timestamp = CURRENT_TIMESTAMP,
          quality = excluded.quality,
          raw_payload = excluded.raw_payload
      `
    );

    const transaction = this.database.transaction((metricReadings: MockMetricReading[]) => {
      for (const reading of metricReadings) {
        upsert.run(reading.metricKey, reading.value, reading.unit, "good", reading.rawPayload);
      }
    });

    transaction(readings);
  }
}
