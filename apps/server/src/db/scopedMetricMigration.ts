import type Database from "better-sqlite3";
import type { MetricScope, SiteScope } from "@solar-display/shared";

export type MigrationOptions = {
  legacySiteScope?: SiteScope;
};

type ScopedMetric = {
  metricKey: string;
  metricScope: MetricScope;
};

type LegacyMetricAlias = ScopedMetric & {
  metricKey: string;
};

/** Explicit compatibility aliases only; arbitrary site-name parsing is forbidden. */
export const legacyMetricAliases: Readonly<Record<string, LegacyMetricAlias>> = {
  factoryPeakMultiplier: { metricKey: "factoryPeakMultiplier", metricScope: "global" },
  factoryStampingPower: { metricKey: "factoryCircuit.stampingPower", metricScope: "cl" },
  factoryBodyPower: { metricKey: "factoryCircuit.bodyPower", metricScope: "cl" },
  factoryPaintingPower: { metricKey: "factoryCircuit.paintingPower", metricScope: "cl" },
  factoryAssemblyPower: { metricKey: "factoryCircuit.assemblyPower", metricScope: "cl" },
  factoryUtilityPower: { metricKey: "factoryCircuit.utilityPower", metricScope: "cl" },
  factoryOfficePower: { metricKey: "factoryCircuit.officePower", metricScope: "cl" },
  factoryHeavyVehiclePower: { metricKey: "factoryCircuit.heavyVehiclePower", metricScope: "cl" },
  factoryEdCoatingPower: { metricKey: "factoryCircuit.edCoatingPower", metricScope: "cl" },
  "factoryCircuit.guanyin.stampingPower": {
    metricKey: "factoryCircuit.stampingPower",
    metricScope: "kn"
  },
  "factoryCircuit.guanyin.bodyPower": { metricKey: "factoryCircuit.bodyPower", metricScope: "kn" },
  "factoryCircuit.guanyin.paintingPower": {
    metricKey: "factoryCircuit.paintingPower",
    metricScope: "kn"
  },
  "factoryCircuit.guanyin.assemblyPower": {
    metricKey: "factoryCircuit.assemblyPower",
    metricScope: "kn"
  },
  "factoryCircuit.guanyin.utilityPower": {
    metricKey: "factoryCircuit.utilityPower",
    metricScope: "kn"
  },
  "factoryCircuit.guanyin.officePower": { metricKey: "factoryCircuit.officePower", metricScope: "kn" },
  "factoryCircuit.guanyin.heavyVehiclePower": {
    metricKey: "factoryCircuit.heavyVehiclePower",
    metricScope: "kn"
  },
  "factoryCircuit.guanyin.edCoatingPower": {
    metricKey: "factoryCircuit.edCoatingPower",
    metricScope: "kn"
  },
  "factoryGeneration.cl.todayMwh": { metricKey: "factoryGeneration.todayMwh", metricScope: "cl" },
  "factoryGeneration.cl.monthMwh": { metricKey: "factoryGeneration.monthMwh", metricScope: "cl" },
  "factoryGeneration.cl.totalMwh": { metricKey: "factoryGeneration.totalMwh", metricScope: "cl" },
  "factoryGeneration.kn.todayMwh": { metricKey: "factoryGeneration.todayMwh", metricScope: "kn" },
  "factoryGeneration.kn.monthMwh": { metricKey: "factoryGeneration.monthMwh", metricScope: "kn" },
  "factoryGeneration.kn.totalMwh": { metricKey: "factoryGeneration.totalMwh", metricScope: "kn" }
};

const siteScopes = new Set<SiteScope>(["cl", "kn"]);

export function normalizeLegacySiteScope(value: unknown): SiteScope | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (siteScopes.has(value as SiteScope)) {
    return value as SiteScope;
  }
  throw new Error("legacySiteScope must be explicitly set to cl or kn; global and empty values are invalid");
}

function resolveLegacyMetric(metricKey: string, legacySiteScope: SiteScope | undefined): ScopedMetric {
  const alias = legacyMetricAliases[metricKey];
  if (alias) {
    return alias;
  }
  if (!legacySiteScope) {
    throw new Error(
      `Ambiguous legacy metric '${metricKey}'; provide an explicit legacySiteScope of cl or kn`
    );
  }
  return { metricKey, metricScope: legacySiteScope };
}

function tableHasMetricScope(database: Database.Database, table: string) {
  const allowedTables = new Set([
    "topic_mappings",
    "live_metric_values",
    "metric_snapshots",
    "daily_energy_summaries",
    "cumulative_counters",
    "display_value_overrides"
  ]);
  if (!allowedTables.has(table)) {
    throw new Error(`Unsupported scoped metric table: ${table}`);
  }
  return Boolean(
    database.prepare(`PRAGMA table_info(${table})`).all().some((row) => (row as { name: string }).name === "metric_scope")
  );
}

