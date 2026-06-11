import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const brandAssetsSource = readFileSync(path.join(import.meta.dirname, "index.tsx"), "utf8");

test("brand assets treats pending destructive actions as protected display sync draft state", () => {
  assert.match(brandAssetsSource, /const hasProtectedBrandDraft = dirty \|\| pendingAction !== null;/);
  assert.match(brandAssetsSource, /isDirty:\s*hasProtectedBrandDraft/);
  assert.match(brandAssetsSource, /dirty:\s*preserveLocalState \? dirtyRef\.current : false/);
  assert.match(brandAssetsSource, /pendingAction:\s*preserveLocalState \? pendingActionRef\.current !== null : false/);
});
