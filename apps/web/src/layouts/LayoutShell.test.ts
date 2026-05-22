import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const layoutDir = path.resolve(import.meta.dirname);
const layoutShellSource = fs.readFileSync(path.join(layoutDir, "LayoutShell.tsx"), "utf8");
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

test("display page registry reload failures preserve the last-known-good playback snapshot", () => {
  assert.match(registryHookSource, /setPages\(nextPages\.filter\(\(page\) => page\.enabled && page\.archivedAt === null\)\)/);
  assert.doesNotMatch(registryHookSource, /catch[\s\S]*setPages\(\[\]\)/);
});
