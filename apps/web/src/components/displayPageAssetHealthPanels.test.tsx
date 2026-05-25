import assert from "node:assert/strict";
import test from "node:test";
import type { DisplayPageAssetHealthReport } from "@solar-display/shared";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DisplayPageEditorAssetHealthPanel,
  ImageManagementAssetHealthPanel
} from "./displayPageAssetHealthPanels";

const healthyReport: DisplayPageAssetHealthReport = {
  assets: [
    {
      affectedPages: ["overview"],
      assetId: 7,
      bindings: [{ bindingId: "heroMedia", pageId: "overview" }],
      filename: "overview.png",
      findings: [],
      reasons: [],
      status: "healthy",
      title: "Overview Hero"
    }
  ],
  findings: [],
  generatedAt: "2026-05-18T08:00:00.000Z",
  status: "healthy"
};

const unhealthyReport: DisplayPageAssetHealthReport = {
  assets: [
    {
      affectedPages: ["images"],
      assetId: 9,
      bindings: [{ bindingId: "mainStage", pageId: "images" }],
      filename: null,
      findings: [
        {
          assetId: 9,
          bindingId: "mainStage",
          message: "素材檔案遺失，無法解析 binding mainStage",
          pageId: "images",
          reason: "missing-file",
          status: "unhealthy"
        }
      ],
      reasons: ["missing-file"],
      status: "unhealthy",
      title: null
    }
  ],
  findings: [
    {
      assetId: 9,
      bindingId: "mainStage",
      message: "素材檔案遺失，無法解析 binding mainStage",
      pageId: "images",
      reason: "missing-file",
      status: "unhealthy"
    }
  ],
  generatedAt: "2026-05-18T08:00:00.000Z",
  status: "unhealthy"
};

test("display page editor asset health panel renders healthy and unhealthy states", () => {
  const healthyHtml = renderToStaticMarkup(
    React.createElement(DisplayPageEditorAssetHealthPanel, {
      errorMessage: "",
      isLoading: false,
      pageId: "overview",
      report: healthyReport
    })
  );
  const unhealthyHtml = renderToStaticMarkup(
    React.createElement(DisplayPageEditorAssetHealthPanel, {
      errorMessage: "",
      isLoading: false,
      pageId: "images",
      report: unhealthyReport
    })
  );

  assert.match(healthyHtml, /健康/);
  assert.match(healthyHtml, /總覽的素材引用目前正常/);
  assert.match(unhealthyHtml, /異常/);
  assert.match(unhealthyHtml, /mainStage/);
});

test("image management asset health panel renders healthy and unhealthy summaries", () => {
  const healthyHtml = renderToStaticMarkup(
    React.createElement(ImageManagementAssetHealthPanel, {
      errorMessage: "",
      isLoading: false,
      report: healthyReport
    })
  );
  const unhealthyHtml = renderToStaticMarkup(
    React.createElement(ImageManagementAssetHealthPanel, {
      errorMessage: "",
      isLoading: false,
      report: unhealthyReport
    })
  );

  assert.match(healthyHtml, /所有展示頁素材引用正常/);
  assert.match(healthyHtml, /展示頁素材健康/);
  assert.match(healthyHtml, /健康/);
  assert.match(unhealthyHtml, /目前有 1 個素材引用異常/);
  assert.match(unhealthyHtml, /異常/);
  assert.match(unhealthyHtml, /Images/);
  assert.match(unhealthyHtml, /檔案遺失/);
  assert.doesNotMatch(unhealthyHtml, /Display Page Asset Health/);
  assert.doesNotMatch(unhealthyHtml, /Unhealthy/);
});
