import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { createImagesDisplayPageSeedConfig, imagesDisplayPageEditorRegions } from "./displayPageConfig";

const imagesSource = readFileSync(path.join(import.meta.dirname, "index.tsx"), "utf8");
const imagesCss = readFileSync(path.join(import.meta.dirname, "images.css"), "utf8");

test("images runtime reads resolved display config for copy, main stage, info panel, thumb grid, and arrows", () => {
  assert.match(imagesSource, /useImagesAutoplay\(/);
  assert.match(imagesSource, /resolvedConfig\.hero\.eyebrow/);
  assert.match(imagesSource, /resolvedConfig\.hero\.title/);
  assert.match(imagesSource, /resolvedConfig\.hero\.subtitle/);
  assert.match(imagesSource, /resolvedConfig\.chrome\.heroTypography\.eyebrowFontSize/);
  assert.match(imagesSource, /resolvedConfig\.chrome\.heroTypography\.titleFontSize/);
  assert.match(imagesSource, /resolvedConfig\.chrome\.heroTypography\.subtitleFontSize/);
  assert.match(imagesSource, /buildCopyTypographyStyleVars\(resolvedConfig\.chrome\.copyTypography\)/);
  assert.match(imagesSource, /\.\.\.seedConfig\.chrome\.copyTypography/);
  assert.match(imagesSource, /resolvedConfig\.chrome\.ornaments\.goldLine\.opacity/);
  assert.match(imagesSource, /resolvedConfig\.chrome\.modules\.counter\.currentFontSize/);
  assert.match(imagesSource, /resolvedConfig\.chrome\.modules\.counter\.progressThickness/);
  assert.match(imagesSource, /resolvedConfig\.chrome\.modules\.arrows\.buttonSize/);
  assert.match(imagesSource, /resolvedConfig\.chrome\.modules\.arrows\.borderRadius/);
  assert.match(imagesSource, /resolvedConfig\.chrome\.modules\.stageFrame\.fullBleed/);
  assert.match(imagesSource, /resolvedConfig\.chrome\.modules\.stageFrame\.radius/);
  assert.match(imagesSource, /resolvedConfig\.chrome\.modules\.stageFrame\.shadow/);
  assert.match(imagesSource, /resolvedConfig\.chrome\.modules\.stageFrame\.thumbnailRadius/);
  assert.match(imagesSource, /resolvedConfig\.hero\.copyLines/);
  assert.match(imagesSource, /resolvedConfig\.textBlocks\.copy/);
  assert.match(imagesSource, /resolvedConfig\.mainStage/);
  assert.match(imagesSource, /resolveDisplayPageMediaSource\(\s*resolvedConfig\.mainStage,\s*seedConfig\.mainStage\.src\s*\)/);
  assert.match(imagesSource, /resolvedConfig\.infoPanel/);
  assert.match(imagesSource, /resolvedConfig\.cardStyles\.infoPanel/);
  assert.match(imagesSource, /resolvedConfig\.rhythm\.imagesCaption/);
  assert.match(imagesSource, /buildImagesCaptionRhythmStyle/);
  assert.match(imagesSource, /resolvedConfig\.arrows\.left/);
  assert.match(imagesSource, /resolvedConfig\.arrows\.right/);
  assert.match(imagesSource, /resolvedConfig\.thumbnailSlots\[thumbSlotOrder\[thumbIndex\]!\]/);
  assert.match(imagesSource, /const playbackActiveEntry =/);
  assert.match(imagesSource, /runtimeHydrationEnabled \? runtimePlaylistEntries : imagesReferencePlaylistEntries/);
  assert.match(imagesSource, /runtimeHydrationEnabled\s*\?\s*playlistRuntime\.payload\?\.activeEntry \?\? null/);
  assert.doesNotMatch(imagesSource, /runtimePlaylistEntries\.length > 0\s*\?/);
  assert.doesNotMatch(imagesSource, /imagesReferencePlaylistEntries\[Math\.min\(requestedIndex, imagesReferencePlaylistEntries\.length - 1\)\]/);
  assert.match(imagesSource, /imagesReferencePlaylistEntries/);
  assert.match(imagesSource, /useState\(0\)/);
  assert.match(imagesSource, /activeIndex: autoplay\.activeIndex/);
  assert.match(imagesSource, /onClick=\{\(\) => autoplay\.prev\(\)\}/);
  assert.match(imagesSource, /onClick=\{\(\) => autoplay\.next\(\)\}/);
  assert.match(imagesSource, /<figure[\s\S]*onClick=\{\(\) => autoplay\.next\(\)\}/);
  assert.match(imagesSource, /onClick=\{\(\) => autoplay\.selectIndex\(visibleStart \+ thumbIndex\)\}/);
  assert.match(imagesSource, /resolveRuntimeMediaUrl\(viewModel\.active\.assetSource \?\? mainStageSource\)/);
  assert.match(imagesSource, /src=\{resolveRuntimeMediaUrl\(thumbnail\.assetSource\)\}/);
  assert.match(imagesSource, /const isStageFullBleed = resolvedConfig\.chrome\.modules\.stageFrame\.fullBleed/);
  assert.doesNotMatch(imagesSource, /isReferenceHeroCrop/);
  assert.doesNotMatch(imagesSource, /viewModel\.active\.assetSource === imagesAssetRuntimeMap\.main/);
  assert.match(imagesSource, /!\s*isStageFullBleed/);
  assert.match(imagesSource, /images-grass-ornament/);
  assert.match(imagesSource, /imagesAssetRuntimeMap\.leftOrnament/);
  assert.doesNotMatch(imagesSource, /ImagesGrassOrnament/);
  assert.match(imagesSource, /key=\{viewModel\.active\.entryId\}/);
  assert.match(imagesSource, /--images-slide-duration/);
  assert.match(imagesSource, /DisplayCardFrame/);
  assert.match(imagesSource, /DisplayCardFooter/);
  assert.doesNotMatch(imagesSource, /目前 fallback：/);
  assert.doesNotMatch(imagesSource, /viewModel\.active\.resolution/);
  assert.doesNotMatch(imagesSource, /viewModel\.active\.infoPanel\.tags/);
});

test("images stage full bleed is rendered from config without secondary transform or overlays", () => {
  assert.match(imagesCss, /\.images-main-stage img\s*\{[\s\S]*display:\s*block;/);
  assert.match(imagesCss, /@keyframes images-main-slide-in/);
  assert.match(imagesCss, /@keyframes images-progress-grow/);
  assert.match(imagesCss, /\.images-grass-ornament/);
  assert.match(imagesCss, /\.images-grass-ornament img/);
  assert.doesNotMatch(imagesCss, /\.images-grass-line/);
  assert.doesNotMatch(imagesCss, /\.images-main-stage-reference/);
  assert.match(imagesCss, /border-radius:\s*var\(--images-stage-radius, 16px\)/);
  assert.match(imagesCss, /box-shadow:\s*var\(--images-stage-shadow, var\(--display-shadow-soft\)\)/);
  assert.doesNotMatch(imagesCss, /translateX\(-76px\)\s*scale\(1\.14\)/);
  assert.match(imagesSource, /isStageFullBleed \? \[\] : mainStageMediaPresentation\.overlayLayers/);
});

test("images display page seed config captures the current default gallery layout and hero contract", () => {
  const config = createImagesDisplayPageSeedConfig("/images-main.jpg");

  assert.equal(config.hero.eyebrow, "綠能驅動・永續未來");
  assert.equal(config.hero.title, "綠能現場影像");
  assert.equal(config.mainStage.src, "/images-main.jpg");
  assert.equal(config.infoPanel.width, 398);
  assert.equal((config as any).rhythm?.imagesCaption?.bodyFontSize, 21);
  assert.equal((config as any).rhythm?.imagesCaption?.bodyLineHeight, 1.74);
  assert.equal((config as any).rhythm?.imagesCaption?.metaFontSize, 18);
  assert.equal(config.chrome.heroTypography.eyebrowMarginBottom, 44);
  assert.equal(config.chrome.copyTypography.fontSize, 24);
  assert.equal(config.chrome.copyTypography.lineHeight, 1.72);
  assert.equal(config.chrome.copyTypography.letterSpacing, 0.4);
  assert.equal(config.chrome.modules.arrows.buttonSize, 68);
  assert.equal(config.chrome.modules.stageFrame.fullBleed, true);
  assert.equal(config.chrome.modules.stageFrame.radius, 16);
  assert.equal(config.chrome.modules.stageFrame.shadow, "soft");
  assert.equal(config.chrome.modules.stageFrame.thumbnailRadius, 20);
  assert.equal(config.arrows.left.left, 545);
  assert.equal(config.thumbnailSlots.thumb3.left, 1206);
});

test("images editor exposes lead copy typography fields", () => {
  const heroRegion = imagesDisplayPageEditorRegions.find((region) => region.id === "images-hero-copy");

  assert.ok(heroRegion);
  assert.ok(heroRegion.fields.some((field) => field.id === "images-copy-font-size"));
  assert.ok(heroRegion.fields.some((field) => field.id === "images-copy-line-height"));
  assert.ok(heroRegion.fields.some((field) => field.id === "images-copy-letter-spacing"));
});

test("images editor exposes stage and thumbnail framing fields", () => {
  const stageRegion = imagesDisplayPageEditorRegions.find((region) => region.id === "images-main-stage");
  const thumbRegion = imagesDisplayPageEditorRegions.find((region) => region.id === "images-thumb-thumb1");

  assert.ok(stageRegion);
  assert.ok(thumbRegion);
  assert.ok(stageRegion.fields.some((field) => field.id === "images-stage-full-bleed"));
  assert.ok(stageRegion.fields.some((field) => field.id === "images-stage-radius"));
  assert.ok(stageRegion.fields.some((field) => field.id === "images-stage-shadow"));
  assert.ok(thumbRegion.fields.some((field) => field.id === "thumb1-thumbnail-radius"));
});
