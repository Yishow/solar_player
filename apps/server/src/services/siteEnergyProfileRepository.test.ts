import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import Database from "better-sqlite3";
import type { SiteEnergyProfileV1, SiteEnergyProfileV2 } from "@solar-display/shared";
import {
  getActiveProfile,
  listPersistedProfiles,
  serializeSiteEnergyProfile
} from "./siteEnergyProfileRepository.js";

function createDatabase(databasePath = ":memory:") {
  const database = new Database(databasePath);
  database.exec(readFileSync(resolve(process.cwd(), "src/db/migrations/041_site_energy_profiles.sql"), "utf8"));
  return database;
}

function insertProfile(database: Database.Database, profile: SiteEnergyProfileV1 | SiteEnergyProfileV2, active = true) {
  const serialized = serializeSiteEnergyProfile(profile);
  database.prepare(`
    INSERT INTO site_energy_profiles (
      profile_id, metric_scope, revision, schema_version, site_time_zone, status,
      effective_from, site_total_json, departments_json, share_basis_json, active, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    profile.profileId,
    profile.metricScope,
    profile.revision,
    serialized.schemaVersion,
    profile.siteTimeZone,
    profile.status,
    profile.effectiveFrom,
    serialized.siteTotalJson,
    serialized.departmentsJson,
    serialized.shareBasisJson,
    active ? 1 : 0,
    "2026-09-16T00:00:00.000Z"
  );
}

const v1: SiteEnergyProfileV1 = {
  departments: [{
    accountingIncluded: true,
    coverageReview: "reviewed",
    departmentId: "cl-production",
    memberChannelIds: ["cl-main"],
    nameZh: "中壢產線"
  }],
  effectiveFrom: "2026-09-01T00:00:00+08:00",
  metricScope: "cl",
  profileId: "cl-energy",
  revision: 4,
  schemaVersion: 1,
  shareBasis: { kind: "site-main" },
  siteTimeZone: "Asia/Taipei",
  siteTotal: {
    coverageReview: "reviewed",
    kind: "meter-set",
    label: "中壢總錶",
    memberChannelIds: ["cl-main"]
  },
  status: "ready"
};

const v2: SiteEnergyProfileV2 = {
  departments: [],
  effectiveFrom: "2026-09-16T00:00:00+08:00",
  metricScope: "kn",
  profileId: "kn-engineering",
  providerKind: "engineering",
  revision: 7,
  schemaVersion: 2,
  shareBasis: { kind: "site-main" },
  siteTimeZone: "Asia/Taipei",
  siteTotal: {
    coverageReview: "reviewed",
    kind: "member-set",
    label: "觀音工程總量",
    members: [{
      engineeringId: "painting",
      kind: "engineering",
      mode: "daily-report",
      sourceRef: "registered-painting-source"
    }]
  },
  status: "configured-awaiting-data"
};

test("V1 persisted rows retain the existing JSON bytes and public shape", () => {
  const database = createDatabase();
  insertProfile(database, v1);

  const row = database.prepare("SELECT site_total_json, departments_json, share_basis_json FROM site_energy_profiles").get() as Record<string, string>;
  assert.equal(row.site_total_json, JSON.stringify(v1.siteTotal));
  assert.equal(row.departments_json, JSON.stringify(v1.departments));
  assert.equal(row.share_basis_json, JSON.stringify(v1.shareBasis));
  assert.deepEqual(getActiveProfile(database, "cl"), v1);
  assert.deepEqual(listPersistedProfiles(database, "cl"), [v1]);
  database.close();
});

test("V2 provider/member JSON round-trips through list/get after a restart", () => {
  const temporaryDirectory = mkdtempSync(resolve(process.cwd(), ".site-energy-profile-repository-"));
  const databasePath = resolve(temporaryDirectory, "profiles.sqlite");
  try {
    const firstConnection = createDatabase(databasePath);
    insertProfile(firstConnection, v2);
    const stored = firstConnection.prepare("SELECT schema_version, site_total_json FROM site_energy_profiles").get() as {
      schema_version: number;
      site_total_json: string;
    };
    assert.equal(stored.schema_version, 2);
    assert.deepEqual(JSON.parse(stored.site_total_json), {
      ...v2.siteTotal,
      providerKind: "engineering"
    });
    assert.deepEqual(getActiveProfile(firstConnection, "kn"), v2);
    assert.deepEqual(listPersistedProfiles(firstConnection, "kn"), [v2]);
    firstConnection.close();

    const restartedConnection = createDatabase(databasePath);
    assert.deepEqual(getActiveProfile(restartedConnection, "kn"), v2);
    assert.deepEqual(listPersistedProfiles(restartedConnection, "kn"), [v2]);
    restartedConnection.close();
  } finally {
    rmSync(temporaryDirectory, { force: true, recursive: true });
  }
});

test("unknown persisted schema versions fail closed for get and list", () => {
  const database = createDatabase();
  database.prepare(`
    INSERT INTO site_energy_profiles (
      profile_id, metric_scope, revision, schema_version, site_time_zone, status,
      effective_from, site_total_json, departments_json, share_basis_json, active, created_at
    ) VALUES ('unknown', 'kn', 1, 99, 'Asia/Taipei', 'ready', ?, '{}', '[]', '{}', 1, ?)
  `).run("2026-09-16T00:00:00+08:00", "2026-09-16T00:00:00.000Z");

  const assertUnsupported = (read: () => unknown) => {
    assert.throws(read, (error: unknown) => {
      assert.equal((error as { code?: string }).code, "PROFILE_VERSION_UNSUPPORTED");
      assert.equal((error as { field?: string }).field, "schemaVersion");
      assert.match((error as Error).message, /99/);
      return true;
    });
  };
  assertUnsupported(() => getActiveProfile(database, "kn"));
  assertUnsupported(() => listPersistedProfiles(database, "kn"));
  database.close();
});
