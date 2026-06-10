import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const routeHostSource = readFileSync(path.join(import.meta.dirname, "displayPageRouteHost.tsx"), "utf8");
const registryHookSource = readFileSync(
  path.join(import.meta.dirname, "../../hooks/useDisplayPageRegistry.ts"),
  "utf8"
);
const layoutShellSource = readFileSync(path.join(import.meta.dirname, "../../layouts/LayoutShell.tsx"), "utf8");

test("display page route loader primes the shared registry snapshot for shell and route host consumers", () => {
  assert.match(routeHostSource, /loadDisplayPageRegistrySnapshot\(\)/);
  assert.doesNotMatch(routeHostSource, /getDisplayPageRegistry\(\)/);
  assert.match(registryHookSource, /getActiveDisplayPageRegistrySnapshot\(\)/);
  assert.match(registryHookSource, /loadDisplayPageRegistrySnapshot\(/);
  assert.match(layoutShellSource, /useDisplayPageRegistry\(\)/);
});
