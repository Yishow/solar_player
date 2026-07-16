import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import Database from "better-sqlite3";

const brokenMigrationPath = join(import.meta.dirname, "023_normalize_factory_circuit_jungli_rows.sql");
const migrationPath = join(import.meta.dirname, "024_fix_factory_circuit_jungli_region_rows.sql");

const legacyConfig = JSON.stringify({
  regions: {
    loadRowStates: {
      ev: {},
      hvac: {},
      infrastructure: {},
      lighting: {},
      office: {},
      production: {}
    },
    loadRows: {
      production: { height: 84, left: 1392, top: 146, width: 470 },
      hvac: { height: 84, left: 1392, top: 241, width: 470 },
      lighting: { height: 84, left: 1392, top: 336, width: 470 },
      office: { height: 84, left: 1392, top: 431, width: 470 },
      ev: { height: 84, left: 1392, top: 526, width: 470 },
      infrastructure: { height: 84, left: 1392, top: 621, width: 470 }
    }
  },
  unrelatedEditorValue: "preserve-me"
});

const guanyinConfig = JSON.stringify({
  regions: {
    loadRows: {
      stamping: { height: 65, left: 1392, top: 146, width: 470 }
    }
  },
  unrelatedEditorValue: "guanyin-preserve-me"
});

function createLegacyDatabase() {
  const database = new Database(":memory:");
  database.exec(`
    CREATE TABLE display_page_configs (
      page_key TEXT PRIMARY KEY,
      config_json TEXT NOT NULL,
      updated_at TEXT
    );
    CREATE TABLE display_page_stage_configs (
      page_key TEXT NOT NULL,
      stage TEXT NOT NULL,
      config_json TEXT NOT NULL,
      version INTEGER NOT NULL,
      updated_at TEXT,
      published_at TEXT,
      published_by TEXT,
      PRIMARY KEY (page_key, stage)
    );
    CREATE TABLE circuit_configs (
      id INTEGER PRIMARY KEY,
      page_key TEXT NOT NULL,
      display_slot TEXT,
      name_zh TEXT,
      name_en TEXT,
      icon TEXT,
      mqtt_topic TEXT,
      rated_capacity REAL,
      normal_min REAL,
      normal_max REAL,
      attention_min REAL,
      attention_max REAL,
      warning_min REAL,
      warning_max REAL,
      display_order INTEGER,
      enabled INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT
    );
    CREATE TABLE topic_mappings (
      metric_key TEXT PRIMARY KEY,
      name_zh TEXT,
      name_en TEXT
    );
  `);

  database
    .prepare("INSERT INTO display_page_configs (page_key, config_json) VALUES (?, ?), (?, ?)")
    .run("factory-circuit", legacyConfig, "factory-circuit-guanyin", guanyinConfig);
  const insertStage = database.prepare(`
    INSERT INTO display_page_stage_configs (
      page_key, stage, config_json, version, published_at, published_by
    ) VALUES (?, ?, ?, ?, ?, ?)
  `);
  insertStage.run("factory-circuit", "draft", legacyConfig, 6, null, null);
  insertStage.run("factory-circuit", "live", legacyConfig, 6, "2026-06-29T08:22:30.829Z", "operator");
  insertStage.run("factory-circuit-guanyin", "live", guanyinConfig, 3, "2026-06-29T08:22:30.829Z", "operator");

  const insertCircuit = database.prepare(`
    INSERT INTO circuit_configs (
      id, page_key, display_slot, name_zh, name_en, icon, mqtt_topic,
      rated_capacity, normal_min, normal_max, attention_min, attention_max,
      warning_min, warning_max, display_order, enabled
    ) VALUES (?, 'factory-circuit', ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, 1)
  `);
  const rows = [
    [1, "production", "生產線用電", "Production Line", "factory", "factory/power/production", 850, 595, 595, 765, 765, 850, 1],
    [2, "hvac", "空調與環境設備", "HVAC & Environment", "wind", "factory/power/hvac", 620, 434, 434, 558, 558, 620, 2],
    [3, "lighting", "照明系統", "Lighting", "lightbulb", "factory/power/lighting", 180, 126, 126, 162, 162, 180, 3],
    [4, "office", "裝配工程", "Assembly Shop", "building-2", "factory/power/office", 240, 168, 168, 216, 216, 240, 4],
    [5, "ev", "充電設備/綠能設施", "Charging & Green Facilities", "battery-charging", "factory/power/ev_green", 320, 224, 224, 288, 288, 320, 5],
    [6, "infrastructure", "其他基礎設施", "Infrastructure", "settings-2", "factory/power/infrastructure", 200, 140, 140, 180, 180, 200, 6],
    [7, "stamping", "沖壓工程", "Stamping Shop", "factory", "factory/power/stamping", 850, 595, 595, 765, 765, 850, 1],
    [8, "body", "車身工程", "Body Shop", "wind", "factory/power/body", 620, 434, 434, 558, 558, 620, 2],
    [9, "painting", "塗裝工程", "Painting Shop", "lightbulb", "factory/power/painting", 180, 126, 126, 162, 162, 180, 3],
    [10, "assembly", "裝配工程", "Assembly Shop", "building-2", "factory/power/assembly", 240, 168, 168, 216, 216, 240, 4],
    [11, "utility", "原動力", "Utility & Powerhouse", "battery-charging", "factory/power/utility", 320, 224, 224, 288, 288, 320, 5]
  ] as const;
  for (const row of rows) {
    insertCircuit.run(...row);
  }

  database
    .prepare("INSERT INTO topic_mappings (metric_key, name_zh, name_en) VALUES (?, ?, ?)")
    .run("factoryOfficePower", "裝配工程", "Assembly Shop");
  return database;
}

