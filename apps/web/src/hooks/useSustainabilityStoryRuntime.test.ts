import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const source = readFileSync(path.join(import.meta.dirname, "useSustainabilityStoryRuntime.ts"), "utf8");

test("sustainability story runtime keeps a period-scoped warm payload cache", () => {
  assert.match(source, /periodPayloadCacheRef = useRef\(new Map/);
  assert.match(source, /periodPayloadCacheRef\.current\.get\(selectedPeriod\)/);
  assert.match(source, /periodPayloadCacheRef\.current\.set\(selectedPeriod,\s*runtime\.payload\)/);
  assert.match(source, /const periodPayload = runtimePeriodPayload \?\? cachedPeriodPayload/);
  assert.match(source, /payload: periodPayload/);
});

test("sustainability story runtime still refreshes the selected period remotely", () => {
  assert.match(source, /fetchSustainabilityStory\(selectedPeriod\)/);
  assert.match(source, /resolveDisplayPageRuntimeRefreshSpec\("sustainability",\s*\{\s*selectedPeriod\s*\}\)/);
});
