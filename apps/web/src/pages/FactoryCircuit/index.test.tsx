import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const factoryCircuitSource = readFileSync(path.join(import.meta.dirname, "index.tsx"), "utf8");

test("factory circuit reloads fallback circuits from relevant display sync scopes", () => {
  assert.match(factoryCircuitSource, /useDisplaySyncRefresh\(/);
  assert.match(factoryCircuitSource, /loadCircuitsRef\.current\("refresh"\)/);
  assert.match(factoryCircuitSource, /factoryCircuitRefreshSpec\.fallbackRefreshScopes/);
  assert.match(factoryCircuitSource, /resolveDisplayPageRuntimeRefreshSpec\("factory-circuit"\)/);
});

test("factory circuit keeps circuits fallback reload page-local and guards against stale refresh races", () => {
  assert.match(factoryCircuitSource, /const requestIdRef = useRef\(0\)/);
  assert.match(factoryCircuitSource, /const loadCircuitsRef = useRef/);
  assert.match(factoryCircuitSource, /requestId !== requestIdRef\.current/);
  assert.match(factoryCircuitSource, /requestJson<\{ success: boolean; data: CircuitConfig\[\] \}>\("\/api\/circuits"\)/);
  assert.doesNotMatch(factoryCircuitSource, /useDisplayStoryRuntime\("factory-circuit",\s*\{[^}]*load:/s);
});

test("factory circuit refresh failures preserve the last settled fallback rows instead of blanking circuits state", () => {
  assert.match(factoryCircuitSource, /setLoadState\("error"\)/);
  assert.doesNotMatch(factoryCircuitSource, /setCircuits\(\[\]\)/);
});
