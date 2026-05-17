import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const overviewSource = readFileSync(path.join(import.meta.dirname, "index.tsx"), "utf8");

test("overview KPI cards use fixed pixel geometry inside the FHD canvas", () => {
  assert.doesNotMatch(overviewSource, /const toPctX =/);
  assert.doesNotMatch(overviewSource, /const toPctY =/);
  assert.doesNotMatch(overviewSource, /height:\s*toPctY\(layout\.height\)/);
  assert.doesNotMatch(overviewSource, /left:\s*toPctX\(layout\.left\)/);
  assert.doesNotMatch(overviewSource, /top:\s*toPctY\(layout\.top\)/);
  assert.doesNotMatch(overviewSource, /width:\s*toPctX\(layout\.width\)/);
});
