import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { routeMetaMap } from "../app/routeMeta";
import { AppFooterNav } from "./AppFooterNav";
import { AppHeader } from "./AppHeader";
import { DisplayCanvas } from "./DisplayCanvas";
import {
  computeManagementFixedLayoutScale,
  MANAGEMENT_FIXED_LAYOUT_HEIGHT,
  MANAGEMENT_FIXED_LAYOUT_WIDTH
} from "./ManagementFixedLayoutFrame";
import { ManagementShell } from "../layouts/ManagementShell";
import { PageScaffold } from "../pages/shared/PageScaffold";
import { ActionCluster } from "./ActionCluster";
import { MediaSlot } from "./MediaSlot";
import { PanelCard } from "./PanelCard";
import { PlaybackTitleGroup } from "./PlaybackTitleGroup";
import { StatusBadge } from "./StatusBadge";

test("shell witness routes declare the shared density contract", () => {
  assert.equal(routeMetaMap.get("/overview")?.shellDensity, "playback");
  assert.equal(routeMetaMap.get("/brand")?.shellDensity, "management");
  assert.equal(routeMetaMap.get("/display-pages/editor")?.shellDensity, "management");
  assert.equal(routeMetaMap.get("/settings/playback")?.shellDensity, "management");
  assert.equal(routeMetaMap.get("/device-status")?.shellDensity, "device-detail");
  assert.equal(routeMetaMap.get("/trends")?.managementFrame, "fixed-fhd");
  assert.equal(routeMetaMap.get("/settings/playback")?.managementFrame, "fixed-fhd");
  assert.equal(routeMetaMap.get("/settings/images")?.managementFrame, "fixed-fhd");
  assert.equal(routeMetaMap.get("/settings/mqtt")?.managementFrame, "fixed-fhd");
  assert.equal(routeMetaMap.get("/settings/circuits")?.managementFrame, "fixed-fhd");
  assert.equal(routeMetaMap.get("/history")?.managementFrame, "fixed-fhd");
  assert.equal(routeMetaMap.get("/slideshow-preview")?.managementFrame, "fixed-fhd");
  assert.equal(routeMetaMap.get("/device-status")?.managementFrame, "fixed-fhd");
  assert.equal(routeMetaMap.get("/brand")?.managementFrame, undefined);
  assert.equal(routeMetaMap.get("/display-pages/editor")?.managementFrame, undefined);
});

test("display canvas host renders a fixed FHD surface with explicit shell primitives", () => {
  const html = renderToStaticMarkup(
    React.createElement(
      DisplayCanvas,
      {
        header: React.createElement("header", null, "header"),
        footer: React.createElement("footer", null, "footer")
      },
      React.createElement("div", null, "body")
    )
  );

  assert.match(html, /data-shell-primitive="display-canvas-viewport"/);
  assert.match(html, /data-shell-primitive="display-canvas-frame"/);
  assert.match(html, /data-shell-primitive="display-canvas-surface"/);
  assert.match(html, /data-shell-primitive="display-canvas-content"/);
  assert.match(html, /width:1920px/);
  assert.match(html, /height:1080px/);
});

test("page scaffold remains the management witness contract", () => {
  const html = renderToStaticMarkup(
    React.createElement(
      PageScaffold,
      {
        path: "/settings/playback",
        description: "播放設定"
      },
      React.createElement("div", null, "body")
    )
  );

  assert.match(html, /data-shell-density="management"/);
  assert.match(html, /data-shell-primitive="management-scaffold"/);
  assert.match(html, /data-shell-primitive="title-block"/);
  assert.match(html, /data-shell-primitive="page-number-pill"/);
  assert.match(html, /min-h-full/);
  assert.doesNotMatch(html, /class="grid gap-6"/);
});

test("playback title group is available without the management title block contract", () => {
  const html = renderToStaticMarkup(
    React.createElement(PlaybackTitleGroup, {
      eyebrow: "綠能驅動・永續未來",
      subtitle: "Playback witness",
      title: "總覽頁",
      description: "Overview witness route"
    })
  );

  assert.match(html, /data-shell-primitive="playback-title-group"/);
  assert.doesNotMatch(html, /data-shell-primitive="title-block"/);
});

test("header and footer expose shell primitives without centered max-width wrappers", () => {
  const headerHtml = renderToStaticMarkup(
    React.createElement(MemoryRouter, { initialEntries: ["/overview"] }, React.createElement(AppHeader))
  );
  const footerHtml = renderToStaticMarkup(
    React.createElement(
      MemoryRouter,
      {
        initialEntries: ["/overview"]
      },
      React.createElement(AppFooterNav)
    )
  );

  assert.match(headerHtml, /data-shell-primitive="app-header"/);
  assert.match(headerHtml, /href="\/settings\/playback"/);
  assert.match(footerHtml, /data-shell-primitive="footer-nav"/);
  assert.doesNotMatch(headerHtml, /max-w-\[var\(--screen-width\)\]/);
  assert.doesNotMatch(footerHtml, /max-w-\[var\(--screen-width\)\]/);
});

test("playback footer keeps the five display routes only", () => {
  const footerHtml = renderToStaticMarkup(
    React.createElement(
      MemoryRouter,
      {
        initialEntries: ["/overview"]
      },
      React.createElement(AppFooterNav)
    )
  );

  assert.match(footerHtml, />總覽</);
  assert.match(footerHtml, />太陽能</);
  assert.match(footerHtml, />迴路</);
  assert.match(footerHtml, />圖庫</);
  assert.match(footerHtml, />永續</);
  assert.doesNotMatch(footerHtml, />進入設定</);
  assert.doesNotMatch(footerHtml, />MQTT</);
  assert.doesNotMatch(footerHtml, />圖片管理</);
  assert.doesNotMatch(footerHtml, /border-left:1px solid var\(--shell-divider\)/);
});

