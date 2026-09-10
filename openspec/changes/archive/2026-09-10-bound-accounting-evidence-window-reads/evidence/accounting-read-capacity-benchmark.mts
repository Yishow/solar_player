import { createRequire } from "node:module";
import { performance } from "node:perf_hooks";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repo = resolve(import.meta.dirname, "../../../../..");
const require = createRequire(`${repo}/apps/server/package.json`);
const Database = require("better-sqlite3") as typeof import("better-sqlite3");
const {
  selectCalculationEvidence,
  selectProjectionFingerprintEvidence
} = await import(`${repo}/apps/server/src/services/accountingEvidenceSelection.ts`);
const { loadAcceptedMeterReadings } = await import(`${repo}/apps/server/src/services/meterReadingService.ts`);

const historyCount = Number(process.argv[2]);
if (![10_000, 100_000].includes(historyCount)) throw new Error("expected 10000 or 100000");

const migration = (name: string) => readFileSync(`${repo}/apps/server/src/db/migrations/${name}`, "utf8");
const database = new Database(":memory:");
for (const name of ["001_init.sql", "040_meter_reading_contracts.sql", "049_meter_source_boundary_age.sql", "046_meter_reading_evidence.sql"]) {
  database.exec(migration(name));
}

const insert = database.prepare(`
  INSERT INTO meter_readings_accepted (
    reading_id, metric_scope, meter_id, channel_id, source_revision, epoch_id,
    raw_value_decimal, normalized_value_kwh, source_timestamp, received_at,
    timestamp_quality, origin, payload_hash, created_at, measurement_kind
  ) VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, ?, 'source', 'mqtt', ?, ?, 'cumulative-energy')
`);
const put = (id: string, scope: string, meter: string, channel: string, epoch: string, value: number, instantMs: number) => {
  const instant = new Date(instantMs).toISOString();
  insert.run(id, scope, meter, channel, epoch, String(value), String(value), instant, instant, id, instant);
};
const historyStart = Date.parse("2019-01-01T00:00:00Z");
const historySpan = Date.parse("2025-01-01T00:00:00Z") - historyStart;
database.transaction(() => {
  for (let index = 0; index < historyCount; index += 1) {
    put(`history-${index}`, "cl", "legacy-main", "main", "legacy", index, historyStart + Math.floor(index * historySpan / historyCount));
  }
  for (let index = 0; index < 1_000; index += 1) {
    put(`other-channel-${index}`, "cl", "other", "other", "other", index, historyStart + index * 60_000);
    put(`other-scope-${index}`, "kn", "main", "main", "other-scope", index, historyStart + index * 60_000);
  }
  put("requested-opening", "cl", "main", "main", "current", 1_000_000, Date.parse("2026-08-31T16:00:00Z"));
  put("requested-middle", "cl", "main", "main", "current", 1_000_050, Date.parse("2026-09-10T00:00:00Z"));
  put("requested-closing", "cl", "main", "main", "current", 1_000_075, Date.parse("2026-09-14T23:59:00Z"));
})();

const pageSize = Number((database.prepare("PRAGMA page_size").get() as { page_size: number }).page_size);
const pagesBeforeIndex = Number((database.prepare("PRAGMA page_count").get() as { page_count: number }).page_count);
database.exec(migration("052_accounting_evidence_query_indexes.sql"));
const pagesAfterIndex = Number((database.prepare("PRAGMA page_count").get() as { page_count: number }).page_count);

const fromMs = Date.parse("2026-08-31T16:00:00Z");
const throughMs = Date.parse("2026-09-15T00:00:00Z");
const projection = {
  calculatedThrough: new Date(throughMs).toISOString(),
  meterIds: ["main"],
  periodEnd: "2026-09-30T16:00:00.000Z",
  periodStart: new Date(fromMs).toISOString(),
  profileRevision: 1,
  quality: "exact" as const,
  siteTimeZone: "Asia/Taipei",
  valueKwh: "75"
};
const operations = {
  baseline: () => ({ queryCount: 1, materializedRowCount: loadAcceptedMeterReadings(database, "cl").length }),
  calculation: () => selectCalculationEvidence(database, { channelIds: ["main"], fromMs, scope: "cl", throughMs }),
  projection: () => selectProjectionFingerprintEvidence(database, "cl", projection)
};

const results: Record<string, { durationsMs: number[]; heapPeakBytes: number; materializedRowCount: number; maxRssKb: number; queryCount: number }> = {};
for (const [name, operation] of Object.entries(operations)) {
  const durationsMs: number[] = [];
  let heapPeakBytes = 0;
  let maxRssKb = 0;
  // Exactly one unmeasured warm-up precedes the seven recorded runs.
  let last = operation();
  for (let run = 0; run < 7; run += 1) {
    const started = performance.now();
    last = operation();
    durationsMs.push(performance.now() - started);
    heapPeakBytes = Math.max(heapPeakBytes, process.memoryUsage().heapTotal);
    maxRssKb = Math.max(maxRssKb, process.resourceUsage().maxRSS);
  }
  results[name] = {
    durationsMs,
    heapPeakBytes,
    materializedRowCount: last.materializedRowCount,
    maxRssKb,
    queryCount: last.queryCount
  };
}

const expression = "CAST(ROUND(unixepoch(COALESCE(source_timestamp, received_at), 'subsec') * 1000) AS INTEGER)";
const plan = (database.prepare(`EXPLAIN QUERY PLAN SELECT reading_id FROM meter_readings_accepted WHERE metric_scope = ? AND channel_id = ? AND ${expression} BETWEEN ? AND ?`).all("cl", "main", fromMs, throughMs) as Array<{ detail: string }>).map((row) => row.detail);

console.log(JSON.stringify({
  environment: { node: process.version, platform: `${process.platform}-${process.arch}`, sqlite: database.prepare("SELECT sqlite_version() AS version").get() },
  historyCount,
  indexBytes: (pagesAfterIndex - pagesBeforeIndex) * pageSize,
  pageSize,
  plan,
  results,
  seed: 20260910,
  totalAcceptedRows: historyCount + 2_003
}));
database.close();
