import assert from "node:assert/strict";
import test from "node:test";
import { defaultFallbackPolicy } from "@solar-display/shared";
import { createSustainabilityDisplayPageSeedConfig } from "../pages/Sustainability/displayPageConfig";
import { createSolarDisplayPageSeedConfig } from "../pages/Solar/displayPageConfig";
import {
  mergeDisplayPageConfig,
  shouldHydrateDisplayPageSession,
  shouldDeferDisplayPageRuntimeRender,
  resolveDisplayPageConfigStagePath,
  resolveDisplayPageFallbackPolicy,
  resolveDisplayPageConfigForPage
} from "./useDisplayPageConfig";

test("mergeDisplayPageConfig preserves solar seed-backed regions outside partial overrides", () => {
  const seedConfig = createSolarDisplayPageSeedConfig("/solar-hero.png");
  const merged = mergeDisplayPageConfig(seedConfig, {
    flowNodes: {
      inverter: {
        left: 1208
      }
    }
  });

  assert.equal(merged.flowNodes.inverter.left, 1208);
  assert.equal(merged.flowNodes.inverter.top, seedConfig.flowNodes.inverter.top);
  assert.deepEqual(merged.heroCopy, seedConfig.heroCopy);
  assert.deepEqual(merged.heroContainer, seedConfig.heroContainer);
  assert.deepEqual(merged.kpiCards.totalCo2, seedConfig.kpiCards.totalCo2);
  assert.deepEqual(merged.connectors.inverterToCo2, seedConfig.connectors.inverterToCo2);
});

test("mergeDisplayPageConfig falls back to seed array entries when persisted config is incomplete", () => {
  const seedConfig = createSolarDisplayPageSeedConfig("/solar-hero.png");
  const merged = mergeDisplayPageConfig(seedConfig, {
    heroCopy: {
      titleLines: ["僅覆蓋第一行"]
    }
  });

  assert.deepEqual(merged.heroCopy.titleLines, [
    "僅覆蓋第一行",
    seedConfig.heroCopy.titleLines[1]
  ]);
  assert.deepEqual(merged.heroCopy.subtitleLines, seedConfig.heroCopy.subtitleLines);
});

test("mergeDisplayPageConfig keeps the seed-backed hero media src when a live managed asset binding no longer resolves", () => {
  const seedConfig = createSustainabilityDisplayPageSeedConfig("/sustainability-seed.jpg");
  const merged = mergeDisplayPageConfig(seedConfig, {
    heroMedia: {
      alt: "Managed sustainability hero",
      assetId: 42
    }
  });

  assert.equal(merged.heroMedia.assetId, 42);
  assert.equal(merged.heroMedia.alt, "Managed sustainability hero");
  assert.equal(merged.heroMedia.src, "/sustainability-seed.jpg");
  assert.equal(merged.heroMedia.fitMode, seedConfig.heroMedia.fitMode);
});

test("resolveDisplayPageConfigForPage falls back to seed config while the next page is still loading", () => {
  const overviewSeed = {
    heroContainer: {
      height: 820,
      left: 430,
      top: 140,
      width: 1490
    }
  };
  const staleSustainabilityConfig = {
    heroMedia: {
      height: 560,
      left: 574,
      top: 146,
      width: 1346
    }
  };

  const resolved = resolveDisplayPageConfigForPage(
    "overview",
    "sustainability",
    overviewSeed,
    staleSustainabilityConfig as unknown as typeof overviewSeed
  );

  assert.deepEqual(resolved, overviewSeed);
});

test("display page runtime previews skip draft-session hydration when persistence is disabled", () => {
  assert.equal(shouldHydrateDisplayPageSession(false, false), false);
  assert.equal(shouldHydrateDisplayPageSession(false, true), false);
  assert.equal(shouldHydrateDisplayPageSession(true, true), false);
  assert.equal(shouldHydrateDisplayPageSession(true, false), true);
});

test("live runtime pages defer first render until persisted config hydration completes", () => {
  assert.equal(
    shouldDeferDisplayPageRuntimeRender({
      runtimeHydrationEnabled: true,
      isLoading: true,
      lastLoadedEnvelope: null,
      stage: "live"
    }),
    true
  );
  assert.equal(
    shouldDeferDisplayPageRuntimeRender({
      runtimeHydrationEnabled: true,
      isLoading: false,
      lastLoadedEnvelope: null,
      stage: "live"
    }),
    false
  );
  assert.equal(
    shouldDeferDisplayPageRuntimeRender({
      runtimeHydrationEnabled: true,
      isLoading: true,
      lastLoadedEnvelope: {
        fallbackPolicy: defaultFallbackPolicy,
        pageId: "overview",
        publishedAt: null,
        publishedBy: null,
        regions: {},
        stage: "live",
        updatedAt: "2026-05-19T08:00:00.000Z",
        version: 3
      },
      stage: "live"
    }),
    false
  );
  assert.equal(
    shouldDeferDisplayPageRuntimeRender({
      runtimeHydrationEnabled: true,
      isLoading: true,
      lastLoadedEnvelope: null,
      stage: "draft"
    }),
    false
  );
});

test("resolveDisplayPageConfigStagePath targets the live publishing channel for runtime reads", () => {
  assert.equal(resolveDisplayPageConfigStagePath("overview", "live"), "/api/display-pages/overview/live");
  assert.equal(resolveDisplayPageConfigStagePath("overview", "draft"), "/api/display-pages/overview/draft");
});

test("resolveDisplayPageFallbackPolicy prefers the envelope fallback policy and falls back to defaults", () => {
  assert.deepEqual(
    resolveDisplayPageFallbackPolicy({
      fallbackPolicy: {
        emptyContent: "show-placeholder",
        missingAsset: "hide",
        staleData: "show-seed"
      }
    }),
    {
      emptyContent: "show-placeholder",
      missingAsset: "hide",
      staleData: "show-seed"
    }
  );
  assert.deepEqual(resolveDisplayPageFallbackPolicy(null), defaultFallbackPolicy);
});
