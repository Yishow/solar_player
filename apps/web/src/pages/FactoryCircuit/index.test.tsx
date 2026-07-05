import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const factoryCircuitPageSource = readFileSync(path.join(import.meta.dirname, "index.tsx"), "utf8");
const factoryCircuitRuntimeSource = readFileSync(path.join(import.meta.dirname, "runtimeContent.tsx"), "utf8");

test("factory circuit reloads fallback circuits from relevant display sync scopes", () => {
  assert.match(factoryCircuitPageSource, /useDisplaySyncRefresh\(/);
  assert.match(factoryCircuitPageSource, /loadCircuitsRef\.current\("refresh"\)/);
  assert.match(factoryCircuitPageSource, /factoryCircuitRefreshSpec\.fallbackRefreshScopes/);
  assert.match(factoryCircuitPageSource, /resolveDisplayPageRuntimeRefreshSpec\("factory-circuit"\)/);
});

test("factory circuit keeps circuits fallback reload page-local and guards against stale refresh races", () => {
  assert.match(factoryCircuitPageSource, /const requestIdRef = useRef\(0\)/);
  assert.match(factoryCircuitPageSource, /const loadCircuitsRef = useRef/);
  assert.match(factoryCircuitPageSource, /requestId !== requestIdRef\.current/);
  assert.match(factoryCircuitPageSource, /requestJson<\{ success: boolean; data: CircuitConfig\[\] \}>\("\/api\/circuits"\)/);
  assert.doesNotMatch(factoryCircuitPageSource, /useDisplayStoryRuntime\("factory-circuit",\s*\{[^}]*load:/s);
});

test("factory circuit refresh failures preserve the last settled fallback rows instead of blanking circuits state", () => {
  assert.match(factoryCircuitPageSource, /setLoadState\("error"\)/);
  assert.doesNotMatch(factoryCircuitPageSource, /setCircuits\(\[\]\)/);
  assert.match(factoryCircuitPageSource, /circuits=\{circuitsRuntimeSource\.circuits\}/);
  assert.match(factoryCircuitPageSource, /loadState=\{circuitsRuntimeSource\.loadState\}/);
});

test("factory circuit keeps circuit and story runtime outside the live-config defer guard", () => {
  assert.match(factoryCircuitPageSource, /shouldDeferDisplayPageRuntimeRender\(\{\s*runtimeHydrationEnabled,\s*isLoading: runtimeConfig\.isLoading,\s*lastLoadedEnvelope: runtimeConfig\.lastLoadedEnvelope,\s*stage: runtimeStage\s*\}\)/s);
  assert.doesNotMatch(factoryCircuitPageSource, /shouldDeferDisplayPageRuntimeRender\(\{[^}]*loadState/s);
  assert.match(factoryCircuitPageSource, /const circuitsRuntimeSource = useMemo/);
  assert.match(factoryCircuitPageSource, /dependencyKey: circuitsRuntimeSource\.dependencyKey/);
  assert.match(factoryCircuitPageSource, /loadState,/);
  assert.match(factoryCircuitPageSource, /factoryCircuitStory=\{factoryStoryRuntime\.payload \?\? undefined\}/);
});

test("factory circuit keeps story refreshes from rebuilding the circuits source boundary", () => {
  const sourceStart = factoryCircuitPageSource.indexOf("const circuitsRuntimeSource = useMemo");
  const sourceEnd = factoryCircuitPageSource.indexOf("const factoryStoryRuntime = useDisplayStoryRuntime", sourceStart);

  assert.ok(sourceStart >= 0);
  assert.ok(sourceEnd > sourceStart);

  const circuitsSourceBlock = factoryCircuitPageSource.slice(sourceStart, sourceEnd);

  assert.match(circuitsSourceBlock, /\[circuits,\s*loadState\]/);
  assert.doesNotMatch(circuitsSourceBlock, /factoryStoryRuntime|factoryCircuitStory|payload/);
  assert.match(factoryCircuitPageSource, /factoryCircuitStory=\{factoryStoryRuntime\.payload \?\? undefined\}/);
});

test("factory circuit isolates live metrics subscriptions inside runtime content", () => {
  assert.doesNotMatch(factoryCircuitPageSource, /useLiveMetrics(?:Selector)?\(/);
  assert.match(factoryCircuitPageSource, /<FactoryCircuitRuntimeContent/);
  assert.match(factoryCircuitRuntimeSource, /useLiveMetricsSelector\(/);
  assert.match(factoryCircuitRuntimeSource, /buildFactoryCircuitViewModel\(/);
});
