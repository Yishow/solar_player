import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const tempDir = mkdtempSync(join(tmpdir(), "solar-display-metric-resolver-test-"));
process.env.DATA_DIR = tempDir;
process.env.DATABASE_PATH = join(tempDir, "solar-display.sqlite");
const [{ getDatabase }, { migrateDatabase }, { seedDatabase }, {
  resolveCumulativeCounterHistory,
  resolveDailyEnergySummaryHistory,
  resolveMetric,
  resolveMetricSnapshotHistory,
  resolveSnapshot
}] = await Promise.all([
  import("../db/index.js"), import("../db/migrate.js"), import("../db/seed.js"), import("./MetricResolver.js")
]);

test.after(() => rmSync(tempDir, { force: true, recursive: true }));

test("MetricResolver keeps identical CL and KN identities independent", () => {
  migrateDatabase();
  seedDatabase();
  const database = getDatabase();
  database.prepare("DELETE FROM live_metric_values").run();
  database.prepare("DELETE FROM topic_mappings").run();
  database.prepare("DELETE FROM display_value_overrides").run();
  database.prepare("INSERT INTO topic_mappings (metric_scope, metric_key, topic, enabled) VALUES ('cl','realTimePower','solar/cl',1),('kn','realTimePower','solar/kn',1),('global','gridStatus','grid/status',1)").run();
  database.prepare("INSERT INTO live_metric_values (metric_scope, metric_key, value, unit, timestamp, quality) VALUES ('cl','realTimePower',12,'kW','2026-08-29T00:00:00.000Z','good'),('kn','realTimePower',34,'kW','2026-08-29T00:10:00.000Z','good'),('global','gridStatus',1,'bool','2026-08-29T00:20:00.000Z','good')").run();
  database.prepare("INSERT INTO display_value_overrides (metric_scope,target_id,page_id,card_id,metric_key,display_value,enabled,reason) VALUES ('cl','overview:realTimePower','overview','power','realTimePower',99,1,'test')").run();

  assert.equal(resolveMetric(database, { metricScope: "cl", metricKey: "realTimePower", targetId: "overview:realTimePower" }).value, 12);
  assert.equal(resolveMetric(database, { metricScope: "cl", metricKey: "realTimePower" }).timestamp, "2026-08-29T00:00:00.000Z");
  assert.equal(
    resolveMetric(database, { metricScope: "cl", metricKey: "realTimePower" }, Date.parse("2026-08-29T00:10:30.000Z")).freshness?.sourceTimestamp,
    "2026-08-29T00:00:00.000Z"
  );
  assert.equal(resolveMetric(database, { metricScope: "cl", metricKey: "realTimePower" }).provenance?.topic, "solar/cl");
  assert.equal(resolveMetric(database, { metricScope: "kn", metricKey: "realTimePower" }).provenance?.topic, "solar/kn");
  assert.equal(resolveMetric(database, { metricScope: "kn", metricKey: "realTimePower", targetId: "overview:realTimePower" }).value, 34);
  assert.equal(resolveMetric(database, { metricScope: "cl", metricKey: "realTimePower", targetId: "overview:realTimePower" }).override?.displayValue, 99);
  assert.equal(resolveMetric(database, { metricScope: "kn", metricKey: "realTimePower", targetId: "overview:realTimePower" }).override, null);
  assert.equal(resolveMetric(database, { metricScope: "cl", metricKey: "gridStatus" }).value, null);
  assert.equal(resolveSnapshot(database, { siteScope: "cl", metricKeys: ["realTimePower", "gridStatus"] }).some((metric) => metric.metricScope === "global"), false);
  assert.deepEqual(resolveSnapshot(database, { siteScope: "cl", metricKeys: ["realTimePower", "gridStatus"], includeGlobal: true }).map((metric) => [metric.metricScope, metric.metricKey]), [["cl", "realTimePower"], ["global", "gridStatus"]]);
});

test("MetricResolver keeps snapshot, summary, and counter history scoped", () => {
  const database = getDatabase();
  database.prepare("DELETE FROM metric_snapshots").run();
  database.prepare("DELETE FROM daily_energy_summaries").run();
  database.prepare("DELETE FROM cumulative_counters").run();
  database.prepare(`
    INSERT INTO metric_snapshots (metric_scope, generation, captured_at)
    VALUES ('cl', 11, '2026-08-29T00:00:00.000Z'), ('kn', 22, '2026-08-29T00:00:00.000Z')
  `).run();
  database.prepare(`
    INSERT INTO daily_energy_summaries (metric_scope, date, generation_total)
    VALUES ('cl', '2026-08-29', 111), ('kn', '2026-08-29', 222)
  `).run();
  database.prepare(`
    INSERT INTO cumulative_counters (metric_scope, metric_key, total_value)
    VALUES ('cl', 'totalGeneration', 1111), ('kn', 'totalGeneration', 2222)
  `).run();

  assert.deepEqual(
    resolveMetricSnapshotHistory(database, { metricScope: "cl", range: "total" }).map((row) => row.generation),
    [11]
  );
  assert.deepEqual(
    resolveDailyEnergySummaryHistory(database, { metricScope: "kn", range: "total" }).map((row) => row.generationTotal),
    [222]
  );
  assert.deepEqual(
    resolveCumulativeCounterHistory(database, { metricScope: "cl" }).map((row) => row.totalValue),
    [1111]
  );
});
