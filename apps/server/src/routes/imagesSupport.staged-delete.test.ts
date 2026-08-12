import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import test, { after } from "node:test";

const tempDir = mkdtempSync(join(tmpdir(), "solar-display-staged-image-delete-"));
const trashDir = join(dirname(tempDir), `.${basename(tempDir)}-trash`);
process.env.UPLOADS_DIR = tempDir;

const { stageImageFileDeletion } = await import("./imagesSupport.js");

after(() => {
  rmSync(tempDir, { force: true, recursive: true });
  rmSync(trashDir, { force: true, recursive: true });
});

test("stageImageFileDeletion removes the public path and rollback restores it", () => {
  mkdirSync(tempDir, { recursive: true });
  const filename = "rollback.png";
  const sourcePath = join(tempDir, filename);
  writeFileSync(sourcePath, "rollback-content");

  const staged = stageImageFileDeletion(filename);
  assert.equal(staged.staged, true);
  assert.equal(existsSync(sourcePath), false);
  assert.equal(existsSync(join(tempDir, ".trash")), false);
  assert.equal(existsSync(trashDir), true);

  staged.rollback();
  assert.equal(existsSync(sourcePath), true);
});

test("stageImageFileDeletion commit permanently removes the staged file", () => {
  mkdirSync(tempDir, { recursive: true });
  const filename = "commit.png";
  const sourcePath = join(tempDir, filename);
  writeFileSync(sourcePath, "commit-content");

  const staged = stageImageFileDeletion(filename);
  assert.equal(existsSync(sourcePath), false);
  staged.commit();

  assert.equal(existsSync(sourcePath), false);
  assert.equal(existsSync(trashDir), true);
  assert.equal(existsSync(join(tempDir, ".trash")), false);
});
