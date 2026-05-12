import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readdirSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after } from "node:test";
import type { ImageAsset } from "@solar-display/shared";

const tempDir = mkdtempSync(join(tmpdir(), "solar-display-images-test-"));
process.env.DATA_DIR = tempDir;
process.env.DATABASE_PATH = join(tempDir, "solar-display.sqlite");

const [{ buildApp }, { migrateDatabase }, { seedDatabase }, { getDatabase }] = await Promise.all([
  import("../app.js"),
  import("../db/migrate.js"),
  import("../db/seed.js"),
  import("../db/index.js")
]);

function clearImagesTable() {
  const db = getDatabase();
  const rows = db.prepare("SELECT id FROM image_assets").all() as Array<{ id: number }>;
  const deleteStmt = db.prepare("DELETE FROM image_assets WHERE id = ?");
  for (const row of rows) {
    deleteStmt.run(row.id);
  }
  // Also clear upload files
  const uploadsDir = join(tempDir, "uploads");
  if (existsSync(uploadsDir)) {
    for (const file of readdirSync(uploadsDir)) {
      unlinkSync(join(uploadsDir, file));
    }
  }
}

// Helper: create a minimal valid PNG file (1x1 pixel)
function createMinimalPng(): Buffer {
  const pngHeader = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a
  ]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(1, 0);
  ihdrData.writeUInt32BE(1, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 2;
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;
  const ihdrCrc = Buffer.from([0x90, 0x77, 0x53, 0xde]);
  const ihdr = Buffer.concat([
    Buffer.from([0x00, 0x00, 0x00, 0x0d]),
    Buffer.from("IHDR"),
    ihdrData,
    ihdrCrc
  ]);
  const idatData = Buffer.from([0x78, 0x9c, 0x62, 0x60, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01]);
  const idatCrc = Buffer.from([0xe8, 0x03, 0x8e, 0x15]);
  const idat = Buffer.concat([
    Buffer.from([0x00, 0x00, 0x00, 0x0a]),
    Buffer.from("IDAT"),
    idatData,
    idatCrc
  ]);
  const iend = Buffer.concat([
    Buffer.from([0x00, 0x00, 0x00, 0x00]),
    Buffer.from("IEND"),
    Buffer.from([0xae, 0x42, 0x60, 0x82])
  ]);
  return Buffer.concat([pngHeader, ihdr, idat, iend]);
}

// Helper: create a minimal JPEG file
function createMinimalJpeg(): Buffer {
  // Minimal valid JPEG (1x1 red pixel)
  return Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
    0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43,
    0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
    0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
    0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20,
    0x24, 0x2e, 0x27, 0x20, 0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29,
    0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27, 0x39, 0x3d, 0x38, 0x32,
    0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01,
    0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00, 0x1f, 0x00, 0x00,
    0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
    0x09, 0x0a, 0x0b, 0xff, 0xc4, 0x00, 0xb5, 0x10, 0x00, 0x02, 0x01, 0x03,
    0x03, 0x02, 0x04, 0x03, 0x05, 0x05, 0x04, 0x04, 0x00, 0x00, 0x01, 0x7d,
    0x01, 0x02, 0x03, 0x00, 0x04, 0x11, 0x05, 0x12, 0x21, 0x31, 0x41, 0x06,
    0x13, 0x51, 0x61, 0x07, 0x22, 0x71, 0x14, 0x32, 0x81, 0x91, 0xa1, 0x08,
    0x23, 0x42, 0xb1, 0xc1, 0x15, 0x52, 0xd1, 0xf0, 0x24, 0x33, 0x62, 0x72,
    0x82, 0x09, 0x0a, 0x16, 0x17, 0x18, 0x19, 0x1a, 0x25, 0x26, 0x27, 0x28,
    0x29, 0x2a, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3a, 0x43, 0x44, 0x45,
    0x46, 0x47, 0x48, 0x49, 0x4a, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59,
    0x5a, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6a, 0x73, 0x74, 0x75,
    0x76, 0x77, 0x78, 0x79, 0x7a, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89,
    0x8a, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9a, 0xa2, 0xa3,
    0xa4, 0xa5, 0xa6, 0xa7, 0xa8, 0xa9, 0xaa, 0xb2, 0xb3, 0xb4, 0xb5, 0xb6,
    0xb7, 0xb8, 0xb9, 0xba, 0xc2, 0xc3, 0xc4, 0xc5, 0xc6, 0xc7, 0xc8, 0xc9,
    0xca, 0xd2, 0xd3, 0xd4, 0xd5, 0xd6, 0xd7, 0xd8, 0xd9, 0xda, 0xe1, 0xe2,
    0xe3, 0xe4, 0xe5, 0xe6, 0xe7, 0xe8, 0xe9, 0xea, 0xf1, 0xf2, 0xf3, 0xf4,
    0xf5, 0xf6, 0xf7, 0xf8, 0xf9, 0xfa, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01,
    0x00, 0x00, 0x3f, 0x00, 0x7b, 0x40, 0x0f, 0xf2, 0x5f, 0xff, 0xd9
  ]);
}

