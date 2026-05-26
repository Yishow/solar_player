import assert from "node:assert/strict";
import { join } from "node:path";
import test from "node:test";

import {
  buildApp,
  getDatabase,
  seedManagedImageAsset,
  uploadsDir
} from "./display-pages-asset-governance.test-support.js";

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

test("draft config stores managed asset references and resolves runtime src on read", async () => {
  const app = await buildApp();
  const managedAsset = seedManagedImageAsset();

  try {
    const saveResponse = await saveDraftConfig(app, "overview", {
      heroMedia: {
        alt: "Managed overview hero",
        assetId: managedAsset.assetId,
        src: "/should-not-persist.png"
      }
    });

    assert.equal(saveResponse.statusCode, 200);

    const storedRow = getDatabase()
      .prepare("SELECT config_json FROM display_page_stage_configs WHERE page_key = ? AND stage = ?")
      .get("overview", "draft") as { config_json: string };
    const storedConfig = JSON.parse(storedRow.config_json) as {
      regions: {
        heroMedia: { alt: string; assetId: number; src?: string };
      };
    };

    assert.equal(storedConfig.regions.heroMedia.assetId, managedAsset.assetId);
    assert.equal(storedConfig.regions.heroMedia.alt, "Managed overview hero");
    assert.equal("src" in storedConfig.regions.heroMedia, false);

    const readResponse = await app.inject({
      method: "GET",
      url: "/api/display-pages/overview/draft"
    });

    assert.equal(readResponse.statusCode, 200);
    const readBody = readResponse.json() as {
      config: {
        regions: {
          heroMedia: { alt: string; assetId: number; src?: string };
        };
      };
    };

    assert.equal(readBody.config.regions.heroMedia.assetId, managedAsset.assetId);
    assert.equal(readBody.config.regions.heroMedia.alt, "Managed overview hero");
    assert.equal(readBody.config.regions.heroMedia.src, `/uploads/images/${managedAsset.filename}`);
  } finally {
    await app.close();
  }
});

test("draft config stores direct-src bindings without stale managed asset baggage", async () => {
  const app = await buildApp();

  try {
    const saveResponse = await saveDraftConfig(app, "overview", {
      heroMedia: {
        alt: "Direct overview hero",
        assetId: 42,
        sourceMode: "direct-src",
        src: "/uploads/images/overview-direct.png"
      }
    });

    assert.equal(saveResponse.statusCode, 200);

    const storedRow = getDatabase()
      .prepare("SELECT config_json FROM display_page_stage_configs WHERE page_key = ? AND stage = ?")
      .get("overview", "draft") as { config_json: string };
    const storedConfig = JSON.parse(storedRow.config_json) as {
      regions: {
        heroMedia: { alt: string; assetId?: number; sourceMode: string; src?: string };
      };
    };

    assert.equal(storedConfig.regions.heroMedia.sourceMode, "direct-src");
    assert.equal(storedConfig.regions.heroMedia.alt, "Direct overview hero");
    assert.equal(storedConfig.regions.heroMedia.src, "/uploads/images/overview-direct.png");
    assert.equal("assetId" in storedConfig.regions.heroMedia, false);

    const readResponse = await app.inject({
      method: "GET",
      url: "/api/display-pages/overview/draft"
    });

    assert.equal(readResponse.statusCode, 200);
    const readBody = readResponse.json() as {
      config: {
        assetFindings?: Array<unknown>;
        regions: {
          heroMedia: { alt: string; assetId?: number; sourceMode: string; src?: string };
        };
      };
    };

    assert.equal(readBody.config.regions.heroMedia.sourceMode, "direct-src");
    assert.equal(readBody.config.regions.heroMedia.alt, "Direct overview hero");
    assert.equal(readBody.config.regions.heroMedia.src, "/uploads/images/overview-direct.png");
    assert.equal("assetId" in readBody.config.regions.heroMedia, false);
    assert.deepEqual(readBody.config.assetFindings ?? [], []);
  } finally {
    await app.close();
  }
});

