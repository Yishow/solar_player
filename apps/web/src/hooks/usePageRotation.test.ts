import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const hookDir = path.resolve(import.meta.dirname);
const usePageRotationSource = fs.readFileSync(path.join(hookDir, "usePageRotation.ts"), "utf8");

test("usePageRotation seeds the initial previous route from the current path so first-load mismatches can redirect", () => {
  assert.match(
    usePageRotationSource,
    /if \(previousControllerRouteRef\.current === undefined\) \{\s+previousControllerRouteRef\.current = options\.currentPath;\s+\}/
  );
});

test("usePageRotation reloads playback runtime from relevant display sync scopes through the shared coordinator", () => {
  assert.match(usePageRotationSource, /subscribeSocketEvent\("display:sync"/);
  assert.match(usePageRotationSource, /createDisplaySyncPlaybackReloadCoordinator\(/);
  assert.match(usePageRotationSource, /coordinator\.notify\(event\)/);
});
