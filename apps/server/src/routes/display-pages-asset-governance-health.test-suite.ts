import assert from "node:assert/strict";
import test from "node:test";

import {
  buildApp,
  getDatabase,
  seedManagedImageAsset
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

test("asset health API reports healthy and unhealthy display page asset references with affected pages", async () => {
  const app = await buildApp();
  const healthyAsset = seedManagedImageAsset("overview-managed-hero.png");
  const missingAsset = seedManagedImageAsset("solar-managed-hero.png");

  try {
    await app.inject({
      method: "PUT",
      url: "/api/display-pages/overview/config",
      payload: {
        regions: {
          heroMedia: {
            alt: "Overview hero",
            assetId: healthyAsset.assetId
          }
        }
      }
    });

    await saveDraftConfig(app, "solar", {
      heroMedia: {
        alt: "Solar hero",
        assetId: missingAsset.assetId
      }
    });

    getDatabase().prepare("DELETE FROM image_assets WHERE id = ?").run(missingAsset.assetId);

    const healthResponse = await app.inject({
      method: "GET",
      url: "/api/display-pages/asset-health"
    });

    assert.equal(healthResponse.statusCode, 200);
    const healthBody = healthResponse.json() as {
      health: {
        assets: Array<{
          assetId: number;
          affectedPages: string[];
          reasons: string[];
          status: string;
        }>;
        findings: Array<{
          assetId: number;
          bindingId: string;
          pageId: string;
          reason: string;
          status: string;
        }>;
        status: string;
      };
    };

    assert.equal(healthBody.health.status, "unhealthy");
    assert.equal(
      healthBody.health.assets.some(
        (asset) =>
          asset.assetId === healthyAsset.assetId &&
          asset.status === "healthy" &&
          asset.affectedPages.includes("overview") &&
          asset.reasons.length === 0
      ),
      true
    );
    assert.equal(
      healthBody.health.assets.some(
        (asset) =>
          asset.assetId === missingAsset.assetId &&
          asset.status === "unhealthy" &&
          asset.affectedPages.includes("solar") &&
          asset.reasons.includes("missing-asset")
      ),
      true
    );
    assert.equal(
      healthBody.health.findings.some(
        (finding) =>
          finding.assetId === missingAsset.assetId &&
          finding.bindingId === "heroMedia" &&
          finding.pageId === "solar" &&
          finding.reason === "missing-asset" &&
          finding.status === "unhealthy"
      ),
      true
    );
  } finally {
    await app.close();
  }
});
