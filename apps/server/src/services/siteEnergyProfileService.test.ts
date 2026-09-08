import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import Database from "better-sqlite3";
import { reassignmentDoesNotTouchSource, type SiteEnergyProfileV1 } from "@solar-display/shared";
import { applyProfile, getActiveProfile, previewProfile } from "./siteEnergyProfileService.js";
import { readLiveState, seedAcceptedReading } from "./meterReadingService.js";
import { saveMeterSource } from "./meterSourceCatalogService.js";
import type { MeterSourceDefinition } from "@solar-display/shared";

function createDatabase() {
  const database = new Database(":memory:");
  database.exec(readFileSync(resolve(process.cwd(), "src/db/migrations/033_freshness_policy.sql"), "utf8"));
  database.exec(readFileSync(resolve(process.cwd(), "src/db/migrations/040_meter_reading_contracts.sql"), "utf8"));
  database.exec(readFileSync(resolve(process.cwd(), "src/db/migrations/046_meter_reading_evidence.sql"), "utf8"));
  database.exec(readFileSync(resolve(process.cwd(), "src/db/migrations/041_site_energy_profiles.sql"), "utf8"));
  database.exec(readFileSync(resolve(process.cwd(), "src/db/migrations/045_profile_apply_guards.sql"), "utf8"));
  database.exec(readFileSync(resolve(process.cwd(), "src/db/migrations/048_meter_source_lifecycle.sql"), "utf8"));
  database.exec(readFileSync(resolve(process.cwd(), "src/db/migrations/049_meter_source_boundary_age.sql"), "utf8"));
  database.exec(readFileSync(resolve(process.cwd(), "src/db/migrations/050_profile_source_review.sql"), "utf8"));
  database.exec(readFileSync(resolve(process.cwd(), "src/db/migrations/051_profile_preview_evidence.sql"), "utf8"));
  return database;
}

const draft: SiteEnergyProfileV1 = {
  departments: [],
  effectiveFrom: "2026-09-01T00:00:00+08:00",
  metricScope: "kn",
  profileId: "kn-energy",
  revision: 0,
  schemaVersion: 1,
  shareBasis: { kind: "site-main" },
  siteTimeZone: "Asia/Taipei",
  siteTotal: {
    coverageReview: "reviewed",
    kind: "meter-set",
    label: "觀音總錶",
    memberChannelIds: ["kn-main"]
  },
  status: "ready"
};

const source: MeterSourceDefinition = {
  channelId: "kn-main",
  enabled: true,
  energyFlowRole: "consumption",
  epochId: "epoch-1",
  expectedCadenceSeconds: 60,
  inputUnit: "kWh",
  measurementKind: "cumulative-energy",
  meterId: "kn-main",
  metricKey: "consumptionEnergy",
  metricScope: "kn",
  reviewStatus: "reviewed",
  scaleDecimal: "1",
  sourceRevision: 1,
  sourceTimestampTimeZone: "UTC",
  timestampPolicy: "source-required"
};

function registerSource(database: Database.Database, overrides: Partial<MeterSourceDefinition> = {}) {
  return saveMeterSource(database, { ...source, ...overrides } as MeterSourceDefinition);
}

test("E6 apply creates a new profile revision without touching E1 source state", () => {
  const database = createDatabase();
  registerSource(database);
  seedAcceptedReading(database, source, "10100", "2026-08-31T16:00:00Z", "2026-08-31T16:00:01.000Z");
  const before = readLiveState(database, source);
  const preview = previewProfile(database, "kn", {
    draft,
    expectedRevision: 0,
    periodSelection: { kind: "month", month: 9, year: 2026 }
  });
  const applied = applyProfile(database, "kn", {
    draft,
    expectedRevision: 0,
    idempotencyKey: "k1",
    previewToken: preview.previewToken
  });
  assert.equal(applied.revision, 1);
  assert.equal(getActiveProfile(database, "kn")?.siteTimeZone, "Asia/Taipei");
  const after = readLiveState(database, source);
  assert.deepEqual(after, before);
  assert.equal(reassignmentDoesNotTouchSource(
    { baseline: before?.baseline_kwh ?? "", epochId: source.epochId, sourceRevision: source.sourceRevision },
    { baseline: after?.baseline_kwh ?? "", epochId: source.epochId, sourceRevision: source.sourceRevision }
  ), true);
  database.close();
});

test("E6 preview rejects caller timezone override", () => {
  const database = createDatabase();
  assert.throws(
    () => previewProfile(database, "kn", {
      draft,
      expectedRevision: 0,
      periodSelection: { kind: "month", month: 9, year: 2026 },
      timeZone: "UTC"
    } as never),
    /CALENDAR_OVERRIDE_REJECTED|期間邊界/
  );
  database.close();
});

