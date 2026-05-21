import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after, beforeEach } from "node:test";

const tempDir = mkdtempSync(join(tmpdir(), "solar-display-display-pages-test-"));
process.env.DATA_DIR = tempDir;
process.env.DATABASE_PATH = join(tempDir, "solar-display.sqlite");
const databasePath = process.env.DATABASE_PATH;

const [{ buildApp }, { closeDatabaseConnection, getDatabase }, { migrateDatabase }, { seedDatabase }] = await Promise.all([
  import("../app.js"),
  import("../db/index.js"),
  import("../db/migrate.js"),
  import("../db/seed.js")
]);

beforeEach(() => {
  closeDatabaseConnection();
  rmSync(databasePath, { force: true });
  rmSync(`${databasePath}-shm`, { force: true });
  rmSync(`${databasePath}-wal`, { force: true });
  migrateDatabase();
  seedDatabase();
});

after(() => {
  closeDatabaseConnection();
  rmSync(tempDir, { force: true, recursive: true });
});

async function saveDraftConfig(
  app: Awaited<ReturnType<typeof buildApp>>,
  pageId: string,
  regions: Record<string, unknown>
) {
  const draftResponse = await app.inject({
    method: "GET",
    url: `/api/display-pages/${pageId}/draft`
  });
  const draftBody = draftResponse.json() as { config: { version: number } };

  return app.inject({
    method: "PUT",
    url: `/api/display-pages/${pageId}/draft`,
    payload: {
      baseVersion: draftBody.config.version,
      regions
    }
  });
}

test("GET /api/display-pages/:pageId/config returns an empty persisted config envelope by default", async () => {
  const app = await buildApp();

  try {
    const response = await app.inject({
      method: "GET",
      url: "/api/display-pages/overview/config"
    });

    assert.equal(response.statusCode, 200);
    const body = response.json() as { config: { pageId: string; regions: Record<string, unknown>; updatedAt: string | null; version: number } };
    assert.equal(body.config.pageId, "overview");
    assert.deepEqual(body.config.regions, {});
    assert.equal(body.config.updatedAt, null);
    assert.equal(body.config.version, 1);
  } finally {
    await app.close();
  }
});

test("PUT /api/display-pages/:pageId/config persists partial region overrides for later runtime merges", async () => {
  const app = await buildApp();

  try {
    const updateResponse = await app.inject({
      method: "PUT",
      url: "/api/display-pages/solar/config",
      payload: {
        regions: {
          flowNodes: {
            inverter: {
              left: 1208
            }
          }
        }
      }
    });

    assert.equal(updateResponse.statusCode, 200);
    const updateBody = updateResponse.json() as { config: { regions: Record<string, unknown>; updatedAt: string | null } };
    assert.deepEqual(updateBody.config.regions, { flowNodes: { inverter: { left: 1208 } } });
    assert.ok(updateBody.config.updatedAt);

    const readResponse = await app.inject({
      method: "GET",
      url: "/api/display-pages/solar/config"
    });

    assert.equal(readResponse.statusCode, 200);
    assert.deepEqual(readResponse.json(), updateResponse.json());
  } finally {
    await app.close();
  }
});

test("GET /api/display-pages/:pageId/draft returns draft stage config", async () => {
  const app = await buildApp();

  try {
    const response = await app.inject({
      method: "GET",
      url: "/api/display-pages/overview/draft"
    });

    assert.equal(response.statusCode, 200);
    const body = response.json() as { config: { pageId: string; stage: string; regions: Record<string, unknown> } };
    assert.equal(body.config.pageId, "overview");
    assert.equal(body.config.stage, "draft");
    assert.deepEqual(body.config.regions, {});
  } finally {
    await app.close();
  }
});

