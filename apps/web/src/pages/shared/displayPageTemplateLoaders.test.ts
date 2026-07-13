import assert from "node:assert/strict";
import { createElement, type ReactElement } from "react";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { displayPageTemplateKeys, type DisplayPageTemplateKey } from "@solar-display/shared";
import {
  getDisplayPageTemplateKeys,
  loadDisplayPageTemplate,
  prefetchDisplayPageTemplate,
  resetDisplayPageTemplateLoadCacheForTests,
  setDisplayPageTemplateImportersForTests
} from "./displayPageTemplateLoaders";

const loaderSource = readFileSync(path.join(import.meta.dirname, "displayPageTemplateLoaders.ts"), "utf8");

function stubRuntime(templateKey: DisplayPageTemplateKey) {
  return {
    renderPage: (_pageId: string): ReactElement => createElement("div", { "data-template": templateKey }),
    templateKey
  };
}

test("playback template loaders cover every template key with dynamic imports", () => {
  assert.deepEqual([...getDisplayPageTemplateKeys()], [...displayPageTemplateKeys]);

  for (const templateKey of displayPageTemplateKeys) {
    if (templateKey.includes("-")) {
      assert.match(loaderSource, new RegExp(`["']${templateKey}["']\\s*:`));
    } else {
      assert.match(loaderSource, new RegExp(`\\b${templateKey}\\s*:`));
    }
  }

  assert.match(loaderSource, /import\("\.\.\/DisplayPagesEditor\/runtimeOverview"\)/);
  assert.match(loaderSource, /import\("\.\.\/DisplayPagesEditor\/runtimeSolar"\)/);
  assert.match(loaderSource, /import\(\s*"\.\.\/DisplayPagesEditor\/runtimeFactoryCircuit"\s*\)/);
  assert.match(loaderSource, /import\("\.\.\/DisplayPagesEditor\/runtimeImages"\)/);
  assert.match(loaderSource, /import\(\s*"\.\.\/DisplayPagesEditor\/runtimeSustainability"\s*\)/);
  assert.doesNotMatch(loaderSource, /from "\.\.\/DisplayPagesEditor\/runtimePageDefinitions"/);
});

test("loadDisplayPageTemplate reuses the same promise for a template key", async () => {
  let importCount = 0;
  setDisplayPageTemplateImportersForTests({
    overview: async () => {
      importCount += 1;
      return stubRuntime("overview");
    }
  });

  try {
    const first = loadDisplayPageTemplate("overview");
    const second = loadDisplayPageTemplate("overview");

    assert.equal(first, second);

    const runtime = await first;
    assert.equal(runtime.templateKey, "overview");
    assert.equal(typeof runtime.renderPage, "function");
    assert.equal(importCount, 1);
    assert.equal(await second, runtime);
  } finally {
    setDisplayPageTemplateImportersForTests(null);
  }
});

test("loadDisplayPageTemplate rejects unknown template keys with an explicit error", async () => {
  resetDisplayPageTemplateLoadCacheForTests();

  await assert.rejects(
    () => loadDisplayPageTemplate("not-a-template"),
    /Unknown display page template key: not-a-template/
  );
});

test("prefetchDisplayPageTemplate swallows load failures without unhandled rejection", async () => {
  resetDisplayPageTemplateLoadCacheForTests();

  const result = await prefetchDisplayPageTemplate("not-a-template");
  assert.equal(result, null);
});

test("each playback template key resolves through the cached registry", async () => {
  const importCounts = Object.fromEntries(displayPageTemplateKeys.map((key) => [key, 0])) as Record<
    DisplayPageTemplateKey,
    number
  >;

  setDisplayPageTemplateImportersForTests(
    Object.fromEntries(
      displayPageTemplateKeys.map((templateKey) => [
        templateKey,
        async () => {
          importCounts[templateKey] += 1;
          return stubRuntime(templateKey);
        }
      ])
    ) as Record<DisplayPageTemplateKey, () => Promise<ReturnType<typeof stubRuntime>>>
  );

  try {
    for (const templateKey of displayPageTemplateKeys) {
      const first = loadDisplayPageTemplate(templateKey);
      const second = loadDisplayPageTemplate(templateKey);
      assert.equal(first, second, `expected shared promise for ${templateKey}`);

      const runtime = await first;
      assert.equal(runtime.templateKey, templateKey);
      assert.equal(typeof runtime.renderPage, "function");
      assert.equal(importCounts[templateKey], 1);
    }
  } finally {
    setDisplayPageTemplateImportersForTests(null);
  }
});

test("failed template loads leave the cache open for a later retry", async () => {
  let shouldFail = true;
  setDisplayPageTemplateImportersForTests({
    solar: async () => {
      if (shouldFail) {
        throw new Error("chunk missing");
      }
      return stubRuntime("solar");
    }
  });

  try {
    await assert.rejects(() => loadDisplayPageTemplate("solar"), /chunk missing/);

    shouldFail = false;
    const runtime = await loadDisplayPageTemplate("solar");
    assert.equal(runtime.templateKey, "solar");
  } finally {
    setDisplayPageTemplateImportersForTests(null);
  }
});
