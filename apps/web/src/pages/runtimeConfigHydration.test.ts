import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { resolveRuntimeFallbackBannerState } from "./runtimeConfigHydration";

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

test("live runtime display pages use the shared runtime refresh hook family instead of page-local fetch-once effects", () => {
  const sourceExpectations = {
    FactoryCircuit: /useDisplayStoryRuntime\("factory-circuit"/,
    Images: /useImagePlaylistRuntime\(requestedIndex/,
    Overview: /useDisplayStoryRuntime\("overview"/,
    Solar: /useDisplayStoryRuntime\("solar"/,
    Sustainability: /useSustainabilityStoryRuntime\(selectedPeriod/
  } as const;
  const sourceRejections = {
    FactoryCircuit: /fetchDisplayStory/,
    Images: /fetchImagePlaylist/,
    Overview: /fetchDisplayStory/,
    Solar: /fetchDisplayStory/,
    Sustainability: /fetchSustainabilityStory/
  } as const;

  for (const pageName of runtimePages) {
    const source = readFileSync(path.join(import.meta.dirname, pageName, "index.tsx"), "utf8");
    assert.match(source, sourceExpectations[pageName], `${pageName} should use the shared runtime refresh hook`);
    assert.doesNotMatch(source, sourceRejections[pageName], `${pageName} should not keep page-local runtime fetch logic`);
  }
});

test("runtime fallback banner prefers config hydration failures and otherwise exposes shared runtime refresh failures", () => {
  assert.deepEqual(
    resolveRuntimeFallbackBannerState({
      configErrorMessage: "config load failed",
      runtimeErrorMessage: "runtime refresh failed",
      usesRuntimeFallback: true
    }),
    {
      errorMessage: "config load failed",
      headline: "展示頁設定載入失敗，暫時使用 seed fallback。"
    }
  );

  assert.deepEqual(
    resolveRuntimeFallbackBannerState({
      configErrorMessage: "",
      runtimeErrorMessage: "story refresh failed",
      usesRuntimeFallback: true
    }),
    {
      errorMessage: "story refresh failed",
      headline: "展示資料同步失敗，暫時保留上一份 fallback-safe 內容。"
    }
  );
});

test("runtime pages route shared runtime hook failure state through the common fallback banner resolver", () => {
  for (const pageName of runtimePages) {
    const source = readFileSync(path.join(import.meta.dirname, pageName, "index.tsx"), "utf8");
    assert.match(source, /resolveRuntimeFallbackBannerState\(/, `${pageName} should use the shared runtime fallback banner resolver`);
    assert.match(source, /runtimeErrorMessage:/, `${pageName} should forward runtime refresh errors into the shared banner resolver`);
    assert.match(source, /usesRuntimeFallback:/, `${pageName} should forward runtime fallback state into the shared banner resolver`);
  }
});
