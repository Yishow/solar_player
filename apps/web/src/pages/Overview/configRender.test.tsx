import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { createOverviewDisplayPageSeedConfig } from "./displayPageConfig";

const overviewSource = readFileSync(path.join(import.meta.dirname, "index.tsx"), "utf8");

test("overview runtime reads resolved display config for hero copy and hero media", () => {
  assert.match(overviewSource, /resolvedConfig\.heroCopy\.eyebrow/);
  assert.match(overviewSource, /resolvedConfig\.heroCopy\.titleLines\[0\]/);
  assert.match(overviewSource, /resolvedConfig\.heroCopyLayout/);
  assert.match(overviewSource, /resolvedConfig\.heroMedia\.src/);
  assert.match(overviewSource, /resolvedConfig\.kpiCards\[cardItem\.key\]/);
});

test("overview display page seed config captures the current default hero contract", () => {
  const config = createOverviewDisplayPageSeedConfig();

  assert.equal(config.heroCopy.eyebrow, "綠能驅動・永續未來");
  assert.deepEqual(config.heroCopy.titleLines, ["以綠色製造", "驅動美好生活"]);
  assert.deepEqual(config.heroCopyLayout, { left: 86, top: 172, width: 642 });
  assert.equal(config.heroMedia.alt, "國瑞汽車中廠綠能展示場域");
  assert.ok((config.heroMedia.src ?? "").length > 0);
});
