import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after, beforeEach } from "node:test";
import { updateDefaultPlaybackPageForTest } from "../testing/defaultPlaybackProfileTestSupport.js";
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
  { readSustainabilityStory, resolveSustainabilityFactoryScope, saveSustainabilityStory },
  { clearDisplayValueOverride, saveDisplayValueOverride }
] = await Promise.all([
  import("../db/index.js"),
  import("../db/migrate.js"),
  import("../db/seed.js"),
  import("./sustainabilityStoryService.js"),
  import("./displayValueOverrideService.js")
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

test("readSustainabilityStory derives carbon reduction and tree equivalence with the overview tree factor", () => {
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
  assert.equal(story.period.bigNumbers.plantedTreeEquivalent, 6);
  assert.equal(
    story.period.bigNumberProvenance.accumulatedCarbonReductionTons.source,
    "CL + KN MQTT aggregate × carbonEmissionFactor (CL today_mwh missing)"
  );
  assert.equal(
    story.period.bigNumberProvenance.plantedTreeEquivalent.source,
    "CL + KN MQTT aggregate × carbonEmissionFactor × co2TreeEquivalentFactor (CL today_mwh missing)"
  );
});

test("readSustainabilityStory derives tree equivalence from the same rounded CO2 display basis as overview", () => {
  const database = getDatabase();
  const timestamp = "2026-06-29T10:00:00.000Z";

  database.prepare("DELETE FROM cumulative_counters").run();
  database
    .prepare(
      `
        INSERT INTO cumulative_counters (metric_key, total_value, last_updated, reset_count)
        VALUES
          ('generation', 53520, ?, 0),
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
          carbon_emission_factor = 1,
          tree_equivalent_factor = 3
        WHERE id = 1
      `
    )
    .run();

  const story = readSustainabilityStory("lifetime");

  assert.equal(story.period.bigNumbers.accumulatedCarbonReductionTons, 53.52);
  assert.equal(story.period.bigNumbers.plantedTreeEquivalent, 334);
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
  assert.equal(story.period.bigNumbers.plantedTreeEquivalent, 58125);
  assert.equal(story.period.highlights[0]?.unit, "MWh");
  assert.equal(story.period.highlights[0]?.value, "18,600");
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
  assert.equal(story.period.bigNumbers.plantedTreeEquivalent, 58125);
  assert.equal(story.period.highlights[0]?.unit, "MWh");
  assert.equal(story.period.highlights[0]?.value, "18,600");
});

test("readSustainabilityStory applies and clears household display overrides without changing formulas", () => {
  const database = getDatabase();
  const timestamp = "2026-07-08T09:00:00.000Z";
  const today = "2026-07-08";

  database
    .prepare(
      `
        UPDATE calculation_settings
        SET household_daily_usage_kwh = 4,
            household_monthly_usage_kwh = 120,
            estimated_tariff_per_kwh = 5
        WHERE id = 1
      `
    )
    .run();
  database.prepare("DELETE FROM daily_energy_summaries").run();
  database
    .prepare(
      `
        INSERT INTO daily_energy_summaries (
          date,
          generation_total,
          consumption_total,
          self_consumption_total
        ) VALUES (?, 100, 80, 16)
      `
    )
    .run(today);
  database
    .prepare(
      `
        INSERT INTO cumulative_counters (metric_key, total_value, last_updated, reset_count)
        VALUES ('selfConsumption', 360, ?, 0)
        ON CONFLICT(metric_key) DO UPDATE SET
          total_value = excluded.total_value,
          last_updated = excluded.last_updated
      `
    )
    .run(timestamp);

  const formulaStory = readSustainabilityStory(undefined, { applyDisplayOverrides: false });
  assert.equal(formulaStory.householdEquivalents.today.householdCountDisplay, "4");

  saveDisplayValueOverride(
    {
      cardId: "sustainability.household.today",
      metricKey: "householdEquivalent.today",
      pageId: "sustainability",
      targetId: "sustainability.household.today",
      unit: "口之家"
    },
    { displayValue: 9 }
  );

  const overriddenStory = readSustainabilityStory();
  const rawStory = readSustainabilityStory(undefined, { applyDisplayOverrides: false });

  assert.equal(overriddenStory.householdEquivalents.today.householdCountDisplay, "9.0");
  assert.equal(rawStory.householdEquivalents.today.householdCountDisplay, "4");

  clearDisplayValueOverride("sustainability.household.today");

  const restoredStory = readSustainabilityStory();
  assert.equal(restoredStory.householdEquivalents.today.householdCountDisplay, "4");
});

test("readSustainabilityStory applies and clears big number display overrides without changing formulas", () => {
  const database = getDatabase();
  const timestamp = "2026-07-09T08:43:30.386Z";

  database.prepare("DELETE FROM cumulative_counters").run();
  database
    .prepare(
      `
        INSERT INTO cumulative_counters (metric_key, total_value, last_updated, reset_count)
        VALUES
          ('generation', 114820, ?, 0),
          ('consumption', 38647, ?, 0),
          ('selfConsumption', 22584, ?, 0)
      `
    )
    .run(timestamp, timestamp, timestamp);
  database
    .prepare(
      `
        UPDATE calculation_settings
        SET
          carbon_emission_factor = 0.467,
          tree_equivalent_factor = 2.6
        WHERE id = 1
      `
    )
    .run();

  saveDisplayValueOverride(
    {
      cardId: "sustainability.big-number.annualEnergySavingPercent",
      metricKey: "annualEnergySavingPercent",
      pageId: "sustainability",
      targetId: "sustainability.big-number.annualEnergySavingPercent",
      unit: "%"
    },
    { displayValue: 8.4 }
  );
  saveDisplayValueOverride(
    {
      cardId: "sustainability.big-number.plantedTreeEquivalent",
      metricKey: "plantedTreeEquivalent",
      pageId: "sustainability",
      targetId: "sustainability.big-number.plantedTreeEquivalent",
      unit: "trees"
    },
    { displayValue: 18 }
  );

  const overriddenStory = readSustainabilityStory("lifetime");
  const rawStory = readSustainabilityStory("lifetime", { applyDisplayOverrides: false });

  assert.equal(overriddenStory.period.bigNumbers.annualEnergySavingPercent, 8.4);
  assert.equal(overriddenStory.period.bigNumbers.plantedTreeEquivalent, 18);
  assert.equal(rawStory.period.bigNumbers.annualEnergySavingPercent, 58.4);
  assert.equal(rawStory.period.bigNumbers.plantedTreeEquivalent, 335);
  assert.equal(
    overriddenStory.period.highlights.find((highlight) => highlight.label === "節能成效")?.value,
    "8.4"
  );
  assert.equal(
    overriddenStory.period.highlights.find((highlight) => highlight.label === "植樹等效")?.value,
    "18"
  );

  clearDisplayValueOverride("sustainability.big-number.annualEnergySavingPercent");
  clearDisplayValueOverride("sustainability.big-number.plantedTreeEquivalent");

  const restoredStory = readSustainabilityStory("lifetime");
  assert.equal(restoredStory.period.bigNumbers.annualEnergySavingPercent, 58.4);
  assert.equal(restoredStory.period.bigNumbers.plantedTreeEquivalent, 335);
});

test("readSustainabilityStory rounds MWh highlights to whole numbers", () => {
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
  assert.equal(story.period.highlights[0]?.value, "18,654");
});

test("readSustainabilityStory uses the CL and KN cumulative aggregate and older source timestamp", () => {
  const database = getDatabase();
  const clTimestamp = "2026-06-26T15:38:10+08:00";
  const knTimestamp = "2026-06-26T15:37:55+08:00";

  database.prepare("DELETE FROM cumulative_counters").run();
  database.prepare("DELETE FROM live_metric_values").run();
  database
    .prepare(
      `
        INSERT INTO cumulative_counters (metric_key, total_value, last_updated, reset_count)
        VALUES ('generation', 13645876, ?, 0)
      `
    )
    .run(knTimestamp);
  const insert = database.prepare(`
    INSERT INTO live_metric_values (metric_key, value, unit, timestamp, quality, raw_payload)
    VALUES (?, ?, 'MWh', ?, 'good', ?)
  `);
  for (const [factory, timestamp, today, month, total] of [
    ["cl", clTimestamp, 3.49, 366.93, 9986.306],
    ["kn", knTimestamp, 2.92, 265.77, 3659.57]
  ] as const) {
    const rawPayload = JSON.stringify({ month_mwh: month, timestamp, today_mwh: today, total_mwh: total });
    insert.run(`factoryGeneration.${factory}.todayMwh`, today, timestamp, rawPayload);
    insert.run(`factoryGeneration.${factory}.monthMwh`, month, timestamp, rawPayload);
    insert.run(`factoryGeneration.${factory}.totalMwh`, total, timestamp, rawPayload);
  }
  database
    .prepare("UPDATE calculation_settings SET carbon_emission_factor = 0.495 WHERE id = 1")
    .run();

  const result = readSustainabilityStory("lifetime", {
    applyDisplayOverrides: false,
    now: new Date("2026-06-26T15:38:20+08:00")
  });

  assert.equal(result.period.bigNumbers.accumulatedGenerationGwh, 13.645876);
  assert.equal(result.period.bigNumbers.accumulatedCarbonReductionTons, 6754.709);
  assert.equal(
    result.period.bigNumberProvenance.accumulatedGenerationGwh.source,
    "CL + KN MQTT aggregate"
  );
  assert.equal(
    result.period.bigNumberProvenance.accumulatedCarbonReductionTons.source,
    "CL + KN MQTT aggregate × carbonEmissionFactor"
  );
  assert.equal(
    result.period.bigNumberProvenance.accumulatedGenerationGwh.updatedAt,
    knTimestamp
  );
  assert.equal(
    result.period.bigNumberProvenance.accumulatedGenerationGwh.syncState,
    "fresh"
  );
});

function setFactoryPlaybackSelection(clEnabled: boolean, knEnabled: boolean) {
  const database = getDatabase();
  updateDefaultPlaybackPageForTest(database, "factory-circuit", { enabled: clEnabled });
  updateDefaultPlaybackPageForTest(database, "factory-circuit-guanyin", { enabled: knEnabled });
}

function insertFactoryGenerationSources(args: {
  clTimestamp?: string;
  knTimestamp?: string;
}) {
  const database = getDatabase();
  const clTimestamp = args.clTimestamp ?? "2026-06-26T15:38:10+08:00";
  const knTimestamp = args.knTimestamp ?? "2026-06-26T15:37:55+08:00";
  const insert = database.prepare(`
    INSERT INTO live_metric_values (metric_key, value, unit, timestamp, quality, raw_payload)
    VALUES (?, ?, 'MWh', ?, 'good', ?)
  `);

  for (const [factory, timestamp, today, month, total] of [
    ["cl", clTimestamp, 3.49, 366.93, 9986.306],
    ["kn", knTimestamp, 2.92, 265.77, 3659.57]
  ] as const) {
    const rawPayload = JSON.stringify({ month_mwh: month, timestamp, today_mwh: today, total_mwh: total });
    insert.run(`factoryGeneration.${factory}.todayMwh`, today, timestamp, rawPayload);
    insert.run(`factoryGeneration.${factory}.monthMwh`, month, timestamp, rawPayload);
    insert.run(`factoryGeneration.${factory}.totalMwh`, total, timestamp, rawPayload);
  }
}

test("resolveSustainabilityFactoryScope maps all playback factory enablement combinations", () => {
  assert.equal(resolveSustainabilityFactoryScope([
    { enabled: true, pageKey: "factory-circuit" },
    { enabled: false, pageKey: "factory-circuit-guanyin" }
  ]), "CL");
  assert.equal(resolveSustainabilityFactoryScope([
    { enabled: false, pageKey: "factory-circuit" },
    { enabled: true, pageKey: "factory-circuit-guanyin" }
  ]), "KN");
  assert.equal(resolveSustainabilityFactoryScope([
    { enabled: true, pageKey: "factory-circuit" },
    { enabled: true, pageKey: "factory-circuit-guanyin" }
  ]), "CL+KN");
  assert.equal(resolveSustainabilityFactoryScope([
    { enabled: false, pageKey: "factory-circuit" },
    { enabled: false, pageKey: "factory-circuit-guanyin" }
  ]), "none");
});

test("readSustainabilityStory scopes generation and CO2 to CL, KN, both, or none", () => {
  const database = getDatabase();
  database.prepare("DELETE FROM cumulative_counters").run();
  database.prepare("DELETE FROM live_metric_values").run();
  insertFactoryGenerationSources({});
  database
    .prepare("UPDATE calculation_settings SET carbon_emission_factor = 0.495 WHERE id = 1")
    .run();
  const now = new Date("2026-06-26T15:38:20+08:00");

  const cases = [
    { cl: true, co2: 4943.221, generation: 9.986306, kn: false, source: "CL MQTT" },
    { cl: false, co2: 1811.487, generation: 3.65957, kn: true, source: "KN MQTT" },
    { cl: true, co2: 6754.709, generation: 13.645876, kn: true, source: "CL + KN MQTT aggregate" },
    { cl: false, co2: null, generation: null, kn: false, source: "未選擇廠區" }
  ] as const;

  for (const expected of cases) {
    setFactoryPlaybackSelection(expected.cl, expected.kn);
    const result = readSustainabilityStory("lifetime", { applyDisplayOverrides: false, now });

    assert.equal(result.period.bigNumbers.accumulatedGenerationGwh, expected.generation);
    assert.equal(result.period.bigNumbers.accumulatedCarbonReductionTons, expected.co2);
    assert.equal(
      result.period.bigNumberProvenance.accumulatedGenerationGwh.source,
      expected.source
    );
  }
});

test("CL-only Sustainability remains fresh when KN is stale", () => {
  const database = getDatabase();
  database.prepare("DELETE FROM cumulative_counters").run();
  database.prepare("DELETE FROM live_metric_values").run();
  insertFactoryGenerationSources({ knTimestamp: "2026-06-26T15:37:00+08:00" });
  setFactoryPlaybackSelection(true, false);

  const result = readSustainabilityStory("lifetime", {
    applyDisplayOverrides: false,
    now: new Date("2026-06-26T15:38:20+08:00")
  });

  assert.equal(result.period.bigNumbers.accumulatedGenerationGwh, 9.986306);
  assert.equal(result.period.bigNumberProvenance.accumulatedGenerationGwh.syncState, "fresh");
  assert.equal(result.period.bigNumberProvenance.accumulatedGenerationGwh.updatedAt, "2026-06-26T15:38:10+08:00");
});

test("Sustainability marks an old cumulative value as a historical snapshot", () => {
  const database = getDatabase();
  database.prepare("DELETE FROM cumulative_counters").run();
  database.prepare("DELETE FROM live_metric_values").run();
  insertFactoryGenerationSources({
    clTimestamp: "2026-07-28T00:00:00.000Z",
    knTimestamp: "2026-07-28T00:00:00.000Z"
  });

  const result = readSustainabilityStory("lifetime", {
    applyDisplayOverrides: false,
    now: new Date("2026-07-30T12:00:00.000Z")
  });
  const provenance =
    result.period.bigNumberProvenance.accumulatedGenerationGwh;

  assert.equal(provenance.freshness?.state, "historical");
  assert.equal(
    provenance.freshness?.sourceTimestamp,
    "2026-07-28T00:00:00.000Z"
  );
  assert.equal(provenance.syncState, "stale");
});

test("no factory selection does not fall back to the combined generation counter", () => {
  const database = getDatabase();
  database.prepare("DELETE FROM live_metric_values").run();
  database.prepare("DELETE FROM cumulative_counters").run();
  database
    .prepare(`
      INSERT INTO cumulative_counters (metric_key, total_value, last_updated, reset_count)
      VALUES ('generation', 13645876, '2026-06-26T15:37:55+08:00', 0)
    `)
    .run();
  setFactoryPlaybackSelection(false, false);

  const result = readSustainabilityStory("lifetime", { applyDisplayOverrides: false });

  assert.equal(result.period.bigNumbers.accumulatedGenerationGwh, null);
  assert.equal(result.period.bigNumbers.accumulatedCarbonReductionTons, null);
  assert.equal(result.period.bigNumberProvenance.accumulatedGenerationGwh.source, "未選擇廠區");
  assert.equal(result.period.bigNumberProvenance.accumulatedGenerationGwh.updatedAt, null);
});

test("stored editorial provenance cannot override the runtime factory scope", () => {
  const database = getDatabase();
  database.prepare("DELETE FROM cumulative_counters").run();
  database.prepare("DELETE FROM live_metric_values").run();
  insertFactoryGenerationSources({});
  setFactoryPlaybackSelection(true, false);
  const configuredStory = structuredClone(story);
  configuredStory.periods.lifetime!.bigNumberProvenance = {
    accumulatedGenerationGwh: {
      label: "舊來源",
      source: "legacy combined counter",
      sourceClass: "runtime-aggregate",
      syncState: "fresh",
      updatedAt: "2026-01-01T00:00:00.000Z"
    }
  };
  saveSustainabilityStory(configuredStory);

  const result = readSustainabilityStory("lifetime", {
    applyDisplayOverrides: false,
    now: new Date("2026-06-26T15:38:20+08:00")
  });

  assert.equal(result.period.bigNumberProvenance.accumulatedGenerationGwh.source, "CL MQTT");
  assert.equal(
    result.period.bigNumberProvenance.accumulatedGenerationGwh.updatedAt,
    "2026-06-26T15:38:10+08:00"
  );
});
