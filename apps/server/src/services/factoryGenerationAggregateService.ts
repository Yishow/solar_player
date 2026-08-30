import type Database from "better-sqlite3";
import type { MetricScope } from "@solar-display/shared";
import {
  type DerivedMetricChange,
  evaluateDerivedMetrics,
  initializeDerivedMetricRegistry
} from "./derivedMetricRegistryService.js";

export type FactoryId = "CL" | "KN";
export type FactoryGenerationScope = FactoryId | "CL+KN" | "none";
export type FactoryPlaybackPage = {
  enabled: boolean;
  pageKey: string;
};
type SourceField = "today_mwh" | "month_mwh" | "total_mwh";

type SourceRow = {
  metric_key: string;
  raw_payload: string | null;
  unit: string | null;
  value: number | null;
};

export type FactoryGenerationAggregateIssue = {
  factory: FactoryId | "CL+KN";
  field: SourceField | "summary";
  reason: "invalid" | "missing" | "regression" | "stale";
};

export type FactoryGenerationAggregateStatus = {
  state: "invalid" | "missing" | "ready" | "regression" | "stale";
  updatedAt: string | null;
  issues: FactoryGenerationAggregateIssue[];
};

type FactorySource = {
  monthMwh: number;
  timestamp: string;
  timestampMs: number;
  todayMwh: number;
  totalMwh: number;
};

type ReadyEvaluation = FactoryGenerationAggregateStatus & {
  state: "ready";
  values: {
    monthGeneration: number;
    todayGeneration: number;
    totalGeneration: number;
  };
};

export type FactoryGenerationEvaluation = FactoryGenerationAggregateStatus | ReadyEvaluation;

export type FactoryGenerationBaselineResetResult =
  | {
      acceptedTotalMwh: number;
      ok: true;
      previousTotalMwh: number;
      updatedAt: string;
    }
  | {
      currentTotalMwh?: number;
      ok: false;
      reason: "confirmation-mismatch" | "not-regression" | "source-not-ready";
    };

const sourceFields = [
  { field: "today_mwh", suffix: "todayMwh" },
  { field: "month_mwh", suffix: "monthMwh" },
  { field: "total_mwh", suffix: "totalMwh" }
] as const;

const factoryGenerationSourceMetricKeys = new Set([
  "factoryGeneration.powerKw",
  ...sourceFields.map(({ suffix }) => `factoryGeneration.${suffix}`)
]);

export function resolveFactoryGenerationScope(
  pages: readonly FactoryPlaybackPage[]
): FactoryGenerationScope {
  const clEnabled = pages.some((page) => page.pageKey === "factory-circuit" && page.enabled);
  const knEnabled = pages.some(
    (page) => page.pageKey === "factory-circuit-guanyin" && page.enabled
  );

  if (clEnabled && knEnabled) {
    return "CL+KN";
  }
  if (clEnabled) {
    return "CL";
  }
  if (knEnabled) {
    return "KN";
  }
  return "none";
}

function roundMwh(value: number) {
  return Number(value.toFixed(3));
}

function parseSourceTimestamp(rawPayload: string | null) {
  if (!rawPayload) {
    return null;
  }

  try {
    const payload = JSON.parse(rawPayload) as { timestamp?: unknown };
    if (typeof payload.timestamp !== "string") {
      return null;
    }
    const timestampMs = Date.parse(payload.timestamp);
    return Number.isFinite(timestampMs)
      ? { timestamp: payload.timestamp, timestampMs }
      : null;
  } catch {
    return null;
  }
}

function readMessageTimeoutMs(database: Database.Database) {
  const row = database
    .prepare("SELECT message_timeout FROM mqtt_settings LIMIT 1")
    .get() as { message_timeout: number | null } | undefined;
  const seconds = row?.message_timeout;
  return typeof seconds === "number" && Number.isFinite(seconds) && seconds > 0
    ? seconds * 1_000
    : 30_000;
}

function normalizeFactorySummaryValue(field: SourceField, row: SourceRow) {
  if (typeof row.value !== "number" || !Number.isFinite(row.value)) {
    return null;
  }

  const unit = row.unit?.trim().toLowerCase();
  if (unit === "mwh") {
    return row.value;
  }
  if (field === "today_mwh" && unit === "kwh") {
    return row.value / 1_000;
  }
  return null;
}

