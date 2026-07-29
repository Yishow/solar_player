import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after, beforeEach } from "node:test";

const tempDir = mkdtempSync(join(tmpdir(), "solar-display-device-group-test-"));
process.env.DATA_DIR = tempDir;
process.env.DATABASE_PATH = join(tempDir, "solar-display.sqlite");
process.env.UPLOADS_DIR = join(tempDir, "uploads", "images");
const databasePath = process.env.DATABASE_PATH;

const [
  { buildApp },
  { closeDatabaseConnection, getDatabase },
  { migrateDatabase },
  { seedDatabase }
] = await Promise.all([
  import("../app.js"),
  import("../db/index.js"),
  import("../db/migrate.js"),
  import("../db/seed.js")
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

test("device/group migration accepts cl and kn while enforcing unique clientId", () => {
  const database = getDatabase();
  const defaultProfile = database
    .prepare("SELECT id FROM playback_profiles WHERE is_default = 1")
    .get() as { id: number };
  const insertGroup = database.prepare(
    `INSERT INTO device_groups (name, enabled, site_scope, playback_profile_id)
     VALUES (?, 1, ?, ?)`
  );

  const clGroupId = Number(insertGroup.run("中壢展示群組", "cl", defaultProfile.id).lastInsertRowid);
  const knGroupId = Number(insertGroup.run("觀音展示群組", "kn", defaultProfile.id).lastInsertRowid);
  const disabledGroupId = Number(
    insertGroup.run("停用展示群組", "kn", defaultProfile.id).lastInsertRowid
  );
  database
    .prepare("UPDATE device_groups SET enabled = 0 WHERE id = ?")
    .run(disabledGroupId);

  assert.throws(
    () => insertGroup.run("遺失 Profile", "cl", 999_999),
    /FOREIGN KEY constraint failed/u
  );
  assert.throws(
    () => insertGroup.run("其他廠區", "other", defaultProfile.id),
    /CHECK constraint failed/u
  );

  const insertDevice = database.prepare(
    `INSERT INTO devices (client_id, display_name, enabled, group_id)
     VALUES (?, ?, 1, ?)`
  );
  insertDevice.run("lobby-cl-01", "中壢大廳", clGroupId);
  assert.throws(
    () => insertDevice.run("lobby-cl-01", "觀音大廳", knGroupId),
    /UNIQUE constraint failed: devices\.client_id/u
  );
  assert.throws(
    () => insertDevice.run("missing-group", "缺少群組", null),
    /CHECK constraint failed/u
  );
  assert.throws(
    () => insertDevice.run("dangling-group", "不存在群組", 999_999),
    /FOREIGN KEY constraint failed/u
  );
  assert.throws(
    () => insertDevice.run("disabled-group", "停用群組", disabledGroupId),
    /enabled_device_requires_active_group/u
  );

  const disabledDeviceId = Number(
    database
      .prepare(
        `INSERT INTO devices (client_id, display_name, enabled, group_id)
         VALUES (?, ?, 0, ?)`
      )
      .run("disabled-device", "停用裝置", disabledGroupId).lastInsertRowid
  );
  assert.throws(
    () =>
      database
        .prepare("UPDATE devices SET enabled = 1 WHERE id = ?")
        .run(disabledDeviceId),
    /enabled_device_requires_active_group/u
  );
  assert.throws(
    () =>
      database
        .prepare("UPDATE devices SET group_id = ? WHERE client_id = ?")
        .run(disabledGroupId, "lobby-cl-01"),
    /enabled_device_requires_active_group/u
  );

  assert.deepEqual(database.prepare("PRAGMA foreign_key_check").all(), []);

  database
    .prepare("DELETE FROM schema_migrations WHERE version = '029_device_group_management'")
    .run();
  migrateDatabase();

  assert.deepEqual(
    database
      .prepare(
        `SELECT
           (SELECT COUNT(*) FROM device_groups) AS group_count,
           (SELECT COUNT(*) FROM devices) AS device_count`
      )
      .get(),
    { device_count: 2, group_count: 3 }
  );
});

test("deleting a referenced Group returns group_in_use without changing state", async () => {
  const app = await buildApp();

  try {
    const groupResponse = await app.inject({
      method: "POST",
      payload: {
        enabled: true,
        name: "中壢展示群組",
        siteScope: "cl"
      },
      url: "/api/device-groups"
    });
    assert.equal(groupResponse.statusCode, 201);
    const groupId = groupResponse.json<{ data: { id: number } }>().data.id;

    const deviceResponse = await app.inject({
      method: "POST",
      payload: {
        clientId: "lobby-cl-01",
        displayName: "中壢大廳",
        enabled: true,
        groupId
      },
      url: "/api/devices"
    });
    assert.equal(deviceResponse.statusCode, 201);

    const deleteResponse = await app.inject({
      method: "DELETE",
      url: `/api/device-groups/${groupId}`
    });
    assert.equal(deleteResponse.statusCode, 409);
    assert.equal(deleteResponse.json<{ code: string }>().code, "group_in_use");

    assert.deepEqual(
      getDatabase()
        .prepare(
          `SELECT devices.group_id, device_groups.id AS existing_group_id
           FROM devices
           INNER JOIN device_groups ON device_groups.id = devices.group_id
           WHERE devices.client_id = ?`
        )
        .get("lobby-cl-01"),
      { existing_group_id: groupId, group_id: groupId }
    );
  } finally {
    await app.close();
  }
});

test("failed Device move rolls back without changing its active Group", async () => {
  const app = await buildApp();

  try {
    const createGroup = async (name: string, siteScope: "cl" | "kn") => {
      const response = await app.inject({
        method: "POST",
        payload: { enabled: true, name, siteScope },
        url: "/api/device-groups"
      });
      assert.equal(response.statusCode, 201);
      return response.json<{ data: { id: number } }>().data.id;
    };
    const clGroupId = await createGroup("中壢展示群組", "cl");
    const knGroupId = await createGroup("觀音展示群組", "kn");

    const createResponse = await app.inject({
      method: "POST",
      payload: {
        clientId: "lobby-cl-01",
        displayName: "中壢大廳",
        enabled: true,
        groupId: clGroupId
      },
      url: "/api/devices"
    });
    assert.equal(createResponse.statusCode, 201);
    const deviceId = createResponse.json<{ data: { id: number } }>().data.id;

    getDatabase().prepare("UPDATE device_groups SET enabled = 0 WHERE id = ?").run(knGroupId);

    const moveResponse = await app.inject({
      method: "PUT",
      payload: {
        displayName: "不應寫入",
        groupId: knGroupId
      },
      url: `/api/devices/${deviceId}`
    });
    assert.equal(moveResponse.statusCode, 400);
    assert.equal(moveResponse.json<{ code: string }>().code, "group_disabled");

    assert.deepEqual(
      getDatabase()
        .prepare(
          "SELECT display_name, group_id FROM devices WHERE id = ?"
        )
        .get(deviceId),
      { display_name: "中壢大廳", group_id: clGroupId }
    );
  } finally {
    await app.close();
  }
});

test("moving a Device from a cl Group to a kn Group replaces its only Group reference", async () => {
  const app = await buildApp();

  try {
    const createGroup = async (name: string, siteScope: "cl" | "kn") => {
      const response = await app.inject({
        method: "POST",
        payload: { enabled: true, name, siteScope },
        url: "/api/device-groups"
      });
      assert.equal(response.statusCode, 201);
      return response.json<{ data: { id: number } }>().data.id;
    };
    const clGroupId = await createGroup("中壢展示群組", "cl");
    const knGroupId = await createGroup("觀音展示群組", "kn");

    const createResponse = await app.inject({
      method: "POST",
      payload: {
        clientId: "lobby-cl-01",
        displayName: "中壢大廳",
        enabled: true,
        groupId: clGroupId
      },
      url: "/api/devices"
    });
    assert.equal(createResponse.statusCode, 201);
    const deviceId = createResponse.json<{ data: { id: number } }>().data.id;

    const moveResponse = await app.inject({
      method: "PUT",
      payload: { groupId: knGroupId },
      url: `/api/devices/${deviceId}`
    });
    assert.equal(moveResponse.statusCode, 200);
    const movedDevice = moveResponse.json<{
      data: { group: { id: number; siteScope: string }; groupId: number };
    }>().data;
    assert.equal(movedDevice.groupId, knGroupId);
    assert.equal(movedDevice.group.id, knGroupId);
    assert.equal(movedDevice.group.siteScope, "kn");
    assert.deepEqual(
      getDatabase()
        .prepare("SELECT group_id FROM devices WHERE id = ?")
        .get(deviceId),
      { group_id: knGroupId }
    );
  } finally {
    await app.close();
  }
});

test("disabling a Group retains Device references without freezing unrelated Device updates", async () => {
  const app = await buildApp();

  try {
    const groupResponse = await app.inject({
      method: "POST",
      payload: {
        enabled: true,
        name: "中壢展示群組",
        siteScope: "cl"
      },
      url: "/api/device-groups"
    });
    assert.equal(groupResponse.statusCode, 201);
    const groupId = groupResponse.json<{ data: { id: number } }>().data.id;

    const deviceResponse = await app.inject({
      method: "POST",
      payload: {
        clientId: "lobby-cl-01",
        displayName: "中壢大廳",
        enabled: true,
        groupId
      },
      url: "/api/devices"
    });
    assert.equal(deviceResponse.statusCode, 201);
    const deviceId = deviceResponse.json<{ data: { id: number } }>().data.id;

    const disableGroupResponse = await app.inject({
      method: "PUT",
      payload: { enabled: false },
      url: `/api/device-groups/${groupId}`
    });
    assert.equal(disableGroupResponse.statusCode, 200);

    const readDeviceResponse = await app.inject({
      method: "GET",
      url: `/api/devices/${deviceId}`
    });
    assert.equal(readDeviceResponse.statusCode, 200);
    const persistedDevice = readDeviceResponse.json<{
      data: { enabled: boolean; group: { enabled: boolean; id: number }; groupId: number };
    }>().data;
    assert.equal(persistedDevice.enabled, true);
    assert.equal(persistedDevice.groupId, groupId);
    assert.equal(persistedDevice.group.id, groupId);
    assert.equal(persistedDevice.group.enabled, false);

    const updateDeviceResponse = await app.inject({
      method: "PUT",
      payload: { displayName: "中壢訪客中心" },
      url: `/api/devices/${deviceId}`
    });
    assert.equal(updateDeviceResponse.statusCode, 200);
    assert.equal(
      updateDeviceResponse.json<{
        data: { displayName: string; group: { enabled: boolean } };
      }>().data.displayName,
      "中壢訪客中心"
    );
    assert.equal(
      updateDeviceResponse.json<{
        data: { displayName: string; group: { enabled: boolean } };
      }>().data.group.enabled,
      false
    );
    assert.deepEqual(
      getDatabase()
        .prepare("SELECT display_name, group_id FROM devices WHERE id = ?")
        .get(deviceId),
      { display_name: "中壢訪客中心", group_id: groupId }
    );
  } finally {
    await app.close();
  }
});

test("missing Playback Profile rejects a Group mutation without partial writes", async () => {
  const app = await buildApp();

  try {
    const createResponse = await app.inject({
      method: "POST",
      payload: {
        enabled: true,
        name: "中壢展示群組",
        siteScope: "cl"
      },
      url: "/api/device-groups"
    });
    assert.equal(createResponse.statusCode, 201);
    const createdGroup = createResponse.json<{
      data: { id: number; playbackProfileId: number };
    }>().data;

    const updateResponse = await app.inject({
      method: "PUT",
      payload: {
        name: "不應寫入",
        playbackProfileId: 999_999,
        siteScope: "kn"
      },
      url: `/api/device-groups/${createdGroup.id}`
    });
    assert.equal(updateResponse.statusCode, 400);
    assert.equal(updateResponse.json<{ code: string }>().code, "profile_not_found");
    assert.deepEqual(
      getDatabase()
        .prepare(
          `SELECT name, playback_profile_id, site_scope
           FROM device_groups
           WHERE id = ?`
        )
        .get(createdGroup.id),
      {
        name: "中壢展示群組",
        playback_profile_id: createdGroup.playbackProfileId,
        site_scope: "cl"
      }
    );
  } finally {
    await app.close();
  }
});

test("disabling a Device preserves its existing Group reference", async () => {
  const app = await buildApp();

  try {
    const groupResponse = await app.inject({
      method: "POST",
      payload: {
        enabled: true,
        name: "中壢展示群組",
        siteScope: "cl"
      },
      url: "/api/device-groups"
    });
    assert.equal(groupResponse.statusCode, 201);
    const groupId = groupResponse.json<{ data: { id: number } }>().data.id;

    const createResponse = await app.inject({
      method: "POST",
      payload: {
        clientId: "lobby-cl-01",
        displayName: "中壢大廳",
        enabled: true,
        groupId
      },
      url: "/api/devices"
    });
    assert.equal(createResponse.statusCode, 201);
    const deviceId = createResponse.json<{ data: { id: number } }>().data.id;

    const disableResponse = await app.inject({
      method: "PUT",
      payload: { enabled: false },
      url: `/api/devices/${deviceId}`
    });
    assert.equal(disableResponse.statusCode, 200);
    const disabledDevice = disableResponse.json<{
      data: { enabled: boolean; group: { id: number }; groupId: number };
    }>().data;
    assert.equal(disabledDevice.enabled, false);
    assert.equal(disabledDevice.groupId, groupId);
    assert.equal(disabledDevice.group.id, groupId);
    assert.deepEqual(
      getDatabase()
        .prepare("SELECT enabled, group_id FROM devices WHERE id = ?")
        .get(deviceId),
      { enabled: 0, group_id: groupId }
    );
  } finally {
    await app.close();
  }
});

test("trusted management callers can complete the Device and Group CRUD lifecycle", async () => {
  const app = await buildApp();

  try {
    const groupCreateResponse = await app.inject({
      method: "POST",
      payload: {
        enabled: true,
        name: "中壢展示群組",
        siteScope: "cl"
      },
      url: "/api/device-groups"
    });
    assert.equal(groupCreateResponse.statusCode, 201);
    const createdGroup = groupCreateResponse.json<{
      data: {
        enabled: boolean;
        id: number;
        name: string;
        playbackProfileId: number;
        siteScope: string;
      };
    }>().data;
    assert.equal(createdGroup.siteScope, "cl");

    const groupListResponse = await app.inject({
      method: "GET",
      url: "/api/device-groups"
    });
    assert.equal(groupListResponse.statusCode, 200);
    assert.equal(groupListResponse.json<{ data: unknown[] }>().data.length, 1);

    const groupUpdateResponse = await app.inject({
      method: "PUT",
      payload: {
        name: "觀音展示群組",
        siteScope: "kn"
      },
      url: `/api/device-groups/${createdGroup.id}`
    });
    assert.equal(groupUpdateResponse.statusCode, 200);
    assert.equal(
      groupUpdateResponse.json<{ data: { siteScope: string } }>().data.siteScope,
      "kn"
    );

    const deviceCreateResponse = await app.inject({
      method: "POST",
      payload: {
        clientId: "lobby-kn-01",
        displayName: "觀音大廳",
        enabled: true,
        groupId: createdGroup.id
      },
      url: "/api/devices"
    });
    assert.equal(deviceCreateResponse.statusCode, 201);
    const createdDevice = deviceCreateResponse.json<{
      data: {
        clientId: string;
        group: { siteScope: string };
        groupId: number;
        id: number;
      };
    }>().data;
    assert.equal(createdDevice.group.siteScope, "kn");

    const deviceListResponse = await app.inject({
      method: "GET",
      url: "/api/devices"
    });
    assert.equal(deviceListResponse.statusCode, 200);
    assert.equal(deviceListResponse.json<{ data: unknown[] }>().data.length, 1);

    const deviceUpdateResponse = await app.inject({
      method: "PUT",
      payload: {
        displayName: "觀音訪客中心"
      },
      url: `/api/devices/${createdDevice.id}`
    });
    assert.equal(deviceUpdateResponse.statusCode, 200);
    assert.equal(
      deviceUpdateResponse.json<{ data: { displayName: string } }>().data.displayName,
      "觀音訪客中心"
    );

    const deviceDeleteResponse = await app.inject({
      method: "DELETE",
      url: `/api/devices/${createdDevice.id}`
    });
    assert.equal(deviceDeleteResponse.statusCode, 200);

    const groupDeleteResponse = await app.inject({
      method: "DELETE",
      url: `/api/device-groups/${createdGroup.id}`
    });
    assert.equal(groupDeleteResponse.statusCode, 200);
  } finally {
    await app.close();
  }
});

test("untrusted playback callers cannot mutate Groups", async () => {
  const app = await buildApp();

  try {
    const response = await app.inject({
      headers: {
        host: "player.example",
        origin: "https://untrusted.example"
      },
      method: "POST",
      payload: {
        enabled: true,
        name: "不應建立",
        siteScope: "cl"
      },
      url: "/api/device-groups"
    });

    assert.equal(response.statusCode, 403);
    assert.deepEqual(response.json(), {
      access: "denied",
      code: "management_access_denied",
      error: "Management access denied",
      requiredRole: "management-trusted",
      success: false,
      timestamp: response.json<{ timestamp: string }>().timestamp
    });
    assert.equal(
      (
        getDatabase()
          .prepare("SELECT COUNT(*) AS count FROM device_groups")
          .get() as { count: number }
      ).count,
      0
    );
  } finally {
    await app.close();
  }
});

test("validation and uniqueness failures return stable codes without partial writes", async () => {
  const app = await buildApp();

  try {
    const blankGroupResponse = await app.inject({
      method: "POST",
      payload: { name: "   ", siteScope: "cl" },
      url: "/api/device-groups"
    });
    assert.equal(blankGroupResponse.statusCode, 400);
    assert.equal(
      blankGroupResponse.json<{ code: string }>().code,
      "invalid_group_name"
    );

    const groupResponse = await app.inject({
      method: "POST",
      payload: { enabled: true, name: "中壢展示群組", siteScope: "cl" },
      url: "/api/device-groups"
    });
    assert.equal(groupResponse.statusCode, 201);
    const groupId = groupResponse.json<{ data: { id: number } }>().data.id;

    const duplicateGroupResponse = await app.inject({
      method: "POST",
      payload: { enabled: true, name: "中壢展示群組", siteScope: "kn" },
      url: "/api/device-groups"
    });
    assert.equal(duplicateGroupResponse.statusCode, 409);
    assert.equal(
      duplicateGroupResponse.json<{ code: string }>().code,
      "group_name_conflict"
    );

    const missingGroupResponse = await app.inject({
      method: "POST",
      payload: {
        clientId: "missing-group",
        displayName: "缺少群組",
        enabled: true
      },
      url: "/api/devices"
    });
    assert.equal(missingGroupResponse.statusCode, 400);
    assert.equal(
      missingGroupResponse.json<{ code: string }>().code,
      "group_required"
    );

    const deviceResponse = await app.inject({
      method: "POST",
      payload: {
        clientId: "lobby-cl-01",
        displayName: "中壢大廳",
        enabled: true,
        groupId
      },
      url: "/api/devices"
    });
    assert.equal(deviceResponse.statusCode, 201);

    const duplicateDeviceResponse = await app.inject({
      method: "POST",
      payload: {
        clientId: "lobby-cl-01",
        displayName: "重複裝置",
        enabled: true,
        groupId
      },
      url: "/api/devices"
    });
    assert.equal(duplicateDeviceResponse.statusCode, 409);
    assert.equal(
      duplicateDeviceResponse.json<{ code: string }>().code,
      "client_id_conflict"
    );

    assert.deepEqual(
      getDatabase()
        .prepare(
          `SELECT
             (SELECT COUNT(*) FROM device_groups) AS group_count,
             (SELECT COUNT(*) FROM devices) AS device_count`
        )
        .get(),
      { device_count: 1, group_count: 1 }
    );
  } finally {
    await app.close();
  }
});
