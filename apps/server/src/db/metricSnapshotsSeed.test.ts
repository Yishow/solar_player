import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after, beforeEach } from "node:test";

const tempDir = mkdtempSync(join(tmpdir(), "solar-display-metric-seed-test-"));
process.env.DATA_DIR = tempDir;
process.env.DATABASE_PATH = join(tempDir, "solar-display.sqlite");
const databasePath = process.env.DATABASE_PATH;

const [{ closeDatabaseConnection, getDatabase }, { migrateDatabase }, { buildIntradayGenerationCurve, seedDatabase }] =
  await Promise.all([import("./index.js"), import("./migrate.js"), import("./seed.js")]);

beforeEach(() => {
  closeDatabaseConnection();
  rmSync(databasePath, { force: true });
  rmSync(`${databasePath}-shm`, { force: true });
  rmSync(`${databasePath}-wal`, { force: true });
});

after(() => {
  closeDatabaseConnection();
  rmSync(tempDir, { force: true, recursive: true });
});

test("intraday generation curve forms a single solar bell", () => {
  const curve = buildIntradayGenerationCurve();
  assert.equal(curve.length, 24);

  const peakIndex = curve.indexOf(Math.max(...curve));
  assert.ok(peakIndex >= 10 && peakIndex <= 14, `peak should be near midday, got index ${peakIndex}`);
  assert.ok(curve[0]! <= curve[peakIndex]!);
  assert.ok(curve[23]! <= curve[peakIndex]!);

  for (let index = 1; index <= peakIndex; index += 1) {
    assert.ok(curve[index]! >= curve[index - 1]!, `expected monotonic rise at ${index}`);
  }
  for (let index = peakIndex + 1; index < curve.length; index += 1) {
    assert.ok(curve[index]! <= curve[index - 1]!, `expected monotonic fall at ${index}`);
  }
});

test("seed populates a 24-point intraday generation series idempotently", () => {
  migrateDatabase();
  seedDatabase();
  seedDatabase();

  const database = getDatabase();
  const rows = database
    .prepare("SELECT generation_power FROM metric_snapshots WHERE generation_power IS NOT NULL ORDER BY captured_at ASC")
    .all() as { generation_power: number }[];

  assert.equal(rows.length, 24);
  const values = rows.map((row) => row.generation_power);
  const peak = Math.max(...values);
  assert.ok(peak > values[0]!);
  assert.ok(peak > values[values.length - 1]!);
});
