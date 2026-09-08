import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import Database from "better-sqlite3";
import type { MeterSourceDefinition, SiteEnergyProfileV1 } from "@solar-display/shared";
import { applyProfile, previewProfile } from "./siteEnergyProfileService.js";
import { saveMeterSource } from "./meterSourceCatalogService.js";

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

test("E6 preview captures deduplicated selected sources from total, departments and meter-set share basis", () => {
  const database = createDatabase();
  registerSource(database);
  registerSource(database, {
    channelId: "kn-department",
    epochId: "department-epoch",
    meterId: "kn-department",
    metricKey: "departmentEnergy"
  });
  registerSource(database, {
    channelId: "kn-share",
    epochId: "share-epoch",
    meterId: "kn-share",
    metricKey: "shareEnergy"
  });
  const selectedDraft: SiteEnergyProfileV1 = {
    ...draft,
    departments: [{
      accountingIncluded: true,
      coverageReview: "reviewed",
      departmentId: "assembly",
      memberChannelIds: ["kn-main", "kn-department"],
      nameZh: "組裝"
    }],
    shareBasis: { kind: "meter-set", memberChannelIds: ["kn-share"] }
  };
  const preview = previewProfile(database, "kn", {
    draft: selectedDraft,
    expectedRevision: 0,
    periodSelection: { kind: "month", month: 9, year: 2026 }
  });
  const row = database.prepare("SELECT source_snapshot_json FROM profile_preview_tokens WHERE preview_token = ?")
    .get(preview.previewToken) as { source_snapshot_json: string };
  const snapshots = JSON.parse(row.source_snapshot_json) as Array<Record<string, unknown>>;
  assert.deepEqual(snapshots.map((snapshot) => snapshot.channelId), ["kn-department", "kn-main", "kn-share"]);
  assert.equal(snapshots.every((snapshot) => !Object.hasOwn(snapshot, "displayNameZh") && !Object.hasOwn(snapshot, "displayNameEn")), true);
  assert.equal(snapshots.find((snapshot) => snapshot.channelId === "kn-main")?.boundaryMaxAgeSeconds, 300);
  database.close();
});

test("E6 preview checks department and meter-set share references", () => {
  const database = createDatabase();
  registerSource(database);
  const selectedDraft: SiteEnergyProfileV1 = {
    ...draft,
    departments: [{
      accountingIncluded: true,
      coverageReview: "reviewed",
      departmentId: "assembly",
      memberChannelIds: ["missing-department"],
      nameZh: "組裝"
    }],
    shareBasis: { kind: "meter-set", memberChannelIds: ["missing-share"] }
  };
  assert.throws(
    () => previewProfile(database, "kn", {
      draft: selectedDraft,
      expectedRevision: 0,
      periodSelection: { kind: "month", month: 9, year: 2026 }
    }),
    (error: Error & { code?: string; statusCode?: number; fields?: Array<{ field: string; message: string }> }) =>
      error.code === "PROFILE_SOURCE_UNAVAILABLE"
      && error.statusCode === 422
      && error.fields?.some((field) => field.field === "departments[0].memberChannelIds[0]") === true
      && error.fields?.some((field) => field.field === "shareBasis.memberChannelIds[0]") === true
  );
  assert.equal((database.prepare("SELECT COUNT(*) AS count FROM profile_preview_tokens").get() as { count: number }).count, 0);
  database.close();
});

test("E6 preview rejects malformed department and meter-set memberships", () => {
  const database = createDatabase();
  registerSource(database);
  const malformedDraft = {
    ...draft,
    departments: [{
      accountingIncluded: true,
      coverageReview: "reviewed",
      departmentId: "assembly",
      memberChannelIds: "not-an-array",
      nameZh: "組裝"
    }],
    shareBasis: { kind: "meter-set" }
  } as unknown as SiteEnergyProfileV1;
  assert.throws(
    () => previewProfile(database, "kn", {
      draft: malformedDraft,
      expectedRevision: 0,
      periodSelection: { kind: "month", month: 9, year: 2026 }
    }),
    (error: Error & { code?: string; statusCode?: number; fields?: Array<{ field: string; message: string }> }) =>
      error.code === "PROFILE_SOURCE_UNAVAILABLE"
      && error.statusCode === 422
      && error.fields?.some((field) => field.field === "departments[0].memberChannelIds") === true
      && error.fields?.some((field) => field.field === "shareBasis.memberChannelIds") === true
  );
  database.close();
});

