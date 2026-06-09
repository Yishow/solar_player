import assert from "node:assert/strict";
import test from "node:test";
import {
  buildApp,
  getDatabase,
  seedManagedImageAsset
} from "./display-pages-asset-governance.test-support.js";

function enableImageInSlideshow(assetId: number) {
  getDatabase()
    .prepare(
      `
        UPDATE image_assets
        SET included_in_slideshow = 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `
    )
    .run(assetId);
}

// seed 現在會內建 4-up demo slideshow 影像；這些 runtime playlist 測試只驗自己 seed 的資產，
// 故隔離掉 display-seed 的 slideshow 成員，避免耦合 seed demo 內容數量。
function clearSeedSlideshowMembership() {
  getDatabase()
    .prepare("UPDATE image_assets SET included_in_slideshow = 0 WHERE original_name LIKE 'display-seed:%'")
    .run();
}

test("GET /api/image-playlist resolves a playable runtime playlist without creating governance rows", async () => {
  const first = seedManagedImageAsset("playlist-cover.png");
  const second = seedManagedImageAsset("playlist-gallery.png");
  enableImageInSlideshow(first.assetId);
  enableImageInSlideshow(second.assetId);
  const app = await buildApp();
  clearSeedSlideshowMembership();

  try {
    const response = await app.inject({
      method: "GET",
      url: "/api/image-playlist"
    });

    assert.equal(response.statusCode, 200);
    const body = response.json() as {
      playlist: {
        activeEntry: {
          entryId: string;
        } | null;
        entries: Array<{
          displayOrder: number;
          durationSeconds: number;
          enabled: boolean;
          entryId: string;
        }>;
        hasPlaylistRows: boolean;
        settings: {
          shuffle: boolean;
        };
      };
    };
    const playlistTableExists = Boolean(
      getDatabase()
        .prepare(
          `
            SELECT name
            FROM sqlite_master
            WHERE type = 'table' AND name = 'image_playlist_entries'
          `
        )
        .get()
    );
    const playlistSettingsTableExists = Boolean(
      getDatabase()
        .prepare(
          `
            SELECT name
            FROM sqlite_master
            WHERE type = 'table' AND name = 'image_playlist_settings'
          `
        )
        .get()
    );

    assert.equal(body.playlist.activeEntry?.entryId, "IMG-01");
    assert.equal(body.playlist.entries.length, 2);
    assert.equal(body.playlist.hasPlaylistRows, false);
    assert.equal(body.playlist.entries[0]?.entryId, "IMG-01");
    assert.equal(body.playlist.entries[0]?.displayOrder, 1);
    assert.equal(body.playlist.entries[0]?.enabled, true);
    assert.equal(body.playlist.entries[0]?.durationSeconds, 10);
    assert.equal(body.playlist.settings.shuffle, false);
    assert.equal(playlistTableExists, false);
    assert.equal(playlistSettingsTableExists, false);
  } finally {
    await app.close();
  }
});

test("GET /api/image-playlist keeps runtime reads side-effect free even when no governance rows exist", async () => {
  const first = seedManagedImageAsset("playlist-cover.png");
  const second = seedManagedImageAsset("playlist-gallery.png");
  enableImageInSlideshow(first.assetId);
  enableImageInSlideshow(second.assetId);
  const app = await buildApp();
  clearSeedSlideshowMembership();

  try {
    const response = await app.inject({
      method: "GET",
      url: "/api/image-playlist"
    });

    assert.equal(response.statusCode, 200);
    const body = response.json() as {
      playlist: {
        activeEntry: unknown;
        entries: Array<unknown>;
        hasPlaylistRows: boolean;
      };
    };

    const playlistTableExists = Boolean(
      getDatabase()
        .prepare(
          `
            SELECT name
            FROM sqlite_master
            WHERE type = 'table' AND name = 'image_playlist_entries'
          `
        )
        .get()
    );
    const playlistSettingsTableExists = Boolean(
      getDatabase()
        .prepare(
          `
            SELECT name
            FROM sqlite_master
            WHERE type = 'table' AND name = 'image_playlist_settings'
          `
        )
        .get()
    );

    assert.notEqual(body.playlist.activeEntry, null);
    assert.equal(body.playlist.entries.length, 2);
    assert.equal(body.playlist.hasPlaylistRows, false);
    assert.equal(playlistTableExists, false);
    assert.equal(playlistSettingsTableExists, false);
  } finally {
    await app.close();
  }
});

