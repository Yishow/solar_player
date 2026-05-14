import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { routeMetaMap } from "../app/routeMeta";
import { AppFooterNav } from "./AppFooterNav";
import { AppHeader } from "./AppHeader";
import { DisplayCanvas } from "./DisplayCanvas";
import { ManagementShell } from "../layouts/ManagementShell";
import { PageScaffold } from "../pages/shared/PageScaffold";
import { ActionCluster } from "./ActionCluster";
import { MediaSlot } from "./MediaSlot";
import { PanelCard } from "./PanelCard";
import { PlaybackTitleGroup } from "./PlaybackTitleGroup";
import { StatusBadge } from "./StatusBadge";

test("shell witness routes declare the shared density contract", () => {
  assert.equal(routeMetaMap.get("/overview")?.shellDensity, "playback");
  assert.equal(routeMetaMap.get("/settings/playback")?.shellDensity, "management");
  assert.equal(routeMetaMap.get("/device-status")?.shellDensity, "device-detail");
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
  const headerHtml = renderToStaticMarkup(React.createElement(AppHeader));
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
  assert.match(footerHtml, /data-shell-primitive="footer-nav"/);
  assert.doesNotMatch(headerHtml, /max-w-\[var\(--screen-width\)\]/);
  assert.doesNotMatch(footerHtml, /max-w-\[var\(--screen-width\)\]/);
});

test("playback footer keeps the five display routes plus a single settings entry", () => {
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
  assert.match(footerHtml, />進入設定</);
  assert.doesNotMatch(footerHtml, />MQTT</);
  assert.doesNotMatch(footerHtml, />圖片管理</);
  assert.match(footerHtml, /h-\[26px\]/);
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

test("management shell shares the FHD canvas with display routes and adds an inner scroll area", () => {
  const html = renderToStaticMarkup(
    React.createElement(
      MemoryRouter,
      {
        initialEntries: ["/settings/mqtt"]
      },
      React.createElement(ManagementShell)
    )
  );

  assert.match(html, /data-shell-primitive="display-canvas-viewport"/);
  assert.match(html, /data-shell-primitive="display-canvas-frame"/);
  assert.match(html, /data-shell-primitive="management-scroll"/);
  assert.match(html, /overflow-y-auto/);
  assert.match(html, /overflow-x-hidden/);
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
          label: "MQTT Online"
        })
      )
    )
  );

  assert.match(html, /data-shell-primitive="section-wrapper"/);
  assert.match(html, /data-shell-primitive="action-cluster"/);
  assert.match(html, /data-shell-primitive="media-slot"/);
  assert.match(html, /data-shell-primitive="status-pill"/);
});
