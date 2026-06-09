import { clearInterval, setInterval } from "node:timers";
import type Database from "better-sqlite3";
import { getDatabase } from "../db/index.js";
import { computeSolarGenerationPowerAt } from "../metrics/solarGenerationProfile.js";

const DEFAULT_INTERVAL_MS = 60_000;

// Simulated instantaneous solar generation power for the given moment. Delegates
// to the shared daily profile so the mock feed and the seed history render the
// same realistic curve (steep morning ramp, early-afternoon peak, gentle decline).
export function computeMockSolarPowerAt(date: Date): number {
  return computeSolarGenerationPowerAt(date);
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
    const power = computeMockSolarPowerAt(this.now());

    this.database
      .prepare(
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
      )
      .run("realTimePower", power, "kW", "good", String(power));
  }
}