test("PUT /api/image-playlist/settings persists shuffle and notifies runtime surfaces", async () => {
  const app = await buildApp();
  const originalEmitImagesUpdated = app.socketService.emitImagesUpdated.bind(app.socketService);
  const originalEmitDisplaySync = app.socketService.emitDisplaySync.bind(app.socketService);
  const imageEvents: Array<{ action: string; playlist: { settings: { shuffle: boolean } } }> = [];
  const syncEvents: Array<{ reason: string; scope: string }> = [];

  app.socketService.emitImagesUpdated = (payload) => {
    imageEvents.push(payload as { action: string; playlist: { settings: { shuffle: boolean } } });
    originalEmitImagesUpdated(payload);
  };
  app.socketService.emitDisplaySync = (payload) => {
    syncEvents.push(payload as { reason: string; scope: string });
    originalEmitDisplaySync(payload);
  };

  try {
    const updateResponse = await app.inject({
      method: "PUT",
      payload: {
        shuffle: true
      },
      url: "/api/image-playlist/settings"
    });

    assert.equal(updateResponse.statusCode, 200);
    const updateBody = updateResponse.json() as {
      playlist: {
        settings: {
          shuffle: boolean;
        };
      };
    };
    assert.equal(updateBody.playlist.settings.shuffle, true);

    const readResponse = await app.inject({
      method: "GET",
      url: "/api/image-playlist"
    });

    assert.equal(readResponse.statusCode, 200);
    const readBody = readResponse.json() as {
      playlist: {
        settings: {
          shuffle: boolean;
        };
      };
    };

    assert.equal(readBody.playlist.settings.shuffle, true);
    assert.equal(imageEvents.at(-1)?.action, "playlist-settings-updated");
    assert.equal(imageEvents.at(-1)?.playlist.settings.shuffle, true);
    assert.equal(syncEvents.at(-1)?.reason, "image-playlist-settings-updated");
    assert.equal(syncEvents.at(-1)?.scope, "images");
  } finally {
    app.socketService.emitImagesUpdated = originalEmitImagesUpdated;
    app.socketService.emitDisplaySync = originalEmitDisplaySync;
    await app.close();
  }
});

test("PUT /api/image-playlist/duration-all updates every duration without changing other fields", async () => {
  const first = seedManagedImageAsset("playlist-bulk-first.png");
  const second = seedManagedImageAsset("playlist-bulk-second.png");
  const third = seedManagedImageAsset("playlist-bulk-third.png");
  enableImageInSlideshow(first.assetId);
  enableImageInSlideshow(second.assetId);
  enableImageInSlideshow(third.assetId);
  const app = await buildApp();
  clearSeedSlideshowMembership();
  const originalEmitImagesUpdated = app.socketService.emitImagesUpdated.bind(app.socketService);
  const originalEmitDisplaySync = app.socketService.emitDisplaySync.bind(app.socketService);
  const imageEvents: Array<{ action: string; playlist: { entries: Array<{ durationSeconds: number }> } }> = [];
  const syncEvents: Array<{ reason: string; scope: string }> = [];

  app.socketService.emitImagesUpdated = (payload) => {
    imageEvents.push(payload as { action: string; playlist: { entries: Array<{ durationSeconds: number }> } });
    originalEmitImagesUpdated(payload);
  };
  app.socketService.emitDisplaySync = (payload) => {
    syncEvents.push(payload as { reason: string; scope: string });
    originalEmitDisplaySync(payload);
  };

  try {
    await app.inject({
      method: "POST",
      url: "/api/image-playlist/governance/bootstrap"
    });
    await app.inject({
      method: "PUT",
      payload: {
        durationSeconds: 15,
        enabled: false,
        tags: ["夜間"],
        title: "第二張"
      },
      url: "/api/image-playlist/IMG-02"
    });
    await app.inject({
      method: "PUT",
      payload: {
        durationSeconds: 5,
        title: "第三張"
      },
      url: "/api/image-playlist/IMG-03"
    });

    const response = await app.inject({
      method: "PUT",
      payload: {
        durationSeconds: 8
      },
      url: "/api/image-playlist/duration-all"
    });

    assert.equal(response.statusCode, 200);
    const governanceResponse = await app.inject({
      method: "GET",
      url: "/api/image-playlist/governance"
    });
    assert.equal(governanceResponse.statusCode, 200);
    const governanceBody = governanceResponse.json() as {
      playlist: {
        entries: Array<{
          tags: string[];
          title: string | null;
          displayOrder: number;
          durationSeconds: number;
          enabled: boolean;
          entryId: string;
        }>;
      };
    };

    assert.deepEqual(governanceBody.playlist.entries.map((entry) => entry.durationSeconds), [8, 8, 8]);
    assert.deepEqual(governanceBody.playlist.entries.map((entry) => entry.displayOrder), [1, 2, 3]);
    assert.equal(governanceBody.playlist.entries[1]?.enabled, false);
    assert.equal(governanceBody.playlist.entries[1]?.title, "第二張");
    assert.deepEqual(governanceBody.playlist.entries[1]?.tags, ["夜間"]);
    assert.equal(imageEvents.at(-1)?.action, "playlist-duration-all-updated");
    assert.equal(syncEvents.at(-1)?.reason, "image-playlist-duration-all-updated");
    assert.equal(syncEvents.at(-1)?.scope, "images");

    const floorResponse = await app.inject({
      method: "PUT",
      payload: {
        durationSeconds: 0
      },
      url: "/api/image-playlist/duration-all"
    });

    assert.equal(floorResponse.statusCode, 200);
    const floorGovernanceResponse = await app.inject({
      method: "GET",
      url: "/api/image-playlist/governance"
    });
    assert.equal(floorGovernanceResponse.statusCode, 200);
    const floorGovernanceBody = floorGovernanceResponse.json() as {
      playlist: {
        entries: Array<{
          durationSeconds: number;
        }>;
      };
    };
    assert.deepEqual(floorGovernanceBody.playlist.entries.map((entry) => entry.durationSeconds), [1, 1, 1]);
  } finally {
    app.socketService.emitImagesUpdated = originalEmitImagesUpdated;
    app.socketService.emitDisplaySync = originalEmitDisplaySync;
    await app.close();
  }
});

