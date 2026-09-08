import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import Database from "better-sqlite3";
import type { MeterSourceDefinition, SiteEnergyProfileV1 } from "@solar-display/shared";
import { seedAcceptedReading } from "./meterReadingService.js";
import { resolvePersistedPeriodConsumption } from "./periodConsumptionService.js";
import { resolvePersistedDepartmentShares } from "./departmentSharesService.js";

const MIGRATIONS = [
  "033_freshness_policy.sql",
  "001_init.sql",
  "040_meter_reading_contracts.sql",
  "046_meter_reading_evidence.sql",
  "041_site_energy_profiles.sql",
  "045_profile_apply_guards.sql",
  "042_consumption_projections.sql",
  "047_projection_activation_context.sql",
  "048_meter_source_lifecycle.sql",
  "049_meter_source_boundary_age.sql"
];

function createDatabase() {
  const database = new Database(":memory:");
  for (const migration of MIGRATIONS) {
    database.exec(readFileSync(resolve(process.cwd(), `src/db/migrations/${migration}`), "utf8"));
  }
  return database;
}

function insertProfile(database: Database.Database, revision: number, effectiveFrom: string, active: boolean, profile: {
  departments: SiteEnergyProfileV1["departments"];
  shareBasis: SiteEnergyProfileV1["shareBasis"];
  siteTotalChannelIds: string[];
}) {
  database.prepare(`
    INSERT INTO site_energy_profiles (
      profile_id, metric_scope, revision, schema_version, site_time_zone, status,
      effective_from, site_total_json, departments_json, share_basis_json, active, created_at
    ) VALUES ('kn-energy', 'kn', ?, 1, 'Asia/Taipei', 'ready', ?, ?, ?, ?, ?, '2026-01-01T00:00:00.000Z')
  `).run(
    revision,
    effectiveFrom,
    JSON.stringify({
      coverageReview: "reviewed",
      kind: "meter-set",
      label: "觀音總錶",
      memberChannelIds: profile.siteTotalChannelIds
    }),
    JSON.stringify(profile.departments),
    JSON.stringify(profile.shareBasis),
    active ? 1 : 0
  );
}

function department(departmentId: string, nameZh: string, memberChannelIds: string[]): SiteEnergyProfileV1["departments"][number] {
  return { accountingIncluded: true, coverageReview: "reviewed", departmentId, memberChannelIds, nameZh };
}

function source(channelId: string): MeterSourceDefinition {
  return {
    channelId,
    enabled: true,
    energyFlowRole: "consumption",
    epochId: "epoch-1",
    expectedCadenceSeconds: 60,
    inputUnit: "kWh",
    measurementKind: "cumulative-energy",
    meterId: channelId,
    metricKey: channelId,
    metricScope: "kn",
    reviewStatus: "reviewed",
    scaleDecimal: "1",
    sourceRevision: 1,
    sourceTimestampTimeZone: "UTC",
    timestampPolicy: "source-required"
  };
}

const MONTH_START = "2026-08-31T16:00:00Z";
const MONTH_END = "2026-09-30T16:00:00Z";
const SEPTEMBER = { kind: "month" as const, month: 9, year: 2026 };
const SEPTEMBER_WINDOW = { kind: "period" as const, period: SEPTEMBER };

function seedMonthDelta(database: Database.Database, channelId: string, opening: string, closing: string) {
  seedAcceptedReading(database, source(channelId), opening, MONTH_START, MONTH_START);
  seedAcceptedReading(database, source(channelId), closing, MONTH_END, MONTH_END);
}