test("GET /api/display-pages/:pageId/draft accepts registry-backed duplicate page instances", async () => {
  const database = getDatabase();
  database
    .prepare(
      `
        INSERT INTO display_page_registry (
          page_key,
          template_key,
          route_slug,
          label_zh,
          label_en,
          enabled,
          archived_at,
          display_order,
          duration_seconds,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `
    )
    .run("images-2", "images", "images-secondary", "綠能影像副本", "Images Secondary", 1, 6, 22);
  database
    .prepare(
      `
        INSERT INTO display_page_stage_configs (
          page_key,
          stage,
          config_json,
          version,
          updated_at,
          published_at,
          published_by
        ) VALUES (?, 'draft', ?, 3, CURRENT_TIMESTAMP, NULL, NULL)
      `
    )
    .run("images-2", JSON.stringify({ hero: { title: "Secondary Images" } }));

  const app = await buildApp();

  try {
    const response = await app.inject({
      method: "GET",
      url: "/api/display-pages/images-2/draft"
    });

    assert.equal(response.statusCode, 200);
    const body = response.json() as { config: { pageId: string; stage: string; version: number } };
    assert.equal(body.config.pageId, "images-2");
    assert.equal(body.config.stage, "draft");
    assert.equal(body.config.version, 3);
  } finally {
    await app.close();
  }
});

test("PUT /api/display-pages/:pageId/draft saves draft without affecting live", async () => {
  const app = await buildApp();

  try {
    const draftRes = await app.inject({
      method: "PUT",
      url: "/api/display-pages/overview/draft",
      payload: { baseVersion: 1, regions: { heroCopyLayout: { left: 120 } } }
    });

    assert.equal(draftRes.statusCode, 200);
    const draftBody = draftRes.json() as {
      config: { stage: string; regions: { heroCopyLayout: { left: number } }; version: number };
    };
    assert.equal(draftBody.config.stage, "draft");
    assert.equal(draftBody.config.regions.heroCopyLayout.left, 120);
    assert.equal(draftBody.config.version, 2);

    const liveRes = await app.inject({
      method: "GET",
      url: "/api/display-pages/overview/live"
    });

    assert.equal(liveRes.statusCode, 200);
    const liveBody = liveRes.json() as { config: { stage: string; regions: Record<string, unknown> } };
    assert.equal(liveBody.config.stage, "live");
    assert.deepEqual(liveBody.config.regions, {});
  } finally {
    await app.close();
  }
});

test("PUT /api/display-pages/:pageId/draft rejects stale baseVersion and returns the latest draft baseline", async () => {
  const app = await buildApp();

  try {
    const firstSaveResponse = await app.inject({
      method: "PUT",
      url: "/api/display-pages/overview/draft",
      payload: { baseVersion: 1, regions: { heroCopyLayout: { left: 120 } } }
    });

    assert.equal(firstSaveResponse.statusCode, 200);

    const staleSaveResponse = await app.inject({
      method: "PUT",
      url: "/api/display-pages/overview/draft",
      payload: { baseVersion: 1, regions: { heroCopyLayout: { left: 188 } } }
    });

    assert.equal(staleSaveResponse.statusCode, 409);
    const staleBody = staleSaveResponse.json() as {
      code: string;
      conflict: {
        baseVersion: number;
        currentVersion: number;
        latestEnvelope: {
          regions: {
            heroCopyLayout: {
              left: number;
            };
          };
          version: number;
        };
      };
    };
    assert.equal(staleBody.code, "management_draft_conflict");
    assert.equal(staleBody.conflict.baseVersion, 1);
    assert.equal(staleBody.conflict.currentVersion, 2);
    assert.equal(staleBody.conflict.latestEnvelope.version, 2);
    assert.equal(staleBody.conflict.latestEnvelope.regions.heroCopyLayout.left, 120);

    const draftReadResponse = await app.inject({
      method: "GET",
      url: "/api/display-pages/overview/draft"
    });
    const draftReadBody = draftReadResponse.json() as {
      config: {
        regions: {
          heroCopyLayout: {
            left: number;
          };
        };
        version: number;
      };
    };

    assert.equal(draftReadBody.config.version, 2);
    assert.equal(draftReadBody.config.regions.heroCopyLayout.left, 120);
  } finally {
    await app.close();
  }
});

test("GET /api/display-pages/:pageId/live returns live stage config", async () => {
  const app = await buildApp();

  try {
    const response = await app.inject({
      method: "GET",
      url: "/api/display-pages/solar/live"
    });

    assert.equal(response.statusCode, 200);
    const body = response.json() as { config: { stage: string } };
    assert.equal(body.config.stage, "live");
  } finally {
    await app.close();
  }
});