test("seed-default bindings do not surface managed asset findings after legacy payload cleanup", async () => {
  const app = await buildApp();
  const managedAsset = seedManagedImageAsset();

  try {
    const saveResponse = await saveDraftConfig(app, "sustainability", {
      heroMedia: {
        alt: "Seed sustainability hero",
        assetId: managedAsset.assetId,
        sourceMode: "seed-default",
        src: "/should-drop.png"
      }
    });

    assert.equal(saveResponse.statusCode, 200);

    const storedRow = getDatabase()
      .prepare("SELECT config_json FROM display_page_stage_configs WHERE page_key = ? AND stage = ?")
      .get("sustainability", "draft") as { config_json: string };
    const storedConfig = JSON.parse(storedRow.config_json) as {
      regions: {
        heroMedia: { alt: string; assetId?: number; sourceMode: string; src?: string };
      };
    };

    assert.equal(storedConfig.regions.heroMedia.sourceMode, "seed-default");
    assert.equal(storedConfig.regions.heroMedia.alt, "Seed sustainability hero");
    assert.equal("assetId" in storedConfig.regions.heroMedia, false);
    assert.equal("src" in storedConfig.regions.heroMedia, false);

    getDatabase().prepare("DELETE FROM image_assets WHERE id = ?").run(managedAsset.assetId);

    const readResponse = await app.inject({
      method: "GET",
      url: "/api/display-pages/sustainability/draft"
    });

    assert.equal(readResponse.statusCode, 200);
    const readBody = readResponse.json() as {
      config: {
        assetFindings?: Array<unknown>;
        regions: {
          heroMedia: { alt: string; assetId?: number; sourceMode: string; src?: string };
        };
      };
    };

    assert.equal(readBody.config.regions.heroMedia.sourceMode, "seed-default");
    assert.equal(readBody.config.regions.heroMedia.alt, "Seed sustainability hero");
    assert.equal("assetId" in readBody.config.regions.heroMedia, false);
    assert.equal("src" in readBody.config.regions.heroMedia, false);
    assert.deepEqual(readBody.config.assetFindings ?? [], []);
  } finally {
    await app.close();
  }
});

test("draft config surfaces a missing managed asset finding when the reference no longer resolves", async () => {
  const app = await buildApp();
  const managedAsset = seedManagedImageAsset();

  try {
    await saveDraftConfig(app, "solar", {
      heroMedia: {
        alt: "Solar hero",
        assetId: managedAsset.assetId
      }
    });

    getDatabase().prepare("DELETE FROM image_assets WHERE id = ?").run(managedAsset.assetId);

    const readResponse = await app.inject({
      method: "GET",
      url: "/api/display-pages/solar/draft"
    });

    assert.equal(readResponse.statusCode, 200);
    const readBody = readResponse.json() as {
      config: {
        assetFindings?: Array<{
          assetId: number;
          bindingId: string;
          pageId: string;
          reason: string;
          status: string;
        }>;
      };
    };

    assert.deepEqual(readBody.config.assetFindings, [
      {
        assetId: managedAsset.assetId,
        bindingId: "heroMedia",
        message: "素材引用不存在，無法解析 binding heroMedia",
        pageId: "solar",
        reason: "missing-asset",
        status: "unhealthy"
      }
    ]);
  } finally {
    await app.close();
  }
});

