import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const layoutDir = path.resolve(import.meta.dirname);
const layoutShellSource = fs.readFileSync(path.join(layoutDir, "LayoutShell.tsx"), "utf8");

test("LayoutShell passes rotation fallback state into offline routing decisions", () => {
  assert.match(layoutShellSource, /const controller = usePageRotation\(/);
  assert.match(layoutShellSource, /fallbackRoute: controller\.fallbackRoute/);
  assert.match(layoutShellSource, /hasPlayablePages: controller\.pages\.length > 0/);
});
