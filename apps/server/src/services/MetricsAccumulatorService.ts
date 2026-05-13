import { setInterval, clearInterval } from "node:timers";
import type Database from "better-sqlite3";
import { getDatabase } from "../db/index.js";
import { type LiveMetricsSnapshot, readLiveMetricsSnapshot } from "../metrics/liveMetrics.js";

export type CumulativeMetricKey = "generation" | "consumption" | "selfConsumption" | "co2";

export type CumulativeCounters = Record<CumulativeMetricKey, number>;

export type MetricsAggregateSnapshot = {
  capturedAt: string | null;
  co2: number;
  consumption: number;
  consumptionPower: number | null;
  efficiency: number | null;
  generation: number;
  generationPower: number | null;
  ratio: number | null;
  selfConsumption: number;
};

type CumulativeCounterRow = {
  last_updated: string | null;
  metric_key: string;
  reset_count: number | null;
  total_value: number | null;
};

type MetricsAccumulatorServiceOptions = {
  database?: Database.Database;
  flushIntervalMs?: number;
  maxIntegrationGapSeconds?: number;
  pollIntervalMs?: number;
  readSnapshot?: () => LiveMetricsSnapshot;
};

type PowerObservation = {
  timestampMs: number;
};

function isFiniteNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function parseTimestamp(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const normalized = value.includes("T") ? value : `${value.replace(" ", "T")}Z`;
  const parsed = Date.parse(normalized);
  return Number.isNaN(parsed) ? null : parsed;
}

function roundTo(value: number, digits: number) {
  return Number(value.toFixed(digits));
}

function buildEmptyCounters(): CumulativeCounters {
  return {
    co2: 0,
    consumption: 0,
    generation: 0,
    selfConsumption: 0
  };
}

function readMetricValue(snapshot: LiveMetricsSnapshot, metricKey: string) {
  const value = snapshot.metrics[metricKey]?.value;
  return isFiniteNumber(value) ? value : null;
}

function sumConsumptionPower(snapshot: LiveMetricsSnapshot) {
  return Object.entries(snapshot.metrics)
    .filter(([metricKey, reading]) => metricKey.startsWith("factory") && reading.unit === "kW")
    .reduce((total, [, reading]) => total + reading.value, 0);
}

export class MetricsAccumulatorService {
  private readonly database: Database.Database;
  private readonly flushIntervalMs: number;
  private readonly maxIntegrationGapSeconds: number;
  private readonly pollIntervalMs: number;
  private readonly readSnapshot: () => LiveMetricsSnapshot;
  private counters = buildEmptyCounters();
  private latestSnapshot: MetricsAggregateSnapshot = {
    capturedAt: null,
    co2: 0,
    consumption: 0,
    consumptionPower: null,
    efficiency: null,
    generation: 0,
    generationPower: null,
    ratio: null,
    selfConsumption: 0
  };
  private lastFlushAtMs: number | null = null;
  private lastSeenGenerationPower: PowerObservation | null = null;
  private dirty = false;
  private initialized = false;
  private readonly resetCounts = new Map<string, number>();
  private timer: NodeJS.Timeout | null = null;

  constructor(options: MetricsAccumulatorServiceOptions = {}) {
    this.database = options.database ?? getDatabase();
    this.flushIntervalMs = options.flushIntervalMs ?? 30_000;
    this.maxIntegrationGapSeconds = options.maxIntegrationGapSeconds ?? 300;
    this.pollIntervalMs = options.pollIntervalMs ?? 5_000;
    this.readSnapshot = options.readSnapshot ?? (() => readLiveMetricsSnapshot(this.database));
  }

  initialize() {
    if (this.initialized) {
      return;
    }

    const rows = this.database
      .prepare(
        `
          SELECT metric_key, total_value, last_updated, reset_count
          FROM cumulative_counters
        `
      )
      .all() as CumulativeCounterRow[];

    for (const row of rows) {
      if (row.metric_key === "generation" && isFiniteNumber(row.total_value)) {
        this.counters.generation = row.total_value;
      }
      if (row.metric_key === "consumption" && isFiniteNumber(row.total_value)) {
        this.counters.consumption = row.total_value;
      }
      if (row.metric_key === "selfConsumption" && isFiniteNumber(row.total_value)) {
        this.counters.selfConsumption = row.total_value;
      }
      if (row.metric_key === "co2" && isFiniteNumber(row.total_value)) {
        this.counters.co2 = row.total_value;
      }

      this.resetCounts.set(row.metric_key, row.reset_count ?? 0);
      const timestampMs = parseTimestamp(row.last_updated);
      if (row.metric_key === "generation" && timestampMs !== null) {
        this.lastSeenGenerationPower = {
          timestampMs
        };
      }
    }

    this.latestSnapshot = this.buildAggregateSnapshot(null);
    this.initialized = true;
  }

  start() {
    this.initialize();

    if (this.timer) {
      return;
    }

    this.timer = setInterval(() => {
      this.processAt(new Date());
    }, this.pollIntervalMs);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    this.flush(true);
  }

