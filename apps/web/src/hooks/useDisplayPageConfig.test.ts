import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test, { type TestContext } from "node:test";
import { JSDOM } from "jsdom";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { defaultFallbackPolicy, type ConfigStage, type DisplayPageConfigEnvelope, type DisplayPageId } from "@solar-display/shared";
import { getSocketClient } from "../services/socket";
import { createImagesDisplayPageSeedConfig } from "../pages/Images/displayPageConfig";
import { createOverviewDisplayPageSeedConfig } from "../pages/Overview/displayPageConfig";
import { createSustainabilityDisplayPageSeedConfig } from "../pages/Sustainability/displayPageConfig";
import { createSolarDisplayPageSeedConfig } from "../pages/Solar/displayPageConfig";
import {
  applyDisplayPageSaveConflict,
  clearDisplayPageConfigCache,
  createDisplayPageConfigSessionFromEnvelope,
  loadDisplayPageConfigEnvelope,
  mergeDisplayPageConfig,
  primeDisplayPageConfigCache,
  resolveCachedDisplayPageConfigSession,
  resolveDisplayPageConfigSyncScopes,
  resolveDisplayPageConfigStagePath,
  resolveDisplayPageFallbackPolicy,
  resolveDisplayPageConfigForPage,
  resolveInitialDisplayPageConfigSession,
  resolveDisplayPageSaveConflictMessage,
  shouldDeferDisplayPageRuntimeRender,
  shouldHydrateDisplayPageSession,
  shouldReloadDisplayPageConfigOnSync,
  useDisplayPageConfig
} from "./useDisplayPageConfig";
import {
  applyDraftConfigUpdate,
  createDraftSession,
  redoDraftSession,
  resetDraftPaths,
  undoDraftSession
} from "./displayPageDraftSession";

const configHookSource = readFileSync(
  path.join(import.meta.dirname, "useDisplayPageConfig.ts"),
  "utf8"
);
const draftSessionSource = readFileSync(
  path.join(import.meta.dirname, "displayPageDraftSession.ts"),
  "utf8"
);
const displayPagesEditorSource = readFileSync(
  path.join(import.meta.dirname, "../pages/DisplayPagesEditor/index.tsx"),
  "utf8"
);

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

test("mergeDisplayPageConfig preserves explicit empty canonical media effect layers instead of restoring seed defaults", () => {
  const seedConfig = createOverviewDisplayPageSeedConfig("/overview-seed.jpg");
  const merged = mergeDisplayPageConfig(seedConfig, {
    heroMedia: {
      effects: {
        layers: []
      }
    }
  });

  assert.deepEqual(merged.heroMedia.effects, { layers: [] });
});

