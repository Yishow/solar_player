import assert from "node:assert/strict";
import test from "node:test";
import type { DisplayPageInstance } from "@solar-display/shared";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { buildPlaybackFooterEntries, resolvePlaybackRouteMeta } from "../app/playbackRouteMeta";
import { routeMetaList, routeMetaMap } from "../app/routeMeta";
import { AppFooterNav } from "./AppFooterNav";
import { AppHeader } from "./AppHeader";
import { DisplayCanvas } from "./DisplayCanvas";
import { computeCanvasLayout } from "./displayCanvasLayout";
import { DisplayPagesEditor } from "../pages/DisplayPagesEditor";
import { ManagementShell, ManagementShellFrame } from "../layouts/ManagementShell";
import { PageScaffold } from "../pages/shared/PageScaffold";
import { ActionCluster } from "./ActionCluster";
import { MediaSlot } from "./MediaSlot";
import { PanelCard } from "./PanelCard";
import { PlaybackTitleGroup } from "./PlaybackTitleGroup";
import { StatusBadge } from "./StatusBadge";

function createPlaybackPage(
  overrides: Partial<DisplayPageInstance> & Pick<DisplayPageInstance, "id" | "pageKey" | "route" | "routeSlug" | "templateKey">
): DisplayPageInstance {
  return {
    archivedAt: null,
    createdAt: "2026-05-22T00:00:00.000Z",
    displayNameEn: "Overview",
    displayNameZh: "總覽",
    displayOrder: 1,
    draftVersion: 1,
    durationSeconds: 15,
    enabled: true,
    hasDraftChanges: false,
    lastPublishedAt: "2026-05-22T00:00:00.000Z",
    liveVersion: 1,
    updatedAt: "2026-05-22T00:00:00.000Z",
    ...overrides
  };
}

function renderManagementRoute(pathname: string, body: string): string {
  return renderToStaticMarkup(
    React.createElement(
      MemoryRouter,
      { initialEntries: [pathname] },
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
            element: React.createElement("div", null, body),
            path: pathname.replace(/^\//, "")
          })
        )
      )
    )
  );
}

test("shell witness routes declare the shared density contract", () => {
  assert.equal(routeMetaMap.get("/overview")?.shellDensity, "playback");
  assert.equal(routeMetaMap.get("/brand")?.shellDensity, "management");
  assert.equal(routeMetaMap.get("/display-pages/editor")?.shellDensity, "management");
  assert.equal(routeMetaMap.get("/settings/playback")?.shellDensity, "management");
  assert.equal(routeMetaMap.get("/device-status")?.shellDensity, "device-detail");
});

