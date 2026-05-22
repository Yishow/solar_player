import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const layoutDir = path.resolve(import.meta.dirname);
const layoutShellSource = fs.readFileSync(path.join(layoutDir, "LayoutShell.tsx"), "utf8");
const managementShellSource = fs.readFileSync(path.join(layoutDir, "ManagementShell.tsx"), "utf8");
const routerSource = fs.readFileSync(path.join(layoutDir, "../app/router.tsx"), "utf8");
const indexHtmlSource = fs.readFileSync(path.join(layoutDir, "../../index.html"), "utf8");
const headerSource = fs.readFileSync(path.join(layoutDir, "../components/AppHeader.tsx"), "utf8");
const footerSource = fs.readFileSync(path.join(layoutDir, "../components/AppFooterNav.tsx"), "utf8");

test("shell layouts consume bootstrapped brand loader data for first paint chrome", () => {
  assert.match(layoutShellSource, /useLoaderData/);
  assert.match(layoutShellSource, /useBrandAssets\(initialBrandView\)/);
  assert.match(layoutShellSource, /brandView=\{brandView\}/);
  assert.match(managementShellSource, /useLoaderData/);
  assert.match(managementShellSource, /useBrandAssets\(initialBrandView\)/);
  assert.match(managementShellSource, /initialBrandView=\{brandView\}/);
});

test("router wires a runtime brand loader into both playback and management shells", () => {
  assert.match(routerSource, /loader:\s*loadRuntimeBrandView/);
});

test("index.html seeds the browser title from cached brand state instead of a stale hardcoded brand", () => {
  assert.match(indexHtmlSource, /solar-display:brand-view/);
  assert.doesNotMatch(indexHtmlSource, /<title>國瑞汽車中廠綠能展示播放器<\/title>/);
});

test("brand chrome components render a provided brand view without re-subscribing to runtime bootstrap hooks", () => {
  assert.doesNotMatch(headerSource, /useBrandAssets\(/);
  assert.doesNotMatch(footerSource, /useBrandAssets\(/);
  assert.match(headerSource, /brandView\?: BrandView/);
  assert.match(footerSource, /brandView\?: BrandView/);
});
