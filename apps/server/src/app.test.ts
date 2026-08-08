import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { buildApp } from "./app.js";
import { migrateDatabase } from "./db/migrate.js";

migrateDatabase();

const INTERNAL_DETAIL = "internal-detail-that-must-not-escape";

test("the error envelope is installed before any route plugin is registered", () => {
  // A Fastify plugin captures the error handler that exists at the moment it is
  // registered, so a handler set afterwards never reaches it. Nothing about the
  // route looks wrong when that happens and no request-level test can observe
  // it once each route catches its own errors — so the ordering is pinned here.
  const source = readFileSync(fileURLToPath(new URL("./app.ts", import.meta.url)), "utf8");
  const errorHandlerIndex = source.indexOf("app.setErrorHandler(");
  const firstRegisterIndex = source.indexOf("app.register(");

  assert.notEqual(errorHandlerIndex, -1);
  assert.notEqual(firstRegisterIndex, -1);
  assert.ok(
    errorHandlerIndex < firstRegisterIndex,
    "app.setErrorHandler must be called before the first app.register, or routes registered earlier answer errors with the framework default"
  );
});

test("an uncaught route error is answered through the envelope without leaking its message", async () => {
  const app = await buildApp();

  try {
    await app.register(async (child) => {
      child.get("/api/__error-envelope-probe", async () => {
        throw new Error(INTERNAL_DETAIL);
      });
    });
    await app.ready();

    const response = await app.inject({ method: "GET", url: "/api/__error-envelope-probe" });

    assert.equal(response.statusCode, 500);
    const body = response.json() as { success: boolean; error: string; timestamp: string };
    assert.equal(body.success, false);
    assert.equal(body.error, "Internal Server Error");
    assert.equal(typeof body.timestamp, "string");
    assert.equal(response.body.includes(INTERNAL_DETAIL), false);
  } finally {
    await app.close();
  }
});

test("a client error raised by a route keeps its own message in the envelope", async () => {
  const app = await buildApp();

  try {
    await app.register(async (child) => {
      child.get("/api/__client-error-probe", async () => {
        const error = new Error("caller supplied an unusable value") as Error & { statusCode?: number };
        error.statusCode = 422;
        throw error;
      });
    });
    await app.ready();

    const response = await app.inject({ method: "GET", url: "/api/__client-error-probe" });

    assert.equal(response.statusCode, 422);
    const body = response.json() as { success: boolean; error: string };
    assert.equal(body.success, false);
    assert.equal(body.error, "caller supplied an unusable value");
  } finally {
    await app.close();
  }
});
