import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const layoutDir = path.resolve(import.meta.dirname);
const layoutShellSource = fs.readFileSync(path.join(layoutDir, "LayoutShell.tsx"), "utf8");
const managementShellSource = fs.readFileSync(path.join(layoutDir, "ManagementShell.tsx"), "utf8");
const registryHookSource = fs.readFileSync(
  path.join(layoutDir, "../hooks/useDisplayPageRegistry.ts"),
  "utf8"
);

test("LayoutShell passes rotation fallback state into offline routing decisions", () => {
  assert.match(layoutShellSource, /const controller = usePageRotation\(/);
  assert.match(layoutShellSource, /fallbackRoute: controller\.fallbackRoute/);
  assert.match(layoutShellSource, /hasPlayablePages: controller\.pages\.length > 0/);
});

test("LayoutShell resolves playback route metadata from the active display page registry", () => {
  assert.match(layoutShellSource, /useDisplayPageRegistry\(\)/);
  assert.match(layoutShellSource, /resolvePlaybackRouteMeta\(location\.pathname, registry\.pages\)/);
});

test("LayoutShell wires display client heartbeats to the active playback page state", () => {
  assert.match(layoutShellSource, /useDisplayClientHeartbeat\(\{/);
  assert.match(layoutShellSource, /pageKey: controller\.currentPage\?\.pageKey \?\? null/);
  assert.match(layoutShellSource, /isPlaying: controller\.isPlaying/);
  assert.match(layoutShellSource, /isIdle: controller\.isIdle/);
  assert.match(layoutShellSource, /route: location\.pathname/);
});

test("LayoutShell contains playback render failures and monitors rotation stalls", () => {
  assert.match(layoutShellSource, /usePlaybackWatchdog\(\{/);
  assert.match(layoutShellSource, /playablePageCount: controller\.pages\.length/);
  assert.match(layoutShellSource, /expectedDurationMs: \(controller\.currentPage\?\.durationSeconds \?\? 0\) \* 1000/);
  assert.match(layoutShellSource, /<PlaybackErrorBoundary>\s*<Outlet \/>\s*<\/PlaybackErrorBoundary>/s);
});

test("LayoutShell keeps the playback screen awake while mounted", () => {
  assert.match(layoutShellSource, /useScreenWakeLock\(\{\s*enabled: true\s*\}\)/s);
});

test("LayoutShell maps the hydrated mqtt status into the playback header meta", () => {
  assert.match(layoutShellSource, /resolveHeaderConnectionMeta/);
  assert.match(
    layoutShellSource,
    /resolveHeaderConnectionMeta\(\{\s*connected: status\.connected,\s*reason: status\.reason,\s*isHydrated\s*\}\)/s
  );
  assert.match(
    layoutShellSource,
    /<AppHeader[^>]*meta=\{\{\s*status: [^,]+,\s*statusLabel: [^,]+,\s*weather: headerWeatherMeta\s*\}\}/s
  );
  assert.match(layoutShellSource, /useHeaderWeatherMeta\(initialShellBootstrap\?\.weatherContract\)/);
});

test("playback and management shells share bootstrapped weather and mqtt header state", () => {
  assert.match(layoutShellSource, /useHeaderWeatherMeta\(initialShellBootstrap\?\.weatherContract\)/);
  assert.match(layoutShellSource, /useMqttStatus\(initialShellBootstrap\?\.mqttStatus\)/);
  assert.match(
    managementShellSource,
    /headerMeta=\{\{\s*status: headerConnectionMeta\.status,\s*statusLabel: headerConnectionMeta\.label,\s*weather: headerWeatherMeta\s*\}\}/s
  );
  assert.match(managementShellSource, /useHeaderWeatherMeta\(initialShellBootstrap\?\.weatherContract\)/);
  assert.match(managementShellSource, /useMqttStatus\(initialShellBootstrap\?\.mqttStatus\)/);
  assert.match(managementShellSource, /<AppHeader[^>]*meta=\{headerMeta\}/s);
});

test("playback and management shells reuse one shared shell decoration runtime loader", () => {
  assert.match(layoutShellSource, /useShellDecorations\(\)/);
  assert.match(layoutShellSource, /<AppHeader[\s\S]*decorationObjects=\{shellDecorations\.headerObjects\}/);
  assert.match(layoutShellSource, /<AppFooterNav[\s\S]*decorationObjects=\{shellDecorations\.footerObjects\}/);
  assert.match(managementShellSource, /useShellDecorations\(\)/);
  assert.match(managementShellSource, /headerDecorationObjects=\{shellDecorations\.headerObjects\}/);
  assert.match(managementShellSource, /footerDecorationObjects=\{shellDecorations\.footerObjects\}/);
});

test("display page registry reload failures preserve the last-known-good playback snapshot", () => {
  assert.match(registryHookSource, /setPages\(nextPages\.filter\(\(page\) => page\.enabled && page\.archivedAt === null\)\)/);
  assert.doesNotMatch(registryHookSource, /catch[\s\S]*setPages\(\[\]\)/);
});