// Helper: build a proper multipart/form-data body for inject
function buildMultipartBody(filename: string, mimeType: string, content: Buffer): { payload: Buffer; contentType: string } {
  const boundary = `----FastifyFormBoundary${Date.now()}`;
  const contentTypeHeader = `multipart/form-data; boundary=${boundary}`;

  const bodyParts: Buffer[] = [];

  // Add file field
  bodyParts.push(Buffer.from(`--${boundary}\r\n`));
  bodyParts.push(Buffer.from(`Content-Disposition: form-data; name="file"; filename="${filename}"\r\n`));
  bodyParts.push(Buffer.from(`Content-Type: ${mimeType}\r\n\r\n`));
  bodyParts.push(content);
  bodyParts.push(Buffer.from(`\r\n--${boundary}--\r\n`));

  return {
    payload: Buffer.concat(bodyParts),
    contentType: contentTypeHeader
  };
}

after(() => {
  rmSync(tempDir, { force: true, recursive: true });
});

test("GET /api/images returns empty list when no images exist", async () => {
  migrateDatabase();
  seedDatabase();
  clearImagesTable();

  const app = await buildApp();

  try {
    const response = await app.inject({
      method: "GET",
      url: "/api/images"
    });

    assert.equal(response.statusCode, 200);
    const body = response.json() as { success: boolean; data: ImageAsset[] };
    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.data));
    assert.equal(body.data.length, 0);
  } finally {
    await app.close();
  }
});

test("POST /api/images uploads a valid PNG image and stores it in the database", async () => {
  migrateDatabase();
  seedDatabase();
  clearImagesTable();

  const app = await buildApp();
  const emittedEvents: unknown[] = [];
  const originalEmit = app.socketService.emitImagesUpdated.bind(app.socketService);
  app.socketService.emitImagesUpdated = (payload: unknown) => {
    emittedEvents.push(payload);
    originalEmit(payload);
  };

  try {
    const pngBuffer = createMinimalPng();
    const { payload, contentType } = buildMultipartBody("test-image.png", "image/png", pngBuffer);

    const response = await app.inject({
      method: "POST",
      url: "/api/images",
      headers: { "content-type": contentType },
      payload
    });

    assert.equal(response.statusCode, 201);
    const body = response.json() as { success: boolean; data: ImageAsset };
    assert.equal(body.success, true);
    assert.equal(body.data.originalName, "test-image.png");
    assert.equal(body.data.mimeType, "image/png");
    assert.ok(body.data.id > 0);
    assert.equal(emittedEvents.length, 1);
  } finally {
    app.socketService.emitImagesUpdated = originalEmit;
    await app.close();
  }
});

test("POST /api/images uploads a valid JPEG image", async () => {
  migrateDatabase();
  seedDatabase();
  clearImagesTable();

  const app = await buildApp();

  try {
    const jpegBuffer = createMinimalJpeg();
    const { payload, contentType } = buildMultipartBody("test-image.jpg", "image/jpeg", jpegBuffer);

    const response = await app.inject({
      method: "POST",
      url: "/api/images",
      headers: { "content-type": contentType },
      payload
    });

    assert.equal(response.statusCode, 201);
    const body = response.json() as { success: boolean; data: ImageAsset };
    assert.equal(body.success, true);
    assert.equal(body.data.originalName, "test-image.jpg");
  } finally {
    await app.close();
  }
});

test("POST /api/images rejects non-image files", async () => {
  migrateDatabase();
  seedDatabase();
  clearImagesTable();

  const app = await buildApp();

  try {
    const { payload, contentType } = buildMultipartBody("test.txt", "text/plain", Buffer.from("not an image"));

    const response = await app.inject({
      method: "POST",
      url: "/api/images",
      headers: { "content-type": contentType },
      payload
    });

    assert.equal(response.statusCode, 400);
  } finally {
    await app.close();
  }
});

