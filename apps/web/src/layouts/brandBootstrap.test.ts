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

test("shell layouts consume bootstrapped shell loader data for first paint chrome", () => {
  assert.match(layoutShellSource, /useLoaderData/);
  assert.match(layoutShellSource, /useBrandAssets\(initialShellBootstrap\?\.brandView \?\? initialBrandView\)/);
  assert.match(layoutShellSource, /useMqttStatus\(initialShellBootstrap\?\.mqttStatus\)/);
  assert.match(layoutShellSource, /useHeaderWeatherMeta\(initialShellBootstrap\?\.weatherContract\)/);
  assert.match(layoutShellSource, /brandView=\{brandView\}/);
  assert.match(managementShellSource, /useLoaderData/);
  assert.match(managementShellSource, /useBrandAssets\(initialShellBootstrap\?\.brandView \?\? initialBrandView\)/);
  assert.match(managementShellSource, /useMqttStatus\(initialShellBootstrap\?\.mqttStatus\)/);
  assert.match(managementShellSource, /useHeaderWeatherMeta\(initialShellBootstrap\?\.weatherContract\)/);
  assert.match(managementShellSource, /resolveHeaderConnectionMeta/);
  assert.match(managementShellSource, /initialBrandView=\{brandView\}/);
});

test("router wires a shell bootstrap loader into both playback and management shells", () => {
  assert.match(routerSource, /loader:\s*loadShellBootstrap/);
  assert.doesNotMatch(routerSource, /loader:\s*loadRuntimeBrandView/);
});

test("router preloads settings editable models before mounting settings pages", () => {
  assert.match(routerSource, /import \{ PlaybackSettings, loadPlaybackSettingsRoute \}/);
  assert.match(routerSource, /import \{ ImageManagement, loadImageManagementRoute \}/);
  assert.match(routerSource, /import \{ MqttSettings, loadMqttSettingsRoute \}/);
  assert.match(routerSource, /import \{ CircuitSettings, loadCircuitSettingsRoute \}/);
  assert.match(routerSource, /path:\s*"settings\/playback",\s*loader:\s*loadPlaybackSettingsRoute,\s*hydrateFallbackElement:\s*<><\/>,\s*element:\s*<PlaybackSettings \/>/s);
  assert.match(routerSource, /path:\s*"settings\/images",\s*loader:\s*loadImageManagementRoute,\s*hydrateFallbackElement:\s*<><\/>,\s*element:\s*<ImageManagement \/>/s);
  assert.match(routerSource, /path:\s*"settings\/mqtt",\s*loader:\s*loadMqttSettingsRoute,\s*hydrateFallbackElement:\s*<><\/>,\s*element:\s*<MqttSettings \/>/s);
  assert.match(routerSource, /path:\s*"settings\/circuits",\s*loader:\s*loadCircuitSettingsRoute,\s*hydrateFallbackElement:\s*<><\/>,\s*element:\s*<CircuitSettings \/>/s);
});

test("router preloads status and editor models before mounting those pages", () => {
  assert.match(routerSource, /import \{ DeviceStatus, loadDeviceStatusRoute \}/);
  assert.match(routerSource, /import \{ DisplayPagesEditorRoute, loadDisplayPagesEditorRoute \}/);
  assert.match(routerSource, /path:\s*"device-status",\s*loader:\s*loadDeviceStatusRoute,\s*hydrateFallbackElement:\s*<><\/>,\s*element:\s*<DeviceStatus \/>/s);
  assert.match(routerSource, /path:\s*"display-pages\/editor",\s*loader:\s*loadDisplayPagesEditorRoute,\s*hydrateFallbackElement:\s*<><\/>,\s*element:\s*<DisplayPagesEditorRoute \/>/s);
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
