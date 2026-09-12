import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync
} from "node:fs";
import http from "node:http";
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

type RawRequestOptions = {
  body?: Buffer | string | Record<string, unknown>;
  contentType?: string;
  method: string;
  path: string;
};

async function sendRaw(port: number, options: RawRequestOptions) {
  const payload = options.body === undefined
    ? undefined
    : Buffer.isBuffer(options.body)
      ? options.body
      : Buffer.from(typeof options.body === "string" ? options.body : JSON.stringify(options.body));
  const headers: Record<string, number | string> = {};
  if (payload) {
    headers["content-length"] = payload.length;
    headers["content-type"] = options.contentType ?? "application/json";
  }
  return new Promise<{ body: string; statusCode?: number }>((resolve, reject) => {
    const request = http.request({
      host: "127.0.0.1",
      method: options.method,
      path: options.path,
      port,
      headers
    }, (incoming) => {
      let responseBody = "";
      incoming.setEncoding("utf8");
      incoming.on("data", (chunk: string) => {
        responseBody += chunk;
      });
      incoming.on("end", () => resolve({ body: responseBody, statusCode: incoming.statusCode }));
    });
    request.on("error", reject);
    request.end(payload);
  });
}

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

test("raw HTTP backslash cannot bypass any covered management id validator", async () => {
  resetFixtures();
  const db = getDatabase();
  mkdirSync(process.env.UPLOADS_DIR!, { recursive: true });
  mkdirSync(process.env.BRAND_UPLOADS_DIR!, { recursive: true });
  writeFileSync(join(process.env.UPLOADS_DIR!, "fixture.png"), "image fixture");
  const logoBody = Buffer.from("<svg xmlns=\"http://www.w3.org/2000/svg\" />");
  writeFileSync(join(process.env.BRAND_UPLOADS_DIR!, "fixture-logo.svg"), logoBody);
  db.prepare(`
    INSERT INTO brand_profiles (
      id, name, brand_name_zh, brand_name_en, product_title_zh, product_title_en,
      slogan_zh, slogan_en, logo_filename, logo_mime_type, logo_file_size,
      is_active, created_at, updated_at
    ) VALUES (13, 'second-fixture', '', '', '', '', '', '', 'fixture-logo.svg', 'image/svg+xml', ?, 0,
      CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).run(logoBody.length);
  db.prepare(`
    UPDATE brand_profiles
    SET logo_filename = 'fixture-logo.svg', logo_mime_type = 'image/svg+xml', logo_file_size = ?
    WHERE id = 12
  `).run(logoBody.length);
  const app = await buildApp();
  const readPlaylist = () => {
    const exists = db
      .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'image_playlist_entries'")
      .get();
    return exists
      ? db.prepare("SELECT * FROM image_playlist_entries ORDER BY entry_id").all()
      : [];
  };
  const before = {
    brandProfiles: db.prepare("SELECT * FROM brand_profiles ORDER BY id").all(),
    circuit: db.prepare("SELECT * FROM circuit_configs WHERE id = 12").get(),
    image: db.prepare("SELECT * FROM image_assets WHERE id = 12").get(),
    imageBytes: readFileSync(join(process.env.UPLOADS_DIR!, "fixture.png")),
    imageFiles: readdirSync(process.env.UPLOADS_DIR!).sort(),
    logoBytes: readFileSync(join(process.env.BRAND_UPLOADS_DIR!, "fixture-logo.svg")),
    logoFiles: readdirSync(process.env.BRAND_UPLOADS_DIR!).sort(),
    playlist: readPlaylist()
  };
  let circuitEvents = 0;
  let imageEvents = 0;
  let displaySyncEvents = 0;
  const originalCircuitEmit = app.socketService.emitCircuitSettingsUpdated.bind(app.socketService);
  const originalImageEmit = app.socketService.emitImagesUpdated.bind(app.socketService);
  const originalDisplaySyncEmit = app.socketService.emitDisplaySync.bind(app.socketService);
  app.socketService.emitCircuitSettingsUpdated = (payload) => {
    circuitEvents += 1;
    originalCircuitEmit(payload);
  };
  app.socketService.emitImagesUpdated = (payload) => {
    imageEvents += 1;
    originalImageEmit(payload);
  };
  app.socketService.emitDisplaySync = (payload) => {
    displaySyncEvents += 1;
    originalDisplaySyncEmit(payload);
  };

  try {
    await app.listen({ host: "127.0.0.1", port: 0 });
    const address = app.server.address();
    assert.ok(address && typeof address !== "string");
    const boundary = "solar-display-management-validation";
    const logoMultipart = Buffer.from([
      `--${boundary}\r\n`,
      "Content-Disposition: form-data; name=\"file\"; filename=\"replacement.svg\"\r\n",
      "Content-Type: image/svg+xml\r\n\r\n",
      "<svg xmlns=\"http://www.w3.org/2000/svg\" />\r\n",
      `--${boundary}--\r\n`
    ].join(""));
    const malformedRequests = [
      { body: { nameZh: "不該寫入" }, method: "PUT", path: "/api/circuits/12\\abc" },
      { method: "DELETE", path: "/api/circuits/12\\abc" },
      { body: { title: "不該寫入" }, method: "PUT", path: "/api/images/12\\abc" },
      { method: "DELETE", path: "/api/images/12\\abc" },
      { body: { name: "不該寫入" }, method: "PUT", path: "/api/brand/profiles/12\\abc" },
      { method: "DELETE", path: "/api/brand/profiles/12\\abc" },
      { method: "POST", path: "/api/brand/profiles/12\\abc/activate" },
      {
        body: logoMultipart,
        contentType: `multipart/form-data; boundary=${boundary}`,
        method: "POST",
        path: "/api/brand/profiles/12\\abc/logo"
      },
      { method: "DELETE", path: "/api/brand/profiles/12\\abc/logo" },
      { method: "GET", path: "/api/display-ops/assets/12\\abc/references" }
    ];
    for (const request of malformedRequests) {
      const response = await sendRaw(address.port, request);
      assert.equal(response.statusCode, 400, `${request.method} ${request.path}: ${response.body}`);
      assert.deepEqual(db.prepare("SELECT * FROM brand_profiles ORDER BY id").all(), before.brandProfiles);
      assert.deepEqual(db.prepare("SELECT * FROM circuit_configs WHERE id = 12").get(), before.circuit);
      assert.deepEqual(db.prepare("SELECT * FROM image_assets WHERE id = 12").get(), before.image);
      assert.deepEqual(readFileSync(join(process.env.UPLOADS_DIR!, "fixture.png")), before.imageBytes);
      assert.deepEqual(readdirSync(process.env.UPLOADS_DIR!).sort(), before.imageFiles);
      assert.deepEqual(readFileSync(join(process.env.BRAND_UPLOADS_DIR!, "fixture-logo.svg")), before.logoBytes);
      assert.deepEqual(readdirSync(process.env.BRAND_UPLOADS_DIR!).sort(), before.logoFiles);
      assert.deepEqual(readPlaylist(), before.playlist);
    }
    assert.equal(circuitEvents, 0);
    assert.equal(imageEvents, 0);
    assert.equal(displaySyncEvents, 0);
  } finally {
    app.socketService.emitCircuitSettingsUpdated = originalCircuitEmit;
    app.socketService.emitImagesUpdated = originalImageEmit;
    app.socketService.emitDisplaySync = originalDisplaySyncEmit;
    await app.close();
  }
});

test("raw HTTP playlist entry validation uses the matched entryId parameter", async () => {
  resetFixtures();
  const app = await buildApp();
  let imageEvents = 0;
  let displaySyncEvents = 0;
  const originalImageEmit = app.socketService.emitImagesUpdated.bind(app.socketService);
  const originalDisplaySyncEmit = app.socketService.emitDisplaySync.bind(app.socketService);
  app.socketService.emitImagesUpdated = (payload) => {
    imageEvents += 1;
    originalImageEmit(payload);
  };
  app.socketService.emitDisplaySync = (payload) => {
    displaySyncEvents += 1;
    originalDisplaySyncEmit(payload);
  };

  try {
    const bootstrap = await app.inject({
      method: "POST",
      url: "/api/image-playlist/governance/bootstrap"
    });
    assert.equal(bootstrap.statusCode, 200);
    imageEvents = 0;
    displaySyncEvents = 0;
    const before = getDatabase()
      .prepare("SELECT * FROM image_playlist_entries ORDER BY entry_id")
      .all();

    await app.listen({ host: "127.0.0.1", port: 0 });
    const address = app.server.address();
    assert.ok(address && typeof address !== "string");
    const response = await sendRaw(address.port, {
      body: { durationSeconds: 20 },
      method: "PUT",
      path: "/api/image-playlist/IMG-01\\abc"
    });

    assert.equal(response.statusCode, 404, response.body);
    assert.deepEqual(
      getDatabase().prepare("SELECT * FROM image_playlist_entries ORDER BY entry_id").all(),
      before
    );
    assert.equal(imageEvents, 0);
    assert.equal(displaySyncEvents, 0);
  } finally {
    app.socketService.emitImagesUpdated = originalImageEmit;
    app.socketService.emitDisplaySync = originalDisplaySyncEmit;
    await app.close();
  }
});

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
