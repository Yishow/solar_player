import assert from "node:assert/strict";
import test from "node:test";
import { defaultFallbackPolicy } from "@solar-display/shared";
import { createImagesDisplayPageSeedConfig } from "../pages/Images/displayPageConfig";
import { createSustainabilityDisplayPageSeedConfig } from "../pages/Sustainability/displayPageConfig";
import { createSolarDisplayPageSeedConfig } from "../pages/Solar/displayPageConfig";
import {
  applyDisplayPageSaveConflict,
  mergeDisplayPageConfig,
  resolveDisplayPageConfigStagePath,
  resolveDisplayPageFallbackPolicy,
  resolveDisplayPageConfigForPage,
  resolveDisplayPageSaveConflictMessage,
  shouldDeferDisplayPageRuntimeRender,
  shouldHydrateDisplayPageSession
} from "./useDisplayPageConfig";
import { createDraftSession } from "./displayPageDraftSession";

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
      assetId: 42,
      sourceMode: "managed-asset"
    }
  });

  assert.equal(merged.heroMedia.assetId, 42);
  assert.equal(merged.heroMedia.alt, "Managed sustainability hero");
  assert.equal(merged.heroMedia.src, "/sustainability-seed.jpg");
  assert.equal(merged.heroMedia.fitMode, seedConfig.heroMedia.fitMode);
  assert.equal(merged.heroMedia.sourceMode, "managed-asset");
});

test("mergeDisplayPageConfig preserves the seed src while honoring explicit seed-default source mode", () => {
  const seedConfig = createSolarDisplayPageSeedConfig("/solar-seed.jpg");
  const merged = mergeDisplayPageConfig(seedConfig, {
    heroMedia: {
      alt: "Solar seed fallback",
      sourceMode: "seed-default"
    }
  });

  assert.equal(merged.heroMedia.sourceMode, "seed-default");
  assert.equal(merged.heroMedia.alt, "Solar seed fallback");
  assert.equal(merged.heroMedia.src, "/solar-seed.jpg");
  assert.equal(merged.heroMedia.fitMode, seedConfig.heroMedia.fitMode);
});

test("mergeDisplayPageConfig keeps geometry and source bindings untouched during style-only card overrides", () => {
  const seedConfig = createImagesDisplayPageSeedConfig("/images-seed.jpg");
  const merged = mergeDisplayPageConfig(seedConfig, {
    cardStyles: {
      infoPanel: {
        titleFontSize: 32
      }
    }
  });

  assert.equal(merged.cardStyles.infoPanel.titleFontSize, 32);
  assert.deepEqual(merged.infoPanel, seedConfig.infoPanel);
  assert.deepEqual(merged.iconSources.infoPanel, seedConfig.iconSources.infoPanel);
  assert.deepEqual(merged.mainStage, seedConfig.mainStage);
});

test("mergeDisplayPageConfig keeps hero content and geometry untouched during page chrome appearance overrides", () => {
  const seedConfig = createSustainabilityDisplayPageSeedConfig("/sustainability-seed.jpg");
  const merged = mergeDisplayPageConfig(seedConfig, {
    chrome: {
      heroTypography: {
        titleFontSize: 92
      },
      modules: {
        periodChips: {
          chipGap: 18
        },
        provenance: {
          fontSize: 17
        }
      },
      ornaments: {
        leaf: {
          opacity: 0.58
        }
      }
    }
  });

  assert.equal(merged.chrome.heroTypography.titleFontSize, 92);
  assert.equal(merged.chrome.modules.periodChips.chipGap, 18);
  assert.equal(merged.chrome.modules.provenance.fontSize, 17);
  assert.equal(merged.chrome.ornaments.leaf.opacity, 0.58);
  assert.deepEqual(merged.hero, seedConfig.hero);
  assert.deepEqual(merged.heroMedia, seedConfig.heroMedia);
  assert.deepEqual(merged.highlightRail, seedConfig.highlightRail);
  assert.deepEqual(merged.statCards.procure, seedConfig.statCards.procure);
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

test("applyDisplayPageSaveConflict preserves local draft edits while rebasing onto the latest server baseline", () => {
  const seedConfig = createSolarDisplayPageSeedConfig("/solar-hero.png");
  const localConfig = mergeDisplayPageConfig(seedConfig, {
    heroCopy: {
      titleLines: ["本地草稿標題", seedConfig.heroCopy.titleLines[1]]
    }
  });
  const latestEnvelope = {
    fallbackPolicy: defaultFallbackPolicy,
    pageId: "solar" as const,
    publishedAt: null,
    publishedBy: null,
    regions: {
      heroCopy: {
        titleLines: ["伺服器新版標題"]
      }
    },
    stage: "draft" as const,
    updatedAt: "2026-05-20T10:00:00.000Z",
    version: 5
  };
  const session = createDraftSession(localConfig, {
    ...latestEnvelope,
    updatedAt: "2026-05-20T09:00:00.000Z",
    version: 4
  }, defaultFallbackPolicy);

  const nextSession = applyDisplayPageSaveConflict(
    session,
    mergeDisplayPageConfig(seedConfig, latestEnvelope.regions),
    latestEnvelope,
    defaultFallbackPolicy
  );

  assert.equal(nextSession.config.heroCopy.titleLines[0], "本地草稿標題");
  assert.equal(nextSession.lastLoadedConfig.heroCopy.titleLines[0], "伺服器新版標題");
  assert.equal(nextSession.lastLoadedEnvelope?.version, 5);
});

test("resolveDisplayPageSaveConflictMessage gives the operator a reload-first conflict hint", () => {
  const message = resolveDisplayPageSaveConflictMessage({
    baseVersion: 4,
    currentVersion: 5,
    latestEnvelope: {
      pageId: "overview",
      regions: {},
      stage: "draft",
      updatedAt: "2026-05-20T10:00:00.000Z",
      version: 5
    },
    resourceId: "overview",
    resourceType: "display-page-draft"
  });

  assert.match(message, /v5/);
  assert.match(message, /重新同步/);
});