test("settings footer keeps overview return plus settings-related routes only", () => {
  const footerHtml = renderToStaticMarkup(
    React.createElement(
      MemoryRouter,
      {
        initialEntries: ["/settings/mqtt"]
      },
      React.createElement(AppFooterNav)
    )
  );

  assert.match(footerHtml, />回總覽</);
  assert.match(footerHtml, />趨勢</);
  assert.match(footerHtml, />品牌</);
  assert.match(footerHtml, />展示編輯</);
  assert.match(footerHtml, />播放設定</);
  assert.match(footerHtml, />圖片管理</);
  assert.match(footerHtml, />MQTT</);
  assert.match(footerHtml, />迴路設定</);
  assert.match(footerHtml, />歷史</);
  assert.match(footerHtml, />預覽</);
  assert.match(footerHtml, />裝置狀態</);
  assert.doesNotMatch(footerHtml, />太陽能</);
  assert.doesNotMatch(footerHtml, />永續</);
  assert.doesNotMatch(footerHtml, />進入設定</);
  assert.doesNotMatch(footerHtml, />離線</);
});

test("management shell keeps its own primitives while fixed-layout routes avoid the playback canvas contract", () => {
  const html = renderToStaticMarkup(
    React.createElement(
      MemoryRouter,
      {
        initialEntries: ["/settings/mqtt"]
      },
      React.createElement(ManagementShell)
    )
  );

  assert.match(html, /data-shell-primitive="management-shell-viewport"/);
  assert.match(html, /data-shell-primitive="management-shell-surface"/);
  assert.match(html, /data-shell-primitive="management-shell-content"/);
  assert.match(html, /data-shell-primitive="management-scroll"/);
  assert.match(html, /overflow-y-auto/);
  assert.match(html, /overflow-x-hidden/);
  assert.match(html, /data-shell-primitive="management-fixed-layout-frame"/);
  assert.match(html, /width:1920px/);
  assert.match(html, /height:838px/);
  assert.doesNotMatch(html, /data-shell-primitive="display-canvas-viewport"/);
  assert.doesNotMatch(html, /data-shell-primitive="display-canvas-frame"/);
  assert.doesNotMatch(html, /height:1080px/);
});

test("management shell wraps fixed-layout management routes in a dedicated scaled frame", () => {
  const fixedLayoutHtml = renderToStaticMarkup(
    React.createElement(
      MemoryRouter,
      {
        initialEntries: ["/settings/playback"]
      },
      React.createElement(
        Routes,
        null,
        React.createElement(
          Route,
          {
            element: React.createElement(ManagementShell),
            path: "/"
          },
          React.createElement(Route, {
            element: React.createElement("div", null, "fixed-layout-body"),
            path: "settings/playback"
          })
        )
      )
    )
  );

  const fluidLayoutHtml = renderToStaticMarkup(
    React.createElement(
      MemoryRouter,
      {
        initialEntries: ["/brand"]
      },
      React.createElement(
        Routes,
        null,
        React.createElement(
          Route,
          {
            element: React.createElement(ManagementShell),
            path: "/"
          },
          React.createElement(Route, {
            element: React.createElement("div", null, "fluid-layout-body"),
            path: "brand"
          })
        )
      )
    )
  );

  assert.match(fixedLayoutHtml, /data-shell-primitive="management-fixed-layout-frame"/);
  assert.match(fixedLayoutHtml, /fixed-layout-body/);
  assert.doesNotMatch(fluidLayoutHtml, /data-shell-primitive="management-fixed-layout-frame"/);
  assert.match(fluidLayoutHtml, /fluid-layout-body/);
});

test("management fixed layout scale clamps to the available viewport without enlarging", () => {
  assert.equal(
    computeManagementFixedLayoutScale({
      height: MANAGEMENT_FIXED_LAYOUT_HEIGHT,
      width: MANAGEMENT_FIXED_LAYOUT_WIDTH
    }),
    1
  );
  assert.equal(
    computeManagementFixedLayoutScale({
      height: 600,
      width: 1280
    }),
    Math.min(1280 / MANAGEMENT_FIXED_LAYOUT_WIDTH, 600 / MANAGEMENT_FIXED_LAYOUT_HEIGHT)
  );
  assert.equal(
    computeManagementFixedLayoutScale({
      height: 2000,
      width: 4000
    }),
    1
  );
});

test("shell primitives expose reusable section, action, media, and status wrappers", () => {
  const html = renderToStaticMarkup(
    React.createElement(
      PanelCard,
      {
        title: "系統資訊",
        subtitle: "SYSTEM"
      },
      React.createElement(
        React.Fragment,
        null,
        React.createElement(
          ActionCluster,
          null,
          React.createElement("button", { type: "button" }, "儲存")
        ),
        React.createElement(MediaSlot, null, React.createElement("img", { alt: "demo", src: "/demo.png" })),
        React.createElement(StatusBadge, {
          status: "connected",
          label: "Online"
        })
      )
    )
  );

  assert.match(html, /data-shell-primitive="section-wrapper"/);
  assert.match(html, /data-shell-primitive="action-cluster"/);
  assert.match(html, /data-shell-primitive="media-slot"/);
  assert.match(html, /data-shell-primitive="status-pill"/);
});
