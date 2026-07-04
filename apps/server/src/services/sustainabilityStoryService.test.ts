import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after, beforeEach } from "node:test";
import {
  normalizeSustainabilityStory,
  resolveSustainabilityStoryPeriod,
  type SustainabilityStoryInput
} from "@solar-display/shared";

const tempDir = mkdtempSync(join(tmpdir(), "solar-display-sustainability-story-test-"));
process.env.DATA_DIR = tempDir;
process.env.DATABASE_PATH = join(tempDir, "solar-display.sqlite");
const databasePath = process.env.DATABASE_PATH;

const [
  { closeDatabaseConnection, getDatabase },
  { migrateDatabase },
  { seedDatabase },
  { readSustainabilityStory }
] = await Promise.all([
  import("../db/index.js"),
  import("../db/migrate.js"),
  import("../db/seed.js"),
  import("./sustainabilityStoryService.js")
]);

const story: SustainabilityStoryInput = {
  availablePeriods: ["month", "quarter", "year", "lifetime"],
  modules: [
    {
      bullets: ["推動再生能源使用", "", "強化供應鏈永續管理"],
      id: "esg-1",
      title: "ESG 行動摘要",
      type: "esg-summary"
    }
  ],
  periods: {
    lifetime: {
      bigNumbers: {
        annualEnergySavingPercent: 12.4,
        accumulatedCarbonReductionTons: 9842,
        accumulatedGenerationGwh: 18.6,
        plantedTreeEquivalent: 25600
      },
      highlights: [],
      provenance: {
        label: "累積",
        source: "cumulative-counters",
        syncState: "fresh",
        updatedAt: "2026-05-13T10:00:00.000Z"
      }
    },
    month: {
      bigNumbers: {
        annualEnergySavingPercent: 2.4,
        accumulatedCarbonReductionTons: 38.4,
        accumulatedGenerationGwh: 0.6,
        plantedTreeEquivalent: 180
      },
      highlights: [],
      provenance: {
        label: "月報",
        source: "monthly-rollup",
        syncState: "fresh",
        updatedAt: "2026-05-13T10:00:00.000Z"
      }
    },
    quarter: {
      bigNumbers: {
        annualEnergySavingPercent: 7.2,
        accumulatedCarbonReductionTons: 312,
        accumulatedGenerationGwh: 4.8,
        plantedTreeEquivalent: 980
      },
      highlights: [],
      provenance: {
        label: "季報",
        source: "quarterly-rollup",
        syncState: "warning",
        updatedAt: "2026-05-01T00:00:00.000Z"
      }
    },
    year: {
      bigNumbers: {
        annualEnergySavingPercent: 12.4,
        accumulatedCarbonReductionTons: 9842,
        accumulatedGenerationGwh: 18.6,
        plantedTreeEquivalent: 25600
      },
      highlights: [],
      provenance: {
        label: "年報",
        source: "yearly-rollup",
        syncState: "stale",
        updatedAt: "2026-04-30T23:00:00.000Z"
      }
    }
  },
  selectedPeriod: "quarter"
};

test("sustainability story keeps the selected period consistent across periodized outputs", () => {
  const normalized = normalizeSustainabilityStory(story);
  const resolved = resolveSustainabilityStoryPeriod(normalized, "quarter");

  assert.equal(resolved.selectedPeriod, "quarter");
  assert.equal(resolved.period.bigNumbers.accumulatedGenerationGwh, 4.8);
  assert.equal(resolved.period.provenance.syncState, "warning");
});

test("sustainability story preserves readable module fallbacks when optional content is incomplete", () => {
  const normalized = normalizeSustainabilityStory(story);

  assert.deepEqual(normalized.modules[0]?.bullets, ["推動再生能源使用", "強化供應鏈永續管理"]);
  assert.match(normalized.modules[0]?.description ?? "", /內容整理中/);
});

beforeEach(() => {
  closeDatabaseConnection();
  rmSync(databasePath, { force: true });
  rmSync(`${databasePath}-shm`, { force: true });
  rmSync(`${databasePath}-wal`, { force: true });
  migrateDatabase();
  seedDatabase();
});

after(() => {
  closeDatabaseConnection();
  rmSync(tempDir, { force: true, recursive: true });
});

test("readSustainabilityStory derives carbon reduction and tree equivalence from configured coefficients", () => {
  const database = getDatabase();
  const timestamp = "2026-06-29T10:00:00.000Z";

  database.prepare("DELETE FROM cumulative_counters").run();
  database
    .prepare(
      `
        INSERT INTO cumulative_counters (metric_key, total_value, last_updated, reset_count)
        VALUES
          ('generation', 2000, ?, 0),
          ('consumption', 1000, ?, 0),
          ('selfConsumption', 600, ?, 0)
      `
    )
    .run(timestamp, timestamp, timestamp);
  database
    .prepare(
      `
        UPDATE calculation_settings
        SET
          carbon_emission_factor = 0.5,
          tree_equivalent_factor = 3
        WHERE id = 1
      `
    )
    .run();

  const story = readSustainabilityStory("lifetime");

  assert.equal(story.period.bigNumbers.accumulatedCarbonReductionTons, 1);
  assert.equal(story.period.bigNumbers.plantedTreeEquivalent, 3);
  assert.equal(
    story.period.bigNumberProvenance.accumulatedCarbonReductionTons.source,
    "generation-carbon-reduction"
  );
  assert.equal(
    story.period.bigNumberProvenance.plantedTreeEquivalent.source,
    "generation-tree-equivalent"
  );
});