test("route metadata no longer splits management routes with a fixed-frame flag", () => {
  for (const route of routeMetaList) {
    assert.equal(
      Object.prototype.hasOwnProperty.call(route, "managementFrame"),
      false,
      `${route.path} should not carry a managementFrame split flag`
    );
  }
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

test("header weather metadata renders alongside the live status badge", () => {
  const headerHtml = renderToStaticMarkup(
    React.createElement(
      MemoryRouter,
      { initialEntries: ["/overview"] },
      React.createElement(AppHeader, {
        meta: {
          status: "connected",
          statusLabel: "Online",
          weather: {
            primaryText: "台北 多雲 31°C",
            secondaryText: "濕度 72%・觀測 14:20",
            state: "ready"
          }
        }
      })
    )
  );

  assert.match(headerHtml, /data-shell-primitive="header-weather"/);
  assert.match(headerHtml, /data-weather-state="ready"/);
  assert.match(headerHtml, /台北 多雲 31°C/);
  assert.match(headerHtml, /濕度 72%・觀測 14:20/);
  assert.match(headerHtml, />Online</);
});

test("header and footer render the provided bootstrap brand view on first paint", () => {
  const brandView = {
    logoSrc: "/uploads/brand/live.png",
    brandNameZh: "測試品牌",
    brandNameEn: "TEST BRAND",
    productTitleZh: "首屏中文標題",
    productTitleEn: "BOOTSTRAPPED PRODUCT",
    sloganZh: "首屏標語",
    sloganEn: "BOOTSTRAPPED SLOGAN"
  };

  const headerHtml = renderToStaticMarkup(
    React.createElement(
      MemoryRouter,
      { initialEntries: ["/overview"] },
      React.createElement(AppHeader, { brandView })
    )
  );
  const footerHtml = renderToStaticMarkup(
    React.createElement(
      MemoryRouter,
      {
        initialEntries: ["/overview"]
      },
      React.createElement(AppFooterNav, { brandView })
    )
  );

  assert.match(headerHtml, /首屏中文標題/);
  assert.match(headerHtml, /BOOTSTRAPPED PRODUCT/);
  assert.match(footerHtml, /首屏標語/);
  assert.match(footerHtml, /BOOTSTRAPPED SLOGAN/);
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

test("playback footer follows resolved registry-backed order, labels, and active duplicate instances", () => {
  const pages = [
    createPlaybackPage({
      id: 1,
      pageKey: "overview",
      route: "/overview",
      routeSlug: "overview",
      templateKey: "overview"
    }),
    createPlaybackPage({
      id: 2,
      pageKey: "overview-2",
      route: "/overview-campus",
      routeSlug: "overview-campus",
      templateKey: "overview",
      displayNameEn: "Overview Campus",
      displayNameZh: "校園總覽",
      displayOrder: 2
    }),
    createPlaybackPage({
      id: 3,
      pageKey: "solar",
      route: "/solar",
      routeSlug: "solar",
      templateKey: "solar",
      displayNameEn: "Solar",
      displayNameZh: "太陽能",
      displayOrder: 3
    })
  ];

  const footerHtml = renderToStaticMarkup(
    React.createElement(
      MemoryRouter,
      {
        initialEntries: ["/overview-campus"]
      },
      React.createElement(AppFooterNav, {
        playbackEntries: buildPlaybackFooterEntries(pages),
        resolvedPlaybackRouteMeta: resolvePlaybackRouteMeta("/overview-campus", pages)
      })
    )
  );

  assert.match(footerHtml, /href="\/overview"/);
  assert.match(footerHtml, /href="\/overview-campus"/);
  assert.match(footerHtml, /href="\/solar"/);
  assert.match(footerHtml, />校園總覽</);
  assert.match(footerHtml, /aria-current="page"[^>]*href="\/overview-campus"/);
  assert.ok(footerHtml.indexOf(">總覽<") < footerHtml.indexOf(">校園總覽<"));
  assert.ok(footerHtml.indexOf(">校園總覽<") < footerHtml.indexOf(">太陽能<"));
});

test("playback footer removes archived registry-backed entries after the refreshed snapshot", () => {
  const activePages = [
    createPlaybackPage({
      id: 1,
      pageKey: "overview",
      route: "/overview",
      routeSlug: "overview",
      templateKey: "overview"
    }),
    createPlaybackPage({
      id: 2,
      pageKey: "overview-2",
      route: "/overview-campus",
      routeSlug: "overview-campus",
      templateKey: "overview",
      displayNameEn: "Overview Campus",
      displayNameZh: "校園總覽",
      displayOrder: 2
    })
  ];
  const refreshedPages = [
    createPlaybackPage({
      id: 1,
      pageKey: "overview",
      route: "/overview",
      routeSlug: "overview",
      templateKey: "overview"
    })
  ];

  const activeFooterHtml = renderToStaticMarkup(
    React.createElement(
      MemoryRouter,
      {
        initialEntries: ["/overview-campus"]
      },
      React.createElement(AppFooterNav, {
        playbackEntries: buildPlaybackFooterEntries(activePages),
        resolvedPlaybackRouteMeta: resolvePlaybackRouteMeta("/overview-campus", activePages)
      })
    )
  );
  const refreshedFooterHtml = renderToStaticMarkup(
    React.createElement(
      MemoryRouter,
      {
        initialEntries: ["/overview-campus"]
      },
      React.createElement(AppFooterNav, {
        playbackEntries: buildPlaybackFooterEntries(refreshedPages),
        resolvedPlaybackRouteMeta: resolvePlaybackRouteMeta("/overview-campus", refreshedPages)
      })
    )
  );

  assert.match(activeFooterHtml, /href="\/overview-campus"/);
  assert.match(activeFooterHtml, /aria-current="page"/);
  assert.doesNotMatch(refreshedFooterHtml, /href="\/overview-campus"/);
  assert.doesNotMatch(refreshedFooterHtml, /aria-current="page"/);
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

test("management shell renders every route inside one whole-page management canvas", () => {
  for (const [pathname, body] of [
    ["/brand", "brand-body"],
    ["/settings/playback", "playback-body"]
  ] as const) {
    const html = renderManagementRoute(pathname, body);

    assert.match(html, /data-shell-primitive="management-shell-viewport"/);
    assert.match(html, /data-shell-primitive="management-shell-frame"/);
    assert.match(html, /data-shell-primitive="management-shell-surface"/);
    assert.match(html, /data-shell-primitive="management-shell-content"/);
    assert.match(html, /data-shell-primitive="management-scroll"/);
    assert.match(html, /data-shell-primitive="app-header"/);
    assert.match(html, /data-shell-primitive="footer-nav"/);
    assert.match(html, new RegExp(body));

    // header, content, and footer share a single scaled 1920x1080 canvas
    assert.match(html, /width:1920px/);
    assert.match(html, /height:1080px/);

    // the legacy split model (separate 1920x838 fixed frame) is gone
    assert.doesNotMatch(html, /data-shell-primitive="management-fixed-layout-frame"/);
    assert.doesNotMatch(html, /height:838px/);

    // management keeps its own primitives rather than the playback canvas primitives
    assert.doesNotMatch(html, /data-shell-primitive="display-canvas-viewport"/);
    assert.doesNotMatch(html, /data-shell-primitive="display-canvas-frame"/);
  }
});

test("management shell reuses playback canvas geometry, slot heights, and uniform scale", () => {
  const html = renderManagementRoute("/settings/playback", "playback-body");

  // 1920x1080 canvas matches the playback DisplayCanvas, not the legacy 838 content frame
  assert.match(html, /width:1920px/);
  assert.match(html, /height:1080px/);
  assert.doesNotMatch(html, /height:838px/);

  // a single translated uniform scale, same semantics as DisplayCanvas
  assert.match(html, /transform:translate\([^)]*\) scale\([^)]*\)/);

  // explicit slots: header 110px, footer 72px, content fills the remaining 898px via flex-1
  assert.match(html, /h-\[var\(--header-height\)\]/);
  assert.match(html, /h-\[var\(--footer-height\)\]/);
  assert.match(html, /data-shell-primitive="management-shell-content"[^>]*flex-1/);

  // the scale is computed from the limiting viewport dimension and is NOT clamped to 1
  const design = { height: 1080, width: 1920 };
  assert.equal(
    computeCanvasLayout({ height: 720, width: 1280 }, design).scale,
    Math.min(1280 / 1920, 720 / 1080)
  );
  assert.equal(
    computeCanvasLayout({ height: 1440, width: 2560 }, design).scale,
    Math.min(2560 / 1920, 1440 / 1080)
  );
  assert.ok(computeCanvasLayout({ height: 1440, width: 2560 }, design).scale > 1);
});

test("management shell keeps the canvas contract when chrome is hidden", () => {
  const hiddenHtml = renderToStaticMarkup(
    React.createElement(
      MemoryRouter,
      {
        initialEntries: ["/display-pages/editor"]
      },
      React.createElement(
        ManagementShellFrame,
        {
          hideChrome: true
        },
        React.createElement("div", null, "edit-body")
      )
    )
  );
  const chromeHtml = renderToStaticMarkup(
    React.createElement(
      MemoryRouter,
      {
        initialEntries: ["/display-pages/editor"]
      },
      React.createElement(
        ManagementShellFrame,
        {
          hideChrome: false
        },
        React.createElement("div", null, "view-body")
      )
    )
  );

  // the management canvas frame remains in both chrome states
  for (const html of [hiddenHtml, chromeHtml]) {
    assert.match(html, /data-shell-primitive="management-shell-viewport"/);
    assert.match(html, /data-shell-primitive="management-shell-frame"/);
    assert.match(html, /data-shell-primitive="management-shell-content"/);
    assert.match(html, /width:1920px/);
    assert.match(html, /height:1080px/);
  }

  // hidden chrome → header and footer are omitted, content still renders inside the canvas
  assert.doesNotMatch(hiddenHtml, /data-shell-primitive="app-header"/);
  assert.doesNotMatch(hiddenHtml, /data-shell-primitive="footer-nav"/);
  assert.match(hiddenHtml, /edit-body/);

  // visible chrome → header and footer share the same canvas
  assert.match(chromeHtml, /data-shell-primitive="app-header"/);
  assert.match(chromeHtml, /data-shell-primitive="footer-nav"/);
  assert.match(chromeHtml, /view-body/);
});

test("management header shares the playback header canvas scale at the same viewport", () => {
  const playbackHtml = renderToStaticMarkup(
    React.createElement(
      DisplayCanvas,
      {
        header: React.createElement(
          MemoryRouter,
          { initialEntries: ["/overview"] },
          React.createElement(AppHeader)
        ),
        footer: React.createElement("footer", null, "footer")
      },
      React.createElement("div", null, "playback-body")
    )
  );
  const managementHtml = renderManagementRoute("/settings/playback", "management-body");

  // both surfaces host their header inside an identical 1920x1080 uniformly-scaled canvas,
  // so the same viewport yields the same header scale on playback and management
  for (const html of [playbackHtml, managementHtml]) {
    assert.match(html, /data-shell-primitive="app-header"/);
    assert.match(html, /width:1920px/);
    assert.match(html, /height:1080px/);
    assert.match(html, /transform:translate\([^)]*\) scale\([^)]*\)/);
    assert.match(html, /h-\[var\(--header-height\)\]/);
  }

  // the management canvas matches the playback design dimensions exactly via the shared math
  const design = { height: 1080, width: 1920 };
  for (const viewport of [
    { height: 720, width: 1280 },
    { height: 1080, width: 1920 },
    { height: 1440, width: 2560 }
  ]) {
    assert.equal(
      computeCanvasLayout(viewport, design).scale,
      Math.min(viewport.width / 1920, viewport.height / 1080)
    );
  }
});

test("display pages editor hides management header and footer while edit mode is active", () => {
  const editModeHtml = renderToStaticMarkup(
    React.createElement(
      MemoryRouter,
      {
        initialEntries: ["/display-pages/editor?page=overview"]
      },
      React.createElement(
        ManagementShellFrame,
        {
          hideChrome: true
        },
        React.createElement(DisplayPagesEditor, {
          editMode: true,
          initialEditorState: {
            editMode: true
          },
          onEditModeChange: () => {},
          renderPreview: false
        })
      )
    )
  );

  const viewModeHtml = renderToStaticMarkup(
    React.createElement(
      MemoryRouter,
      {
        initialEntries: ["/display-pages/editor?page=overview"]
      },
      React.createElement(
        ManagementShellFrame,
        {
          hideChrome: false
        },
        React.createElement(DisplayPagesEditor, {
          editMode: false,
          initialEditorState: {
            editMode: false
          },
          onEditModeChange: () => {},
          renderPreview: false
        })
      )
    )
  );

  assert.doesNotMatch(editModeHtml, /data-shell-primitive="app-header"/);
  assert.doesNotMatch(editModeHtml, /data-shell-primitive="footer-nav"/);
  assert.match(viewModeHtml, /data-shell-primitive="app-header"/);
  assert.match(viewModeHtml, /data-shell-primitive="footer-nav"/);
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
