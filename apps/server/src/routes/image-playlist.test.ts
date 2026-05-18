import assert from "node:assert/strict";
import test from "node:test";
import {
  buildApp,
  getDatabase,
  seedManagedImageAsset
} from "./display-pages-asset-governance.test-support.js";

test("GET /api/image-playlist bootstraps ordered playlist entries from image assets", async () => {
  seedManagedImageAsset("playlist-cover.png");
  seedManagedImageAsset("playlist-gallery.png");
  const app = await buildApp();

  try {
    const response = await app.inject({
      method: "GET",
      url: "/api/image-playlist"
    });

    assert.equal(response.statusCode, 200);
    const body = response.json() as {
      playlist: {
        entries: Array<{
          displayOrder: number;
          durationSeconds: number;
          enabled: boolean;
          entryId: string;
        }>;
      };
    };

    assert.equal(body.playlist.entries.length, 2);
    assert.equal(body.playlist.entries[0]?.entryId, "IMG-01");
    assert.equal(body.playlist.entries[0]?.displayOrder, 1);
    assert.equal(body.playlist.entries[0]?.enabled, true);
    assert.equal(body.playlist.entries[0]?.durationSeconds, 10);
  } finally {
    await app.close();
  }
});

test("playlist routes persist reordering, metadata, durations, and diagnosable fallback state", async () => {
  const first = seedManagedImageAsset("playlist-first.png");
  const second = seedManagedImageAsset("playlist-second.png");
  const app = await buildApp();

  try {
    await app.inject({
      method: "GET",
      url: "/api/image-playlist"
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
