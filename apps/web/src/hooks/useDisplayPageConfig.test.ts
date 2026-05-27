import assert from "node:assert/strict";
import test from "node:test";
import { defaultFallbackPolicy } from "@solar-display/shared";
import { createImagesDisplayPageSeedConfig } from "../pages/Images/displayPageConfig";
import { createSustainabilityDisplayPageSeedConfig } from "../pages/Sustainability/displayPageConfig";
import { createSolarDisplayPageSeedConfig } from "../pages/Solar/displayPageConfig";
import {
  applyDisplayPageSaveConflict,
  mergeDisplayPageConfig,
  primeDisplayPageConfigCache,
  resolveCachedDisplayPageConfigSession,
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

test("mergeDisplayPageConfig preserves template-tagged highlight rail cards with independent frames", () => {
  const seedConfig = createSustainabilityDisplayPageSeedConfig("/sustainability-seed.jpg");
  const merged = mergeDisplayPageConfig(seedConfig, {
    highlightRail: {
      cards: [
        {
          contentSource: {
            mode: "static",
            payload: {
              basisSourceLabel: "今日自發自用量",
              calcProfile: {
                id: "default-four-person",
                label: "預設四口之家"
              },
              derivedStatus: "available",
              disclaimer: "依四口之家平均用電與估算電價換算",
              eyebrow: "今日綠電效益",
              householdCountDisplay: "18",
              householdLabel: "戶4口之家",
              provenance: {
                label: "今日自發自用量",
                source: "daily-self-consumption",
                sourceClass: "derived-metric",
                syncState: "fresh",
                updatedAt: "2026-05-21T10:00:00.000Z"
              },
              supportingLine: "約可折抵一日電費"
            }
          },
          displayOrder: 2,
          frame: {
            height: 108,
            left: 241,
            top: 0,
            width: 229
          },
          id: "household-cumulative",
          template: "household-equivalent",
          visible: true
        }
      ],
      container: {
        height: 108,
        left: 68,
        top: 578,
        width: 470
      }
    }
  });

  assert.equal(merged.highlightRail.container.left, 68);
  assert.equal(merged.highlightRail.cards.length, 1);
  assert.equal(merged.highlightRail.cards[0]?.id, "household-cumulative");
  assert.equal(merged.highlightRail.cards[0]?.template, "household-equivalent");
  assert.equal(merged.highlightRail.cards[0]?.frame.left, 241);
  assert.equal(merged.highlightRail.cards[0]?.contentSource.mode, "static");
  assert.equal(
    merged.highlightRail.cards[0]?.template === "household-equivalent"
      ? merged.highlightRail.cards[0].contentSource.payload.householdLabel
      : null,
    "戶4口之家"
  );
});

test("mergeDisplayPageConfig preserves newly added rail cards instead of truncating them back to the seed length", () => {
  const seedConfig = createSustainabilityDisplayPageSeedConfig("/sustainability-seed.jpg");
  const merged = mergeDisplayPageConfig(seedConfig, {
    highlightRail: {
      cards: [
        ...seedConfig.highlightRail.cards,
        {
          contentSource: {
            mode: "static",
            payload: {
              label: "新增指標",
              unit: "kWh",
              value: "--"
            }
          },
          displayOrder: 3,
          frame: {
            height: 108,
            left: 120,
            top: 0,
            width: 160
          },
          id: "metric-highlight-copy-1",
          template: "metric-highlight",
          visible: true
        }
      ],
      container: seedConfig.highlightRail.container
    }
  });

  assert.equal(merged.highlightRail.cards.length, 3);
  assert.equal(merged.highlightRail.cards[2]?.id, "metric-highlight-copy-1");
  assert.equal(merged.highlightRail.cards[2]?.template, "metric-highlight");
});

test("mergeDisplayPageConfig upgrades legacy highlight items into metric-highlight cards", () => {
  const seedConfig = createSustainabilityDisplayPageSeedConfig("/sustainability-seed.jpg");
  const merged = mergeDisplayPageConfig(seedConfig, {
    highlightRail: {
      container: {
        height: 108,
        left: 68,
        top: 578,
        width: 470
      },
      items: [
        { label: "本月減碳", unit: "tCO₂e", value: "38.4" },
        { label: "年度節電", unit: "MWh", value: "214" }
      ]
    }
  });

  assert.equal(merged.highlightRail.cards.length, 2);
  assert.equal(merged.highlightRail.cards[0]?.template, "metric-highlight");
  assert.equal(
    merged.highlightRail.cards[0]?.template === "metric-highlight"
      ? merged.highlightRail.cards[0].contentSource.payload.value
      : null,
    "38.4"
  );
  assert.equal(
    merged.highlightRail.cards[1]?.template === "metric-highlight"
      ? merged.highlightRail.cards[1].contentSource.payload.label
      : null,
    "年度節電"
  );
  assert.equal("items" in merged.highlightRail, false);
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

test("display page config cache primes live route hydration before first render", () => {
  const seedConfig = createSolarDisplayPageSeedConfig("/solar-hero.png");
  const envelope = {
    fallbackPolicy: defaultFallbackPolicy,
    pageId: "solar-cache-test",
    publishedAt: "2026-05-27T00:00:00.000Z",
    publishedBy: null,
    regions: {
      heroCopy: {
        titleLines: ["預載太陽能", seedConfig.heroCopy.titleLines[1]]
      }
    },
    stage: "live" as const,
    updatedAt: "2026-05-27T00:00:00.000Z",
    version: 8
  };

  primeDisplayPageConfigCache("solar-cache-test", "live", envelope);

  const session = resolveCachedDisplayPageConfigSession("solar-cache-test", "live", seedConfig);

  assert.equal(session?.config.heroCopy.titleLines[0], "預載太陽能");
  assert.equal(session?.lastLoadedEnvelope, envelope);
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
