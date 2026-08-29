import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after, beforeEach } from "node:test";

const tempDir = mkdtempSync(join(tmpdir(), "solar-display-preview-context-test-"));
process.env.DATA_DIR = tempDir;
process.env.DATABASE_PATH = join(tempDir, "solar-display.sqlite");
const databasePath = process.env.DATABASE_PATH;

const [
  { buildApp },
  { closeDatabaseConnection },
  { migrateDatabase },
  { seedDatabase },
  { createDevice, createDeviceGroup },
  { readDefaultPlaybackProfileId }
] = await Promise.all([
  import("../app.js"),
  import("../db/index.js"),
  import("../db/migrate.js"),
  import("../db/seed.js"),
  import("../services/deviceGroupService.js"),
  import("../services/playbackProfileService.js")
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
});

test("management Preview Context resolves trusted site, Device, and Group selections", async () => {
  const app = await buildApp();
  const group = createDeviceGroup({
    enabled: true,
    name: "Preview Group",
    playbackProfileId: readDefaultPlaybackProfileId(),
    siteScope: "cl"
  });
  const device = createDevice({
    clientId: "preview-device",
    displayName: "Preview Device",
    enabled: true,
    groupId: group.id
  });

  try {
    const [siteResponse, deviceResponse, groupResponse] = await Promise.all([
      app.inject({
        method: "POST",
        url: "/api/display-pages/preview-context/resolve",
        payload: { kind: "site", siteScope: "kn" }
      }),
      app.inject({
        method: "POST",
        url: "/api/display-pages/preview-context/resolve",
        payload: { deviceId: device.id, kind: "device" }
      }),
      app.inject({
        method: "POST",
        url: "/api/display-pages/preview-context/resolve",
        payload: { groupId: group.id, kind: "group" }
      })
    ]);

    assert.equal(siteResponse.statusCode, 200);
    assert.deepEqual(siteResponse.json().context, {
      contextKey: "site:kn",
      deviceId: null,
      groupId: null,
      kind: "site",
      label: "KN",
      profileId: null,
      siteScope: "kn"
    });
    assert.equal(deviceResponse.statusCode, 200);
    assert.deepEqual(deviceResponse.json().context, {
      contextKey: `device:${device.id}`,
      deviceId: device.id,
      groupId: group.id,
      kind: "device",
      label: "Preview Device",
      profileId: group.playbackProfileId,
      siteScope: "cl"
    });
    assert.equal(groupResponse.statusCode, 200);
    assert.deepEqual(groupResponse.json().context, {
      contextKey: `group:${group.id}`,
      deviceId: null,
      groupId: group.id,
      kind: "group",
      label: group.name,
      profileId: group.playbackProfileId,
      siteScope: "cl"
    });
  } finally {
    await app.close();
  }
});

test("management Preview Context rejects disabled Device and Group selections", async () => {
  const app = await buildApp();
  const activeGroup = createDeviceGroup({
    enabled: true,
    name: "Active Preview Group",
    playbackProfileId: readDefaultPlaybackProfileId(),
    siteScope: "cl"
  });
  const disabledDevice = createDevice({
    clientId: "disabled-preview-device",
    displayName: "Disabled Preview Device",
    enabled: false,
    groupId: activeGroup.id
  });
  const disabledGroup = createDeviceGroup({
    enabled: false,
    name: "Disabled Preview Group",
    playbackProfileId: activeGroup.playbackProfileId,
    siteScope: "kn"
  });

  try {
    const [deviceResponse, groupResponse] = await Promise.all([
      app.inject({
        method: "POST",
        url: "/api/display-pages/preview-context/resolve",
        payload: { deviceId: disabledDevice.id, kind: "device" }
      }),
      app.inject({
        method: "POST",
        url: "/api/display-pages/preview-context/resolve",
        payload: { groupId: disabledGroup.id, kind: "group" }
      })
    ]);

    assert.equal(deviceResponse.statusCode, 403);
    assert.equal(deviceResponse.json().code, "preview_context_disabled");
    assert.equal(groupResponse.statusCode, 403);
    assert.equal(groupResponse.json().code, "preview_context_disabled");
  } finally {
    await app.close();
  }
});

test("Preview Context resolution rejects untrusted management callers", async () => {
  const app = await buildApp();

  try {
    const response = await app.inject({
      headers: {
        host: "player.example",
        origin: "https://evil.example"
      },
      method: "POST",
      payload: { kind: "site", siteScope: "kn" },
      remoteAddress: "198.51.100.24",
      url: "/api/display-pages/preview-context/resolve"
    });

    assert.equal(response.statusCode, 403);
    assert.equal(response.json().code, "management_access_denied");
  } finally {
    await app.close();
  }
});

test("Preview Context rejects ambiguous selections", async () => {
  const app = await buildApp();

  try {
    const ambiguousResponse = await app.inject({
      method: "POST",
      payload: { deviceId: 1, kind: "site", siteScope: "cl" },
      url: "/api/display-pages/preview-context/resolve"
    });

    assert.equal(ambiguousResponse.statusCode, 400);
    assert.equal(ambiguousResponse.json().code, "preview_context_invalid");
  } finally {
    await app.close();
  }
});