test("POST /api/images rejects files with invalid extensions", async () => {
  migrateDatabase();
  seedDatabase();
  clearImagesTable();

  const app = await buildApp();

  try {
    const pngBuffer = createMinimalPng();
    const { payload, contentType } = buildMultipartBody("test-image.gif", "image/gif", pngBuffer);

    const response = await app.inject({
      method: "POST",
      url: "/api/images",
      headers: { "content-type": contentType },
      payload
    });

    assert.equal(response.statusCode, 400);
  } finally {
    await app.close();
  }
});

test("PUT /api/images/:id updates image metadata", async () => {
  migrateDatabase();
  seedDatabase();
  clearImagesTable();

  const app = await buildApp();

  try {
    // First upload an image
    const pngBuffer = createMinimalPng();
    const { payload, contentType } = buildMultipartBody("update-test.png", "image/png", pngBuffer);

    const uploadResponse = await app.inject({
      method: "POST",
      url: "/api/images",
      headers: { "content-type": contentType },
      payload
    });
    assert.equal(uploadResponse.statusCode, 201);
    const uploaded = (uploadResponse.json() as { data: ImageAsset }).data;

    // Update metadata
    const updateResponse = await app.inject({
      method: "PUT",
      url: `/api/images/${uploaded.id}`,
      payload: {
        title: "Updated Title",
        description: "Updated description",
        includedInSlideshow: true,
        isCover: true,
        displayDuration: 20
      }
    });

    assert.equal(updateResponse.statusCode, 200);
    const updated = (updateResponse.json() as { data: ImageAsset }).data;
    assert.equal(updated.title, "Updated Title");
    assert.equal(updated.description, "Updated description");
    assert.equal(updated.includedInSlideshow, true);
    assert.equal(updated.isCover, true);
    assert.equal(updated.displayDuration, 20);
  } finally {
    await app.close();
  }
});

test("PUT /api/images/:id returns 404 for non-existent image", async () => {
  migrateDatabase();
  seedDatabase();
  clearImagesTable();

  const app = await buildApp();

  try {
    const response = await app.inject({
      method: "PUT",
      url: "/api/images/99999",
      payload: { title: "Does Not Exist" }
    });

    assert.equal(response.statusCode, 404);
  } finally {
    await app.close();
  }
});

test("DELETE /api/images/:id removes image from database", async () => {
  migrateDatabase();
  seedDatabase();
  clearImagesTable();

  const app = await buildApp();

  try {
    // Upload an image first
    const pngBuffer = createMinimalPng();
    const { payload, contentType } = buildMultipartBody("delete-test.png", "image/png", pngBuffer);

    const uploadResponse = await app.inject({
      method: "POST",
      url: "/api/images",
      headers: { "content-type": contentType },
      payload
    });
    assert.equal(uploadResponse.statusCode, 201);
    const uploaded = (uploadResponse.json() as { data: ImageAsset }).data;

    // Delete the image
    const deleteResponse = await app.inject({
      method: "DELETE",
      url: `/api/images/${uploaded.id}`
    });

    assert.equal(deleteResponse.statusCode, 200);
    const deletedBody = deleteResponse.json() as { data: { id: number } };
    assert.equal(deletedBody.data.id, uploaded.id);

    // Verify image is gone
    const getResponse = await app.inject({
      method: "GET",
      url: "/api/images"
    });
    const images = (getResponse.json() as { data: ImageAsset[] }).data;
    assert.equal(images.length, 0);
  } finally {
    await app.close();
  }
});

test("DELETE /api/images/:id returns 404 for non-existent image", async () => {
  migrateDatabase();
  seedDatabase();
  clearImagesTable();

  const app = await buildApp();

  try {
    const response = await app.inject({
      method: "DELETE",
      url: "/api/images/99999"
    });

    assert.equal(response.statusCode, 404);
  } finally {
    await app.close();
  }
});