test("E6 rejects cross-site tokens and rolls back failed activation", () => {
  const database = createDatabase();
  registerSource(database);
  const request = { draft, expectedRevision: 0, periodSelection: { kind: "month" as const, month: 9, year: 2026 } };
  const preview = previewProfile(database, "kn", request);
  const input = { draft, expectedRevision: 0, idempotencyKey: "scope-guard", previewToken: preview.previewToken };
  assert.throws(() => applyProfile(database, "cl", input), /PROFILE_SCOPE_MISMATCH/);
  const first = applyProfile(database, "kn", input);
  const { readiness: _readiness, activationAsOf: _activationAsOf, reviewAsOf: _reviewAsOf, ...persisted } = first;
  assert.deepEqual(applyProfile(database, "kn", input), first);
  const reordered = JSON.parse(JSON.stringify(input, (_key, value: unknown) => value && typeof value === "object" && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value).reverse()) : value));
  assert.deepEqual(applyProfile(database, "kn", reordered), first);
  assert.throws(() => applyProfile(database, "kn", { ...input, draft: { ...draft, status: "incomplete" } }), /IDEMPOTENCY_CONFLICT/);
  const next = previewProfile(database, "kn", { ...request, expectedRevision: 1 });
  database.exec("CREATE TRIGGER fail_profile BEFORE INSERT ON site_energy_profiles BEGIN SELECT RAISE(ABORT, 'injected failure'); END");
  assert.throws(() => applyProfile(database, "kn", { ...input, expectedRevision: 1, idempotencyKey: "failure", previewToken: next.previewToken }), /injected failure/);
  assert.deepEqual(getActiveProfile(database, "kn"), persisted);
  database.close();
});

test("E6 preview calculator receives recursively frozen snapshots", () => {
  const database = createDatabase();
  registerSource(database);
  const request = {
    draft: structuredClone(draft),
    expectedRevision: 0,
    periodSelection: { kind: "month" as const, year: 2026, month: 9 }
  };
  assert.throws(
    () => previewProfile(database, "kn", request, (profile, period) => {
      assert.equal(Object.isFrozen(profile), true);
      assert.equal(Object.isFrozen(profile.siteTotal), true);
      assert.equal(Object.isFrozen(profile.siteTotal.memberChannelIds), true);
      assert.equal(Object.isFrozen(period), true);
      profile.siteTotal.memberChannelIds.push("mutated");
      const result = { profileRevision: profile.revision, quality: "unavailable" as const, siteTimeZone: profile.siteTimeZone, valueKwh: null };
      return { period: result, basis: { memberChannelIds: profile.siteTotal.memberChannelIds, result }, departments: [] };
    }),
    TypeError
  );
  assert.equal((database.prepare("SELECT COUNT(*) AS count FROM profile_preview_tokens").get() as { count: number }).count, 0);
  database.close();
});

test("E6 calculator failure leaves no preview token", () => {
  const database = createDatabase();
  registerSource(database);
  assert.throws(
    () => previewProfile(database, "kn", {
      draft: structuredClone(draft),
      expectedRevision: 0,
      periodSelection: { kind: "month", year: 2026, month: 9 }
    }, () => {
      throw new Error("calculator failed");
    }),
    /calculator failed/
  );
  assert.equal((database.prepare("SELECT COUNT(*) AS count FROM profile_preview_tokens").get() as { count: number }).count, 0);
  database.close();
});

test("E6 preview snapshots draft and period before calculator closure mutation", () => {
  const database = createDatabase();
  registerSource(database);
  const request = {
    draft: structuredClone(draft),
    expectedRevision: 0,
    periodSelection: { kind: "month" as const, year: 2026, month: 9 }
  };
  const preview = previewProfile(database, "kn", request, (profile, period) => {
    request.draft.siteTotal.memberChannelIds.push("external-mutation");
    request.draft.siteTimeZone = "UTC";
    request.periodSelection.month = 12;
    request.expectedRevision = 99;
    assert.equal(profile.siteTimeZone, draft.siteTimeZone);
    assert.deepEqual(period, { kind: "month", year: 2026, month: 9 });
    const result = { profileRevision: profile.revision, quality: "unavailable" as const, siteTimeZone: profile.siteTimeZone, valueKwh: null };
    return { period: result, basis: { memberChannelIds: profile.siteTotal.memberChannelIds, result }, departments: [] };
  });
  const stored = database.prepare("SELECT draft_json FROM profile_preview_tokens WHERE preview_token = ?")
    .get(preview.previewToken) as { draft_json: string };
  assert.notEqual(preview.profile, request.draft);
  assert.deepEqual(preview.profile, draft);
  assert.deepEqual(JSON.parse(stored.draft_json), draft);
  assert.equal((database.prepare("SELECT expected_revision FROM profile_preview_tokens WHERE preview_token = ?")
    .get(preview.previewToken) as { expected_revision: number }).expected_revision, 0);
  assert.equal(preview.siteTimeZone, draft.siteTimeZone);
  const applied = applyProfile(database, "kn", {
    draft: preview.profile,
    expectedRevision: 0,
    idempotencyKey: "snapshot-apply",
    previewToken: preview.previewToken
  });
  assert.equal(applied.revision, 1);
  database.close();
});