function rebuildTable(
  database: Database.Database,
  table: string,
  createSql: string,
  columns: string[],
  rows: unknown[][]
) {
  const legacyTable = `${table}__legacy_scope`;
  database.exec(`ALTER TABLE ${table} RENAME TO ${legacyTable}`);
  database.exec(createSql);
  const placeholders = columns.map(() => "?").join(", ");
  const insert = database.prepare(
    `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders})`
  );
  for (const row of rows) {
    insert.run(row);
  }
  database.exec(`DROP TABLE ${legacyTable}`);
}

function readRows(database: Database.Database, table: string) {
  return database.prepare(`SELECT * FROM ${table}`).all() as Array<Record<string, unknown>>;
}

export function migrateScopedMetricIdentity(
  database: Database.Database,
  options: MigrationOptions = {}
) {
  const legacySiteScope = normalizeLegacySiteScope(options.legacySiteScope);
  if (tableHasMetricScope(database, "topic_mappings")) {
    return;
  }

  const topicRows = readRows(database, "topic_mappings");
  const liveRows = readRows(database, "live_metric_values");
  const snapshotRows = readRows(database, "metric_snapshots");
  const dailyRows = readRows(database, "daily_energy_summaries");
  const counterRows = readRows(database, "cumulative_counters");
  const overrideRows = readRows(database, "display_value_overrides");

  // Resolve every row before changing a table, so an ambiguous row fails before
  // any rebuild starts and the caller's transaction can roll back atomically.
  const topics = topicRows.map((row) => ({ row, scope: resolveLegacyMetric(String(row.metric_key), legacySiteScope) }));
  const live = liveRows.map((row) => ({ row, scope: resolveLegacyMetric(String(row.metric_key), legacySiteScope) }));
  const counters = counterRows.map((row) => ({ row, scope: resolveLegacyMetric(String(row.metric_key), legacySiteScope) }));
  const overrides = overrideRows.map((row) => ({ row, scope: resolveLegacyMetric(String(row.metric_key), legacySiteScope) }));
  const historyScope = (rows: Array<Record<string, unknown>>, table: string) => {
    if (rows.length === 0) {
      return undefined;
    }
    if (!legacySiteScope) {
      throw new Error(`Ambiguous legacy ${table} rows; provide an explicit legacySiteScope of cl or kn`);
    }
    return legacySiteScope;
  };
  const snapshotScope = historyScope(snapshotRows, "metric_snapshots");
  const dailyScope = historyScope(dailyRows, "daily_energy_summaries");

  rebuildTable(
    database,
    "topic_mappings",
    `CREATE TABLE topic_mappings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      metric_scope TEXT NOT NULL CHECK (metric_scope IN ('cl', 'kn', 'global')),
      metric_key TEXT NOT NULL,
      topic TEXT NOT NULL,
      unit TEXT,
      value_path TEXT,
      multiplier REAL DEFAULT 1,
      offset REAL DEFAULT 0,
      decimal_places INTEGER DEFAULT 2,
      enabled BOOLEAN DEFAULT 1,
      created_at DATETIME,
      updated_at DATETIME,
      name_zh TEXT,
      name_en TEXT
    )`,
    [
      "id", "metric_scope", "metric_key", "topic", "unit", "value_path", "multiplier", "offset",
      "decimal_places", "enabled", "created_at", "updated_at", "name_zh", "name_en"
    ],
    topics.map(({ row, scope }) => [
      row.id, scope.metricScope, scope.metricKey, row.topic, row.unit, row.value_path, row.multiplier,
      row.offset, row.decimal_places, row.enabled, row.created_at, row.updated_at, row.name_zh ?? null,
      row.name_en ?? null
    ])
  );
  rebuildTable(
    database,
    "live_metric_values",
    `CREATE TABLE live_metric_values (
      metric_scope TEXT NOT NULL CHECK (metric_scope IN ('cl', 'kn', 'global')),
      metric_key TEXT NOT NULL,
      value REAL,
      unit TEXT,
      timestamp DATETIME,
      quality TEXT,
      raw_payload TEXT,
      PRIMARY KEY (metric_scope, metric_key)
    )`,
    ["metric_scope", "metric_key", "value", "unit", "timestamp", "quality", "raw_payload"],
    live.map(({ row, scope }) => [scope.metricScope, scope.metricKey, row.value, row.unit, row.timestamp, row.quality, row.raw_payload])
  );
  rebuildTable(
    database,
    "metric_snapshots",
    `CREATE TABLE metric_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      metric_scope TEXT NOT NULL CHECK (metric_scope IN ('cl', 'kn', 'global')),
      generation_power REAL,
      generation REAL,
      consumption REAL,
      self_consumption REAL,
      co2 REAL,
      ratio REAL,
      efficiency REAL,
      captured_at DATETIME
    )`,
    ["id", "metric_scope", "generation_power", "generation", "consumption", "self_consumption", "co2", "ratio", "efficiency", "captured_at"],
    snapshotRows.map((row) => [row.id, snapshotScope, row.generation_power, row.generation, row.consumption, row.self_consumption, row.co2, row.ratio, row.efficiency, row.captured_at])
  );
  rebuildTable(
    database,
    "daily_energy_summaries",
    `CREATE TABLE daily_energy_summaries (
      metric_scope TEXT NOT NULL CHECK (metric_scope IN ('cl', 'kn', 'global')),
      date TEXT NOT NULL,
      generation_total REAL,
      consumption_total REAL,
      self_consumption_total REAL,
      co2_total REAL,
      peak_generation REAL,
      peak_generation_time DATETIME,
      peak_consumption REAL,
      peak_consumption_time DATETIME,
      PRIMARY KEY (metric_scope, date)
    )`,
    ["metric_scope", "date", "generation_total", "consumption_total", "self_consumption_total", "co2_total", "peak_generation", "peak_generation_time", "peak_consumption", "peak_consumption_time"],
    dailyRows.map((row) => [dailyScope, row.date, row.generation_total, row.consumption_total, row.self_consumption_total, row.co2_total, row.peak_generation, row.peak_generation_time, row.peak_consumption, row.peak_consumption_time])
  );
  rebuildTable(
    database,
    "cumulative_counters",
    `CREATE TABLE cumulative_counters (
      metric_scope TEXT NOT NULL CHECK (metric_scope IN ('cl', 'kn', 'global')),
      metric_key TEXT NOT NULL,
      total_value REAL,
      last_updated DATETIME,
      reset_count INTEGER DEFAULT 0,
      PRIMARY KEY (metric_scope, metric_key)
    )`,
    ["metric_scope", "metric_key", "total_value", "last_updated", "reset_count"],
    counters.map(({ row, scope }) => [scope.metricScope, scope.metricKey, row.total_value, row.last_updated, row.reset_count])
  );
  rebuildTable(
    database,
    "display_value_overrides",
    `CREATE TABLE display_value_overrides (
      metric_scope TEXT NOT NULL CHECK (metric_scope IN ('cl', 'kn', 'global')),
      target_id TEXT NOT NULL,
      page_id TEXT NOT NULL,
      card_id TEXT NOT NULL,
      metric_key TEXT NOT NULL,
      display_value REAL NOT NULL,
      unit TEXT,
      enabled INTEGER NOT NULL DEFAULT 1,
      reason TEXT,
      expires_at DATETIME,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(metric_scope, target_id)
    )`,
    ["metric_scope", "target_id", "page_id", "card_id", "metric_key", "display_value", "unit", "enabled", "reason", "expires_at", "updated_at"],
    overrides.map(({ row, scope }) => [scope.metricScope, row.target_id, row.page_id, row.card_id, scope.metricKey, row.display_value, row.unit, row.enabled, row.reason, row.expires_at, row.updated_at])
  );

  database.exec(`
    DROP INDEX IF EXISTS idx_topic_mappings_metric_key;
    DROP INDEX IF EXISTS idx_topic_mappings_topic;
    DROP INDEX IF EXISTS idx_metric_snapshots_captured_at;
    DROP INDEX IF EXISTS idx_daily_energy_summaries_date;
    DROP INDEX IF EXISTS idx_cumulative_counters_last_updated;
    CREATE UNIQUE INDEX idx_topic_mappings_metric_key
      ON topic_mappings(metric_scope, metric_key);
    CREATE INDEX idx_topic_mappings_topic ON topic_mappings(topic);
    CREATE INDEX idx_metric_snapshots_scope_captured_at
      ON metric_snapshots(metric_scope, captured_at);
    CREATE INDEX idx_metric_snapshots_captured_at ON metric_snapshots(captured_at);
    CREATE INDEX idx_daily_energy_summaries_scope_date
      ON daily_energy_summaries(metric_scope, date);
    CREATE INDEX idx_daily_energy_summaries_date ON daily_energy_summaries(date);
    CREATE INDEX idx_cumulative_counters_scope_updated
      ON cumulative_counters(metric_scope, last_updated);
    CREATE INDEX idx_cumulative_counters_last_updated ON cumulative_counters(last_updated);
  `);
}
