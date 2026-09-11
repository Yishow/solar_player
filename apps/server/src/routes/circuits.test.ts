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
  getDatabase().prepare("DELETE FROM circuit_configs").run();
}

after(() => {
  rmSync(tempDir, { force: true, recursive: true });
});

test("GET /api/circuits returns seeded circuits", async () => {
  migrateDatabase();
  seedDatabase();
  const app = await buildApp();
  try {
    const response = await app.inject({ method: "GET", url: "/api/circuits" });
    assert.equal(response.statusCode, 200);
    const body = response.json() as { success: boolean; data: CircuitConfig[] };
    assert.equal(body.success, true);
    assert.ok(body.data.length > 0);
    assert.equal(body.data.filter((row) => row.pageKey === "factory-circuit").length, 6);
    assert.equal(body.data.filter((row) => row.pageKey === "factory-circuit-guanyin").length, 8);
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
    const row = (response.json() as { success: boolean; data: CircuitConfig }).data;
    assert.equal(row.nameZh, "測試迴路");
    assert.equal(row.ratedCapacity, 500);
    assert.ok(row.id > 0);
  } finally {
    await app.close();
  }
});

test("GET and POST /api/circuits preserve Factory Circuit page key scope", async () => {
  migrateDatabase();
  seedDatabase();
  clearCircuitsTable();
  const app = await buildApp();
  try {
    for (const payload of [
      { displaySlot: "stamping", nameZh: "中壢沖壓", pageKey: "factory-circuit", ratedCapacity: 500 },
      { displaySlot: "stamping", nameZh: "觀音沖壓", pageKey: "factory-circuit-guanyin", ratedCapacity: 600 }
    ]) {
      const response = await app.inject({ method: "POST", url: "/api/circuits", payload });
      assert.equal(response.statusCode, 200);
    }
    const jungli = await app.inject({ method: "GET", url: "/api/circuits?pageKey=factory-circuit" });
    const guanyin = await app.inject({ method: "GET", url: "/api/circuits?pageKey=factory-circuit-guanyin" });
    assert.deepEqual((jungli.json() as { data: CircuitConfig[] }).data.map((row) => row.nameZh), ["中壢沖壓"]);
    assert.deepEqual((guanyin.json() as { data: CircuitConfig[] }).data.map((row) => row.nameZh), ["觀音沖壓"]);
  } finally {
    await app.close();
  }
});

test("PUT /api/circuits/:id updates circuit metadata and page scope", async () => {
  migrateDatabase();
  seedDatabase();
  clearCircuitsTable();
  const app = await buildApp();
  try {
    const createdResponse = await app.inject({
      method: "POST",
      url: "/api/circuits",
      payload: { displaySlot: "office", nameZh: "待調整工程", pageKey: "factory-circuit", ratedCapacity: 500 }
    });
    const created = (createdResponse.json() as { data: CircuitConfig }).data;
    const response = await app.inject({
      method: "PUT",
      url: `/api/circuits/${created.id}`,
      payload: { nameZh: "更新名稱", ratedCapacity: 999, pageKey: "factory-circuit-guanyin" }
    });
    assert.equal(response.statusCode, 200);
    const updated = (response.json() as { data: CircuitConfig }).data;
    assert.equal(updated.nameZh, "更新名稱");
    assert.equal(updated.ratedCapacity, 999);
    assert.equal(updated.pageKey, "factory-circuit-guanyin");
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
    assert.equal(response.statusCode, 404);
    assert.equal((response.json() as { success: boolean }).success, false);
  } finally {
    await app.close();
  }
});

test("DELETE /api/circuits/:id removes circuit and returns 404 for missing", async () => {
  migrateDatabase();
  seedDatabase();
  clearCircuitsTable();
  const app = await buildApp();
  try {
    const createdResponse = await app.inject({
      method: "POST",
      url: "/api/circuits",
      payload: { nameZh: "ToDelete", ratedCapacity: 100 }
    });
    const created = (createdResponse.json() as { data: CircuitConfig }).data;
    const deleted = await app.inject({ method: "DELETE", url: `/api/circuits/${created.id}` });
    assert.equal(deleted.statusCode, 200);
    const missing = await app.inject({ method: "DELETE", url: `/api/circuits/${created.id}` });
    assert.equal(missing.statusCode, 404);
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
    const circuits: CircuitConfig[] = [];
    for (let index = 0; index < 3; index += 1) {
      const response = await app.inject({
        method: "POST",
        url: "/api/circuits",
        payload: { nameZh: `Circuit ${index}`, ratedCapacity: 100 + index * 100, displayOrder: index + 1 }
      });
      circuits.push((response.json() as { data: CircuitConfig }).data);
    }
    const reversed = circuits.slice().reverse();
    const response = await app.inject({
      method: "PUT",
      url: "/api/circuits/reorder",
      payload: { circuits: reversed.map((row, index) => ({ id: row.id, displayOrder: index + 1 })) }
    });
    assert.equal(response.statusCode, 200);
    const rows = (response.json() as { data: CircuitConfig[] }).data;
    assert.equal(rows[0]?.id, circuits[2]?.id);
    assert.equal(rows[2]?.id, circuits[0]?.id);
  } finally {
    await app.close();
  }
});