test("GET /api/display-pages/:pageId/live exposes the shared fallback policy metadata for live-dependent pages", async () => {
  const app = await buildApp();

  try {
    const [overviewResponse, factoryResponse] = await Promise.all([
      app.inject({
        method: "GET",
        url: "/api/display-pages/overview/live"
      }),
      app.inject({
        method: "GET",
        url: "/api/display-pages/factory-circuit/live"
      })
    ]);

    assert.equal(overviewResponse.statusCode, 200);
    assert.equal(factoryResponse.statusCode, 200);

    const overviewBody = overviewResponse.json() as {
      config: {
        fallbackPolicy: {
          emptyContent: string;
          missingAsset: string;
          staleData: string;
        };
      };
    };
    const factoryBody = factoryResponse.json() as {
      config: {
        fallbackPolicy: {
          emptyContent: string;
          missingAsset: string;
          staleData: string;
        };
      };
    };

    assert.deepEqual(overviewBody.config.fallbackPolicy, {
      emptyContent: "hide",
      missingAsset: "show-seed",
      staleData: "hide"
    });
    assert.deepEqual(factoryBody.config.fallbackPolicy, {
      emptyContent: "hide",
      missingAsset: "show-placeholder",
      staleData: "hide"
    });
  } finally {
    await app.close();
  }
});

test("POST /api/display-pages/:pageId/publish promotes draft to live", async () => {
  const app = await buildApp();

  try {
    await saveDraftConfig(app, "overview", { heroCopyLayout: { left: 120 } });

    const publishRes = await app.inject({
      method: "POST",
      url: "/api/display-pages/overview/publish",
      payload: { publishedBy: "test-operator" }
    });

    assert.equal(publishRes.statusCode, 200);
    const publishBody = publishRes.json() as { config: { version: number; stage?: string; publishedBy?: string | null }; validation: { canPublish: boolean } };
    assert.equal(publishBody.config.version, 2);
    assert.equal(publishBody.validation.canPublish, true);

    const liveRes = await app.inject({
      method: "GET",
      url: "/api/display-pages/overview/live"
    });
    const liveBody = liveRes.json() as { config: { regions: { heroCopyLayout: { left: number } }; publishedBy: string | null } };
    assert.equal(liveBody.config.regions.heroCopyLayout.left, 120);
    assert.equal(liveBody.config.publishedBy, "test-operator");
  } finally {
    await app.close();
  }
});

test("draft and live channels roundtrip the same card rail payload through the shared display page config envelope", async () => {
  const app = await buildApp();
  const highlightRail = {
    cards: [
      {
        contentSource: {
          mode: "static",
          payload: {
            label: "本月減碳",
            unit: "tCO₂e",
            value: "38.4"
          }
        },
        displayOrder: 1,
        frame: {
          height: 108,
          left: 0,
          top: 0,
          width: 108
        },
        id: "summary-1",
        template: "metric-highlight",
        visible: true
      },
      {
        contentSource: {
          mode: "static",
          payload: {
            label: "年度節電",
            unit: "MWh",
            value: "214"
          }
        },
        displayOrder: 2,
        frame: {
          height: 108,
          left: 120,
          top: 0,
          width: 108
        },
        id: "summary-2",
        template: "metric-highlight",
        visible: true
      },
      {
        contentSource: {
          mode: "static",
          payload: {
            label: "綠電自用",
            unit: "%",
            value: "71"
          }
        },
        displayOrder: 3,
        frame: {
          height: 108,
          left: 240,
          top: 0,
          width: 108
        },
        id: "summary-3",
        template: "metric-highlight",
        visible: false
      }
    ],
    container: {
      height: 108,
      left: 68,
      top: 578,
      width: 470
    }
  };

  try {
    const saveResponse = await saveDraftConfig(app, "sustainability", {
      highlightRail
    });

    assert.equal(saveResponse.statusCode, 200);
    const draftSaveBody = saveResponse.json() as {
      config: {
        regions: {
          highlightRail: typeof highlightRail;
        };
      };
    };
    assert.deepEqual(draftSaveBody.config.regions.highlightRail, highlightRail);

    const draftReadResponse = await app.inject({
      method: "GET",
      url: "/api/display-pages/sustainability/draft"
    });
    assert.equal(draftReadResponse.statusCode, 200);
    const draftReadBody = draftReadResponse.json() as {
      config: {
        regions: {
          highlightRail: typeof highlightRail;
        };
      };
    };
    assert.deepEqual(draftReadBody.config.regions.highlightRail, highlightRail);

    const publishResponse = await app.inject({
      method: "POST",
      url: "/api/display-pages/sustainability/publish",
      payload: { publishedBy: "card-rail-operator" }
    });
    assert.equal(publishResponse.statusCode, 200);

    const liveReadResponse = await app.inject({
      method: "GET",
      url: "/api/display-pages/sustainability/live"
    });
    assert.equal(liveReadResponse.statusCode, 200);
    const liveReadBody = liveReadResponse.json() as {
      config: {
        publishedBy: string | null;
        regions: {
          highlightRail: typeof highlightRail;
        };
      };
    };
    assert.equal(liveReadBody.config.publishedBy, "card-rail-operator");
    assert.deepEqual(liveReadBody.config.regions.highlightRail, highlightRail);
  } finally {
    await app.close();
  }
});

