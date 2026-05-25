import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const stylesDir = path.resolve(import.meta.dirname);
const tokensCss = fs.readFileSync(path.join(stylesDir, "tokens.css"), "utf8");
const globalCss = fs.readFileSync(path.join(stylesDir, "global.css"), "utf8");

test("shell bars keep the measured reference heights while using crisper separators", () => {
  assert.match(tokensCss, /--header-height:\s*110px;/);
  assert.match(tokensCss, /--footer-height:\s*72px;/);
  assert.match(tokensCss, /--content-height:\s*898px;/);
  assert.match(tokensCss, /--shell-bar-border:\s*rgba\(171,\s*166,\s*154,\s*0\.48\);/);
  assert.match(tokensCss, /--shell-bar-shadow:\s*none;/);
  assert.match(tokensCss, /--shell-divider:\s*rgba\(198,\s*192,\s*179,\s*0\.56\);/);
  assert.match(tokensCss, /--shell-divider-strong:\s*rgba\(186,\s*180,\s*168,\s*0\.7\);/);
  assert.match(tokensCss, /--shell-divider-brand:\s*rgba\(186,\s*180,\s*168,\s*0\.7\);/);
});

test("header and footer bars do not rely on blur to fake the divider line", () => {
  const headerSection = globalCss.match(/\.shell-header-bar\s*\{[^}]+\}/)?.[0] ?? "";
  const footerSection = globalCss.match(/\.shell-footer-bar\s*\{[^}]+\}/)?.[0] ?? "";

  assert.equal(headerSection.includes("backdrop-filter"), false);
  assert.equal(footerSection.includes("backdrop-filter"), false);
  assert.match(headerSection, /border-bottom:\s*0;/);
  assert.match(footerSection, /border-top:\s*0;/);
});

test("shared shell css keeps the accepted single-line header and footer divider treatment", () => {
  assert.match(globalCss, /\.shell-header-bar::after\s*\{[\s\S]*?width:\s*66\.667%;/);
  assert.match(globalCss, /\.shell-footer-bar::after\s*\{[\s\S]*?width:\s*90%;/);
  assert.match(globalCss, /\.shell-header-bar::after\s*\{[\s\S]*?transform:\s*scaleY\(var\(--shell-divider-scale-y,\s*0\.5\)\);/);
  assert.match(globalCss, /\.shell-footer-bar::after\s*\{[\s\S]*?transform:\s*scaleY\(var\(--shell-divider-scale-y,\s*0\.5\)\);/);
  assert.doesNotMatch(globalCss, /\.shell-header-bar::before\s*\{/);
  assert.doesNotMatch(globalCss, /\.shell-footer-bar::before\s*\{/);
});

test("display playback pages define semantic chrome tokens separately from global shell and brand roles", () => {
  assert.match(tokensCss, /\/\*\s*Display playback chrome tokens\s*\*\//);
  assert.match(tokensCss, /--display-title-ink:\s*var\(--ink-strong\);/);
  assert.match(tokensCss, /--display-eyebrow-green:\s*var\(--green\);/);
  assert.match(tokensCss, /--display-emphasis-green:\s*var\(--green-2\);/);
  assert.match(tokensCss, /--display-emphasis-gold:\s*var\(--accent\);/);
  assert.match(tokensCss, /--display-card-surface:\s*rgba\(255,\s*253,\s*247,\s*0\.92\);/);
  assert.match(tokensCss, /--display-card-border-soft:\s*rgba\(155,\s*139,\s*92,\s*0\.28\);/);
  assert.match(tokensCss, /--display-photo-fade-paper:\s*rgba\(255,\s*253,\s*247,\s*0\.96\);/);
  assert.match(tokensCss, /--display-ornament-leaf-fill:\s*rgba\(130,\s*154,\s*104,\s*0\.16\);/);
  assert.match(tokensCss, /--display-ornament-leaf-stroke:\s*rgba\(130,\s*154,\s*104,\s*0\.72\);/);
  assert.match(tokensCss, /--display-shadow-soft:\s*0\s+12px\s+28px\s+rgba\(59,\s*54,\s*40,\s*0\.1\);/);
  assert.match(tokensCss, /\/\*\s*Global shell and brand tokens remain the cross-surface baseline\s*\*\//);
});