function readFactorySource(
  database: Database.Database,
  factory: FactoryId,
  nowMs: number,
  timeoutMs: number
): FactorySource | FactoryGenerationAggregateStatus {
  const metricScope = factory.toLowerCase();
  const rows = database
    .prepare(
      `
        SELECT metric_key, value, unit, raw_payload
        FROM live_metric_values
        WHERE metric_scope = ? AND metric_key IN (?, ?, ?)
      `
    )
    .all(metricScope, ...sourceFields.map(({ suffix }) => `factoryGeneration.${suffix}`)) as SourceRow[];
  const rowsByKey = new Map(rows.map((row) => [row.metric_key, row]));
  const values: Partial<Record<SourceField, number>> = {};
  const sourceTimestamps = new Map<number, string>();

  for (const { field, suffix } of sourceFields) {
    const row = rowsByKey.get(`factoryGeneration.${suffix}`);
    if (!row) {
      return { state: "missing", updatedAt: null, issues: [{ factory, field, reason: "missing" }] };
    }
    const normalizedValue = normalizeFactorySummaryValue(field, row);
    if (normalizedValue === null) {
      return { state: "invalid", updatedAt: null, issues: [{ factory, field, reason: "invalid" }] };
    }
    const sourceTimestamp = parseSourceTimestamp(row.raw_payload);
    if (!sourceTimestamp) {
      return { state: "invalid", updatedAt: null, issues: [{ factory, field: "summary", reason: "invalid" }] };
    }
    values[field] = normalizedValue;
    sourceTimestamps.set(sourceTimestamp.timestampMs, sourceTimestamp.timestamp);
  }

  if (sourceTimestamps.size !== 1) {
    return { state: "invalid", updatedAt: null, issues: [{ factory, field: "summary", reason: "invalid" }] };
  }

  const timestampEntry = sourceTimestamps.entries().next().value;
  if (!timestampEntry) {
    return { state: "invalid", updatedAt: null, issues: [{ factory, field: "summary", reason: "invalid" }] };
  }
  const [timestampMs, timestamp] = timestampEntry;
  if (Math.abs(nowMs - timestampMs) > timeoutMs) {
    return { state: "stale", updatedAt: timestamp, issues: [{ factory, field: "summary", reason: "stale" }] };
  }

  return {
    monthMwh: values.month_mwh!,
    timestamp,
    timestampMs,
    todayMwh: values.today_mwh!,
    totalMwh: values.total_mwh!
  };
}

function isStatus(value: FactorySource | FactoryGenerationAggregateStatus): value is FactoryGenerationAggregateStatus {
  return "state" in value;
}

function normalizeExistingTotalToMwh(value: number, unit: string | null) {
  switch (unit?.trim().toLowerCase()) {
    case "gwh":
      return value * 1_000;
    case "kwh":
      return value / 1_000;
    case "wh":
      return value / 1_000_000;
    case "mwh":
      return value;
    default:
      return null;
  }
}

function readAcceptedFactoryTotalMwh(
  database: Database.Database,
  factory: FactoryId
) {
  const row = database
    .prepare("SELECT value, unit FROM live_metric_values WHERE metric_scope = ? AND metric_key = 'factoryGeneration.acceptedTotalMwh'")
    .get(factory.toLowerCase()) as
      | { unit: string | null; value: number | null }
      | undefined;

  return typeof row?.value === "number" && Number.isFinite(row.value)
    ? normalizeExistingTotalToMwh(row.value, row.unit)
    : null;
}

function readLastAcceptedTotalMwh(database: Database.Database) {
  const existing = database
    .prepare("SELECT value, unit FROM live_metric_values WHERE metric_scope = 'global' AND metric_key = 'totalGeneration'")
    .get() as { unit: string | null; value: number | null } | undefined;
  const persistedCounter = database
    .prepare("SELECT total_value FROM cumulative_counters WHERE metric_scope = 'global' AND metric_key = 'generation'")
    .get() as { total_value: number | null } | undefined;
  const acceptedTotalsMwh = [
    typeof existing?.value === "number" && Number.isFinite(existing.value)
      ? normalizeExistingTotalToMwh(existing.value, existing.unit)
      : null,
    typeof persistedCounter?.total_value === "number" && Number.isFinite(persistedCounter.total_value)
      ? persistedCounter.total_value / 1_000
      : null
  ].filter((value): value is number => value !== null);

  return acceptedTotalsMwh.length > 0 ? Math.max(...acceptedTotalsMwh) : null;
}

