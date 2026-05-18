import assert from "node:assert/strict";
import test from "node:test";

import {
  buildApp,
  getDatabase,
  seedManagedImageAsset
} from "./display-pages-asset-governance.test-support.js";

test("draft save rejects invalid placement control payloads with field-specific details", async () => {
  const app = await buildApp();
  const managedAsset = seedManagedImageAsset();

  try {
    const saveResponse = await app.inject({
      method: "PUT",
      url: "/api/display-pages/images/draft",
      payload: {
        regions: {
          mainStage: {
            alt: "Images stage",
            assetId: managedAsset.assetId,
            fitMode: "stretch",
            focusX: 1.7
          }
        }
      }
    });

    assert.equal(saveResponse.statusCode, 400);
    const saveBody = saveResponse.json() as {
      details?: string[];
      error: string;
      success: boolean;
    };

    assert.equal(saveBody.success, false);
    assert.equal(saveBody.error, "Display page media placement is invalid");
    assert.deepEqual(saveBody.details, [
      "mainStage.fitMode 僅支援 contain 或 cover",
      "mainStage.focusX 必須介於 0 和 1 之間"
    ]);
  } finally {
    await app.close();
  }
});

test("draft validation reports invalid alignment placement values as blocking findings", async () => {
  const app = await buildApp();
  const managedAsset = seedManagedImageAsset();

  try {
    getDatabase()
      .prepare(
        `INSERT INTO display_page_stage_configs (page_key, stage, config_json, updated_at)
         VALUES (?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(page_key, stage) DO UPDATE SET
           config_json = excluded.config_json,
           updated_at = CURRENT_TIMESTAMP`
      )
      .run(
        "images",
        "draft",
        JSON.stringify({
          mainStage: {
            alt: "Images stage",
            alignY: null,
            assetId: managedAsset.assetId
          }
        })
      );

    const validateResponse = await app.inject({
      method: "POST",
      url: "/api/display-pages/images/validate"
    });

    assert.equal(validateResponse.statusCode, 200);
    const validateBody = validateResponse.json() as {
      validation: {
        canPublish: boolean;
        findings: Array<{
          code: string;
          message: string;
          regionId?: string;
          severity: string;
        }>;
      };
    };

    assert.equal(validateBody.validation.canPublish, false);
    assert.equal(
      validateBody.validation.findings.some(
        (finding) =>
          finding.code === "MEDIA_PLACEMENT_INVALID" &&
          finding.regionId === "mainStage.alignY" &&
          finding.message === "mainStage.alignY 必須為有效數字" &&
          finding.severity === "blocking"
      ),
      true
    );
  } finally {
    await app.close();
  }
});