test("E6 preview rejects missing, wrong-scope and power-gauge sources", () => {
  const cases: Array<{ name: string; source?: Partial<MeterSourceDefinition> }> = [
    { name: "missing" },
    { name: "wrong scope", source: { metricScope: "cl" } },
    { name: "power gauge", source: { measurementKind: "power-gauge", inputUnit: "kW" } }
  ];
  for (const sourceCase of cases) {
    const database = createDatabase();
    if (sourceCase.source) registerSource(database, sourceCase.source);
    assert.throws(
      () => previewProfile(database, "kn", {
        draft,
        expectedRevision: 0,
        periodSelection: { kind: "month", month: 9, year: 2026 }
      }),
      (error: Error & { code?: string; statusCode?: number; fields?: Array<{ field: string; message: string }> }) =>
        error.code === "PROFILE_SOURCE_UNAVAILABLE"
        && error.statusCode === 422
        && error.fields?.some((field) => field.field === "siteTotal.memberChannelIds[0]") === true,
      sourceCase.name
    );
    assert.equal((database.prepare("SELECT COUNT(*) AS count FROM profile_preview_tokens").get() as { count: number }).count, 0, sourceCase.name);
    database.close();
  }
});

test("E6 apply rejects selected source changes without profile or receipt writes", () => {
  const changes: Array<{ name: string; update: (database: Database.Database) => void }> = [
    {
      name: "source revision",
      update: (database) => saveMeterSource(database, { ...source, sourceRevision: 2 }, {
        actor: "management",
        reason: "transport-revision",
        transportChanged: true
      })
    },
    {
      name: "meter identity",
      update: (database) => saveMeterSource(database, { ...source, meterId: "kn-replacement", sourceRevision: 2, epochId: "epoch-2" }, {
        actor: "management",
        reason: "replace-meter"
      })
    },
    {
      name: "epoch",
      update: (database) => saveMeterSource(database, { ...source, sourceRevision: 2, epochId: "epoch-2" }, {
        actor: "management",
        reason: "new-epoch"
      })
    },
    {
      name: "disabled",
      update: (database) => saveMeterSource(database, { ...source, enabled: false }, {
        actor: "management",
        reason: "disable-source"
      })
    },
    {
      name: "unreviewed",
      update: (database) => saveMeterSource(database, { ...source, reviewStatus: "needs-review" }, {
        actor: "management",
        reason: "review-source"
      })
    },
    {
      name: "cadence",
      update: (database) => saveMeterSource(database, { ...source, expectedCadenceSeconds: 120 }, {
        actor: "management",
        reason: "cadence-source"
      })
    },
    {
      name: "boundary age",
      update: (database) => saveMeterSource(database, { ...source, boundaryMaxAgeSeconds: 600 }, {
        actor: "management",
        reason: "boundary-source"
      })
    }
  ];

  for (const change of changes) {
    const database = createDatabase();
    registerSource(database);
    const preview = previewProfile(database, "kn", {
      draft,
      expectedRevision: 0,
      periodSelection: { kind: "month", month: 9, year: 2026 }
    });
    change.update(database);
    const before = {
      profiles: (database.prepare("SELECT COUNT(*) AS count FROM site_energy_profiles").get() as { count: number }).count,
      receipts: (database.prepare("SELECT COUNT(*) AS count FROM profile_apply_receipts").get() as { count: number }).count
    };
    assert.throws(
      () => applyProfile(database, "kn", {
        draft,
        expectedRevision: 0,
        idempotencyKey: `source-conflict-${change.name}`,
        previewToken: preview.previewToken
      }),
      (error: Error & { code?: string; statusCode?: number }) => error.code === "PROFILE_SOURCE_CONFLICT" && error.statusCode === 409,
      change.name
    );
    assert.deepEqual({
      profiles: (database.prepare("SELECT COUNT(*) AS count FROM site_energy_profiles").get() as { count: number }).count,
      receipts: (database.prepare("SELECT COUNT(*) AS count FROM profile_apply_receipts").get() as { count: number }).count
    }, before, change.name);
    database.close();
  }
});