test("R6 explicit meter-set denominator is resolved even when it belongs to no other set", () => {
  const database = createDatabase();
  insertProfile(database, 1, "2026-01-01T00:00:00+08:00", true, {
    departments: [department("dept-b", "B 部門", ["kn-b"])],
    shareBasis: { kind: "meter-set", label: "自訂分母", memberChannelIds: ["kn-c"] },
    siteTotalChannelIds: ["kn-main"]
  });
  seedMonthDelta(database, "kn-main", "0", "1000");
  seedMonthDelta(database, "kn-b", "0", "100");
  seedMonthDelta(database, "kn-c", "0", "400");

  const shares = resolvePersistedDepartmentShares(database, "kn", SEPTEMBER_WINDOW, MONTH_END);
  assert.equal(shares?.quality, "exact");
  assert.equal(shares?.shares[0]?.valueKwh, "100");
  assert.equal(shares?.shares[0]?.ratio, 0.25);
  assert.notEqual(shares?.shares[0]?.ratio, 0.1);
  assert.equal(shares?.unallocatedKwh, "300");

  const siteTotal = resolvePersistedPeriodConsumption(database, "kn", SEPTEMBER, MONTH_END);
  assert.equal(siteTotal.valueKwh, "1000");
  assert.equal(shares?.profileRevision, siteTotal.profileRevision);
  assert.equal(shares?.periodStart, siteTotal.periodStart);
  assert.equal(shares?.calculatedThrough, siteTotal.calculatedThrough);
  database.close();
});

test("R6 missing custom denominator evidence stays unavailable without a denominator fallback", () => {
  const database = createDatabase();
  insertProfile(database, 1, "2026-01-01T00:00:00+08:00", true, {
    departments: [department("dept-b", "B 部門", ["kn-b"])],
    shareBasis: { kind: "meter-set", label: "自訂分母", memberChannelIds: ["kn-c"] },
    siteTotalChannelIds: ["kn-main"]
  });
  seedMonthDelta(database, "kn-main", "0", "1000");
  seedMonthDelta(database, "kn-b", "0", "100");
  seedAcceptedReading(database, source("kn-c"), "400", MONTH_END, MONTH_END);

  const shares = resolvePersistedDepartmentShares(database, "kn", SEPTEMBER_WINDOW, MONTH_END);
  assert.equal(shares?.quality, "unavailable");
  assert.equal(shares?.shares[0]?.ratio, null);
  assert.ok(shares?.issues?.some((issue) => issue.startsWith("MISSING_BASELINE:kn-c")));
  database.close();
});

test("R6 a channel shared by the denominator and a department is resolved once without changing membership", () => {
  const database = createDatabase();
  insertProfile(database, 1, "2026-01-01T00:00:00+08:00", true, {
    departments: [department("dept-b", "B 部門", ["kn-b"]), department("dept-c", "C 部門", ["kn-c"])],
    shareBasis: { kind: "meter-set", label: "自訂分母", memberChannelIds: ["kn-b", "kn-c"] },
    siteTotalChannelIds: ["kn-main"]
  });
  seedMonthDelta(database, "kn-main", "0", "1000");
  seedMonthDelta(database, "kn-b", "0", "100");
  seedMonthDelta(database, "kn-c", "0", "300");

  const shares = resolvePersistedDepartmentShares(database, "kn", SEPTEMBER_WINDOW, MONTH_END);
  assert.equal(shares?.quality, "exact");
  assert.deepEqual(shares?.shares.map((share) => share.ratio), [0.25, 0.75]);
  assert.equal(shares?.unallocatedKwh, "0");
  database.close();
});

test("R5 a mid-month membership change cannot claim an exact full-month ratio", () => {
  const database = createDatabase();
  const layout = {
    departments: [department("dept-b", "B 部門", ["kn-b"])],
    shareBasis: { kind: "site-main" as const },
    siteTotalChannelIds: ["kn-main"]
  };
  insertProfile(database, 1, "2026-01-01T00:00:00+08:00", false, layout);
  insertProfile(database, 2, "2026-09-15T00:00:00+08:00", true, layout);
  seedMonthDelta(database, "kn-main", "0", "1000");
  seedMonthDelta(database, "kn-b", "0", "100");

  const shares = resolvePersistedDepartmentShares(database, "kn", SEPTEMBER_WINDOW, MONTH_END);
  const siteTotal = resolvePersistedPeriodConsumption(database, "kn", SEPTEMBER, MONTH_END);
  assert.equal(siteTotal.quality, "partial");
  assert.equal(shares?.quality, "partial");
  assert.deepEqual(shares?.shares.map((share) => share.ratio), [null]);
  assert.ok(shares?.issues?.includes("PROFILE_REVISION_BOUNDARY"));
  assert.deepEqual(shares?.profileRevisionBoundaries?.map((boundary) => boundary.profileRevision), [1, 2]);
  assert.equal(shares?.profileRevisionBoundaries?.[1]?.effectiveFrom, "2026-09-15T00:00:00+08:00");
  database.close();
});

