import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const hookDir = path.resolve(import.meta.dirname);
const usePageRotationSource = fs.readFileSync(path.join(hookDir, "usePageRotation.ts"), "utf8");

test("usePageRotation initializes the previous controller route before evaluating redirects", () => {
  const initialGuardMatch = usePageRotationSource.match(
    /if \(previousControllerRouteRef\.current === undefined\) \{\s+previousControllerRouteRef\.current = controller\.currentPage\?\.route;\s+return;\s+\}/
  );

  assert.ok(initialGuardMatch, "expected initial render guard before route resolution");

  const initialGuardIndex = usePageRotationSource.indexOf(initialGuardMatch[0]);
  const resolveIndex = usePageRotationSource.indexOf("const nextRoute = resolvePlaybackRouteNavigation");

  assert.notEqual(initialGuardIndex, -1);
  assert.notEqual(resolveIndex, -1);
  assert.ok(initialGuardIndex < resolveIndex, "expected guard to run before playback route resolution");
});