test("GET /api/image-playlist/governance keeps disabled rows visible for management", async () => {
  const first = seedManagedImageAsset("playlist-governance-cover.png");
  const second = seedManagedImageAsset("playlist-governance-gallery.png");
  enableImageInSlideshow(first.assetId);
  enableImageInSlideshow(second.assetId);
  const app = await buildApp();
  clearSeedSlideshowMembership();

  try {
    await app.inject({
      method: "POST",
      url: "/api/image-playlist/governance/bootstrap"
    });

    const disableResponse = await app.inject({
      method: "PUT",
      payload: {
        enabled: false
      },
      url: "/api/image-playlist/IMG-01"
    });

    assert.equal(disableResponse.statusCode, 200);

    const response = await app.inject({
      method: "GET",
      url: "/api/image-playlist/governance"
    });

    assert.equal(response.statusCode, 200);
    const body = response.json() as {
      playlist: {
        entries: Array<{
          enabled: boolean;
          entryId: string;
        }>;
        resolvedEntries: Array<{
          entryId: string;
          isPlayable: boolean;
        }>;
        hasPlaylistRows: boolean;
      };
    };

    assert.equal(body.playlist.hasPlaylistRows, true);
    assert.equal(body.playlist.entries.length, 2);
    assert.equal(body.playlist.entries[0]?.entryId, "IMG-01");
    assert.equal(body.playlist.entries[0]?.enabled, false);
    assert.equal(body.playlist.resolvedEntries[0]?.entryId, "IMG-01");
    assert.equal(body.playlist.resolvedEntries[0]?.isPlayable, false);
  } finally {
    await app.close();
  }
});

test("playlist entry updates do not mirror duration or enabled state back into legacy asset slideshow fields", async () => {
  const asset = seedManagedImageAsset("playlist-ownership-audit.png");
  enableImageInSlideshow(asset.assetId);
  const app = await buildApp();
  clearSeedSlideshowMembership();

  try {
    await app.inject({
      method: "POST",
      url: "/api/image-playlist/governance/bootstrap"
    });

    const response = await app.inject({
      method: "PUT",
      payload: {
        durationSeconds: 18,
        enabled: false
      },
      url: "/api/image-playlist/IMG-01"
    });

    assert.equal(response.statusCode, 200);

    const assetRow = getDatabase()
      .prepare(
        `
          SELECT display_duration, included_in_slideshow
          FROM image_assets
          WHERE id = ?
        `
      )
      .get(asset.assetId) as {
        display_duration: number;
        included_in_slideshow: number;
      };

    assert.equal(assetRow.display_duration, 10);
    assert.equal(assetRow.included_in_slideshow, 1);
  } finally {
    await app.close();
  }
});