test("legacy Jungli fixture reproduces the overlapping office row and duplicate assembly label", () => {
  const database = createLegacyDatabase();
  try {
    const config = JSON.parse(
      database.prepare("SELECT config_json FROM display_page_configs WHERE page_key = 'factory-circuit'").pluck().get() as string
    );
    const office = database
      .prepare("SELECT name_zh, name_en FROM circuit_configs WHERE page_key = 'factory-circuit' AND display_slot = 'office'")
      .get() as { name_en: string; name_zh: string };

    assert.equal(config.regions.loadRows.office.top, 431);
    assert.deepEqual(office, { name_en: "Assembly Shop", name_zh: "裝配工程" });
    assert.equal(
      database
        .prepare("SELECT COUNT(*) FROM circuit_configs WHERE display_slot IN ('production', 'hvac', 'lighting', 'ev', 'infrastructure') AND enabled = 1")
        .pluck()
        .get(),
      5
    );
  } finally {
    database.close();
  }
});

test("024 migration repairs the installed nested Jungli config without changing Guanyin or unrelated fields", () => {
  const database = createLegacyDatabase();
  try {
    const brokenMigration = readFileSync(brokenMigrationPath, "utf8");
    const guanyinBefore = database
      .prepare("SELECT config_json FROM display_page_configs WHERE page_key = 'factory-circuit-guanyin'")
      .pluck()
      .get();

    database.exec(brokenMigration);
    const brokenConfig = JSON.parse(
      database.prepare("SELECT config_json FROM display_page_stage_configs WHERE page_key = 'factory-circuit' AND stage = 'live'").pluck().get() as string
    );
    assert.equal(brokenConfig.regions.loadRows.office.top, 431);
    assert.equal(brokenConfig.loadRows.office.top, 635);

    const migration = readFileSync(migrationPath, "utf8");
    database.exec(migration);
    const firstResult = database.serialize();
    database.exec(migration);

    const expectedKeys = ["assembly", "body", "office", "painting", "stamping", "utility"];
    const expectedTops = {
      assembly: 445,
      body: 255,
      office: 635,
      painting: 350,
      stamping: 160,
      utility: 540
    } as const;
    const configs = database
      .prepare(`
        SELECT config_json
        FROM display_page_configs
        WHERE page_key = 'factory-circuit'
        UNION ALL
        SELECT config_json
        FROM display_page_stage_configs
        WHERE page_key = 'factory-circuit'
        ORDER BY config_json
      `)
      .all() as Array<{ config_json: string }>;

    assert.equal(configs.length, 3);
    for (const row of configs) {
      const config = JSON.parse(row.config_json);
      assert.deepEqual(Object.keys(config.regions.loadRows).sort(), expectedKeys);
      assert.deepEqual(
        Object.fromEntries(expectedKeys.map((key) => [key, config.regions.loadRows[key].top])),
        expectedTops
      );
      assert.equal(config.loadRows, undefined);
      assert.equal(config.loadRowStates, undefined);
      assert.equal(config.unrelatedEditorValue, "preserve-me");
    }
    assert.equal(
      database
        .prepare("SELECT COUNT(*) FROM circuit_configs WHERE display_slot IN ('production', 'hvac', 'lighting', 'ev', 'infrastructure') AND enabled = 1")
        .pluck()
        .get(),
      0
    );
    assert.deepEqual(
      database
        .prepare("SELECT name_zh, name_en, rated_capacity, display_order, enabled FROM circuit_configs WHERE display_slot = 'office'")
        .get(),
      { display_order: 6, enabled: 1, name_en: "Office & Administration", name_zh: "事務系", rated_capacity: 200 }
    );
    assert.deepEqual(
      database.prepare("SELECT name_zh, name_en FROM topic_mappings WHERE metric_key = 'factoryOfficePower'").get(),
      { name_en: "Office & Administration", name_zh: "事務系" }
    );
    assert.equal(
      database.prepare("SELECT version FROM display_page_stage_configs WHERE page_key = 'factory-circuit' AND stage = 'live'").pluck().get(),
      8
    );
    assert.equal(
      database.prepare("SELECT published_by FROM display_page_stage_configs WHERE page_key = 'factory-circuit' AND stage = 'live'").pluck().get(),
      "system-migration"
    );
    assert.equal(
      database.prepare("SELECT config_json FROM display_page_configs WHERE page_key = 'factory-circuit-guanyin'").pluck().get(),
      guanyinBefore
    );
    assert.deepEqual(database.serialize(), firstResult);
  } finally {
    database.close();
  }
});
