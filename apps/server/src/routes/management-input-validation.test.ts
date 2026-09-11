import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after } from "node:test";

const tempDir = mkdtempSync(join(tmpdir(), "solar-display-management-validation-test-"));
process.env.DATA_DIR = tempDir;
process.env.DATABASE_PATH = join(tempDir, "solar-display.sqlite");
process.env.UPLOADS_DIR = join(tempDir, "uploads", "images");
process.env.BRAND_UPLOADS_DIR = join(tempDir, "uploads", "brand");

const [{ buildApp }, { migrateDatabase }, { seedDatabase }, { getDatabase }] = await Promise.all([
  import("../app.js"),
  import("../db/migrate.js"),
  import("../db/seed.js"),
  import("../db/index.js")
]);

after(() => rmSync(tempDir, { force: true, recursive: true }));

function resetFixtures() {
  migrateDatabase();
  seedDatabase();
  const db = getDatabase();
  db.prepare("DELETE FROM circuit_configs").run();
  const playlistTable = db
    .prepare(
      `
        SELECT name
        FROM sqlite_master
        WHERE type = 'table' AND name = 'image_playlist_entries'
      `
    )
    .get();
  if (playlistTable) {
    db.prepare("DELETE FROM image_playlist_entries").run();
  }
  db.prepare("DELETE FROM image_assets").run();
  db.prepare("DELETE FROM brand_profiles").run();

  db.prepare(`
    INSERT INTO circuit_configs (
      id, page_key, name_zh, unit, rated_capacity,
      normal_min, normal_max, attention_min, attention_max, warning_min, warning_max,
      display_order, display_slot, enabled, created_at, updated_at
    ) VALUES (12, 'factory-circuit', '固定迴路', 'kW', 100, 0, 70, 70, 90, 90, 100, 1, 'office', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).run();
  db.prepare(`
    INSERT INTO image_assets (
      id, category, usage_scope, filename, original_name, title, mime_type, file_size,
      aspect_ratio, display_duration, display_order, included_in_slideshow, is_cover,
      created_at, updated_at
    ) VALUES (12, 'background', 'both', 'fixture.png', 'fixture.png', 'fixture', 'image/png', 1,
      1, 10, 1, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).run();
  db.prepare(`
    INSERT INTO brand_profiles (
      id, name, brand_name_zh, brand_name_en, product_title_zh, product_title_en,
      slogan_zh, slogan_en, is_active, created_at, updated_at
    ) VALUES (12, 'fixture', '', '', '', '', '', '', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).run();
}

const malformedIds = ["12abc", "12.0", "+12", "0", "-1", "9007199254740992"];

test("covered management routes reject non-canonical numeric ids with 400", async () => {
  resetFixtures();
  const app = await buildApp();
  try {
    for (const id of malformedIds) {
      const cases = [
        { method: "PUT" as const, url: `/api/circuits/${id}`, payload: { nameZh: "不該寫入" } },
        { method: "DELETE" as const, url: `/api/images/${id}` },
        { method: "PUT" as const, url: `/api/brand/profiles/${id}`, payload: { name: "不該寫入" } },
        { method: "GET" as const, url: `/api/display-ops/assets/${id}/references` }
      ];
      for (const request of cases) {
        const response = await app.inject(request);
        assert.equal(response.statusCode, 400, `${request.method} ${request.url}`);
      }
    }

    const circuit = getDatabase().prepare("SELECT name_zh FROM circuit_configs WHERE id = 12").get() as { name_zh: string };
    assert.equal(circuit.name_zh, "固定迴路");
    const brand = getDatabase().prepare("SELECT name FROM brand_profiles WHERE id = 12").get() as { name: string };
    assert.equal(brand.name, "fixture");
    assert.ok(getDatabase().prepare("SELECT 1 FROM image_assets WHERE id = 12").get());
  } finally {
    await app.close();
  }
});

test("covered valid-but-missing ids return 404", async () => {
  resetFixtures();
  const app = await buildApp();
  try {
    for (const request of [
      { method: "PUT" as const, url: "/api/circuits/99999", payload: { nameZh: "missing" } },
      { method: "PUT" as const, url: "/api/images/99999", payload: { title: "missing" } },
      { method: "PUT" as const, url: "/api/brand/profiles/99999", payload: { name: "missing" } },
      { method: "GET" as const, url: "/api/display-ops/assets/99999/references" }
    ]) {
      const response = await app.inject(request);
      assert.equal(response.statusCode, 404, `${request.method} ${request.url}`);
    }
  } finally {
    await app.close();
  }
});

test("Circuit create and partial update reject invalid candidates without persistence", async () => {
  resetFixtures();
  const app = await buildApp();
  try {
    const beforeCount = (getDatabase().prepare("SELECT COUNT(*) AS count FROM circuit_configs").get() as { count: number }).count;
    for (const payload of [
      { nameZh: "", ratedCapacity: 100 },
      { nameZh: "bad", ratedCapacity: -1 },
      { nameZh: "bad", ratedCapacity: 100, normalMax: 80, attentionMin: 70 },
      { nameZh: "bad", ratedCapacity: 100, displaySlot: "not-a-slot" },
      { nameZh: "bad", ratedCapacity: 100, displayOrder: 1.5 }
    ]) {
      const response = await app.inject({ method: "POST", url: "/api/circuits", payload });
      assert.equal(response.statusCode, 400);
    }
    const afterCount = (getDatabase().prepare("SELECT COUNT(*) AS count FROM circuit_configs").get() as { count: number }).count;
    assert.equal(afterCount, beforeCount);

    const before = getDatabase().prepare("SELECT * FROM circuit_configs WHERE id = 12").get();
    const response = await app.inject({
      method: "PUT",
      url: "/api/circuits/12",
      payload: { attentionMin: 60 }
    });
    assert.equal(response.statusCode, 400);
    const after = getDatabase().prepare("SELECT * FROM circuit_configs WHERE id = 12").get();
    assert.deepEqual(after, before);
  } finally {
    await app.close();
  }
});

test("Image updates reject invalid runtime values before changing metadata", async () => {
  resetFixtures();
  const app = await buildApp();
  try {
    const before = getDatabase().prepare("SELECT * FROM image_assets WHERE id = 12").get();
    for (const payload of [
      { displayDuration: 0 },
      { displayDuration: 1.5 },
      { aspectRatio: 0 },
      { category: "wallpaper" },
      { usageScope: "everywhere" },
      { isCover: 1 },
      { includedInSlideshow: "true" }
    ]) {
      const response = await app.inject({ method: "PUT", url: "/api/images/12", payload });
      assert.equal(response.statusCode, 400, JSON.stringify(payload));
      assert.deepEqual(getDatabase().prepare("SELECT * FROM image_assets WHERE id = 12").get(), before);
    }
  } finally {
    await app.close();
  }
});

test("Circuit and image reorder validate the whole request before any update", async () => {
  resetFixtures();
  const db = getDatabase();
  db.prepare(`INSERT INTO circuit_configs (
    id, page_key, name_zh, rated_capacity, normal_min, normal_max, attention_min, attention_max,
    warning_min, warning_max, display_order, enabled
  ) VALUES (13, 'factory-circuit', '第二迴路', 100, 0, 70, 70, 90, 90, 100, 2, 1)`).run();
  db.prepare(`INSERT INTO image_assets (
    id, category, usage_scope, filename, display_duration, display_order, included_in_slideshow, is_cover
  ) VALUES (13, 'background', 'both', 'fixture-2.png', 10, 2, 0, 0)`).run();

  const app = await buildApp();
  try {
    const circuitBefore = db.prepare("SELECT id, display_order FROM circuit_configs WHERE id IN (12,13) ORDER BY id").all();
    const imageBefore = db.prepare("SELECT id, display_order FROM image_assets WHERE id IN (12,13) ORDER BY id").all();

    for (const payload of [
      { circuits: [{ id: 12, displayOrder: 9 }, { id: 99999, displayOrder: 1 }] },
      { circuits: [{ id: 12, displayOrder: 9 }, { id: 12, displayOrder: 1 }] },
      { circuits: [{ id: 12, displayOrder: -1 }] },
      { circuits: [{ id: 12, displayOrder: 1.5 }] }
    ]) {
      const response = await app.inject({ method: "PUT", url: "/api/circuits/reorder", payload });
      assert.equal(response.statusCode, 400);
      assert.deepEqual(db.prepare("SELECT id, display_order FROM circuit_configs WHERE id IN (12,13) ORDER BY id").all(), circuitBefore);
    }

    for (const payload of [
      { images: [{ id: 12, displayOrder: 9 }, { id: 99999, displayOrder: 1 }] },
      { images: [{ id: 12, displayOrder: 9 }, { id: 12, displayOrder: 1 }] },
      { images: [{ id: 12, displayOrder: -1 }] },
      { images: [{ id: 12, displayOrder: 1.5 }] }
    ]) {
      const response = await app.inject({ method: "PUT", url: "/api/images/reorder", payload });
      assert.equal(response.statusCode, 400);
      assert.deepEqual(db.prepare("SELECT id, display_order FROM image_assets WHERE id IN (12,13) ORDER BY id").all(), imageBefore);
    }
  } finally {
    await app.close();
  }
});
