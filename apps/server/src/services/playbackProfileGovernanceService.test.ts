import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after, beforeEach } from "node:test";

const tempDir = mkdtempSync(join(tmpdir(), "solar-profile-governance-"));
process.env.DATA_DIR = tempDir;
process.env.DATABASE_PATH = join(tempDir, "solar-display.sqlite");
process.env.UPLOADS_DIR = join(tempDir, "uploads", "images");
const databasePath = process.env.DATABASE_PATH;

const [
  { closeDatabaseConnection, getDatabase },
  { migrateDatabase },
  { seedDatabase },
  governance
] = await Promise.all([
  import("../db/index.js"),
  import("../db/migrate.js"),
  import("../db/seed.js"),
  import("./playbackProfileGovernanceService.js")
]);

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
  delete process.env.DATA_DIR;
  delete process.env.DATABASE_PATH;
  delete process.env.UPLOADS_DIR;
});

test("governance migration is repeatable and initializes the Default Draft", () => {
  migrateDatabase();
  const draft = governance.readPlaybackProfileDraft(
    governance.listPlaybackProfiles().find((profile) => profile.isDefault)!.id
  );

  assert.equal(draft.revision, 1);
  assert.ok(draft.pages.length >= 5);
  assert.equal(
    (getDatabase()
      .prepare("SELECT COUNT(*) AS total FROM playback_profile_versions")
      .get() as { total: number }).total,
    0
  );
});

test("stale Draft save fails with the current revision and preserves newer data", () => {
  const profile = governance.createPlaybackProfile({ name: "Operations" });
  const original = governance.readPlaybackProfileDraft(profile.id);
  const saved = governance.savePlaybackProfileDraft(profile.id, {
    expectedRevision: original.revision,
    settings: { ...original.settings, brightness: 73 },
    pages: original.pages
  });

  assert.throws(
    () => governance.savePlaybackProfileDraft(profile.id, {
      expectedRevision: original.revision,
      settings: { ...original.settings, brightness: 12 },
      pages: original.pages
    }),
    (error: unknown) => (
      error instanceof governance.PlaybackProfileGovernanceError
      && error.code === "profile_draft_conflict"
      && error.statusCode === 409
      && error.currentRevision === saved.revision
    )
  );
  assert.equal(
    governance.readPlaybackProfileDraft(profile.id).settings.brightness,
    73
  );
});

test("invalid publish appends no Version and published snapshots stay immutable", () => {
  const profile = governance.createPlaybackProfile({ name: "Published" });
  const draft = governance.readPlaybackProfileDraft(profile.id);
  governance.savePlaybackProfileDraft(profile.id, {
    expectedRevision: draft.revision,
    settings: draft.settings,
    pages: draft.pages.map((page) => ({ ...page, enabled: false }))
  });

  assert.throws(
    () => governance.publishPlaybackProfile(profile.id, {
      createdBy: "test-manager",
      expectedRevision: 2
    }),
    (error: unknown) => (
      error instanceof governance.PlaybackProfileGovernanceError
      && error.code === "profile_publish_invalid"
      && error.statusCode === 400
    )
  );
  assert.deepEqual(governance.listPlaybackProfileVersions(profile.id), []);

  const invalid = governance.readPlaybackProfileDraft(profile.id);
  const valid = governance.savePlaybackProfileDraft(profile.id, {
    expectedRevision: invalid.revision,
    settings: {
      ...invalid.settings,
      startPage: draft.pages[0]!.id
    },
    pages: draft.pages
  });
  const version1 = governance.publishPlaybackProfile(profile.id, {
    createdBy: "test-manager",
    expectedRevision: valid.revision
  });
  governance.savePlaybackProfileDraft(profile.id, {
    expectedRevision: valid.revision,
    settings: { ...valid.settings, brightness: 42 },
    pages: valid.pages
  });
  governance.publishPlaybackProfile(profile.id, {
    createdBy: "test-manager",
    expectedRevision: valid.revision + 1
  });

  assert.deepEqual(
    governance.readPlaybackProfileVersion(profile.id, version1.id),
    version1
  );
  assert.throws(() => getDatabase()
    .prepare("UPDATE playback_profile_versions SET created_by = 'tampered' WHERE id = ?")
    .run(version1.id), /immutable/u);
  assert.throws(() => getDatabase()
    .prepare("DELETE FROM playback_profile_versions WHERE id = ?")
    .run(version1.id), /immutable/u);
});