test("POST /api/display-pages/:pageId/rollback restores previous version", async () => {
  const app = await buildApp();

  try {
    await saveDraftConfig(app, "solar", { heroCopyLayout: { left: 100 } });
    const pub1 = await app.inject({
      method: "POST",
      url: "/api/display-pages/solar/publish"
    });
    assert.equal(pub1.statusCode, 200);

    await saveDraftConfig(app, "solar", { heroCopyLayout: { left: 200 } });
    const pub2 = await app.inject({
      method: "POST",
      url: "/api/display-pages/solar/publish"
    });
    assert.equal(pub2.statusCode, 200);

    const liveBefore = await app.inject({ method: "GET", url: "/api/display-pages/solar/live" });
    const liveBeforeBody = liveBefore.json() as { config: { regions: { heroCopyLayout: { left: number } }; version: number } };
    assert.equal(liveBeforeBody.config.regions.heroCopyLayout.left, 200);
    assert.equal(liveBeforeBody.config.version, 3);

    const rollbackRes = await app.inject({
      method: "POST",
      url: "/api/display-pages/solar/rollback",
      payload: { targetVersion: 2, publishedBy: "rollback-operator" }
    });

    assert.equal(rollbackRes.statusCode, 200);
    const rollbackBody = rollbackRes.json() as { config: { regions: { heroCopyLayout: { left: number } }; version: number } };
    assert.equal(rollbackBody.config.regions.heroCopyLayout.left, 100);
    assert.equal(rollbackBody.config.version, 4);
  } finally {
    await app.close();
  }
});

test("GET /api/display-pages/:pageId/history returns publish history", async () => {
  const app = await buildApp();

  try {
    await saveDraftConfig(app, "images", { gallery: { cols: 3 } });
    await app.inject({ method: "POST", url: "/api/display-pages/images/publish", payload: { publishedBy: "op1" } });

    await saveDraftConfig(app, "images", { gallery: { cols: 4 } });
    await app.inject({ method: "POST", url: "/api/display-pages/images/publish", payload: { publishedBy: "op2" } });

    const historyRes = await app.inject({ method: "GET", url: "/api/display-pages/images/history" });
    assert.equal(historyRes.statusCode, 200);
    const historyBody = historyRes.json() as { history: Array<{ version: number; action: string; publishedBy: string | null }> };
    assert.equal(historyBody.history.length, 2);
    assert.equal(historyBody.history[0]!.action, "publish");
    assert.equal(historyBody.history[0]!.publishedBy, "op2");
    assert.equal(historyBody.history[1]!.publishedBy, "op1");
  } finally {
    await app.close();
  }
});

test("POST rollback to non-existent version returns 404", async () => {
  const app = await buildApp();

  try {
    const res = await app.inject({
      method: "POST",
      url: "/api/display-pages/overview/rollback",
      payload: { targetVersion: 999 }
    });

    assert.equal(res.statusCode, 404);
  } finally {
    await app.close();
  }
});

test("POST publish with out-of-bounds geometry is rejected", async () => {
  const app = await buildApp();

  try {
    await saveDraftConfig(app, "overview", {
      heroRegion: { left: 1800, top: 0, width: 200, height: 100 }
    });

    const publishRes = await app.inject({
      method: "POST",
      url: "/api/display-pages/overview/publish"
    });

    assert.equal(publishRes.statusCode, 422);
    const body = publishRes.json() as { success: false; validation: { canPublish: boolean; findings: Array<{ code: string; severity: string }> } };
    assert.equal(body.success, false);
    assert.equal(body.validation.canPublish, false);
    assert.ok(body.validation.findings.some((f) => f.code === "GEOMETRY_OUT_OF_BOUNDS"));
  } finally {
    await app.close();
  }
});

