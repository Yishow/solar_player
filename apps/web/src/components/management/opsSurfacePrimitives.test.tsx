import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  OpsActionRow,
  OpsInfoBanner,
  OpsStatStrip,
  OpsSurface,
  OpsSurfaceTitle
} from "./opsSurfacePrimitives";

test("ops surface primitives expose family-specific board, banner, stat, and action contracts", () => {
  const html = renderToStaticMarkup(
    React.createElement(
      OpsSurface,
      {
        family: "preview"
      },
      React.createElement(OpsSurfaceTitle, {
        caption: "Configured Rotation Preview",
        title: "目前配置輪播鏈"
      }),
      React.createElement(OpsInfoBanner, {
        detail: "等待 live asset sync 完成後再檢查 skipped rows。",
        title: "目前有 1 筆 skipped row",
        tone: "warning"
      }),
      React.createElement(
        OpsStatStrip,
        {
          family: "status-dashboard"
        },
        React.createElement(
          "div",
          {
            className: "mgmt-stat"
          },
          React.createElement("span", { className: "mgmt-stat__label" }, "Live Version"),
          React.createElement("span", { className: "mgmt-stat__value" }, "v12")
        )
      ),
      React.createElement(
        OpsActionRow,
        null,
        React.createElement("button", { className: "mgmt-action", type: "button" }, "重新同步")
      )
    )
  );

  assert.match(html, /class="mgmt-surface mgmt-surface--preview"/);
  assert.match(html, /data-surface-family="preview"/);
  assert.match(html, /class="mgmt-surface__title"/);
  assert.match(html, /Configured Rotation Preview/);
  assert.match(html, /class="mgmt-banner is-warning"/);
  assert.match(html, /data-surface-family="status-dashboard"/);
  assert.match(html, /class="mgmt-stat-strip mgmt-stat-strip--status-dashboard"/);
  assert.match(html, /class="mgmt-action-row"/);
});