test("Draft save rejects incomplete or non-canonical payloads before persistence", () => {
  const profile = governance.createPlaybackProfile({ name: "Validated" });
  const draft = governance.readPlaybackProfileDraft(profile.id);

  assert.throws(
    () => governance.savePlaybackProfileDraft(profile.id, {
      expectedRevision: draft.revision,
      pages: draft.pages.map((page, index) => (
        index === 0 ? { ...page, pageKey: "factory-circuit" } : page
      )),
      settings: { ...draft.settings, brightness: Number.NaN }
    }),
    (error: unknown) => (
      error instanceof governance.PlaybackProfileGovernanceError
      && error.code === "profile_draft_invalid"
      && error.statusCode === 400
    )
  );
  assert.equal(
    governance.readPlaybackProfileDraft(profile.id).revision,
    draft.revision
  );
});

test("publish rejects a stale Draft revision without appending a Version", () => {
  const profile = governance.createPlaybackProfile({ name: "Publish conflict" });
  const original = governance.readPlaybackProfileDraft(profile.id);
  const current = governance.savePlaybackProfileDraft(profile.id, {
    expectedRevision: original.revision,
    pages: original.pages,
    settings: { ...original.settings, startPage: original.pages[0]!.id }
  });

  assert.throws(
    () => governance.publishPlaybackProfile(profile.id, {
      createdBy: "manager",
      expectedRevision: original.revision
    }),
    (error: unknown) => (
      error instanceof governance.PlaybackProfileGovernanceError
      && error.code === "profile_draft_conflict"
      && error.currentRevision === current.revision
    )
  );
  assert.deepEqual(governance.listPlaybackProfileVersions(profile.id), []);
});

test("publish rejects a Draft with no Effective Page in either Site Scope", () => {
  const profile = governance.createPlaybackProfile({ name: "No effective page" });
  const draft = governance.readPlaybackProfileDraft(profile.id);
  const saved = governance.savePlaybackProfileDraft(profile.id, {
    expectedRevision: draft.revision,
    pages: draft.pages,
    settings: {
      ...draft.settings,
      scheduleEnabled: true,
      scheduleEnd: "09:00",
      scheduleStart: "08:00",
      startPage: draft.pages[0]!.id
    }
  });

  assert.throws(
    () => governance.publishPlaybackProfile(profile.id, {
      createdBy: "manager",
      expectedRevision: saved.revision,
      mqttStatus: { connected: true, reason: "mock" },
      now: new Date("2026-07-30T12:00:00.000Z")
    }),
    (error: unknown) => (
      error instanceof governance.PlaybackProfileGovernanceError
      && error.code === "profile_publish_invalid"
      && error.statusCode === 400
    )
  );
  assert.deepEqual(governance.listPlaybackProfileVersions(profile.id), []);
});

test("rollback appends a new Version with immutable source linkage", () => {
  const profile = governance.createPlaybackProfile({ name: "Rollback" });
  const draft1 = governance.readPlaybackProfileDraft(profile.id);
  const validDraft1 = governance.savePlaybackProfileDraft(profile.id, {
    expectedRevision: draft1.revision,
    settings: { ...draft1.settings, startPage: draft1.pages[0]!.id },
    pages: draft1.pages
  });
  const version1 = governance.publishPlaybackProfile(profile.id, {
    createdBy: "publisher",
    expectedRevision: validDraft1.revision
  });
  governance.savePlaybackProfileDraft(profile.id, {
    expectedRevision: validDraft1.revision,
    settings: { ...validDraft1.settings, brightness: 55 },
    pages: validDraft1.pages
  });
  const version2 = governance.publishPlaybackProfile(profile.id, {
    createdBy: "publisher",
    expectedRevision: validDraft1.revision + 1
  });
  const rollback = governance.rollbackPlaybackProfile(profile.id, {
    createdBy: "rollback-manager",
    versionId: version1.id
  });

  assert.equal(rollback.versionNumber, 3);
  assert.equal(rollback.rollbackFromVersionId, version1.id);
  assert.deepEqual(rollback.snapshot, version1.snapshot);
  assert.equal(
    governance.readPlaybackProfileVersion(profile.id, version2.id).versionNumber,
    2
  );
});