test("POST /api/image-playlist/governance/bootstrap creates governable rows explicitly", async () => {
  const first = seedManagedImageAsset("playlist-bootstrap-cover.png");
  const second = seedManagedImageAsset("playlist-bootstrap-gallery.png");
  enableImageInSlideshow(first.assetId);
  enableImageInSlideshow(second.assetId);
  const app = await buildApp();
  clearSeedSlideshowMembership();

  try {
    const response = await app.inject({
      method: "POST",
      url: "/api/image-playlist/governance/bootstrap"
    });

    assert.equal(response.statusCode, 200);
    const body = response.json() as {
      playlist: {
        entries: Array<{
          enabled: boolean;
          entryId: string;
        }>;
        hasPlaylistRows: boolean;
      };
    };

    assert.equal(body.playlist.hasPlaylistRows, true);
    assert.equal(body.playlist.entries.length, 2);
    assert.equal(body.playlist.entries[0]?.entryId, "IMG-01");
    assert.equal(body.playlist.entries[0]?.enabled, true);
  } finally {
    await app.close();
  }
});

test("PUT /api/image-playlist/:entryId clears nullable governance fields when null is sent explicitly", async () => {
  const asset = seedManagedImageAsset("playlist-clearable.png");
  enableImageInSlideshow(asset.assetId);
  const app = await buildApp();
  clearSeedSlideshowMembership();

  try {
    await app.inject({
      method: "POST",
      url: "/api/image-playlist/governance/bootstrap"
    });

    const seedResponse = await app.inject({
      method: "PUT",
      payload: {
        area: "首頁 Hero",
        title: "太陽能板鳥瞰"
      },
      url: "/api/image-playlist/IMG-01"
    });

    assert.equal(seedResponse.statusCode, 200);

    const clearResponse = await app.inject({
      method: "PUT",
      payload: {
        area: null,
        title: null
      },
      url: "/api/image-playlist/IMG-01"
    });

    assert.equal(clearResponse.statusCode, 200);

    const governanceResponse = await app.inject({
      method: "GET",
      url: "/api/image-playlist/governance"
    });

    assert.equal(governanceResponse.statusCode, 200);
    const body = governanceResponse.json() as {
      playlist: {
        entries: Array<{
          area?: string | null;
          entryId: string;
          title?: string | null;
        }>;
      };
    };

    const entry = body.playlist.entries.find((item) => item.entryId === "IMG-01");
    assert.equal(entry?.title, null);
    assert.equal(entry?.area, null);
  } finally {
    await app.close();
  }
});

test("playlist routes persist reordering, metadata, durations, and diagnosable fallback state", async () => {
  const first = seedManagedImageAsset("playlist-first.png");
  const second = seedManagedImageAsset("playlist-second.png");
  enableImageInSlideshow(first.assetId);
  enableImageInSlideshow(second.assetId);
  const app = await buildApp();
  clearSeedSlideshowMembership();

  try {
    await app.inject({
      method: "POST",
      url: "/api/image-playlist/governance/bootstrap"
    });

    const updateResponse = await app.inject({
      method: "PUT",
      payload: {
        area: "首頁 Hero",
        capturedAt: "2026/05/10 14:32",
        description: "首頁封面展示最新太陽能陣列成果。",
        durationSeconds: 25,
        fallbackMode: "display-placeholder",
        tags: ["封面", "太陽能"],
        title: "太陽能板鳥瞰"
      },
      url: "/api/image-playlist/IMG-01"
    });

    assert.equal(updateResponse.statusCode, 200);

    const degradedResponse = await app.inject({
      method: "PUT",
      payload: {
        durationSeconds: 12,
        fallbackMode: "skip"
      },
      url: "/api/image-playlist/IMG-02"
    });

    assert.equal(degradedResponse.statusCode, 200);

    const reorderResponse = await app.inject({
      method: "PUT",
      payload: {
        entries: [
          { displayOrder: 1, durationSeconds: 12, enabled: true, entryId: "IMG-02" },
          { displayOrder: 2, durationSeconds: 25, enabled: true, entryId: "IMG-01" }
        ]
      },
      url: "/api/image-playlist/reorder"
    });

    assert.equal(reorderResponse.statusCode, 200);

    getDatabase().prepare("DELETE FROM image_assets WHERE id = ?").run(second.assetId);

    const response = await app.inject({
      method: "GET",
      url: "/api/image-playlist?activeIndex=0"
    });

    assert.equal(response.statusCode, 200);
    const body = response.json() as {
      playlist: {
        activeEntry: {
          entryId: string;
          infoPanel: {
            area: string;
            title: string;
          };
        };
        entries: Array<{
          durationSeconds: number;
          entryId: string;
          fallbackMode: string;
          fallbackReason: string | null;
          infoPanel: {
            tags: string[];
            title: string;
          };
          isPlayable: boolean;
        }>;
      };
    };

    assert.equal(body.playlist.activeEntry.entryId, "IMG-01");
    assert.equal(body.playlist.activeEntry.infoPanel.title, "太陽能板鳥瞰");
    assert.equal(body.playlist.activeEntry.infoPanel.area, "首頁 Hero");
    assert.equal(body.playlist.entries[0]?.entryId, "IMG-02");
    assert.equal(body.playlist.entries[0]?.fallbackMode, "skip");
    assert.equal(body.playlist.entries[0]?.fallbackReason, "asset-missing");
    assert.equal(body.playlist.entries[0]?.isPlayable, false);
    assert.equal(body.playlist.entries[1]?.durationSeconds, 25);
    assert.deepEqual(body.playlist.entries[1]?.infoPanel.tags, ["封面", "太陽能"]);
    assert.equal(first.assetId > 0, true);
  } finally {
    await app.close();
  }
});