export function evaluateFactoryGenerationAggregate(
  database: Database.Database,
  now: Date = new Date()
): FactoryGenerationAggregateStatus | ReadyEvaluation {
  const timeoutMs = readMessageTimeoutMs(database);
  const cl = readFactorySource(database, "CL", now.getTime(), timeoutMs);
  if (isStatus(cl)) {
    return cl;
  }
  const kn = readFactorySource(database, "KN", now.getTime(), timeoutMs);
  if (isStatus(kn)) {
    return kn;
  }

  const values = {
    monthGeneration: roundMwh(cl.monthMwh + kn.monthMwh),
    todayGeneration: roundMwh(cl.todayMwh + kn.todayMwh),
    totalGeneration: roundMwh(cl.totalMwh + kn.totalMwh)
  };
  const lastAcceptedTotalMwh = readLastAcceptedTotalMwh(database);
  if (
    lastAcceptedTotalMwh !== null
    && values.totalGeneration < roundMwh(lastAcceptedTotalMwh)
  ) {
    return {
      state: "regression",
      updatedAt: cl.timestampMs <= kn.timestampMs ? cl.timestamp : kn.timestamp,
      issues: [{ factory: "CL+KN", field: "total_mwh", reason: "regression" }]
    };
  }

  return {
    state: "ready",
    updatedAt: cl.timestampMs <= kn.timestampMs ? cl.timestamp : kn.timestamp,
    issues: [],
    values
  };
}

export function evaluateFactoryGenerationScope(
  database: Database.Database,
  scope: Exclude<FactoryGenerationScope, "none">,
  now: Date = new Date()
): FactoryGenerationEvaluation {
  if (scope === "CL+KN") {
    return evaluateFactoryGenerationAggregate(database, now);
  }

  const source = readFactorySource(
    database,
    scope,
    now.getTime(),
    readMessageTimeoutMs(database)
  );
  if (isStatus(source)) {
    return source;
  }

  const acceptedTotalMwh = readAcceptedFactoryTotalMwh(database, scope);
  if (
    acceptedTotalMwh !== null
    && roundMwh(source.totalMwh) < roundMwh(acceptedTotalMwh)
  ) {
    return {
      state: "regression",
      updatedAt: source.timestamp,
      issues: [{ factory: scope, field: "total_mwh", reason: "regression" }]
    };
  }

  return {
    state: "ready",
    updatedAt: source.timestamp,
    issues: [],
    values: {
      monthGeneration: roundMwh(source.monthMwh),
      todayGeneration: roundMwh(source.todayMwh),
      totalGeneration: roundMwh(source.totalMwh)
    }
  };
}

export function updateFactoryGenerationAggregate(
  database: Database.Database,
  now: Date = new Date(),
  options: { changedMetrics?: readonly DerivedMetricChange[] } = {}
): FactoryGenerationAggregateStatus {
  const changedMetrics: DerivedMetricChange[] = options.changedMetrics === undefined
    ? (["cl", "kn"] as MetricScope[]).flatMap((metricScope) =>
      sourceFields.map(({ suffix }) => ({
        metricScope,
        metricKey: `factoryGeneration.${suffix}`
      }))
    )
    : [...options.changedMetrics];
  const triggeredFactoryScopes = new Set(
    changedMetrics
      .filter(({ metricScope, metricKey }) =>
        (metricScope === "cl" || metricScope === "kn")
        && factoryGenerationSourceMetricKeys.has(metricKey)
      )
      .map(({ metricScope }) => metricScope)
  );
  const acceptedFactoryTotalUpsert = database.prepare(`
    INSERT INTO live_metric_values (metric_scope, metric_key, value, unit, timestamp, quality, raw_payload)
    VALUES (?, ?, ?, 'MWh', ?, 'good', ?)
    ON CONFLICT(metric_scope, metric_key) DO UPDATE SET
      value = excluded.value,
      unit = excluded.unit,
      timestamp = excluded.timestamp,
      quality = excluded.quality,
      raw_payload = excluded.raw_payload
  `);
  for (const factory of ["CL", "KN"] as const) {
    const factoryEvaluation = evaluateFactoryGenerationScope(database, factory, now);
    const factoryScope = factory.toLowerCase() as MetricScope;
    if (
      factoryEvaluation.state === "ready"
      && "values" in factoryEvaluation
      && factoryEvaluation.updatedAt
      && triggeredFactoryScopes.has(factoryScope)
    ) {
      acceptedFactoryTotalUpsert.run(
        factoryScope,
        "factoryGeneration.acceptedTotalMwh",
        factoryEvaluation.values.totalGeneration,
        factoryEvaluation.updatedAt,
        JSON.stringify({ source: `${factory} MQTT`, updatedAt: factoryEvaluation.updatedAt })
      );
      changedMetrics.push({
        metricScope: factoryScope,
        metricKey: "factoryGeneration.acceptedTotalMwh"
      });
    }
  }

  const evaluation = evaluateFactoryGenerationAggregate(database, now);
  if (evaluation.state !== "ready" || !("values" in evaluation) || !evaluation.updatedAt) {
    evaluateDerivedMetrics(database, now, { changedMetrics, materialize: false });
    return evaluation;
  }

  evaluateDerivedMetrics(database, now, { changedMetrics });

  return {
    state: evaluation.state,
    updatedAt: evaluation.updatedAt,
    issues: evaluation.issues
  };
}

