import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after, beforeEach } from "node:test";

const tempDir = mkdtempSync(join(tmpdir(), "solar-profile-rollout-"));
process.env.DATA_DIR = tempDir;
process.env.DATABASE_PATH = join(tempDir, "solar-display.sqlite");
process.env.UPLOADS_DIR = join(tempDir, "uploads", "images");
const databasePath = process.env.DATABASE_PATH;

const [
  { closeDatabaseConnection, getDatabase },
  { migrateDatabase },
  { seedDatabase },
  governance,
  rollout
] = await Promise.all([
  import("../db/index.js"),
  import("../db/migrate.js"),
  import("../db/seed.js"),
  import("./playbackProfileGovernanceService.js"),
  import("./deviceProfileRolloutService.js")
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

function createGroupAndDevice(profileId: number, name: string) {
  const db = getDatabase();
  const groupId = Number(db.prepare(
    `INSERT INTO device_groups (
       name, enabled, site_scope, playback_profile_id
     ) VALUES (?, 1, 'cl', ?)`
  ).run(`${name} group`, profileId).lastInsertRowid);
  const deviceId = Number(db.prepare(
    `INSERT INTO devices (
       client_id, display_name, enabled, group_id
     ) VALUES (?, ?, 1, ?)`
  ).run(`${name}-client`, `${name} display`, groupId).lastInsertRowid);
  return { deviceId, groupId };
}

function publish(profileId: number) {
  const draft = governance.readPlaybackProfileDraft(profileId);
  const saved = governance.savePlaybackProfileDraft(profileId, {
    expectedRevision: draft.revision,
    pages: draft.pages,
    settings: {
      ...draft.settings,
      startPage: draft.pages[0]!.id
    }
  });
  return governance.publishPlaybackProfile(profileId, {
    createdBy: "rollout-test",
    expectedRevision: saved.revision,
    mqttStatus: { connected: true, reason: "mock" }
  });
}

test("Publish assigns enabled Groups without overwriting Device applied state", () => {
  const profile = governance.createPlaybackProfile({ name: "Rollout" });
  const { deviceId, groupId } = createGroupAndDevice(profile.id, "online");
  const version1 = publish(profile.id);
  rollout.recordDeviceProfileRolloutHeartbeat(deviceId, {
    appliedVersion: version1.id,
    desiredVersion: version1.id,
    updateState: "applied"
  });
  const version2 = publish(profile.id);

  assert.equal(rollout.readDeviceProfileRollout(deviceId).desiredVersion, version2.id);
  assert.equal(rollout.readDeviceProfileRollout(deviceId).appliedVersion, version1.id);
  assert.equal(
    (getDatabase()
      .prepare("SELECT desired_profile_version_id AS value FROM device_groups WHERE id = ?")
      .get(groupId) as { value: number }).value,
    version2.id
  );
});

test("heartbeat mismatch fails closed and Group move exposes the new desired Version", () => {
  const profileA = governance.createPlaybackProfile({ name: "A" });
  const profileB = governance.createPlaybackProfile({ name: "B" });
  const first = createGroupAndDevice(profileA.id, "moving");
  const second = createGroupAndDevice(profileB.id, "target");
  const versionA = publish(profileA.id);
  const versionB = publish(profileB.id);

  const mismatch = rollout.recordDeviceProfileRolloutHeartbeat(first.deviceId, {
    appliedVersion: null,
    desiredVersion: versionB.id,
    updateState: "waiting"
  });
  assert.equal(mismatch.updateState, "failed");
  assert.match(mismatch.lastError ?? "", /desired version mismatch/u);

  getDatabase()
    .prepare("UPDATE devices SET group_id = ? WHERE id = ?")
    .run(second.groupId, first.deviceId);
  const moved = rollout.readDeviceProfileRollout(first.deviceId);
  assert.equal(moved.desiredVersion, versionB.id);
  assert.notEqual(moved.desiredVersion, versionA.id);
});

test("waiting and failed heartbeats cannot overwrite the last applied Version", () => {
  const profile = governance.createPlaybackProfile({ name: "Authority" });
  const { deviceId } = createGroupAndDevice(profile.id, "authority");
  const version1 = publish(profile.id);
  rollout.recordDeviceProfileRolloutHeartbeat(deviceId, {
    appliedVersion: version1.id,
    desiredVersion: version1.id,
    updateState: "applied"
  });
  const version2 = publish(profile.id);

  for (const updateState of ["waiting", "failed"] as const) {
    const status = rollout.recordDeviceProfileRolloutHeartbeat(deviceId, {
      appliedVersion: version2.id,
      desiredVersion: version2.id,
      updateError: updateState === "failed" ? "candidate rejected" : null,
      updateState
    });
    assert.equal(status.appliedVersion, version1.id);
    assert.equal(status.updateState, "failed");
    assert.match(status.lastError ?? "", /applied version mismatch/u);
  }
});

test("rollout heartbeat state does not mutate the Device assignment revision", () => {
  const profile = governance.createPlaybackProfile({ name: "Revision" });
  const { deviceId } = createGroupAndDevice(profile.id, "revision");
  const version = publish(profile.id);
  getDatabase()
    .prepare("UPDATE devices SET updated_at = '2026-07-01 00:00:00' WHERE id = ?")
    .run(deviceId);

  rollout.recordDeviceProfileRolloutHeartbeat(deviceId, {
    appliedVersion: version.id,
    desiredVersion: version.id,
    updateState: "applied"
  });

  const row = getDatabase()
    .prepare("SELECT updated_at AS updatedAt, profile_update_at AS profileUpdateAt FROM devices WHERE id = ?")
    .get(deviceId) as { profileUpdateAt: string | null; updatedAt: string };
  assert.equal(row.updatedAt, "2026-07-01 00:00:00");
  assert.ok(row.profileUpdateAt);
});

test("offline fleet state preserves last applied Version and does not block peers", () => {
  const profile = governance.createPlaybackProfile({ name: "Fleet" });
  const first = createGroupAndDevice(profile.id, "first");
  const second = createGroupAndDevice(profile.id, "second");
  const version = publish(profile.id);
  rollout.recordDeviceProfileRolloutHeartbeat(first.deviceId, {
    appliedVersion: version.id,
    desiredVersion: version.id,
    updateState: "applied"
  });

  const fleet = rollout.deriveFleetProfileRollout([
    { deviceId: first.deviceId, state: "offline" },
    { deviceId: second.deviceId, state: "online" }
  ]);
  assert.deepEqual(fleet.summary, {
    applied: 0,
    failed: 0,
    offline: 1,
    total: 2,
    waiting: 1
  });
  assert.equal(
    fleet.devices.find((device) => device.deviceId === first.deviceId)?.appliedVersion,
    version.id
  );
});