test("PUT /api/images/reorder updates display order", async () => {
  migrateDatabase();
  seedDatabase();
  clearImagesTable();

  const app = await buildApp();

  try {
    const pngBuffer = createMinimalPng();
    const images: ImageAsset[] = [];

    for (let i = 0; i < 3; i++) {
      const { payload, contentType } = buildMultipartBody(`reorder-${i}.png`, "image/png", pngBuffer);

      const uploadResponse = await app.inject({
        method: "POST",
        url: "/api/images",
        headers: { "content-type": contentType },
        payload
      });
      assert.equal(uploadResponse.statusCode, 201);
      images.push((uploadResponse.json() as { data: ImageAsset }).data);
    }

    // Reorder: reverse the order
    const reversed = images.slice().reverse();
    const reorderResponse = await app.inject({
      method: "PUT",
      url: "/api/images/reorder",
      payload: {
        images: reversed.map((img, index) => ({
          id: img.id,
          displayOrder: index + 1
        }))
      }
    });

    assert.equal(reorderResponse.statusCode, 200);
    const reordered = (reorderResponse.json() as { data: ImageAsset[] }).data;

    assert.equal(reordered[0]?.id, images[2]?.id);
    assert.equal(reordered[1]?.id, images[1]?.id);
    assert.equal(reordered[2]?.id, images[0]?.id);
  } finally {
    await app.close();
  }
});

test("GET /api/images/storage-usage returns storage information", async () => {
  migrateDatabase();
  seedDatabase();
  clearImagesTable();

  const app = await buildApp();

  try {
    const response = await app.inject({
      method: "GET",
      url: "/api/images/storage-usage"
    });

    assert.equal(response.statusCode, 200);
    const body = response.json() as {
      success: boolean;
      data: { usedBytes: number; usedMB: number; fileCount: number };
    };
    assert.equal(body.success, true);
    assert.ok(typeof body.data.usedBytes === "number");
    assert.ok(typeof body.data.fileCount === "number");
  } finally {
    await app.close();
  }
});

test("Full lifecycle: upload, update, list, reorder, delete", async () => {
  migrateDatabase();
  seedDatabase();
  clearImagesTable();

  const app = await buildApp();
  const emittedEvents: unknown[] = [];
  const originalEmit = app.socketService.emitImagesUpdated.bind(app.socketService);
  app.socketService.emitImagesUpdated = (payload: unknown) => {
    emittedEvents.push(payload);
    originalEmit(payload);
  };

  try {
    const pngBuffer = createMinimalPng();
    const images: ImageAsset[] = [];

    // Upload 2 images
    for (let i = 0; i < 2; i++) {
      const { payload, contentType } = buildMultipartBody(`lifecycle-${i}.png`, "image/png", pngBuffer);

      const uploadResponse = await app.inject({
        method: "POST",
        url: "/api/images",
        headers: { "content-type": contentType },
        payload
      });
      assert.equal(uploadResponse.statusCode, 201);
      images.push((uploadResponse.json() as { data: ImageAsset }).data);
    }

    // List images
    const listResponse = await app.inject({
      method: "GET",
      url: "/api/images"
    });
    assert.equal(listResponse.statusCode, 200);
    const listed = (listResponse.json() as { data: ImageAsset[] }).data;
    assert.equal(listed.length, 2);

    // Update first image
    const updateResponse = await app.inject({
      method: "PUT",
      url: `/api/images/${images[0]?.id}`,
      payload: { title: "Lifecycle Test Image", includedInSlideshow: true }
    });
    assert.equal(updateResponse.statusCode, 200);
    const updated = (updateResponse.json() as { data: ImageAsset }).data;
    assert.equal(updated.title, "Lifecycle Test Image");

    // Reorder
    const reorderResponse = await app.inject({
      method: "PUT",
      url: "/api/images/reorder",
      payload: {
        images: [
          { id: images[1]!.id, displayOrder: 1 },
          { id: images[0]!.id, displayOrder: 2 }
        ]
      }
    });
    assert.equal(reorderResponse.statusCode, 200);

    // Delete first image
    const deleteResponse = await app.inject({
      method: "DELETE",
      url: `/api/images/${images[0]?.id}`
    });
    assert.equal(deleteResponse.statusCode, 200);

    // Verify only one image remains
    const finalResponse = await app.inject({
      method: "GET",
      url: "/api/images"
    });
    const finalList = (finalResponse.json() as { data: ImageAsset[] }).data;
    assert.equal(finalList.length, 1);
    assert.equal(finalList[0]?.id, images[1]?.id);

    // Verify socket events were emitted
    assert.ok(emittedEvents.length >= 5);
  } finally {
    app.socketService.emitImagesUpdated = originalEmit;
    await app.close();
  }
});
