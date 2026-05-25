import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { createOverviewDisplayPageSeedConfig } from "./displayPageConfig";

const overviewCss = fs.readFileSync(path.join(import.meta.dirname, "overview.css"), "utf8");

test("overview hero image anchors custom artwork to the top-right corner", () => {
  const config = createOverviewDisplayPageSeedConfig();

  assert.equal(config.heroMedia.fitMode, "contain");
  assert.equal(config.heroMedia.alignX, 1);
  assert.equal(config.heroMedia.alignY, 0);
  assert.match(overviewCss, /\.overview-hero-banner img \{[\s\S]*?transform-origin:\s*top right;/);
});
