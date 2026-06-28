import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after } from "node:test";

const tempDir = mkdtempSync(join(tmpdir(), "solar-display-story-names-test-"));
process.env.DATA_DIR = tempDir;
process.env.DATABASE_PATH = join(tempDir, "solar-display.sqlite");

const [{ migrateDatabase }, { seedDatabase }, { getDatabase }, storyService] = await Promise.all([
  import("../db/migrate.js"),
  import("../db/seed.js"),
  import("../db/index.js"),
  import("./displayStoryService.js")
]);

migrateDatabase();
seedDatabase();

after(() => {
  rmSync(tempDir, { force: true, recursive: true });
});

function setTopicName(metricKey: string, nameZh: string | null, nameEn: string | null) {
  getDatabase()
    .prepare("UPDATE topic_mappings SET name_zh = ?, name_en = ? WHERE metric_key = ?")
    .run(nameZh, nameEn, metricKey);
}

test("overview story uses custom topic name as label when set", () => {
  setTopicName("realTimePower", "一號廠輸出", "Plant A Output");

  const story = storyService.readOverviewDisplayStory();
  const metric = story.metrics.find((entry) => entry.metricKey === "realTimePower");

  assert.equal(metric?.label, "一號廠輸出");
});

test("overview story falls back to built-in default when custom name is empty", () => {
  setTopicName("realTimePower", null, null);

  const story = storyService.readOverviewDisplayStory();
  const metric = story.metrics.find((entry) => entry.metricKey === "realTimePower");

  assert.equal(metric?.label, "即時發電功率");
});

test("solar story uses custom topic name as label when set", () => {
  setTopicName("todayGeneration", "今日產出", "Today Output");

  const story = storyService.readSolarDisplayStory();
  const kpi = story.kpis.find((entry) => entry.metricKey === "todayGeneration");

  assert.equal(kpi?.label, "今日產出");
  // restore
  setTopicName("todayGeneration", null, null);
});

test("factory circuit slot prefers topic name over circuit config name", () => {
  setTopicName("factoryProductionPower", "一號產線", "Line 1");

  const story = storyService.readFactoryCircuitDisplayStory();
  const slot = story.slots.find((entry) => entry.slotKey === "production");

  assert.equal(slot?.label, "一號產線");
});

test("factory circuit slot uses circuit config name when topic name is empty", () => {
  setTopicName("factoryProductionPower", null, null);

  const circuitName = (
    getDatabase()
      .prepare("SELECT name_zh FROM circuit_configs WHERE display_slot = ?")
      .get("production") as { name_zh: string | null } | undefined
  )?.name_zh;

  const story = storyService.readFactoryCircuitDisplayStory();
  const slot = story.slots.find((entry) => entry.slotKey === "production");

  // Without a topic name, the label should come from circuit config (or slot default).
  assert.equal(slot?.label, circuitName ?? "production");
});