test("mergeDisplayPageConfig preserves an explicitly emptied overview background pool", () => {
  const seedConfig = createOverviewDisplayPageSeedConfig("/overview-seed.jpg", undefined, [
    "/overview-bg-1.png",
    "/overview-bg-2.png"
  ]);
  const merged = mergeDisplayPageConfig(seedConfig, {
    backgroundPool: {
      sources: []
    }
  });

  assert.deepEqual(merged.backgroundPool.sources, []);
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
  clearDisplayPageConfigCache();
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

test("display page config initial session can be resolved from a route-provided envelope", () => {
  const seedConfig = createSolarDisplayPageSeedConfig("/solar-hero.png");
  const envelope = {
    fallbackPolicy: defaultFallbackPolicy,
    pageId: "solar-cache-test",
    publishedAt: null,
    publishedBy: null,
    regions: {
      heroCopy: {
        titleLines: ["route envelope", seedConfig.heroCopy.titleLines[1]]
      }
    },
    stage: "draft" as const,
    updatedAt: "2026-05-27T00:00:00.000Z",
    version: 9
  };

  const initialSession = resolveInitialDisplayPageConfigSession({
    enabled: true,
    initialEnvelope: envelope,
    pageId: "solar-cache-test",
    seedConfig,
    stage: "draft"
  });

  assert.equal(initialSession?.config.heroCopy.titleLines[0], "route envelope");
  assert.equal(initialSession?.dirty, false);
  assert.equal(initialSession?.lastLoadedEnvelope, envelope);
  assert.equal(
    resolveInitialDisplayPageConfigSession({
      enabled: false,
      initialEnvelope: envelope,
      pageId: "solar-cache-test",
      seedConfig,
      stage: "draft"
    }),
    null
  );
});

test("display page config initial session prefers a matching session before cached or envelope data", () => {
  clearDisplayPageConfigCache();
  const seedConfig = createSolarDisplayPageSeedConfig("/solar-hero.png");
  const sessionEnvelope = {
    fallbackPolicy: defaultFallbackPolicy,
    pageId: "solar-cache-test",
    publishedAt: null,
    publishedBy: null,
    regions: {
      heroCopy: {
        titleLines: ["initial session", seedConfig.heroCopy.titleLines[1]]
      }
    },
    stage: "draft" as const,
    updatedAt: "2026-05-27T00:00:00.000Z",
    version: 10
  };
  const initialSession = createDisplayPageConfigSessionFromEnvelope(seedConfig, sessionEnvelope);

  primeDisplayPageConfigCache("solar-cache-test", "draft", {
    ...sessionEnvelope,
    regions: {
      heroCopy: {
        titleLines: ["cached session", seedConfig.heroCopy.titleLines[1]]
      }
    },
    version: 11
  });

  const resolvedSession = resolveInitialDisplayPageConfigSession({
    enabled: true,
    initialSession,
    pageId: "solar-cache-test",
    seedConfig,
    stage: "draft"
  });

  assert.equal(resolvedSession?.config.heroCopy.titleLines[0], "initial session");
  assert.equal(resolvedSession?.lastLoadedEnvelope?.version, 10);
});

test("display page draft session dirty flag updates on edit reset undo and redo", () => {
  const seedConfig = createSolarDisplayPageSeedConfig("/solar-hero.png");
  const envelope = {
    fallbackPolicy: defaultFallbackPolicy,
    pageId: "solar" as const,
    publishedAt: null,
    publishedBy: null,
    regions: {},
    stage: "draft" as const,
    updatedAt: "2026-05-20T09:00:00.000Z",
    version: 4
  };
  const session = createDraftSession(seedConfig, envelope, defaultFallbackPolicy);
  assert.equal(session.dirty, false);

  const editedSession = applyDraftConfigUpdate(session, (current) => ({
    ...current,
    heroCopy: {
      ...current.heroCopy,
      titleLines: ["本地草稿標題", current.heroCopy.titleLines[1]] as [string, string]
    }
  }), { dirtyPaths: [["heroCopy", "titleLines"]] });

  assert.equal(editedSession.dirty, true);
  assert.equal(undoDraftSession(editedSession).dirty, false);
  assert.equal(redoDraftSession(undoDraftSession(editedSession)).dirty, true);
  assert.equal(resetDraftPaths(editedSession, seedConfig, [["heroCopy", "titleLines"]]).dirty, false);
});

test("display page config envelope loader reuses cached live envelopes without duplicate reads", async () => {
  clearDisplayPageConfigCache();
  const seedConfig = createSolarDisplayPageSeedConfig("/solar-hero.png");
  const envelope = {
    fallbackPolicy: defaultFallbackPolicy,
    pageId: "solar-cache-test",
    publishedAt: "2026-05-27T00:00:00.000Z",
    publishedBy: null,
    regions: {
      heroCopy: {
        titleLines: ["共用太陽能", seedConfig.heroCopy.titleLines[1]]
      }
    },
    stage: "live" as const,
    updatedAt: "2026-05-27T00:00:00.000Z",
    version: 8
  };
  let readCount = 0;
  const readConfig = async () => {
    readCount += 1;
    return envelope;
  };

  assert.equal(
    (await loadDisplayPageConfigEnvelope("solar-cache-test", "live", { readConfig })).version,
    8
  );
  assert.equal(
    (await loadDisplayPageConfigEnvelope("solar-cache-test", "live", { readConfig })).version,
    8
  );
  assert.equal(readCount, 1);

  const session = resolveCachedDisplayPageConfigSession("solar-cache-test", "live", seedConfig);

  assert.equal(session?.config.heroCopy.titleLines[0], "共用太陽能");
});

test("display page config envelope loader shares an in-flight live envelope request", async () => {
  clearDisplayPageConfigCache();
  const seedConfig = createSolarDisplayPageSeedConfig("/solar-hero.png");
  const envelope = {
    fallbackPolicy: defaultFallbackPolicy,
    pageId: "solar-cache-test",
    publishedAt: "2026-05-27T00:00:00.000Z",
    publishedBy: null,
    regions: {
      heroCopy: {
        titleLines: ["pending 太陽能", seedConfig.heroCopy.titleLines[1]]
      }
    },
    stage: "live" as const,
    updatedAt: "2026-05-27T00:00:00.000Z",
    version: 12
  };
  let readCount = 0;
  let resolveRead: ((value: typeof envelope) => void) | null = null;
  const readConfig = async () => {
    readCount += 1;
    return new Promise<typeof envelope>((resolve) => {
      resolveRead = resolve;
    });
  };

  const firstLoad = loadDisplayPageConfigEnvelope("solar-cache-test", "live", { readConfig });
  const secondLoad = loadDisplayPageConfigEnvelope("solar-cache-test", "live", { readConfig });

  assert.equal(readCount, 1);
  const completeRead = resolveRead as ((value: typeof envelope) => void) | null;
  assert.ok(completeRead);
  completeRead(envelope);

  const [firstEnvelope, secondEnvelope] = await Promise.all([firstLoad, secondLoad]);

  assert.equal(firstEnvelope.version, 12);
  assert.equal(secondEnvelope.version, 12);
  assert.equal(resolveCachedDisplayPageConfigSession("solar-cache-test", "live", seedConfig)?.lastLoadedEnvelope, envelope);
});

test("display page config envelope loader force reloads for display sync", async () => {
  clearDisplayPageConfigCache();
  let readCount = 0;
  const readConfig = async () => {
    readCount += 1;
    return {
      fallbackPolicy: defaultFallbackPolicy,
      pageId: "overview",
      publishedAt: "2026-05-27T00:00:00.000Z",
      publishedBy: null,
      regions: {
        hero: {
          titleLines: [readCount === 1 ? "初始總覽" : "同步總覽"]
        }
      },
      stage: "live" as const,
      updatedAt: "2026-05-27T00:00:00.000Z",
      version: readCount
    };
  };

  assert.equal((await loadDisplayPageConfigEnvelope("overview", "live", { readConfig })).version, 1);
  assert.equal((await loadDisplayPageConfigEnvelope("overview", "live", { readConfig })).version, 1);
  assert.equal(
    (await loadDisplayPageConfigEnvelope("overview", "live", { force: true, readConfig })).version,
    2
  );
  assert.equal(readCount, 2);
});

test("display page config envelope loader keeps the warm envelope when a force reload fails", async () => {
  clearDisplayPageConfigCache();
  const seedConfig = createSolarDisplayPageSeedConfig("/solar-hero.png");
  const envelope = {
    fallbackPolicy: defaultFallbackPolicy,
    pageId: "solar-cache-test",
    publishedAt: "2026-05-27T00:00:00.000Z",
    publishedBy: null,
    regions: {
      heroCopy: {
        titleLines: ["保留太陽能", seedConfig.heroCopy.titleLines[1]]
      }
    },
    stage: "live" as const,
    updatedAt: "2026-05-27T00:00:00.000Z",
    version: 13
  };

  assert.equal(
    (await loadDisplayPageConfigEnvelope("solar-cache-test", "live", {
      readConfig: async () => envelope
    })).version,
    13
  );
  await assert.rejects(
    loadDisplayPageConfigEnvelope("solar-cache-test", "live", {
      force: true,
      readConfig: async () => {
        throw new Error("live config unavailable");
      }
    }),
    /live config unavailable/
  );

  const session = resolveCachedDisplayPageConfigSession("solar-cache-test", "live", seedConfig);

  assert.equal(session?.lastLoadedEnvelope, envelope);
  assert.equal(session?.config.heroCopy.titleLines[0], "保留太陽能");
});

test("live-stage warm config cache does not seed draft-stage sessions", () => {
  clearDisplayPageConfigCache();
  const seedConfig = createSolarDisplayPageSeedConfig("/solar-hero.png");
  const liveEnvelope = {
    fallbackPolicy: defaultFallbackPolicy,
    pageId: "solar-cache-test",
    publishedAt: "2026-05-27T00:00:00.000Z",
    publishedBy: null,
    regions: {
      heroCopy: {
        titleLines: ["live only", seedConfig.heroCopy.titleLines[1]]
      }
    },
    stage: "live" as const,
    updatedAt: "2026-05-27T00:00:00.000Z",
    version: 14
  };

  primeDisplayPageConfigCache("solar-cache-test", "live", liveEnvelope);

  assert.equal(
    resolveInitialDisplayPageConfigSession({
      enabled: true,
      pageId: "solar-cache-test",
      seedConfig,
      stage: "draft"
    }),
    null
  );
});

test("display page config hook ignores stale route hydration after a newer reload starts", () => {
  assert.match(configHookSource, /const loadRequestIdRef = useRef\(0\)/);
  assert.match(configHookSource, /requestId !== loadRequestIdRef\.current/);
  assert.match(configHookSource, /requestId === loadRequestIdRef\.current/);
});

test("display page config hook reads session dirty state instead of stringifying config during render", () => {
  assert.match(configHookSource, /const dirty = currentSession\?\.dirty \?\? false/);
  assert.doesNotMatch(configHookSource, /JSON\.stringify\(config\)/);
  assert.doesNotMatch(configHookSource, /JSON\.stringify\(lastLoadedConfig\)/);
});

test("display page draft session tracks scoped dirty operations instead of full-config serialization", () => {
  assert.doesNotMatch(draftSessionSource, /JSON\.stringify\(config\) !== JSON\.stringify\(lastLoadedConfig\)/);
  assert.doesNotMatch(draftSessionSource, /isDraftConfigDirty/);
  assert.match(draftSessionSource, /dirtyPaths/);
  assert.match(displayPagesEditorSource, /dirtyPaths:\s*\[path\]/);
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

test("live runtime pages reload page config when a relevant display-pages sync arrives", () => {
  assert.equal(
    shouldReloadDisplayPageConfigOnSync({
      enabled: true,
      stage: "live",
      dirty: false,
      scope: "display-pages"
    }),
    true
  );
});

test("display page config sync reload is suppressed for dirty, draft, disabled, or unrelated scopes", () => {
  // dirty live：保護未同步的本地狀態（理論上 live 不會 dirty，但仍防禦）
  assert.equal(
    shouldReloadDisplayPageConfigOnSync({
      enabled: true,
      stage: "live",
      dirty: true,
      scope: "display-pages"
    }),
    false
  );
  // draft：編輯器草稿不可被 socket 重載覆蓋
  assert.equal(
    shouldReloadDisplayPageConfigOnSync({
      enabled: true,
      stage: "draft",
      dirty: false,
      scope: "display-pages"
    }),
    false
  );
  // disabled：runtime hydration 關閉時不連動
  assert.equal(
    shouldReloadDisplayPageConfigOnSync({
      enabled: false,
      stage: "live",
      dirty: false,
      scope: "display-pages"
    }),
    false
  );
  // 非 config 變更的 scope 不應觸發 config reload（由各自的資料 runtime 處理）
  for (const scope of ["images", "mqtt", "sustainability", "circuits"] as const) {
    assert.equal(
      shouldReloadDisplayPageConfigOnSync({
        enabled: true,
        stage: "live",
        dirty: false,
        scope
      }),
      false
    );
  }
});

test("resolveDisplayPageConfigStagePath targets the live publishing channel for runtime reads", () => {
  assert.equal(resolveDisplayPageConfigStagePath("overview", "live"), "/api/display-pages/overview/live");
  assert.equal(resolveDisplayPageConfigStagePath("overview", "draft"), "/api/display-pages/overview/draft");
});

test("resolveDisplayPageConfigSyncScopes only enables display sync refresh for live runtime hydration", () => {
  assert.deepEqual(resolveDisplayPageConfigSyncScopes(true, "live"), ["display-pages"]);
  assert.deepEqual(resolveDisplayPageConfigSyncScopes(true, "draft"), []);
  assert.deepEqual(resolveDisplayPageConfigSyncScopes(false, "live"), []);
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
  assert.equal(nextSession.dirty, true);
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

// ---------------------------------------------------------------------------
// Mounted hook harness: the hook runs in a real React root and talks to the
// real api module through a deferred fetch, so save/reload/remount ordering is
// exercised end to end rather than through the cache helpers alone.

const hookSeed = { hero: { title: "種子標題" } };
type HookSeed = typeof hookSeed;
type HookResult = ReturnType<typeof useDisplayPageConfig<HookSeed>>;

let hookDom: JSDOM | null = null;

function ensureHookDom() {
  if (hookDom) {
    return;
  }

  hookDom = new JSDOM("<!doctype html><html><body></body></html>", {
    pretendToBeVisual: true,
    url: "http://127.0.0.1/settings/display-pages/editor"
  });
  for (const [key, value] of Object.entries({
    document: hookDom.window.document,
    HTMLElement: hookDom.window.HTMLElement,
    navigator: hookDom.window.navigator,
    window: hookDom.window
  })) {
    Object.defineProperty(globalThis, key, { configurable: true, value, writable: true });
  }
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
}

test.after(() => {
  if (hookDom) {
    getSocketClient().disconnect();
    hookDom.window.close();
  }
});

async function flushAsync() {
  for (let index = 0; index < 5; index += 1) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

async function settle(action: () => unknown) {
  await act(async () => {
    action();
    await flushAsync();
  });
}

async function mountConfigHook(t: TestContext, pageId: DisplayPageId, stage: ConfigStage = "draft") {
  ensureHookDom();
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const latest: { current: HookResult | null } = { current: null };
  let mounted = true;
  let activePageId = pageId;
  let activeStage = stage;

  function Probe({ pageId: probePageId, stage: probeStage }: { pageId: DisplayPageId; stage: ConfigStage }) {
    latest.current = useDisplayPageConfig(probePageId, hookSeed, { stage: probeStage });
    return null;
  }

  const unmount = async () => {
    if (!mounted) {
      return;
    }

    mounted = false;
    await act(async () => root.unmount());
    container.remove();
  };
  t.after(unmount);
  await settle(() => root.render(React.createElement(Probe, { pageId: activePageId, stage: activeStage })));

  return {
    get result() {
      assert.ok(latest.current);
      return latest.current;
    },
    switchPage: (nextPageId: DisplayPageId) => settle(() => {
      activePageId = nextPageId;
      root.render(React.createElement(Probe, { pageId: activePageId, stage: activeStage }));
    }),
    switchStage: (nextStage: ConfigStage) => settle(() => {
      activeStage = nextStage;
      root.render(React.createElement(Probe, { pageId: activePageId, stage: activeStage }));
    }),
    unmount
  };
}

type HookHandle = Awaited<ReturnType<typeof mountConfigHook>>;

type Deferred<T> = {
  promise: Promise<T>;
  reject: (error: unknown) => void;
  resolve: (value: T) => void;
};

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

// Every GET is a read and every PUT a save; each answers only when the test
// resolves its deferred response.
function installDisplayPageApi(t: TestContext) {
  const reads: Array<Deferred<Response>> = [];
  const saves: Array<{ body: { baseVersion?: number }; response: Deferred<Response> }> = [];
  t.mock.method(globalThis, "fetch", (_input: unknown, init?: RequestInit) => {
    const response = createDeferred<Response>();
    if (init?.method === "PUT") {
      saves.push({ body: JSON.parse(String(init.body)) as { baseVersion?: number }, response });
    } else {
      reads.push(response);
    }
    return response.promise;
  });
  return { reads, saves };
}

function hookEnvelope(pageId: DisplayPageId, version: number, title: string, stage: ConfigStage = "draft"): DisplayPageConfigEnvelope {
  return {
    fallbackPolicy: defaultFallbackPolicy,
    pageId,
    publishedAt: null,
    publishedBy: null,
    regions: { hero: { title } },
    stage,
    updatedAt: `2026-09-10T00:00:${String(version).padStart(2, "0")}.000Z`,
    version
  };
}

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { headers: { "Content-Type": "application/json" }, status });
}

const configResponse = (envelope: DisplayPageConfigEnvelope) => jsonResponse(200, { config: envelope });
const conflictResponse = (latestEnvelope: DisplayPageConfigEnvelope, baseVersion: number) => jsonResponse(409, {
  code: "management_draft_conflict",
  conflict: {
    baseVersion,
    currentVersion: latestEnvelope.version,
    latestEnvelope,
    resourceId: latestEnvelope.pageId,
    resourceType: "display-page-draft"
  },
  error: "draft conflict",
  success: false,
  timestamp: "2026-09-10T00:00:00.000Z"
});

function cachedVersion(pageId: DisplayPageId, stage: ConfigStage) {
  return resolveCachedDisplayPageConfigSession(pageId, stage, hookSeed)?.lastLoadedEnvelope.version ?? null;
}

async function editTitle(hook: HookHandle, title: string) {
  await settle(() => hook.result.setConfig((current) => ({ ...current, hero: { title } })));
}

// These return a holder instead of the operation's promise: an async function
// returning a pending promise would adopt it, so the caller could never reach
// the step that answers the request the operation is waiting on.
async function startSave(hook: HookHandle) {
  const operation = { finished: Promise.resolve() };
  await settle(() => {
    operation.finished = hook.result.save();
  });
  return operation;
}

async function startReload(
  hook: HookHandle,
  options: { discardLocalChanges?: boolean } = { discardLocalChanges: true }
) {
  const operation = { finished: Promise.resolve() };
  await settle(() => {
    operation.finished = hook.result.reload(options);
  });
  return operation;
}

test("a successful draft save publishes its envelope to the stage-page cache and survives remount", async (t) => {
  clearDisplayPageConfigCache();
  const api = installDisplayPageApi(t);
  primeDisplayPageConfigCache("overview", "draft", hookEnvelope("overview", 4, "v4 標題"));

  const first = await mountConfigHook(t, "overview");
  assert.equal(first.result.lastLoadedEnvelope?.version, 4);
  await editTitle(first, "本地標題");
  const saving = await startSave(first);
  assert.equal(api.saves[0]?.body.baseVersion, 4);
  await settle(() => api.saves[0]!.response.resolve(configResponse(hookEnvelope("overview", 5, "本地標題"))));
  await saving.finished;

  assert.equal(first.result.lastLoadedEnvelope?.version, 5);
  assert.equal(first.result.dirty, false);
  assert.equal(cachedVersion("overview", "draft"), 5);
  await first.unmount();

  const second = await mountConfigHook(t, "overview");
  assert.equal(second.result.lastLoadedEnvelope?.version, 5);
  assert.equal(second.result.config.hero.title, "本地標題");
  assert.equal(api.reads.length, 0, "remount initializes from the committed cache without a read");
  await editTitle(second, "再次編輯");
  const savingAgain = await startSave(second);
  assert.equal(api.saves[1]?.body.baseVersion, 5);
  await settle(() => api.saves[1]!.response.resolve(configResponse(hookEnvelope("overview", 6, "再次編輯"))));
  await savingAgain.finished;
});

test("draft-cold-edit-blocked keeps a pending draft read baseline-free", async (t) => {
  clearDisplayPageConfigCache();
  const api = installDisplayPageApi(t);
  const hook = await mountConfigHook(t, "overview");
  const initialConfig = hook.result.config;

  assert.equal(api.reads.length, 1);
  assert.equal(hook.result.isLoading, true);
  assert.equal(hook.result.lastLoadedEnvelope, null);

  await settle(() => {
    hook.result.setConfig((current) => ({ ...current, hero: { title: "不應建立基線" } }));
    hook.result.applyConfigUpdate((current) => ({ ...current, hero: { title: "不應建立歷程" } }));
    hook.result.resetPaths([["hero", "title"]]);
    hook.result.undo();
    hook.result.redo();
  });

  assert.equal(hook.result.canEdit, false);
  assert.deepEqual(hook.result.config, initialConfig);
  assert.equal(hook.result.dirty, false);
  assert.equal(hook.result.canUndo, false);
  assert.equal(hook.result.canRedo, false);
  assert.equal(hook.result.isLoading, true);

  await settle(() => api.reads[0]!.resolve(configResponse(hookEnvelope("overview", 4, "伺服器基線"))));
  const loadedEnvelope = hook.result.lastLoadedEnvelope as unknown as DisplayPageConfigEnvelope;
  assert.equal(loadedEnvelope.version, 4);
  assert.equal(hook.result.config.hero.title, "伺服器基線");
  assert.equal(hook.result.canEdit, true);
});

test("draft-load-failure-retry keeps the seed read-only until an envelope arrives", async (t) => {
  clearDisplayPageConfigCache();
  const api = installDisplayPageApi(t);
  const hook = await mountConfigHook(t, "overview");

  await settle(() => api.reads[0]!.reject(new Error("draft read failed")));
  assert.equal(hook.result.isLoading, false);
  assert.equal(hook.result.lastLoadedEnvelope, null);
  assert.equal(hook.result.canEdit, false);
  assert.equal(hook.result.dirty, false);
  assert.equal(hook.result.config.hero.title, hookSeed.hero.title);
  assert.equal(hook.result.errorMessage, "draft read failed");

  await settle(() => {
    void hook.result.save();
  });
  assert.equal(api.saves.length, 0, "a failed initial read cannot save the seed fallback");

  const retrying = await startReload(hook, { discardLocalChanges: false });
  assert.equal(api.reads.length, 2);
  assert.equal(hook.result.isLoading, true);
  assert.equal(hook.result.canEdit, false);
  await settle(() => api.reads[1]!.resolve(configResponse(hookEnvelope("overview", 7, "重試基線"))));
  await retrying.finished;

  const retriedEnvelope = hook.result.lastLoadedEnvelope as unknown as DisplayPageConfigEnvelope;
  assert.equal(retriedEnvelope.version, 7);
  assert.equal(hook.result.config.hero.title, "重試基線");
  assert.equal(hook.result.canEdit, true);
  await editTitle(hook, "重試後編輯");
  const saving = await startSave(hook);
  assert.equal(api.saves[0]?.body.baseVersion, 7);
  await settle(() => api.saves[0]!.response.resolve(configResponse(hookEnvelope("overview", 8, "重試後編輯"))));
  await saving.finished;
});

test("draft-page-stage-isolation prevents old responses from enabling the new owner", async (t) => {
  clearDisplayPageConfigCache();
  const api = installDisplayPageApi(t);
  const hook = await mountConfigHook(t, "overview");
  assert.equal(api.reads.length, 1);

  await hook.switchPage("solar");
  assert.equal(api.reads.length, 2);
  await hook.switchStage("live");
  assert.equal(api.reads.length, 3);

  await settle(() => api.reads[0]!.resolve(configResponse(hookEnvelope("overview", 4, "舊頁面"))));
  await settle(() => api.reads[1]!.resolve(configResponse(hookEnvelope("solar", 5, "舊階段"))));
  assert.equal(hook.result.lastLoadedEnvelope, null);
  assert.equal(hook.result.config.hero.title, hookSeed.hero.title);
  assert.equal(hook.result.canEdit, true, "live keeps its existing editable contract");

  await settle(() => api.reads[2]!.resolve(configResponse(hookEnvelope("solar", 6, "新 owner", "live"))));
  const currentEnvelope = hook.result.lastLoadedEnvelope as unknown as DisplayPageConfigEnvelope;
  assert.equal(currentEnvelope.pageId, "solar");
  assert.equal(currentEnvelope.stage, "live");
  assert.equal(currentEnvelope.version, 6);
  assert.equal(hook.result.config.hero.title, "新 owner");
});

test("draft reload requires explicit discard and failed retry preserves local history", async (t) => {
  clearDisplayPageConfigCache();
  const api = installDisplayPageApi(t);
  primeDisplayPageConfigCache("overview", "draft", hookEnvelope("overview", 4, "伺服器基線"));
  const hook = await mountConfigHook(t, "overview");

  await editTitle(hook, "本地草稿");
  assert.equal(hook.result.dirty, true);
  assert.equal(hook.result.canUndo, true);
  const beforeCancel = {
    config: hook.result.config,
    lastLoadedEnvelope: hook.result.lastLoadedEnvelope,
    dirty: hook.result.dirty,
    canUndo: hook.result.canUndo
  };

  const cancelled = await startReload(hook, {});
  await cancelled.finished;
  assert.equal(api.reads.length, 0, "a dirty reload without discard permission is a no-op");
  assert.deepEqual(
    {
      config: hook.result.config,
      lastLoadedEnvelope: hook.result.lastLoadedEnvelope,
      dirty: hook.result.dirty,
      canUndo: hook.result.canUndo
    },
    beforeCancel
  );

  const failed = { finished: Promise.resolve() };
  await settle(() => {
    failed.finished = hook.result.reload({ discardLocalChanges: true });
    hook.result.setConfig((current) => ({ ...current, hero: { title: "不可於重載中編輯" } }));
  });
  assert.equal(api.reads.length, 1);
  assert.equal(hook.result.isLoading, true);
  assert.equal(hook.result.canEdit, false);
  assert.equal(hook.result.config.hero.title, "本地草稿");
  assert.equal(hook.result.canUndo, true);
  await settle(() => api.reads[0]!.reject(new Error("reload failed")));
  await failed.finished;

  assert.equal(hook.result.config.hero.title, "本地草稿");
  assert.equal(hook.result.dirty, true);
  assert.equal(hook.result.canUndo, true);
  assert.equal(hook.result.lastLoadedEnvelope?.version, 4);
  assert.equal(hook.result.canEdit, true);
  assert.equal(hook.result.errorMessage, "reload failed");

  const retry = await startReload(hook, { discardLocalChanges: true });
  await settle(() => api.reads[1]!.resolve(configResponse(hookEnvelope("overview", 5, "伺服器重載"))));
  await retry.finished;
  assert.equal(hook.result.config.hero.title, "伺服器重載");
  assert.equal(hook.result.dirty, false);
  assert.equal(hook.result.canUndo, false);
  assert.equal(hook.result.lastLoadedEnvelope?.version, 5);
});

test("a save that settles after unmount still commits its envelope for the next mount", async (t) => {
  clearDisplayPageConfigCache();
  const api = installDisplayPageApi(t);
  primeDisplayPageConfigCache("overview", "draft", hookEnvelope("overview", 4, "v4 標題"));

  const first = await mountConfigHook(t, "overview");
  await editTitle(first, "本地標題");
  const saving = await startSave(first);
  await first.unmount();
  await settle(() => api.saves[0]!.response.resolve(configResponse(hookEnvelope("overview", 5, "本地標題"))));
  await saving.finished;

  assert.equal(cachedVersion("overview", "draft"), 5);
  const second = await mountConfigHook(t, "overview");
  assert.equal(second.result.lastLoadedEnvelope?.version, 5);
  assert.equal(api.reads.length, 0);
});

test("a save that settles after the owner switched pages leaves the new page's loading and message alone", async (t) => {
  clearDisplayPageConfigCache();
  const api = installDisplayPageApi(t);
  primeDisplayPageConfigCache("overview", "draft", hookEnvelope("overview", 4, "v4 標題"));

  const hook = await mountConfigHook(t, "overview");
  await editTitle(hook, "本地標題");
  const saving = await startSave(hook);
  await hook.switchPage("solar");
  assert.equal(hook.result.isLoading, true);
  assert.equal(api.reads.length, 1);

  await settle(() => api.saves[0]!.response.resolve(configResponse(hookEnvelope("overview", 5, "本地標題"))));
  await saving.finished;
  assert.equal(cachedVersion("overview", "draft"), 5);
  assert.equal(hook.result.isLoading, true, "the overview save must not settle solar's hydration");
  assert.notEqual(hook.result.message, "展示頁設定已儲存。");

  await settle(() => api.reads[0]!.resolve(configResponse(hookEnvelope("solar", 3, "太陽能 v3"))));
  assert.equal(hook.result.lastLoadedEnvelope?.version, 3);
  assert.equal(hook.result.isLoading, false);

  await hook.switchPage("overview");
  assert.equal(hook.result.lastLoadedEnvelope?.version, 5);
  assert.equal(hook.result.config.hero.title, "本地標題");
});

test("a late save from the previous page cannot clear the current page's newer saving state", async (t) => {
  clearDisplayPageConfigCache();
  const api = installDisplayPageApi(t);
  primeDisplayPageConfigCache("overview", "draft", hookEnvelope("overview", 4, "overview v4"));
  primeDisplayPageConfigCache("solar", "draft", hookEnvelope("solar", 3, "solar v3"));

  const hook = await mountConfigHook(t, "overview");
  await editTitle(hook, "overview local");
  const overviewSave = await startSave(hook);

  await hook.switchPage("solar");
  assert.equal(hook.result.isSaving, false, "switching owners resets the previous page's saving state");
  await editTitle(hook, "solar local");
  const solarSave = await startSave(hook);
  assert.equal(hook.result.isSaving, true);

  await settle(() => api.saves[0]!.response.resolve(configResponse(hookEnvelope("overview", 5, "overview local"))));
  await overviewSave.finished;
  assert.equal(hook.result.isSaving, true, "the obsolete overview finally must not clear solar's save state");

  await settle(() => api.saves[1]!.response.resolve(configResponse(hookEnvelope("solar", 4, "solar local"))));
  await solarSave.finished;
  assert.equal(hook.result.isSaving, false);
});

test("a save from an earlier visit cannot overwrite a newer lifecycle on the same page", async (t) => {
  clearDisplayPageConfigCache();
  const api = installDisplayPageApi(t);
  primeDisplayPageConfigCache("overview", "draft", hookEnvelope("overview", 4, "overview v4"));
  primeDisplayPageConfigCache("solar", "draft", hookEnvelope("solar", 3, "solar v3"));

  const hook = await mountConfigHook(t, "overview");
  await editTitle(hook, "old visit edit");
  const oldSave = await startSave(hook);
  await hook.switchPage("solar");
  await hook.switchPage("overview");
  await editTitle(hook, "new visit edit");
  const newSave = await startSave(hook);

  await settle(() => api.saves[0]!.response.resolve(configResponse(hookEnvelope("overview", 5, "old visit edit"))));
  await oldSave.finished;
  assert.equal(cachedVersion("overview", "draft"), 5);
  assert.equal(hook.result.config.hero.title, "new visit edit");
  assert.equal(hook.result.dirty, true);
  assert.equal(hook.result.isSaving, true, "the earlier lifecycle must not settle the current save");

  await settle(() => api.saves[1]!.response.resolve(conflictResponse(hookEnvelope("overview", 5, "old visit edit"), 4)));
  await newSave.finished;
  assert.equal(hook.result.config.hero.title, "new visit edit");
  assert.equal(hook.result.dirty, true);
  assert.equal(hook.result.lastLoadedEnvelope?.version, 5);
  assert.equal(hook.result.isSaving, false);
});

test("a failed draft save without an authoritative envelope leaves the cache and baseline for retry", async (t) => {
  clearDisplayPageConfigCache();
  const api = installDisplayPageApi(t);
  primeDisplayPageConfigCache("overview", "draft", hookEnvelope("overview", 4, "v4 標題"));

  const hook = await mountConfigHook(t, "overview");
  await editTitle(hook, "本地標題");
  const saving = await startSave(hook);
  await settle(() => api.saves[0]!.response.resolve(jsonResponse(500, { error: "server unavailable", success: false })));
  await saving.finished;

  assert.equal(cachedVersion("overview", "draft"), 4);
  assert.equal(hook.result.lastLoadedEnvelope?.version, 4);
  assert.equal(hook.result.config.hero.title, "本地標題");
  assert.equal(hook.result.dirty, true);
  assert.notEqual(hook.result.errorMessage, "");

  const retry = await startSave(hook);
  assert.equal(api.saves[1]?.body.baseVersion, 4);
  await settle(() => api.saves[1]!.response.resolve(configResponse(hookEnvelope("overview", 5, "本地標題"))));
  await retry.finished;
});

test("a save conflict publishes the latest envelope while keeping local edits for a newest-baseVersion retry", async (t) => {
  clearDisplayPageConfigCache();
  const api = installDisplayPageApi(t);
  primeDisplayPageConfigCache("overview", "draft", hookEnvelope("overview", 4, "v4 標題"));

  const hook = await mountConfigHook(t, "overview");
  await editTitle(hook, "本地標題");
  const saving = await startSave(hook);
  await settle(() => api.saves[0]!.response.resolve(conflictResponse(hookEnvelope("overview", 6, "伺服器 v6 標題"), 4)));
  await saving.finished;

  assert.equal(cachedVersion("overview", "draft"), 6);
  assert.equal(hook.result.lastLoadedEnvelope?.version, 6);
  assert.equal(hook.result.config.hero.title, "本地標題");
  assert.equal(hook.result.dirty, true);
  assert.match(hook.result.errorMessage, /v6/);
  assert.notEqual(hook.result.message, "展示頁設定已儲存。");

  const retry = await startSave(hook);
  assert.equal(api.saves[1]?.body.baseVersion, 6);
  await settle(() => api.saves[1]!.response.resolve(configResponse(hookEnvelope("overview", 7, "本地標題"))));
  await retry.finished;
});

test("only the committed stage-page cache entry changes when a draft save succeeds", async (t) => {
  clearDisplayPageConfigCache();
  const api = installDisplayPageApi(t);
  primeDisplayPageConfigCache("overview", "draft", hookEnvelope("overview", 5, "總覽草稿"));
  primeDisplayPageConfigCache("overview", "live", hookEnvelope("overview", 2, "總覽正式", "live"));
  primeDisplayPageConfigCache("solar", "draft", hookEnvelope("solar", 3, "太陽能草稿"));

  const hook = await mountConfigHook(t, "overview");
  await editTitle(hook, "總覽新草稿");
  const saving = await startSave(hook);
  await settle(() => api.saves[0]!.response.resolve(configResponse(hookEnvelope("overview", 6, "總覽新草稿"))));
  await saving.finished;

  assert.equal(cachedVersion("overview", "draft"), 6);
  assert.equal(cachedVersion("overview", "live"), 2);
  assert.equal(cachedVersion("solar", "draft"), 3);
});

test("a reload that resolves after a save cannot downgrade the saved envelope or hold loading", async (t) => {
  clearDisplayPageConfigCache();
  const api = installDisplayPageApi(t);
  primeDisplayPageConfigCache("overview", "draft", hookEnvelope("overview", 4, "v4 標題"));

  const hook = await mountConfigHook(t, "overview");
  await editTitle(hook, "本地標題");
  const saving = await startSave(hook);
  const reloading = await startReload(hook);
  assert.equal(hook.result.isLoading, true);
  assert.equal(api.reads.length, 1);
  await settle(() => api.saves[0]!.response.resolve(configResponse(hookEnvelope("overview", 5, "本地標題"))));
  await saving.finished;
  assert.equal(hook.result.isLoading, false, "the save commit settles the loading it took over");
  assert.equal(hook.result.lastLoadedEnvelope?.version, 5);

  await settle(() => api.reads[0]!.resolve(configResponse(hookEnvelope("overview", 4, "v4 標題"))));
  await reloading.finished;
  assert.equal(cachedVersion("overview", "draft"), 5);
  assert.equal(hook.result.lastLoadedEnvelope?.version, 5);
  assert.equal(hook.result.config.hero.title, "本地標題");
  assert.equal(hook.result.errorMessage, "");
  assert.equal(hook.result.isLoading, false);
});

test("an obsolete reload rejection cannot change the saved session or a newer reload's loading", async (t) => {
  clearDisplayPageConfigCache();
  const api = installDisplayPageApi(t);
  primeDisplayPageConfigCache("overview", "draft", hookEnvelope("overview", 4, "v4 標題"));

  const hook = await mountConfigHook(t, "overview");
  await editTitle(hook, "本地標題");
  const saving = await startSave(hook);
  const obsoleteReload = await startReload(hook);
  await settle(() => api.saves[0]!.response.resolve(configResponse(hookEnvelope("overview", 5, "本地標題"))));
  await saving.finished;
  const currentReload = await startReload(hook);
  assert.equal(api.reads.length, 2);
  assert.equal(hook.result.isLoading, true);

  // The superseded read joins the newer one, so its reload settles only with it.
  await settle(() => api.reads[0]!.reject(new Error("obsolete read failed")));
  assert.equal(hook.result.lastLoadedEnvelope?.version, 5);
  assert.equal(hook.result.errorMessage, "");
  assert.equal(hook.result.isLoading, true, "the obsolete read must not clear the newer reload's loading");

  await settle(() => api.reads[1]!.resolve(configResponse(hookEnvelope("overview", 5, "本地標題"))));
  await Promise.all([obsoleteReload.finished, currentReload.finished]);
  assert.equal(hook.result.isLoading, false);
  assert.equal(hook.result.lastLoadedEnvelope?.version, 5);
});

test("a reload that resolves after a save conflict cannot discard the kept local draft", async (t) => {
  // A conflict keeps the session dirty, so nothing but the commit itself can
  // retire the reload that was already in flight.
  clearDisplayPageConfigCache();
  const api = installDisplayPageApi(t);
  primeDisplayPageConfigCache("overview", "draft", hookEnvelope("overview", 4, "v4 標題"));

  const hook = await mountConfigHook(t, "overview");
  await editTitle(hook, "本地標題");
  const saving = await startSave(hook);
  const reloading = await startReload(hook);
  await settle(() => api.saves[0]!.response.resolve(conflictResponse(hookEnvelope("overview", 6, "伺服器 v6 標題"), 4)));
  await saving.finished;
  assert.equal(hook.result.isLoading, false, "the conflict commit settles the loading it took over");

  await settle(() => api.reads[0]!.resolve(configResponse(hookEnvelope("overview", 4, "v4 標題"))));
  await reloading.finished;
  assert.equal(hook.result.config.hero.title, "本地標題");
  assert.equal(hook.result.dirty, true);
  assert.equal(hook.result.lastLoadedEnvelope?.version, 6);
  assert.equal(cachedVersion("overview", "draft"), 6);
});

test("hydration adopts an envelope committed after its read settled but before it resumed", async (t) => {
  clearDisplayPageConfigCache();
  ensureHookDom();
  const api = installDisplayPageApi(t);
  // Registered before the hook joins the same read, so this commit lands after
  // the read settles as current and before hydration resumes.
  const sharedRead = loadDisplayPageConfigEnvelope("overview", "draft");
  const committed = sharedRead.then(() => {
    primeDisplayPageConfigCache("overview", "draft", hookEnvelope("overview", 5, "v5 標題"));
  });

  const hook = await mountConfigHook(t, "overview");
  assert.equal(api.reads.length, 1, "the hook joins the pending read");
  await settle(() => api.reads[0]!.resolve(configResponse(hookEnvelope("overview", 4, "v4 標題"))));
  await committed;

  assert.equal(cachedVersion("overview", "draft"), 5);
  assert.equal(hook.result.lastLoadedEnvelope?.version, 5);
  assert.equal(hook.result.isLoading, false);
});

test("hydration adopts an envelope committed after its read failed but before it resumed", async (t) => {
  clearDisplayPageConfigCache();
  ensureHookDom();
  const api = installDisplayPageApi(t);
  const sharedRead = loadDisplayPageConfigEnvelope("overview", "draft");
  const committed = sharedRead.catch(() => {
    primeDisplayPageConfigCache("overview", "draft", hookEnvelope("overview", 5, "v5 標題"));
  });

  const hook = await mountConfigHook(t, "overview");
  await settle(() => api.reads[0]!.reject(new Error("draft read failed")));
  await committed;

  assert.equal(hook.result.lastLoadedEnvelope?.version, 5);
  assert.equal(hook.result.errorMessage, "");
  assert.equal(hook.result.isLoading, false);
});

test("hydration awaiting a read superseded by an external prime adopts the committed envelope", async (t) => {
  clearDisplayPageConfigCache();
  const api = installDisplayPageApi(t);

  const hook = await mountConfigHook(t, "overview");
  assert.equal(hook.result.isLoading, true);
  assert.equal(api.reads.length, 1);

  await settle(() => primeDisplayPageConfigCache("overview", "draft", hookEnvelope("overview", 5, "v5 標題")));
  await settle(() => api.reads[0]!.resolve(configResponse(hookEnvelope("overview", 4, "v4 標題"))));

  assert.equal(cachedVersion("overview", "draft"), 5);
  assert.equal(hook.result.lastLoadedEnvelope?.version, 5);
  assert.equal(hook.result.isLoading, false);
});

test("hydration whose read fails after an external prime adopts the committed envelope without an error", async (t) => {
  clearDisplayPageConfigCache();
  const api = installDisplayPageApi(t);

  const hook = await mountConfigHook(t, "overview");
  await settle(() => primeDisplayPageConfigCache("overview", "draft", hookEnvelope("overview", 5, "v5 標題")));
  await settle(() => api.reads[0]!.reject(new Error("obsolete read failed")));

  assert.equal(hook.result.lastLoadedEnvelope?.version, 5);
  assert.equal(hook.result.errorMessage, "");
  assert.equal(hook.result.isLoading, false);
});

test("a public loader caller receives the committed envelope instead of an obsolete read outcome", async () => {
  clearDisplayPageConfigCache();
  const staleRead = createDeferred<DisplayPageConfigEnvelope>();
  const loading = loadDisplayPageConfigEnvelope("overview", "draft", { force: true, readConfig: () => staleRead.promise });
  primeDisplayPageConfigCache("overview", "draft", hookEnvelope("overview", 5, "v5 標題"));
  staleRead.resolve(hookEnvelope("overview", 4, "v4 標題"));
  assert.equal((await loading).version, 5);
  assert.equal(cachedVersion("overview", "draft"), 5);

  const failedRead = createDeferred<DisplayPageConfigEnvelope>();
  const failing = loadDisplayPageConfigEnvelope("overview", "draft", { force: true, readConfig: () => failedRead.promise });
  primeDisplayPageConfigCache("overview", "draft", hookEnvelope("overview", 6, "v6 標題"));
  failedRead.reject(new Error("obsolete read failed"));
  assert.equal((await failing).version, 6);
});

test("a superseded read joins the newer pending read and its finalizer keeps that pending entry", async () => {
  clearDisplayPageConfigCache();
  const olderRead = createDeferred<DisplayPageConfigEnvelope>();
  const newerRead = createDeferred<DisplayPageConfigEnvelope>();
  let readCount = 0;
  const readConfig = () => {
    readCount += 1;
    return readCount === 1 ? olderRead.promise : newerRead.promise;
  };

  const older = loadDisplayPageConfigEnvelope("overview", "draft", { readConfig });
  const newer = loadDisplayPageConfigEnvelope("overview", "draft", { force: true, readConfig });
  olderRead.reject(new Error("obsolete read failed"));
  await new Promise((resolve) => setTimeout(resolve, 0));

  const joined = loadDisplayPageConfigEnvelope("overview", "draft", { readConfig });
  assert.equal(readCount, 2, "a later consumer joins the newer pending read instead of starting another");
  newerRead.resolve(hookEnvelope("overview", 7, "v7 標題"));

  const [olderOutcome, newerOutcome, joinedOutcome] = await Promise.all([older, newer, joined]);
  assert.equal(olderOutcome.version, 7);
  assert.equal(newerOutcome.version, 7);
  assert.equal(joinedOutcome.version, 7);
});

test("a superseded read adopts the newer read failure without starting a third request or using warm cache", async () => {
  clearDisplayPageConfigCache();
  primeDisplayPageConfigCache("overview", "draft", hookEnvelope("overview", 4, "v4 標題"));
  const olderRead = createDeferred<DisplayPageConfigEnvelope>();
  const newerRead = createDeferred<DisplayPageConfigEnvelope>();
  const currentError = new Error("current read failed");
  let readCount = 0;
  const readConfig = () => {
    readCount += 1;
    return readCount === 1 ? olderRead.promise : newerRead.promise;
  };

  const older = loadDisplayPageConfigEnvelope("overview", "draft", { force: true, readConfig });
  const newer = loadDisplayPageConfigEnvelope("overview", "draft", { force: true, readConfig });
  newerRead.reject(currentError);
  await assert.rejects(newer, (error) => error === currentError);
  olderRead.resolve(hookEnvelope("overview", 3, "obsolete v3"));
  await assert.rejects(older, (error) => error === currentError);

  assert.equal(readCount, 2);
  assert.equal(cachedVersion("overview", "draft"), 4);
});

test("a current read keeps its own result and an external prime only invalidates its own key", async () => {
  clearDisplayPageConfigCache();
  assert.equal(
    (await loadDisplayPageConfigEnvelope("overview", "draft", { readConfig: async () => hookEnvelope("overview", 4, "v4 標題") })).version,
    4
  );
  assert.equal(cachedVersion("overview", "draft"), 4);

  const overviewRead = createDeferred<DisplayPageConfigEnvelope>();
  const solarRead = createDeferred<DisplayPageConfigEnvelope>();
  const overviewLoading = loadDisplayPageConfigEnvelope("overview", "draft", { force: true, readConfig: () => overviewRead.promise });
  const solarLoading = loadDisplayPageConfigEnvelope("solar", "draft", { readConfig: () => solarRead.promise });

  primeDisplayPageConfigCache("overview", "draft", hookEnvelope("overview", 5, "v5 標題"));
  overviewRead.resolve(hookEnvelope("overview", 4, "v4 重讀"));
  solarRead.resolve(hookEnvelope("solar", 3, "太陽能 v3"));

  assert.equal((await overviewLoading).version, 5);
  assert.equal((await solarLoading).version, 3);
  assert.equal(cachedVersion("overview", "draft"), 5);
  assert.equal(cachedVersion("solar", "draft"), 3);
});

test("an earlier-visit save that returns after a newer confirmed save cannot downgrade cache, remount, or next baseVersion", async (t) => {
  clearDisplayPageConfigCache();
  const api = installDisplayPageApi(t);
  primeDisplayPageConfigCache("overview", "draft", hookEnvelope("overview", 4, "overview v4"));
  primeDisplayPageConfigCache("solar", "draft", hookEnvelope("solar", 3, "solar v3"));

  const hook = await mountConfigHook(t, "overview");
  await editTitle(hook, "R1 edit");
  const r1 = await startSave(hook);
  assert.equal(api.saves[0]?.body.baseVersion, 4);

  await hook.switchPage("solar");
  await hook.switchPage("overview");
  await editTitle(hook, "R2 edit");
  const r2 = await startSave(hook);
  assert.equal(api.saves[1]?.body.baseVersion, 4);
  await settle(() => api.saves[1]!.response.resolve(conflictResponse(hookEnvelope("overview", 5, "R1 edit"), 4)));
  await r2.finished;
  assert.equal(hook.result.lastLoadedEnvelope?.version, 5);
  assert.equal(hook.result.config.hero.title, "R2 edit");

  const retry = await startSave(hook);
  assert.equal(api.saves[2]?.body.baseVersion, 5);
  await settle(() => api.saves[2]!.response.resolve(configResponse(hookEnvelope("overview", 6, "R2 edit"))));
  await retry.finished;
  assert.equal(cachedVersion("overview", "draft"), 6);
  const ownerStateBeforeR1 = {
    errorMessage: hook.result.errorMessage,
    isLoading: hook.result.isLoading,
    isSaving: hook.result.isSaving,
    message: hook.result.message
  };

  await settle(() => api.saves[0]!.response.resolve(configResponse(hookEnvelope("overview", 5, "R1 edit"))));
  await r1.finished;
  assert.equal(cachedVersion("overview", "draft"), 6, "the earlier save must not downgrade the confirmed cache");
  assert.equal(hook.result.lastLoadedEnvelope?.version, 6);
  assert.equal(hook.result.config.hero.title, "R2 edit");
  assert.equal(hook.result.dirty, false);
  assert.deepEqual(
    {
      errorMessage: hook.result.errorMessage,
      isLoading: hook.result.isLoading,
      isSaving: hook.result.isSaving,
      message: hook.result.message
    },
    ownerStateBeforeR1,
    "R1 must not alter the new owner's message or operation state"
  );
  await hook.unmount();

  const remounted = await mountConfigHook(t, "overview");
  assert.equal(remounted.result.lastLoadedEnvelope?.version, 6);
  assert.equal(remounted.result.config.hero.title, "R2 edit");
  assert.equal(api.reads.length, 0, "remount initializes from the confirmed cache without a read");
  await editTitle(remounted, "after remount");
  const next = await startSave(remounted);
  assert.equal(api.saves[3]?.body.baseVersion, 6, "the next save must build on the confirmed version");
  await settle(() => api.saves[3]!.response.resolve(configResponse(hookEnvelope("overview", 7, "after remount"))));
  await next.finished;
});

test("an earlier save's older conflict envelope cannot downgrade the baseline, drop the draft, or retire a newer read", async (t) => {
  clearDisplayPageConfigCache();
  const api = installDisplayPageApi(t);
  primeDisplayPageConfigCache("overview", "draft", hookEnvelope("overview", 4, "v4 標題"));

  const hook = await mountConfigHook(t, "overview");
  await editTitle(hook, "first attempt");
  const earlier = await startSave(hook);
  await editTitle(hook, "second attempt");
  const later = await startSave(hook);
  await settle(() => api.saves[1]!.response.resolve(configResponse(hookEnvelope("overview", 6, "second attempt"))));
  await later.finished;
  assert.equal(cachedVersion("overview", "draft"), 6);

  await editTitle(hook, "unsaved local draft");
  const reloading = await startReload(hook);
  assert.equal(api.reads.length, 1);
  assert.equal(hook.result.isLoading, true);

  await settle(() => api.saves[0]!.response.resolve(conflictResponse(hookEnvelope("overview", 5, "someone else v5"), 4)));
  await earlier.finished;
  assert.equal(cachedVersion("overview", "draft"), 6, "an older conflict must not replace the confirmed cache");
  assert.equal(hook.result.lastLoadedEnvelope?.version, 6);
  assert.equal(hook.result.config.hero.title, "unsaved local draft");
  assert.equal(hook.result.dirty, true);
  assert.equal(hook.result.isLoading, true, "the rejected envelope must not settle the newer read's loading");

  await settle(() => api.reads[0]!.resolve(configResponse(hookEnvelope("overview", 7, "server v7"))));
  await reloading.finished;
  assert.equal(cachedVersion("overview", "draft"), 7, "the newer read must still publish its own result");
  assert.equal(hook.result.lastLoadedEnvelope?.version, 7);
  assert.equal(hook.result.isLoading, false);
});

test("a repeated same-version response reuses the confirmed envelope without retiring a newer read", async (t) => {
  clearDisplayPageConfigCache();
  const api = installDisplayPageApi(t);
  primeDisplayPageConfigCache("overview", "draft", hookEnvelope("overview", 5, "v5 標題"));

  const hook = await mountConfigHook(t, "overview");
  await editTitle(hook, "first attempt");
  const earlier = await startSave(hook);
  await editTitle(hook, "second attempt");
  const later = await startSave(hook);
  await settle(() => api.saves[1]!.response.resolve(configResponse(hookEnvelope("overview", 6, "second attempt"))));
  await later.finished;

  const reloading = await startReload(hook);
  await settle(() => api.saves[0]!.response.resolve(configResponse(hookEnvelope("overview", 6, "stale copy of v6"))));
  await earlier.finished;
  assert.equal(cachedVersion("overview", "draft"), 6);
  assert.equal(
    resolveCachedDisplayPageConfigSession("overview", "draft", hookSeed)?.config.hero.title,
    "second attempt",
    "a same-version response must reuse the confirmed envelope"
  );
  assert.equal(hook.result.config.hero.title, "second attempt");
  assert.equal(hook.result.isLoading, true, "repeating version 6 must not settle the newer read");

  await settle(() => api.reads[0]!.resolve(configResponse(hookEnvelope("overview", 7, "server v7"))));
  await reloading.finished;
  assert.equal(cachedVersion("overview", "draft"), 7, "repeating version 6 must not obsolete the newer read");
  assert.equal(hook.result.lastLoadedEnvelope?.version, 7);
  assert.equal(hook.result.isLoading, false);
});

test("an owned same-version save settles only its own operation and leaves a newer read to finish", async (t) => {
  clearDisplayPageConfigCache();
  const api = installDisplayPageApi(t);
  primeDisplayPageConfigCache("overview", "draft", hookEnvelope("overview", 5, "v5 標題"));

  const hook = await mountConfigHook(t, "overview");
  // Saving the clean session keeps `dirty` unchanged, so only the admission
  // decides whether the owner's newer read survives this response.
  const saving = await startSave(hook);
  assert.equal(api.saves[0]?.body.baseVersion, 5);
  // Another reader confirms this save's version 6 before the save response arrives.
  const confirmedByReader = await loadDisplayPageConfigEnvelope("overview", "draft", {
    force: true,
    readConfig: async () => hookEnvelope("overview", 6, "v5 標題")
  });
  assert.equal(confirmedByReader.version, 6);
  const reloading = await startReload(hook);
  assert.equal(hook.result.isLoading, true);

  await settle(() => api.saves[0]!.response.resolve(configResponse(hookEnvelope("overview", 6, "v5 標題"))));
  await saving.finished;
  assert.equal(hook.result.isSaving, false, "the owned same-version response settles its own save");
  assert.equal(hook.result.message, "展示頁設定已儲存。");
  assert.equal(hook.result.lastLoadedEnvelope?.version, 6);
  assert.equal(hook.result.dirty, false);
  assert.equal(hook.result.isLoading, true, "the same-version response must not settle the newer read's loading");

  await settle(() => api.reads[0]!.resolve(configResponse(hookEnvelope("overview", 7, "server v7"))));
  await reloading.finished;
  assert.equal(cachedVersion("overview", "draft"), 7);
  assert.equal(hook.result.lastLoadedEnvelope?.version, 7);
  assert.equal(hook.result.isLoading, false);
});

test("after unmount a newer save still publishes its own key while an older sibling response is rejected", async (t) => {
  clearDisplayPageConfigCache();
  const api = installDisplayPageApi(t);
  primeDisplayPageConfigCache("overview", "draft", hookEnvelope("overview", 4, "overview v4"));
  primeDisplayPageConfigCache("overview", "live", hookEnvelope("overview", 2, "overview live", "live"));
  primeDisplayPageConfigCache("solar", "draft", hookEnvelope("solar", 3, "solar v3"));

  const hook = await mountConfigHook(t, "overview");
  await editTitle(hook, "first attempt");
  const earlier = await startSave(hook);
  await editTitle(hook, "second attempt");
  const later = await startSave(hook);
  await hook.unmount();

  await settle(() => api.saves[1]!.response.resolve(configResponse(hookEnvelope("overview", 6, "second attempt"))));
  await later.finished;
  assert.equal(cachedVersion("overview", "draft"), 6, "a newer save still publishes after unmount");
  await settle(() => api.saves[0]!.response.resolve(configResponse(hookEnvelope("overview", 5, "first attempt"))));
  await earlier.finished;
  assert.equal(cachedVersion("overview", "draft"), 6, "an older response after unmount is rejected");
  assert.equal(cachedVersion("overview", "live"), 2);
  assert.equal(cachedVersion("solar", "draft"), 3);

  const remounted = await mountConfigHook(t, "overview");
  assert.equal(remounted.result.config.hero.title, "second attempt");
  assert.equal(remounted.result.dirty, false);
  await editTitle(remounted, "next edit");
  const next = await startSave(remounted);
  assert.equal(api.saves[2]?.body.baseVersion, 6);
  await settle(() => api.saves[2]!.response.resolve(configResponse(hookEnvelope("overview", 7, "next edit"))));
  await next.finished;
});


test("confirmed reload blocks same-tick save until the read settles", async (t) => {
  clearDisplayPageConfigCache();
  const api = installDisplayPageApi(t);
  primeDisplayPageConfigCache("overview", "draft", hookEnvelope("overview", 4, "基線"));
  const hook = await mountConfigHook(t, "overview");
  await editTitle(hook, "本地草稿");
  let reloading: Promise<void> | undefined;
  await settle(() => {
    reloading = hook.result.reload({ discardLocalChanges: true });
    void hook.result.save();
  });
  assert.equal(api.saves.length, 0);
  await settle(() => api.reads[0]!.resolve(configResponse(hookEnvelope("overview", 5, "遠端草稿"))));
  await reloading;
  await editTitle(hook, "重載後編輯");
  const saving = await startSave(hook);
  assert.equal(api.saves[0]?.body.baseVersion, 5);
  await settle(() => api.saves[0]!.response.resolve(configResponse(hookEnvelope("overview", 6, "重載後編輯"))));
  await saving.finished;
});

test("failed dirty reload preserves local history despite an external cache commit", async (t) => {
  clearDisplayPageConfigCache();
  const api = installDisplayPageApi(t);
  primeDisplayPageConfigCache("overview", "draft", hookEnvelope("overview", 4, "基線"));
  const hook = await mountConfigHook(t, "overview");
  await editTitle(hook, "本地草稿");
  const reloading = await startReload(hook);
  await settle(() => primeDisplayPageConfigCache("overview", "draft", hookEnvelope("overview", 5, "其他 owner 儲存")));
  await settle(() => api.reads[0]!.reject(new Error("confirmed read failed")));
  await reloading.finished;
  assert.equal(hook.result.config.hero.title, "本地草稿");
  assert.equal(hook.result.dirty, true);
  assert.equal(hook.result.canUndo, true);
  assert.equal(hook.result.lastLoadedEnvelope?.version, 4);
  assert.equal(hook.result.errorMessage, "confirmed read failed");
  assert.equal(hook.result.canEdit, true);
  await settle(() => hook.result.undo());
  assert.equal(hook.result.config.hero.title, "基線");
  assert.equal(cachedVersion("overview", "draft"), 5);
});
