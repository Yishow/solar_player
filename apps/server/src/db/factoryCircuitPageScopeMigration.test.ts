import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import Database from "better-sqlite3";

test("020 migration moves legacy heavy vehicle and ED rows out of Jungli Factory Circuit", () => {
  const database = new Database(":memory:");
  const migration020 = readFileSync(
    resolve(process.cwd(), "src/db/migrations/020_fix_factory_circuit_site_counts.sql"),
    "utf8"
  );

  database.exec(`
    CREATE TABLE circuit_configs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      page_key TEXT NOT NULL,
      name_zh TEXT,
      mqtt_topic TEXT,
      display_slot TEXT
    );
  `);
  const insertCircuit = database.prepare(`
    INSERT INTO circuit_configs (page_key, name_zh, mqtt_topic, display_slot)
    VALUES (?, ?, ?, ?)
  `);

  insertCircuit.run("factory-circuit", "沖壓工程", "factory/power/stamping", "stamping");
  insertCircuit.run("factory-circuit", "大車工程", "factory/power/heavy_vehicle", "heavy_vehicle");
  insertCircuit.run("factory-circuit", "ED電著", "factory/power/ed_coating", "ed_coating");

  database.exec(migration020);

  const counts = database
    .prepare("SELECT page_key, COUNT(*) AS count FROM circuit_configs GROUP BY page_key ORDER BY page_key")
    .all() as Array<{ count: number; page_key: string }>;

  assert.deepEqual(counts, [
    { count: 1, page_key: "factory-circuit" },
    { count: 2, page_key: "factory-circuit-guanyin" }
  ]);
  database.close();
});
