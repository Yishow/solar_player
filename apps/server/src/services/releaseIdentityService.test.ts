import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { parseReleaseManifest, readReleaseIdentity } from "./releaseIdentityService.js";

const validManifest = {
  releaseId: "0.1.0+abc1234def56",
  commit: "abc1234def5678901234567890abcdef12345678",
  builtAt: "2026-07-14T00:00:00.000Z",
  packageVersion: "0.1.0",
  schemaVersion: 22,
  sourceDirty: false
};

test("parseReleaseManifest accepts a complete manifest", () => {
  const parsed = parseReleaseManifest(validManifest);
  assert.equal(parsed.releaseId, validManifest.releaseId);
  assert.equal(parsed.schemaVersion, 22);
  assert.equal(parsed.sourceDirty, false);
});

test("parseReleaseManifest rejects corrupt manifests", () => {
  assert.throws(() => parseReleaseManifest({ releaseId: "x" }), /missing commit/);
  assert.throws(
    () => parseReleaseManifest({ ...validManifest, schemaVersion: "22" }),
    /invalid schemaVersion/
  );
});

test("readReleaseIdentity returns available identity for a valid file", () => {
  const dir = mkdtempSync(join(tmpdir(), "release-identity-"));
  const path = join(dir, "release-manifest.json");
  try {
    writeFileSync(path, JSON.stringify(validManifest), "utf8");
    const identity = readReleaseIdentity({ manifestPath: path });
    assert.equal(identity.available, true);
    assert.equal(identity.releaseId, validManifest.releaseId);
    assert.equal(identity.packageVersion, "0.1.0");
    assert.equal(identity.unavailableReason, null);
  } finally {
    rmSync(dir, { force: true, recursive: true });
  }
});

test("readReleaseIdentity reports missing and corrupt manifests without throwing", () => {
  const dir = mkdtempSync(join(tmpdir(), "release-identity-"));
  try {
    const missing = readReleaseIdentity({ manifestPath: join(dir, "missing.json") });
    assert.equal(missing.available, false);
    assert.match(missing.unavailableReason ?? "", /missing/i);

    const corruptPath = join(dir, "corrupt.json");
    writeFileSync(corruptPath, "{not-json", "utf8");
    const corrupt = readReleaseIdentity({ manifestPath: corruptPath });
    assert.equal(corrupt.available, false);
    assert.match(corrupt.unavailableReason ?? "", /corrupt/i);
  } finally {
    rmSync(dir, { force: true, recursive: true });
  }
});
