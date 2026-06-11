import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const playbackRuntimePages = [
  { pageKey: "overview", sourcePath: "Overview/index.tsx" },
  { pageKey: "solar", sourcePath: "Solar/index.tsx" },
  { pageKey: "factory-circuit", sourcePath: "FactoryCircuit/index.tsx" },
  { pageKey: "images", sourcePath: "Images/index.tsx" },
  { pageKey: "sustainability", sourcePath: "Sustainability/index.tsx" }
] as const;

function sourceBetweenLoadingReturnAndMainReturn(pageKey: string, source: string) {
  const loadingReturnIndex = source.indexOf("return <DisplayPageLoadingState />;");
  assert.ok(loadingReturnIndex >= 0, `${pageKey} should render the shared display page loading state`);

  const mainReturnIndex = source.indexOf("return (", loadingReturnIndex);
  assert.ok(mainReturnIndex > loadingReturnIndex, `${pageKey} should keep a main JSX return after the loading return`);

  return source.slice(loadingReturnIndex, mainReturnIndex);
}

test("playback runtime loading returns stay after hook evaluation", () => {
  for (const page of playbackRuntimePages) {
    const source = readFileSync(path.join(import.meta.dirname, page.sourcePath), "utf8");
    const loadingReturnRegion = sourceBetweenLoadingReturnAndMainReturn(page.pageKey, source);

    assert.doesNotMatch(
      loadingReturnRegion,
      /\buse[A-Z][A-Za-z]+\(/,
      `${page.pageKey} should not call React hooks after returning DisplayPageLoadingState`
    );
  }
});