test("readSustainabilityStory falls back to live metrics when cumulative counters have not flushed yet", () => {
  const database = getDatabase();
  const timestamp = "2026-06-29T10:00:00.000Z";

  database.prepare("DELETE FROM cumulative_counters").run();
  database.prepare("DELETE FROM live_metric_values").run();
  database
    .prepare(
      `
        INSERT INTO live_metric_values (metric_key, value, unit, timestamp, quality, raw_payload)
        VALUES
          ('totalGeneration', 18600000, 'kWh', ?, 'good', '{}'),
          ('consumptionEnergy', 6000, 'kWh', ?, 'good', '{}'),
          ('selfConsumptionEnergy', 4200, 'kWh', ?, 'good', '{}')
      `
    )
    .run(timestamp, timestamp, timestamp);
  database
    .prepare(
      `
        UPDATE calculation_settings
        SET
          carbon_emission_factor = 0.5,
          tree_equivalent_factor = 3
        WHERE id = 1
      `
    )
    .run();

  const story = readSustainabilityStory("lifetime");

  assert.equal(story.period.bigNumbers.accumulatedGenerationGwh, 18.6);
  assert.equal(story.period.bigNumbers.accumulatedCarbonReductionTons, 9300);
  assert.equal(story.period.bigNumbers.annualEnergySavingPercent, 70);
  assert.equal(story.period.bigNumbers.plantedTreeEquivalent, 27900);
  assert.equal(story.period.highlights[0]?.unit, "MWh");
  assert.equal(story.period.highlights[0]?.value, "18,600.0");
  assert.equal(
    story.period.bigNumberProvenance.accumulatedGenerationGwh.updatedAt,
    timestamp
  );
  assert.equal(
    story.period.bigNumberProvenance.accumulatedGenerationGwh.sourceClass,
    "runtime-aggregate"
  );
});

test("readSustainabilityStory normalizes GWh live metrics before deriving sustainability big numbers", () => {
  const database = getDatabase();
  const timestamp = "2026-06-29T10:00:00.000Z";

  database.prepare("DELETE FROM cumulative_counters").run();
  database.prepare("DELETE FROM live_metric_values").run();
  database
    .prepare(
      `
        INSERT INTO live_metric_values (metric_key, value, unit, timestamp, quality, raw_payload)
        VALUES
          ('totalGeneration', 18.6, 'GWh', ?, 'good', '{}'),
          ('consumptionEnergy', 6000, 'kWh', ?, 'good', '{}'),
          ('selfConsumptionEnergy', 4200, 'kWh', ?, 'good', '{}')
      `
    )
    .run(timestamp, timestamp, timestamp);
  database
    .prepare(
      `
        UPDATE calculation_settings
        SET
          carbon_emission_factor = 0.5,
          tree_equivalent_factor = 3
        WHERE id = 1
      `
    )
    .run();

  const story = readSustainabilityStory("lifetime");

  assert.equal(story.period.bigNumbers.accumulatedGenerationGwh, 18.6);
  assert.equal(story.period.bigNumbers.accumulatedCarbonReductionTons, 9300);
  assert.equal(story.period.bigNumbers.plantedTreeEquivalent, 27900);
  assert.equal(story.period.highlights[0]?.unit, "MWh");
  assert.equal(story.period.highlights[0]?.value, "18,600.0");
});

test("readSustainabilityStory preserves sub-0.1 GWh precision when formatting MWh highlights", () => {
  const database = getDatabase();
  const timestamp = "2026-06-29T10:00:00.000Z";

  database.prepare("DELETE FROM cumulative_counters").run();
  database
    .prepare(
      `
        INSERT INTO cumulative_counters (metric_key, total_value, last_updated, reset_count)
        VALUES
          ('generation', 18654321, ?, 0),
          ('consumption', 6000, ?, 0),
          ('selfConsumption', 4200, ?, 0)
      `
    )
    .run(timestamp, timestamp, timestamp);

  const story = readSustainabilityStory("lifetime");

  assert.ok(Math.abs((story.period.bigNumbers.accumulatedGenerationGwh ?? 0) - 18.654321) < 0.000001);
  assert.equal(story.period.highlights[0]?.unit, "MWh");
  assert.equal(story.period.highlights[0]?.value, "18,654.3");
});
