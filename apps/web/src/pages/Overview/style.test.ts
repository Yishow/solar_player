import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const overviewCss = fs.readFileSync(path.join(import.meta.dirname, "overview.css"), "utf8");

test("overview hero image anchors custom artwork to the top-right corner", () => {
  assert.match(overviewCss, /\.overview-hero-banner img \{[\s\S]*?object-position:\s*100%\s+0%;/);
  assert.match(overviewCss, /\.overview-hero-banner img \{[\s\S]*?object-fit:\s*contain;/);
  assert.match(overviewCss, /\.overview-hero-banner img \{[\s\S]*?transform-origin:\s*top right;/);
});
