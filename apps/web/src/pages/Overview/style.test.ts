import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { createOverviewDisplayPageSeedConfig } from "./displayPageConfig";

const overviewCss = fs.readFileSync(path.join(import.meta.dirname, "overview.css"), "utf8");
const sharedCardCss = fs.readFileSync(
  path.join(import.meta.dirname, "../../components/displayPageCards.css"),
  "utf8"
);

test("overview hero image anchors custom artwork to the top-right corner", () => {
  const config = createOverviewDisplayPageSeedConfig();

  assert.equal(config.heroMedia.fitMode, "contain");
  assert.equal(config.heroMedia.alignX, 1);
  assert.equal(config.heroMedia.alignY, 0);
  assert.match(overviewCss, /\.overview-hero-banner img \{[\s\S]*?transform-origin:\s*top right;/);
});

test("overview cards use frosted-glass treatment scoped to overview only", () => {
  // Overview-scoped cards carry the frosted-glass backdrop blur.
  assert.match(overviewCss, /\.overview-kpi-card[\s\S]*?backdrop-filter:\s*blur/);
  assert.match(overviewCss, /\.overview-dashboard-widget[\s\S]*?backdrop-filter:\s*blur/);
  // The shared card base must NOT be touched with the frosted-glass treatment.
  assert.doesNotMatch(sharedCardCss, /backdrop-filter/);
});

test("generation trend keeps toolbar and footer alignment independent from valueRowAlign", () => {
  assert.match(
    overviewCss,
    /\.overview-generation-trend-widget\s+\.overview-trend-toolbar\s*\{[\s\S]*?align-items:\s*flex-end;[\s\S]*?text-align:\s*right;/
  );
  assert.match(
    overviewCss,
    /\.overview-generation-trend-widget\s+\.overview-widget-meta\s*\{[\s\S]*?justify-content:\s*space-between;[\s\S]*?text-align:\s*left;/
  );
});
