import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { createImagesDisplayPageSeedConfig } from "./displayPageConfig";

const imagesSource = readFileSync(path.join(import.meta.dirname, "index.tsx"), "utf8");

test("images runtime reads resolved display config for copy, main stage, info panel, thumb grid, and arrows", () => {
  assert.match(imagesSource, /resolvedConfig\.hero\.eyebrow/);
  assert.match(imagesSource, /resolvedConfig\.hero\.title/);
  assert.match(imagesSource, /resolvedConfig\.hero\.subtitle/);
  assert.match(imagesSource, /resolvedConfig\.hero\.copyLines/);
  assert.match(imagesSource, /resolvedConfig\.textBlocks\.copy/);
  assert.match(imagesSource, /resolvedConfig\.mainStage/);
  assert.match(imagesSource, /resolvedConfig\.infoPanel/);
  assert.match(imagesSource, /resolvedConfig\.arrows\.left/);
  assert.match(imagesSource, /resolvedConfig\.arrows\.right/);
  assert.match(imagesSource, /resolvedConfig\.thumbnailSlots\[thumbSlotOrder\[thumbIndex\]!\]/);
  assert.match(imagesSource, /activeEntry: playlistData\?\.activeEntry \?\? null/);
  assert.match(imagesSource, /entries: playlistData\?\.entries \?\? \[\]/);
  assert.match(imagesSource, /viewModel\.active\.assetSource \?/);
});

test("images display page seed config captures the current default gallery layout and hero contract", () => {
  const config = createImagesDisplayPageSeedConfig("/images-main.jpg");

  assert.equal(config.hero.eyebrow, "綠能驅動・永續未來");
  assert.equal(config.hero.title, "綠能現場影像");
  assert.equal(config.mainStage.src, "/images-main.jpg");
  assert.equal(config.infoPanel.width, 374);
  assert.equal(config.arrows.left.left, 548);
  assert.equal(config.thumbnailSlots.thumb3.left, 1206);
});