test("POST publish with negative dimensions is rejected", async () => {
  const app = await buildApp();

  try {
    await saveDraftConfig(app, "solar", {
      kpiCard: { left: 0, top: 0, width: -10, height: 50 }
    });

    const publishRes = await app.inject({
      method: "POST",
      url: "/api/display-pages/solar/publish"
    });

    assert.equal(publishRes.statusCode, 422);
    const body = publishRes.json() as { validation: { canPublish: boolean; findings: Array<{ code: string; regionId?: string }> } };
    assert.equal(body.validation.canPublish, false);
    assert.ok(body.validation.findings.some((f) => f.code === "GEOMETRY_INVALID_VALUE" && f.regionId === "kpiCard"));
  } finally {
    await app.close();
  }
});

test("POST publish blocks rail cards that overflow the parent rail bounds", async () => {
  const app = await buildApp();

  try {
    await saveDraftConfig(app, "sustainability", {
      highlightRail: {
        cards: [
          {
            contentSource: {
              mode: "static",
              payload: {
                label: "本月減碳",
                unit: "tCO₂e",
                value: "38.4"
              }
            },
            displayOrder: 1,
            frame: {
              height: 108,
              left: 420,
              top: 0,
              width: 140
            },
            id: "summary-1",
            template: "metric-highlight",
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

    const publishRes = await app.inject({
      method: "POST",
      url: "/api/display-pages/sustainability/publish"
    });

    assert.equal(publishRes.statusCode, 422);
    const body = publishRes.json() as {
      success: false;
      validation: {
        canPublish: boolean;
        findings: Array<{ code: string; regionId?: string }>;
      };
    };
    assert.equal(body.validation.canPublish, false);
    assert.equal(
      body.validation.findings.some(
        (finding) =>
          finding.code === "CARD_RAIL_OUT_OF_BOUNDS" &&
          finding.regionId === "highlightRail.cards.summary-1"
      ),
      true
    );
  } finally {
    await app.close();
  }
});

test("POST publish blocks visible rail cards that omit metric-highlight template fields", async () => {
  const app = await buildApp();

  try {
    await saveDraftConfig(app, "sustainability", {
      highlightRail: {
        cards: [
          {
            contentSource: {
              mode: "static",
              payload: {
                label: "",
                unit: "tCO₂e",
                value: "38.4"
              }
            },
            displayOrder: 1,
            frame: {
              height: 108,
              left: 0,
              top: 0,
              width: 108
            },
            id: "summary-1",
            template: "metric-highlight",
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

    const validateRes = await app.inject({
      method: "POST",
      url: "/api/display-pages/sustainability/validate"
    });

    assert.equal(validateRes.statusCode, 200);
    const body = validateRes.json() as {
      validation: {
        canPublish: boolean;
        findings: Array<{ code: string; regionId?: string }>;
      };
    };
    assert.equal(body.validation.canPublish, false);
    assert.equal(
      body.validation.findings.some(
        (finding) =>
          finding.code === "CARD_RAIL_TEMPLATE_REQUIRED" &&
          finding.regionId === "highlightRail.cards.summary-1"
      ),
      true
    );
  } finally {
    await app.close();
  }
});

test("POST publish blocks visible rail cards that use an unknown template key", async () => {
  const app = await buildApp();

  try {
    await saveDraftConfig(app, "sustainability", {
      highlightRail: {
        cards: [
          {
            contentSource: {
              mode: "static",
              payload: {
                label: "未知模板",
                unit: "kWh",
                value: "18"
              }
            },
            displayOrder: 1,
            frame: {
              height: 108,
              left: 0,
              top: 0,
              width: 108
            },
            id: "summary-unknown",
            template: "story-teaser",
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

    const validateRes = await app.inject({
      method: "POST",
      url: "/api/display-pages/sustainability/validate"
    });

    assert.equal(validateRes.statusCode, 200);
    const body = validateRes.json() as {
      validation: {
        canPublish: boolean;
        findings: Array<{ code: string; regionId?: string }>;
      };
    };
    assert.equal(body.validation.canPublish, false);
    assert.equal(
      body.validation.findings.some(
        (finding) =>
          finding.code === "CARD_RAIL_TEMPLATE_UNKNOWN" &&
          finding.regionId === "highlightRail.cards.summary-unknown"
      ),
      true
    );
  } finally {
    await app.close();
  }
});

test("POST publish with valid config succeeds", async () => {
  const app = await buildApp();

  try {
    await saveDraftConfig(app, "sustainability", {
      heroBanner: { left: 0, top: 0, width: 1920, height: 400 }
    });

    const publishRes = await app.inject({
      method: "POST",
      url: "/api/display-pages/sustainability/publish"
    });

    assert.equal(publishRes.statusCode, 200);
    const body = publishRes.json() as { config: { regions: { heroBanner: { width: number } } }; validation: { canPublish: boolean } };
    assert.equal(body.config.regions.heroBanner.width, 1920);
    assert.equal(body.validation.canPublish, true);
  } finally {
    await app.close();
  }
});

test("POST /api/display-pages/:pageId/validate returns validation without publishing", async () => {
  const app = await buildApp();

  try {
    await saveDraftConfig(app, "overview", {
      badRegion: { left: -10, top: 0, width: 100, height: 100 }
    });

    const validateRes = await app.inject({
      method: "POST",
      url: "/api/display-pages/overview/validate"
    });

    assert.equal(validateRes.statusCode, 200);
    const body = validateRes.json() as { validation: { canPublish: boolean; findings: Array<{ code: string }> } };
    assert.equal(body.validation.canPublish, false);
    assert.ok(body.validation.findings.some((f) => f.code === "GEOMETRY_OUT_OF_BOUNDS"));

    const liveRes = await app.inject({ method: "GET", url: "/api/display-pages/overview/live" });
    const liveBody = liveRes.json() as { config: { regions: Record<string, unknown> } };
    assert.deepEqual(liveBody.config.regions, {});
  } finally {
    await app.close();
  }
});

test("overlapping live draft regions are reported with both region ids and blocked from publish", async () => {
  const app = await buildApp();

  try {
    await saveDraftConfig(app, "solar", {
      generation: { left: 120, top: 80, width: 320, height: 180 },
      efficiency: { left: 220, top: 140, width: 320, height: 180 }
    });

    const validateRes = await app.inject({
      method: "POST",
      url: "/api/display-pages/solar/validate"
    });

    assert.equal(validateRes.statusCode, 200);
    const validateBody = validateRes.json() as {
      validation: {
        canPublish: boolean;
        findings: Array<{ code: string; regionId?: string }>;
      };
    };
    assert.equal(validateBody.validation.canPublish, false);
    assert.equal(
      validateBody.validation.findings.some(
        (finding) => finding.code === "GEOMETRY_OVERLAP" && finding.regionId === "generation"
      ),
      true
    );
    assert.equal(
      validateBody.validation.findings.some(
        (finding) => finding.code === "GEOMETRY_OVERLAP" && finding.regionId === "efficiency"
      ),
      true
    );

    const publishRes = await app.inject({
      method: "POST",
      url: "/api/display-pages/solar/publish"
    });

    assert.equal(publishRes.statusCode, 422);
    const publishBody = publishRes.json() as {
      success: boolean;
      validation: {
        canPublish: boolean;
        findings: Array<{ code: string; regionId?: string }>;
      };
    };
    assert.equal(publishBody.success, false);
    assert.equal(publishBody.validation.canPublish, false);
    assert.equal(
      publishBody.validation.findings.some(
        (finding) => finding.code === "GEOMETRY_OVERLAP" && finding.regionId === "generation"
      ),
      true
    );
    assert.equal(
      publishBody.validation.findings.some(
        (finding) => finding.code === "GEOMETRY_OVERLAP" && finding.regionId === "efficiency"
      ),
      true
    );

    const liveRes = await app.inject({ method: "GET", url: "/api/display-pages/solar/live" });
    const liveBody = liveRes.json() as { config: { regions: Record<string, unknown> } };
    assert.deepEqual(liveBody.config.regions, {});
  } finally {
    await app.close();
  }
});