test("DELETE /api/images/:id removes disabled governance rows for the deleted asset", async () => {
  const first = seedManagedImageAsset("playlist-delete-first.png");
  const second = seedManagedImageAsset("playlist-delete-second.png");
  enableImageInSlideshow(first.assetId);
  enableImageInSlideshow(second.assetId);
  const app = await buildApp();
  clearSeedSlideshowMembership();

  try {
    await app.inject({
      method: "POST",
      url: "/api/image-playlist/governance/bootstrap"
    });

    const disableResponse = await app.inject({
      method: "PUT",
      payload: {
        enabled: false
      },
      url: "/api/image-playlist/IMG-01"
    });

    assert.equal(disableResponse.statusCode, 200);

    const deleteResponse = await app.inject({
      method: "DELETE",
      url: `/api/images/${first.assetId}`
    });

    assert.equal(deleteResponse.statusCode, 200);

    const governanceResponse = await app.inject({
      method: "GET",
      url: "/api/image-playlist/governance"
    });

    assert.equal(governanceResponse.statusCode, 200);
    const body = governanceResponse.json() as {
      playlist: {
        entries: Array<{
          assetId: string | null;
          entryId: string;
        }>;
      };
    };

    assert.equal(
      body.playlist.entries.some((entry) => entry.entryId === "IMG-01" || entry.assetId === String(first.assetId)),
      false
    );
  } finally {
    await app.close();
  }
});

test("POST /api/image-playlist/governance/bootstrap assigns a fresh entry id after an older row was removed", async () => {
  const first = seedManagedImageAsset("playlist-gap-first.png");
  const second = seedManagedImageAsset("playlist-gap-second.png");
  enableImageInSlideshow(first.assetId);
  enableImageInSlideshow(second.assetId);
  const app = await buildApp();
  clearSeedSlideshowMembership();

  try {
    const bootstrapResponse = await app.inject({
      method: "POST",
      url: "/api/image-playlist/governance/bootstrap"
    });
    assert.equal(bootstrapResponse.statusCode, 200);

    getDatabase().prepare("DELETE FROM image_playlist_entries WHERE asset_id = ?").run(first.assetId);

    const third = seedManagedImageAsset("playlist-gap-third.png");
    enableImageInSlideshow(third.assetId);

    const response = await app.inject({
      method: "POST",
      url: "/api/image-playlist/governance/bootstrap"
    });

    assert.equal(response.statusCode, 200);
    const body = response.json() as {
      playlist: {
        entries: Array<{
          assetId: string | null;
          entryId: string;
        }>;
      };
    };

    const thirdEntry = body.playlist.entries.find((entry) => entry.assetId === String(third.assetId));
    assert.equal(thirdEntry?.entryId, "IMG-04");
  } finally {
    await app.close();
  }
});
