import assert from "node:assert/strict";
import { join } from "node:path";
import test from "node:test";

import {
  buildApp,
  getDatabase,
  seedManagedImageAsset,
  uploadsDir
} from "./display-pages-asset-governance.test-support.js";

test("draft config stores managed asset references and resolves runtime src on read", async () => {
  const app = await buildApp();
  const managedAsset = seedManagedImageAsset();

  try {
    const saveResponse = await app.inject({
      method: "PUT",
      url: "/api/display-pages/overview/draft",
      payload: {
        regions: {
          heroMedia: {
            alt: "Managed overview hero",
            assetId: managedAsset.assetId,
            src: "/should-not-persist.png"
          }
        }
      }
    });

    assert.equal(saveResponse.statusCode, 200);

    const storedRow = getDatabase()
      .prepare("SELECT config_json FROM display_page_stage_configs WHERE page_key = ? AND stage = ?")
      .get("overview", "draft") as { config_json: string };
    const storedConfig = JSON.parse(storedRow.config_json) as {
      heroMedia: { alt: string; assetId: number; src?: string };
    };

    assert.equal(storedConfig.heroMedia.assetId, managedAsset.assetId);
    assert.equal(storedConfig.heroMedia.alt, "Managed overview hero");
    assert.equal("src" in storedConfig.heroMedia, false);

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

test("draft config surfaces a missing managed asset finding when the reference no longer resolves", async () => {
  const app = await buildApp();
  const managedAsset = seedManagedImageAsset();

  try {
    await app.inject({
      method: "PUT",
      url: "/api/display-pages/solar/draft",
      payload: {
        regions: {
          heroMedia: {
            alt: "Solar hero",
            assetId: managedAsset.assetId
          }
        }
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

test("draft validation reports missing managed asset references as warnings", async () => {
  const app = await buildApp();
  const managedAsset = seedManagedImageAsset();

  try {
    await app.inject({
      method: "PUT",
      url: "/api/display-pages/images/draft",
      payload: {
        regions: {
          mainStage: {
            alt: "Images stage",
            assetId: managedAsset.assetId
          }
        }
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
