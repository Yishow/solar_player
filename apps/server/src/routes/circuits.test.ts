import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after } from "node:test";
import type { CircuitConfig } from "@solar-display/shared";

const tempDir = mkdtempSync(join(tmpdir(), "solar-display-circuits-test-"));
process.env.DATA_DIR = tempDir;
process.env.DATABASE_PATH = join(tempDir, "solar-display.sqlite");

const [{ buildApp }, { migrateDatabase }, { seedDatabase }, { getDatabase }] = await Promise.all([
  import("../app.js"),
  import("../db/migrate.js"),
  import("../db/seed.js"),
  import("../db/index.js")
]);

function clearCircuitsTable() {
  const db = getDatabase();
  db.prepare("DELETE FROM circuit_configs").run();
}

after(() => {
  rmSync(tempDir, { force: true, recursive: true });
});

test("GET /api/circuits returns seeded circuits", async () => {
  migrateDatabase();
  seedDatabase();

  const app = await buildApp();

  try {
    const response = await app.inject({
      method: "GET",
      url: "/api/circuits"
    });

    assert.equal(response.statusCode, 200);
    const body = response.json() as { success: boolean; data: CircuitConfig[] };
    assert.equal(body.success, true);
    assert.ok(body.data.length > 0, "Should have seeded circuits");
  } finally {
    await app.close();
  }
});

test("POST /api/circuits creates a new circuit", async () => {
  migrateDatabase();
  seedDatabase();

  const app = await buildApp();

  try {
    const response = await app.inject({
      method: "POST",
      url: "/api/circuits",
      payload: {
        nameZh: "測試迴路",
        nameEn: "Test Circuit",
        icon: "test",
        unit: "kW",
        mqttTopic: "test/circuit/1",
        ratedCapacity: 500
      }
    });

    assert.equal(response.statusCode, 200);
    const body = response.json() as { success: boolean; data: CircuitConfig };
    assert.equal(body.success, true);
    assert.equal(body.data.nameZh, "測試迴路");
    assert.equal(body.data.ratedCapacity, 500);
    assert.ok(body.data.id > 0);
  } finally {
    await app.close();
  }
});

test("PUT /api/circuits/:id updates circuit metadata", async () => {
  migrateDatabase();
  seedDatabase();

  const app = await buildApp();

  try {
    // Get first circuit
    const getResponse = await app.inject({ method: "GET", url: "/api/circuits" });
    const circuits = (getResponse.json() as { data: CircuitConfig[] }).data;
    const firstCircuit = circuits[0];
    assert.ok(firstCircuit);

    const updateResponse = await app.inject({
      method: "PUT",
      url: `/api/circuits/${firstCircuit.id}`,
      payload: {
        nameZh: "更新名稱",
        ratedCapacity: 999
      }
    });

    assert.equal(updateResponse.statusCode, 200);
    const updated = (updateResponse.json() as { data: CircuitConfig }).data;
    assert.equal(updated.nameZh, "更新名稱");
    assert.equal(updated.ratedCapacity, 999);
  } finally {
    await app.close();
  }
});

test("PUT /api/circuits/:id returns 404 for non-existent circuit", async () => {
  migrateDatabase();
  seedDatabase();

  const app = await buildApp();

  try {
    const response = await app.inject({
      method: "PUT",
      url: "/api/circuits/99999",
      payload: { nameZh: "NotExist" }
    });

    assert.equal(response.statusCode, 200);
    const body = response.json() as { success: boolean };
    assert.equal(body.success, false);
  } finally {
    await app.close();
  }
});

test("DELETE /api/circuits/:id removes circuit", async () => {
  migrateDatabase();
  seedDatabase();
  clearCircuitsTable();

  const app = await buildApp();

  try {
    // Create a circuit
    const createResponse = await app.inject({
      method: "POST",
      url: "/api/circuits",
      payload: { nameZh: "ToDelete", ratedCapacity: 100 }
    });
    assert.equal(createResponse.statusCode, 200);
    const created = (createResponse.json() as { data: CircuitConfig }).data;

    // Delete it
    const deleteResponse = await app.inject({
      method: "DELETE",
      url: `/api/circuits/${created.id}`
    });
    assert.equal(deleteResponse.statusCode, 200);

    // Verify gone
    const getResponse = await app.inject({ method: "GET", url: "/api/circuits" });
    const circuits = (getResponse.json() as { data: CircuitConfig[] }).data;
    assert.equal(circuits.length, 0);
  } finally {
    await app.close();
  }
});

test("DELETE /api/circuits/:id returns 404 for non-existent circuit", async () => {
  migrateDatabase();
  seedDatabase();

  const app = await buildApp();

  try {
    const response = await app.inject({
      method: "DELETE",
      url: "/api/circuits/99999"
    });

    assert.equal(response.statusCode, 404);
  } finally {
    await app.close();
  }
});

test("PUT /api/circuits/reorder updates display order", async () => {
  migrateDatabase();
  seedDatabase();
  clearCircuitsTable();

  const app = await buildApp();

  try {
    // Create 3 circuits
    const circuits: CircuitConfig[] = [];
    for (let i = 0; i < 3; i++) {
      const resp = await app.inject({
        method: "POST",
        url: "/api/circuits",
        payload: { nameZh: `Circuit ${i}`, ratedCapacity: 100 + i * 100, displayOrder: i + 1 }
      });
      circuits.push((resp.json() as { data: CircuitConfig }).data);
    }

    // Reverse order
    const reversed = circuits.slice().reverse();
    const reorderResponse = await app.inject({
      method: "PUT",
      url: "/api/circuits/reorder",
      payload: {
        circuits: reversed.map((c, idx) => ({ id: c.id, displayOrder: idx + 1 }))
      }
    });

    assert.equal(reorderResponse.statusCode, 200);
    const reordered = (reorderResponse.json() as { data: CircuitConfig[] }).data;
    assert.equal(reordered[0]?.id, circuits[2]?.id);
    assert.equal(reordered[2]?.id, circuits[0]?.id);
  } finally {
    await app.close();
  }
});