test("R5 a closed month keeps the membership effective for that period", () => {
  const database = createDatabase();
  insertProfile(database, 1, "2026-01-01T00:00:00+08:00", false, {
    departments: [department("dept-b", "B 部門", ["kn-b"])],
    shareBasis: { kind: "site-main" },
    siteTotalChannelIds: ["kn-main"]
  });
  insertProfile(database, 2, "2026-10-01T00:00:00+08:00", true, {
    departments: [department("dept-b", "B 部門", ["kn-x"])],
    shareBasis: { kind: "site-main" },
    siteTotalChannelIds: ["kn-main"]
  });
  seedMonthDelta(database, "kn-main", "0", "1000");
  seedMonthDelta(database, "kn-b", "0", "250");

  const shares = resolvePersistedDepartmentShares(database, "kn", SEPTEMBER_WINDOW, MONTH_END);
  assert.equal(shares?.profileRevision, 1);
  assert.equal(shares?.quality, "exact");
  assert.equal(shares?.shares[0]?.valueKwh, "250");
  assert.equal(shares?.shares[0]?.ratio, 0.25);
  database.close();
});

test("R5 upstream estimated boundaries survive share aggregation", () => {
  const database = createDatabase();
  insertProfile(database, 1, "2026-01-01T00:00:00+08:00", true, {
    departments: [department("dept-b", "B 部門", ["kn-b"])],
    shareBasis: { kind: "site-main" },
    siteTotalChannelIds: ["kn-main"]
  });
  seedMonthDelta(database, "kn-main", "0", "1000");
  seedAcceptedReading(database, source("kn-b"), "0", "2026-08-31T15:59:00Z", "2026-08-31T15:59:00Z");
  seedAcceptedReading(database, source("kn-b"), "250", MONTH_END, MONTH_END);

  const shares = resolvePersistedDepartmentShares(database, "kn", SEPTEMBER_WINDOW, MONTH_END);
  assert.equal(shares?.quality, "estimated-boundary");
  assert.equal(shares?.shares[0]?.ratio, 0.25);
  assert.equal(shares?.freshnessState, resolvePersistedPeriodConsumption(database, "kn", SEPTEMBER, MONTH_END).freshnessState);
  database.close();
});

test("R6 a site-total channel outside the denominator cannot degrade a proven ratio", () => {
  const database = createDatabase();
  insertProfile(database, 1, "2026-01-01T00:00:00+08:00", true, {
    departments: [department("dept-b", "B 部門", ["kn-b"])],
    shareBasis: { kind: "meter-set", label: "自訂分母", memberChannelIds: ["kn-c"] },
    siteTotalChannelIds: ["kn-main"]
  });
  seedMonthDelta(database, "kn-b", "0", "100");
  seedMonthDelta(database, "kn-c", "0", "400");

  const shares = resolvePersistedDepartmentShares(database, "kn", SEPTEMBER_WINDOW, MONTH_END);
  assert.equal(shares?.quality, "exact");
  assert.equal(shares?.shares[0]?.ratio, 0.25);
  assert.ok(!shares?.issues?.some((issue) => issue.endsWith(":kn-main")));

  const siteTotal = resolvePersistedPeriodConsumption(database, "kn", SEPTEMBER, MONTH_END);
  assert.equal(siteTotal.valueKwh, null);
  assert.equal(siteTotal.quality, "unavailable");
  database.close();
});