test("E6 display-name-only and unrelated scope/source changes do not invalidate apply", () => {
  const database = createDatabase();
  registerSource(database);
  registerSource(database, {
    channelId: "kn-other",
    epochId: "other-epoch",
    meterId: "kn-other",
    metricKey: "otherEnergy"
  });
  registerSource(database, {
    channelId: "cl-main",
    epochId: "cl-epoch",
    meterId: "cl-main",
    metricKey: "consumptionEnergy",
    metricScope: "cl"
  });
  const preview = previewProfile(database, "kn", {
    draft,
    expectedRevision: 0,
    periodSelection: { kind: "month", month: 9, year: 2026 }
  });
  saveMeterSource(database, { ...source, displayNameZh: "新名稱" }, {
    actor: "management",
    reason: "rename-source"
  });
  saveMeterSource(database, {
    ...source,
    channelId: "kn-other",
    epochId: "other-epoch",
    meterId: "kn-other",
    metricKey: "otherEnergy",
    expectedCadenceSeconds: 120
  }, {
    actor: "management",
    reason: "unrelated-channel"
  });
  saveMeterSource(database, {
    ...source,
    channelId: "cl-main",
    epochId: "cl-epoch",
    meterId: "cl-main",
    metricKey: "consumptionEnergy",
    metricScope: "cl",
    displayNameZh: "CL 名稱",
    expectedCadenceSeconds: 120
  }, {
    actor: "management",
    reason: "unrelated-scope"
  });
  const applied = applyProfile(database, "kn", {
    draft,
    expectedRevision: 0,
    idempotencyKey: "name-and-scope-isolation",
    previewToken: preview.previewToken
  });
  assert.equal(applied.revision, 1);
  database.close();
});

test("E6 legacy preview tokens require a new source review and write nothing", () => {
  const database = createDatabase();
  registerSource(database);
  const preview = previewProfile(database, "kn", {
    draft,
    expectedRevision: 0,
    periodSelection: { kind: "month", month: 9, year: 2026 }
  });
  database.prepare("UPDATE profile_preview_tokens SET source_snapshot_json = NULL WHERE preview_token = ?").run(preview.previewToken);
  assert.throws(
    () => applyProfile(database, "kn", {
      draft,
      expectedRevision: 0,
      idempotencyKey: "legacy-review",
      previewToken: preview.previewToken
    }),
    (error: Error & { code?: string; statusCode?: number }) => error.code === "PROFILE_SOURCE_REVIEW_REQUIRED" && error.statusCode === 409
  );
  assert.equal((database.prepare("SELECT COUNT(*) AS count FROM site_energy_profiles").get() as { count: number }).count, 0);
  assert.equal((database.prepare("SELECT COUNT(*) AS count FROM profile_apply_receipts").get() as { count: number }).count, 0);
  database.close();
});

test("E6 successful idempotent retry replays after selected source changes", () => {
  const database = createDatabase();
  registerSource(database);
  const preview = previewProfile(database, "kn", {
    draft,
    expectedRevision: 0,
    periodSelection: { kind: "month", month: 9, year: 2026 }
  });
  const input = {
    draft,
    expectedRevision: 0,
    idempotencyKey: "replay-after-source-change",
    previewToken: preview.previewToken
  };
  const first = applyProfile(database, "kn", input);
  saveMeterSource(database, { ...source, sourceRevision: 2 }, {
    actor: "management",
    reason: "source-refresh",
    transportChanged: true
  });
  assert.deepEqual(applyProfile(database, "kn", input), first);
  assert.equal((database.prepare("SELECT COUNT(*) AS count FROM site_energy_profiles").get() as { count: number }).count, 1);
  assert.equal((database.prepare("SELECT COUNT(*) AS count FROM profile_apply_receipts").get() as { count: number }).count, 1);
  database.close();
});
