import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { RotationOpsSummary } from "./rotationOpsSummary";

test("rotation ops summary renders shared stats, status, skipped items, and actions", () => {
  const html = renderToStaticMarkup(
    React.createElement(RotationOpsSummary, {
      actions: React.createElement("button", { className: "mgmt-action primary", type: "button" }, "恢復輪播"),
      items: [
        {
          detail: "overview 缺少必要的 MQTT mapping",
          key: "overview",
          label: "02 · 太陽能",
          tone: "warning"
        }
      ],
      stats: [
        { label: "Configured", value: "3 頁", valueTone: "default" },
        { label: "Effective", value: "2 頁", valueTone: "ready" },
        { label: "Skipped", value: "1 頁", valueTone: "warning" }
      ],
      status: {
        detail: "目前可播放 2 頁，另有 1 頁被 skip。",
        title: "輪播狀態已降級",
        tone: "warning"
      },
      subtitle: "Effective Rotation Diagnostics",
      title: "正式生效輪播鏈"
    })
  );

  assert.match(html, /class="mgmt-surface mgmt-surface--preview rotation-ops-summary"/);
  assert.match(html, /Configured/);
  assert.match(html, /class="mgmt-banner is-warning rotation-ops-summary__status"/);
  assert.match(html, /class="mgmt-status is-warning rotation-ops-summary__item"/);
  assert.match(html, /class="mgmt-action-row rotation-ops-summary__actions"/);
});