export function resetFactoryGenerationBaseline(
  database: Database.Database,
  expectedTotalMwh: number,
  now: Date = new Date()
): FactoryGenerationBaselineResetResult {
  const timeoutMs = readMessageTimeoutMs(database);
  const cl = readFactorySource(database, "CL", now.getTime(), timeoutMs);
  const kn = readFactorySource(database, "KN", now.getTime(), timeoutMs);
  if (isStatus(cl) || isStatus(kn)) {
    return { ok: false, reason: "source-not-ready" };
  }

  const values = {
    monthGeneration: roundMwh(cl.monthMwh + kn.monthMwh),
    todayGeneration: roundMwh(cl.todayMwh + kn.todayMwh),
    totalGeneration: roundMwh(cl.totalMwh + kn.totalMwh)
  };
  const previousTotalMwh = readLastAcceptedTotalMwh(database);
  if (
    previousTotalMwh === null
    || values.totalGeneration >= roundMwh(previousTotalMwh)
  ) {
    return {
      currentTotalMwh: values.totalGeneration,
      ok: false,
      reason: "not-regression"
    };
  }
  if (
    !Number.isFinite(expectedTotalMwh)
    || expectedTotalMwh < 0
    || roundMwh(expectedTotalMwh) !== values.totalGeneration
  ) {
    return {
      currentTotalMwh: values.totalGeneration,
      ok: false,
      reason: "confirmation-mismatch"
    };
  }

  const updatedAt = cl.timestampMs <= kn.timestampMs ? cl.timestamp : kn.timestamp;
  const acceptedFactoryTotalUpsert = database.prepare(`
    INSERT INTO live_metric_values (metric_scope, metric_key, value, unit, timestamp, quality, raw_payload)
    VALUES (?, ?, ?, 'MWh', ?, 'good', ?)
    ON CONFLICT(metric_scope, metric_key) DO UPDATE SET
      value = excluded.value,
      unit = excluded.unit,
      timestamp = excluded.timestamp,
      quality = excluded.quality,
      raw_payload = excluded.raw_payload
  `);
  const counter = database
    .prepare("SELECT reset_count FROM cumulative_counters WHERE metric_scope = 'global' AND metric_key = 'generation'")
    .get() as { reset_count: number | null } | undefined;
  const resetAt = now.toISOString();

  database.transaction(() => {
    for (const [factory, source] of [["CL", cl], ["KN", kn]] as const) {
      acceptedFactoryTotalUpsert.run(
        factory.toLowerCase(),
        "factoryGeneration.acceptedTotalMwh",
        roundMwh(source.totalMwh),
        source.timestamp,
        JSON.stringify({ source: `${factory} MQTT`, updatedAt: source.timestamp })
      );
    }

    database.prepare(`
      INSERT INTO cumulative_counters (metric_scope, metric_key, total_value, last_updated, reset_count)
      VALUES ('global', 'generation', ?, ?, ?)
      ON CONFLICT(metric_scope, metric_key) DO UPDATE SET
        total_value = excluded.total_value,
        last_updated = excluded.last_updated,
        reset_count = excluded.reset_count
    `).run(
      Number((values.totalGeneration * 1_000).toFixed(3)),
      resetAt,
      (counter?.reset_count ?? 0) + 1
    );
    database.prepare(`
      DELETE FROM derived_metric_evaluations
      WHERE metric_scope = 'global' AND metric_key = 'totalGeneration'
    `).run();
    database.prepare(`
      DELETE FROM live_metric_values
      WHERE metric_scope = 'global' AND metric_key = 'totalGeneration'
    `).run();
  })();

  initializeDerivedMetricRegistry(database);
  evaluateDerivedMetrics(database, now);

  return {
    acceptedTotalMwh: values.totalGeneration,
    ok: true,
    previousTotalMwh,
    updatedAt
  };
}
