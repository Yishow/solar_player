import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const runtimePages = [
  "Overview",
  "Solar",
  "FactoryCircuit",
  "Sustainability",
  "Images"
] as const;

const viewModelBuilders = {
  FactoryCircuit: "buildFactoryCircuitViewModel",
  Images: "buildImagesViewModel",
  Overview: "buildOverviewViewModel",
  Solar: "buildSolarViewModel",
  Sustainability: "buildSustainabilityViewModel"
} as const;

test("live runtime display pages defer first paint until persisted config hydration finishes", () => {
  for (const pageName of runtimePages) {
    const source = readFileSync(path.join(import.meta.dirname, pageName, "index.tsx"), "utf8");
    const guardIndex = source.indexOf("shouldDeferDisplayPageRuntimeRender");
    const viewModelIndex = source.indexOf(viewModelBuilders[pageName]);

    assert.match(source, /shouldDeferDisplayPageRuntimeRender/, `${pageName} should use runtime render defer guard`);
    assert.match(source, /lastLoadedEnvelope:\s*runtimeConfig\.lastLoadedEnvelope/, `${pageName} should key defer logic off the first hydration envelope`);
    assert.match(source, /RuntimeConfigFallbackBanner/, `${pageName} should surface runtime hydration fallback warnings`);
    assert.ok(guardIndex !== -1 && viewModelIndex !== -1 && guardIndex < viewModelIndex, `${pageName} should defer before building its runtime view model`);
  }
});
