import assert from "node:assert/strict";
import test from "node:test";
import {
  buildApp,
  getDatabase,
  seedManagedImageAsset
} from "./display-pages-asset-governance.test-support.js";

function enableImageInSlideshow(assetId: number) {
  getDatabase()
    .prepare("UPDATE image_assets SET included_in_slideshow = 1 WHERE id = ?")
    .run(assetId);
}

function readEntry(entryId: string) {
  return getDatabase()
    .prepare(`
      SELECT asset_id, display_order, duration_seconds, enabled, fallback_mode, tags_json
      FROM image_playlist_entries
      WHERE entry_id = ?
    `)
    .get(entryId);
}

test("image playlist entry mutations reject malformed values without writes or socket events", async () => {
  const asset = seedManagedImageAsset("playlist-validation.png");
  enableImageInSlideshow(asset.assetId);
  const app = await buildApp();
  const imageEvents: unknown[] = [];
  const syncEvents: unknown[] = [];
  const originalImageEmit = app.socketService.emitImagesUpdated.bind(app.socketService);
  const originalSyncEmit = app.socketService.emitDisplaySync.bind(app.socketService);
  app.socketService.emitImagesUpdated = (payload) => {
    imageEvents.push(payload);
    originalImageEmit(payload);
  };
  app.socketService.emitDisplaySync = (payload) => {
    syncEvents.push(payload);
    originalSyncEmit(payload);
  };

  try {
    const bootstrap = await app.inject({
      method: "POST",
      url: "/api/image-playlist/governance/bootstrap"
    });
    assert.equal(bootstrap.statusCode, 200);
    imageEvents.length = 0;
    syncEvents.length = 0;

    const before = readEntry("IMG-01");
    assert.ok(before);

    const invalidBodies: Array<Record<string, unknown>> = [
      { durationSeconds: 0 },
      { durationSeconds: -1 },
      { durationSeconds: 1.5 },
      { displayOrder: -1 },
      { displayOrder: 1.5 },
      { enabled: "true" },
      { fallbackMode: "unknown" },
      { assetId: 999_999 },
      { tags: ["valid", 123] }
    ];

    for (const payload of invalidBodies) {
      const response = await app.inject({
        method: "PUT",
        url: "/api/image-playlist/IMG-01",
        payload
      });
      assert.equal(response.statusCode, 400, JSON.stringify(payload));
      assert.deepEqual(readEntry("IMG-01"), before, JSON.stringify(payload));
    }

    const unknownEntry = await app.inject({
      method: "PUT",
      url: "/api/image-playlist/IMG-999",
      payload: { durationSeconds: 10 }
    });
    assert.equal(unknownEntry.statusCode, 404);
    assert.equal(imageEvents.length, 0);
    assert.equal(syncEvents.length, 0);
  } finally {
    app.socketService.emitImagesUpdated = originalImageEmit;
    app.socketService.emitDisplaySync = originalSyncEmit;
    await app.close();
  }
});

test("image playlist settings, duration-all, and reorder validation is atomic", async () => {
  const first = seedManagedImageAsset("playlist-validation-first.png");
  const second = seedManagedImageAsset("playlist-validation-second.png");
  enableImageInSlideshow(first.assetId);
  enableImageInSlideshow(second.assetId);
  const app = await buildApp();
  const imageEvents: unknown[] = [];
  const syncEvents: unknown[] = [];
  const originalImageEmit = app.socketService.emitImagesUpdated.bind(app.socketService);
  const originalSyncEmit = app.socketService.emitDisplaySync.bind(app.socketService);
  app.socketService.emitImagesUpdated = (payload) => {
    imageEvents.push(payload);
    originalImageEmit(payload);
  };
  app.socketService.emitDisplaySync = (payload) => {
    syncEvents.push(payload);
    originalSyncEmit(payload);
  };

  try {
    const bootstrap = await app.inject({
      method: "POST",
      url: "/api/image-playlist/governance/bootstrap"
    });
    assert.equal(bootstrap.statusCode, 200);
    imageEvents.length = 0;
    syncEvents.length = 0;

    const beforeRows = getDatabase()
      .prepare("SELECT entry_id, display_order, duration_seconds, enabled FROM image_playlist_entries ORDER BY entry_id")
      .all();

    const invalidSettings = await app.inject({
      method: "PUT",
      url: "/api/image-playlist/settings",
      payload: { shuffle: "true" }
    });
    assert.equal(invalidSettings.statusCode, 400);

    const invalidDuration = await app.inject({
      method: "PUT",
      url: "/api/image-playlist/duration-all",
      payload: { durationSeconds: 0 }
    });
    assert.equal(invalidDuration.statusCode, 400);

    const duplicateReorder = await app.inject({
      method: "PUT",
      url: "/api/image-playlist/reorder",
      payload: {
        entries: [
          { displayOrder: 1, entryId: "IMG-01" },
          { displayOrder: 2, entryId: "IMG-01" }
        ]
      }
    });
    assert.equal(duplicateReorder.statusCode, 400);

    const unknownReorder = await app.inject({
      method: "PUT",
      url: "/api/image-playlist/reorder",
      payload: {
        entries: [
          { displayOrder: 1, entryId: "IMG-01" },
          { displayOrder: 2, entryId: "IMG-999" }
        ]
      }
    });
    assert.equal(unknownReorder.statusCode, 400);

    const invalidReorderValue = await app.inject({
      method: "PUT",
      url: "/api/image-playlist/reorder",
      payload: {
        entries: [{ displayOrder: -1, durationSeconds: 0, entryId: "IMG-01" }]
      }
    });
    assert.equal(invalidReorderValue.statusCode, 400);

    const afterRows = getDatabase()
      .prepare("SELECT entry_id, display_order, duration_seconds, enabled FROM image_playlist_entries ORDER BY entry_id")
      .all();
    assert.deepEqual(afterRows, beforeRows);
    assert.equal(imageEvents.length, 0);
    assert.equal(syncEvents.length, 0);
  } finally {
    app.socketService.emitImagesUpdated = originalImageEmit;
    app.socketService.emitDisplaySync = originalSyncEmit;
    await app.close();
  }
});
