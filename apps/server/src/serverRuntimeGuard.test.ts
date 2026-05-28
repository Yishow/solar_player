import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { acquireServerRuntimeGuard } from "./serverRuntimeGuard.js";

test("acquireServerRuntimeGuard blocks a second live backend instance", () => {
  const dataDir = mkdtempSync(join(tmpdir(), "solar-display-runtime-guard-"));
  const lockPath = join(dataDir, "server-runtime.lock.json");

  try {
    const release = acquireServerRuntimeGuard({
      dataDir,
      pid: process.pid,
      token: "primary-lock"
    });

    assert.throws(
      () =>
        acquireServerRuntimeGuard({
          dataDir,
          pid: process.pid,
          token: "secondary-lock"
        }),
      (error: unknown) =>
        error instanceof Error
        && error.message.includes("Another solar-display backend is already running")
        && error.message.includes(`pid ${process.pid}`)
        && error.message.includes(lockPath)
    );

    release();
  } finally {
    rmSync(dataDir, { force: true, recursive: true });
  }
});

test("acquireServerRuntimeGuard clears a stale backend lock", () => {
  const dataDir = mkdtempSync(join(tmpdir(), "solar-display-runtime-guard-"));
  const lockPath = join(dataDir, "server-runtime.lock.json");

  try {
    writeFileSync(
      lockPath,
      JSON.stringify({
        createdAt: "2026-05-28T00:00:00.000Z",
        pid: 999999,
        token: "stale-lock"
      })
    );

    const release = acquireServerRuntimeGuard({
      dataDir,
      pid: 54321,
      token: "fresh-lock"
    });

    release();
  } finally {
    rmSync(dataDir, { force: true, recursive: true });
  }
});