test("draft config resolves managed visual primitive sources and reports missing references", async () => {
  const app = await buildApp();
  const managedIcon = seedManagedImageAsset("managed-kpi-icon.png");
  const managedLeaf = seedManagedImageAsset("managed-leaf.png");

  try {
    const saveResponse = await saveDraftConfig(app, "solar", {
      chrome: {
        ornaments: {
          leaf: {
            offsetX: 0,
            offsetY: 0,
            opacity: 0.4,
            scale: 1,
            source: {
              assetId: managedLeaf.assetId,
              fallbackSrc: "/uploads/images/seed-leaf.png",
              mode: "managed-asset",
              ornamentKey: "leaf",
              src: "/should-not-persist.png"
            }
          }
        }
      },
      iconSources: {
        kpiCards: {
          generation: {
            assetId: managedIcon.assetId,
            fallbackSrc: "/uploads/images/seed-icon.png",
            mode: "managed-asset",
            src: "/should-not-persist.png"
          }
        }
      }
    });

    assert.equal(saveResponse.statusCode, 200);

    const storedRow = getDatabase()
      .prepare("SELECT config_json FROM display_page_stage_configs WHERE page_key = ? AND stage = ?")
      .get("solar", "draft") as { config_json: string };
    const storedConfig = JSON.parse(storedRow.config_json) as {
      regions: {
        chrome: { ornaments: { leaf: { source: { src?: string } } } };
        iconSources: { kpiCards: { generation: { src?: string } } };
      };
    };
    assert.equal("src" in storedConfig.regions.iconSources.kpiCards.generation, false);
    assert.equal("src" in storedConfig.regions.chrome.ornaments.leaf.source, false);

    getDatabase().prepare("DELETE FROM image_assets WHERE id = ?").run(managedIcon.assetId);

    const readResponse = await app.inject({
      method: "GET",
      url: "/api/display-pages/solar/draft"
    });
    assert.equal(readResponse.statusCode, 200);
    const readBody = readResponse.json() as {
      config: {
        assetFindings?: Array<{ assetId: number; bindingId: string; pageId: string; reason: string }>;
        regions: {
          chrome: { ornaments: { leaf: { source: { src?: string } } } };
          iconSources: { kpiCards: { generation: { src?: string } } };
        };
      };
    };

    assert.equal(readBody.config.regions.iconSources.kpiCards.generation.src, undefined);
    assert.equal(readBody.config.regions.chrome.ornaments.leaf.source.src, `/uploads/images/${managedLeaf.filename}`);
    assert.equal(
      readBody.config.assetFindings?.some(
        (finding) =>
          finding.assetId === managedIcon.assetId &&
          finding.bindingId === "iconSources.kpiCards.generation" &&
          finding.pageId === "solar" &&
          finding.reason === "missing-asset"
      ),
      true
    );
  } finally {
    await app.close();
  }
});

test("draft validation reports missing managed asset references as warnings", async () => {
  const app = await buildApp();
  const managedAsset = seedManagedImageAsset();

  try {
    await saveDraftConfig(app, "images", {
      mainStage: {
        alt: "Images stage",
        assetId: managedAsset.assetId
      }
    });

    getDatabase().prepare("DELETE FROM image_assets WHERE id = ?").run(managedAsset.assetId);

    const validateResponse = await app.inject({
      method: "POST",
      url: "/api/display-pages/images/validate"
    });

    assert.equal(validateResponse.statusCode, 200);
    const validateBody = validateResponse.json() as {
      validation: {
        findings: Array<{
          code: string;
          message: string;
          regionId?: string;
          severity: string;
        }>;
      };
    };

    assert.equal(
      validateBody.validation.findings.some(
        (finding) =>
          finding.code === "ASSET_REFERENCE_MISSING" &&
          finding.regionId === "mainStage" &&
          finding.severity === "warning"
      ),
      true
    );
  } finally {
    await app.close();
  }
});

test("management config read surfaces an unhealthy finding when the managed asset file is missing", async () => {
  const app = await buildApp();
  const managedAsset = seedManagedImageAsset();

  try {
    await app.inject({
      method: "PUT",
      url: "/api/display-pages/overview/config",
      payload: {
        regions: {
          heroMedia: {
            alt: "Overview hero",
            assetId: managedAsset.assetId
          }
        }
      }
    });

    const { unlinkSync } = await import("node:fs");
    unlinkSync(join(uploadsDir, managedAsset.filename));

    const readResponse = await app.inject({
      method: "GET",
      url: "/api/display-pages/overview/config"
    });

    assert.equal(readResponse.statusCode, 200);
    const readBody = readResponse.json() as {
      config: {
        assetFindings?: Array<{
          assetId: number;
          bindingId: string;
          message: string;
          pageId: string;
          reason: string;
          status: string;
        }>;
      };
    };

    assert.deepEqual(readBody.config.assetFindings, [
      {
        assetId: managedAsset.assetId,
        bindingId: "heroMedia",
        message: "素材檔案遺失，無法解析 binding heroMedia",
        pageId: "overview",
        reason: "missing-file",
        status: "unhealthy"
      }
    ]);
  } finally {
    await app.close();
  }
});