  processAt(now: Date) {
    this.initialize();

    const snapshot = this.readSnapshot();
    const observedTimestamp = snapshot.timestamp ?? now.toISOString();
    const observedAtMs = parseTimestamp(observedTimestamp) ?? now.getTime();

    const totalGeneration = readMetricValue(snapshot, "totalGeneration");
    const generationPower = readMetricValue(snapshot, "realTimePower");
    const consumption = readMetricValue(snapshot, "consumptionEnergy");
    const selfConsumption = readMetricValue(snapshot, "selfConsumptionEnergy");
    const explicitCo2 = readMetricValue(snapshot, "totalCo2Reduction");

    if (isFiniteNumber(totalGeneration)) {
      this.setCounter("generation", roundTo(totalGeneration, 3));
    } else if (isFiniteNumber(generationPower)) {
      this.integrateGenerationPower(generationPower, observedAtMs);
    }

    if (isFiniteNumber(consumption)) {
      this.setCounter("consumption", roundTo(consumption, 3));
    }

    if (isFiniteNumber(selfConsumption)) {
      this.setCounter("selfConsumption", roundTo(selfConsumption, 3));
    }

    if (isFiniteNumber(explicitCo2)) {
      this.setCounter("co2", roundTo(explicitCo2, 3));
    } else {
      const co2Factor = this.readCo2Factor();
      this.setCounter("co2", roundTo(this.counters.generation * co2Factor, 3));
    }

    if (isFiniteNumber(generationPower)) {
      this.lastSeenGenerationPower = {
        timestampMs: observedAtMs
      };
    }

    this.latestSnapshot = this.buildAggregateSnapshot({
      capturedAt: observedTimestamp,
      consumptionPower: sumConsumptionPower(snapshot),
      efficiency: readMetricValue(snapshot, "systemEfficiency"),
      generationPower
    });

    if (this.lastFlushAtMs === null) {
      this.lastFlushAtMs = now.getTime();
      return;
    }

    if (now.getTime() - this.lastFlushAtMs >= this.flushIntervalMs) {
      this.flush();
      this.lastFlushAtMs = now.getTime();
    }
  }

  flush(force = false) {
    this.initialize();

    if (!force && !this.dirty) {
      return;
    }

    const nowIso = new Date().toISOString();
    const upsert = this.database.prepare(
      `
        INSERT INTO cumulative_counters (metric_key, total_value, last_updated, reset_count)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(metric_key) DO UPDATE SET
          total_value = excluded.total_value,
          last_updated = excluded.last_updated,
          reset_count = excluded.reset_count
      `
    );

    this.database.transaction(() => {
      upsert.run("generation", roundTo(this.counters.generation, 3), nowIso, this.resetCounts.get("generation") ?? 0);
      upsert.run("consumption", roundTo(this.counters.consumption, 3), nowIso, this.resetCounts.get("consumption") ?? 0);
      upsert.run(
        "selfConsumption",
        roundTo(this.counters.selfConsumption, 3),
        nowIso,
        this.resetCounts.get("selfConsumption") ?? 0
      );
      upsert.run("co2", roundTo(this.counters.co2, 3), nowIso, this.resetCounts.get("co2") ?? 0);
    })();

    this.dirty = false;
  }

  getCounters(): CumulativeCounters {
    this.initialize();
    return {
      ...this.counters
    };
  }

  getLatestSnapshot() {
    this.initialize();
    return {
      ...this.latestSnapshot
    };
  }

  private buildAggregateSnapshot(
    observation: {
      capturedAt: string;
      consumptionPower: number;
      efficiency: number | null;
      generationPower: number | null;
    } | null
  ): MetricsAggregateSnapshot {
    const ratio =
      this.counters.generation > 0
        ? roundTo((this.counters.selfConsumption / this.counters.generation) * 100, 2)
        : null;

    return {
      capturedAt: observation?.capturedAt ?? this.latestSnapshot.capturedAt,
      co2: roundTo(this.counters.co2, 3),
      consumption: roundTo(this.counters.consumption, 3),
      consumptionPower:
        observation && observation.consumptionPower > 0 ? roundTo(observation.consumptionPower, 3) : null,
      efficiency: isFiniteNumber(observation?.efficiency) ? roundTo(observation.efficiency, 2) : null,
      generation: roundTo(this.counters.generation, 3),
      generationPower: isFiniteNumber(observation?.generationPower) ? roundTo(observation.generationPower, 3) : null,
      ratio,
      selfConsumption: roundTo(this.counters.selfConsumption, 3)
    };
  }

  private integrateGenerationPower(powerKw: number, observedAtMs: number) {
    const lastObservation = this.lastSeenGenerationPower;

    if (lastObservation === null) {
      this.lastSeenGenerationPower = {
        timestampMs: observedAtMs
      };
      return;
    }

    const deltaSeconds = (observedAtMs - lastObservation.timestampMs) / 1000;
    this.lastSeenGenerationPower = {
      timestampMs: observedAtMs
    };

    if (deltaSeconds <= 0 || deltaSeconds > this.maxIntegrationGapSeconds) {
      return;
    }

    this.setCounter(
      "generation",
      roundTo(this.counters.generation + (deltaSeconds * powerKw) / 3600, 3)
    );
  }

  private readCo2Factor() {
    const row = this.database
      .prepare(
        `
          SELECT value
          FROM system_settings
          WHERE key = 'co2_factor'
          LIMIT 1
        `
      )
      .get() as { value: string | null } | undefined;

    if (!row?.value) {
      return 0;
    }

    const parsed = Number(row.value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private setCounter(metricKey: CumulativeMetricKey, nextValue: number) {
    const currentValue = this.counters[metricKey];

    if (nextValue < currentValue) {
      this.resetCounts.set(metricKey, (this.resetCounts.get(metricKey) ?? 0) + 1);
    }

    if (currentValue !== nextValue) {
      this.counters[metricKey] = nextValue;
      this.dirty = true;
    }
  }
}
