import assert from "node:assert/strict";
import test from "node:test";
import type { DisplayPageInstance } from "@solar-display/shared";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { buildPlaybackFooterEntries, resolvePlaybackRouteMeta } from "../app/playbackRouteMeta";
import { AppFooterNav } from "./AppFooterNav";

function renderFooter(pathname: string, props: React.ComponentProps<typeof AppFooterNav> = {}) {
  return renderToStaticMarkup(
    React.createElement(
      MemoryRouter,
      {
        initialEntries: [pathname]
      },
      React.createElement(AppFooterNav, props)
    )
  );
}

function createPlaybackPage(
  overrides: Partial<DisplayPageInstance> & Pick<DisplayPageInstance, "id" | "pageKey" | "route" | "routeSlug" | "templateKey">
): DisplayPageInstance {
  return {
    archivedAt: null,
    createdAt: "2026-06-06T00:00:00.000Z",
    displayNameEn: "Overview",
    displayNameZh: "總覽",
    displayOrder: 1,
    draftVersion: 1,
    durationSeconds: 15,
    enabled: true,
    hasDraftChanges: false,
    lastPublishedAt: "2026-06-06T00:00:00.000Z",
    liveVersion: 1,
    updatedAt: "2026-06-06T00:00:00.000Z",
    ...overrides
  };
}

function assertIconLabelEntry(html: string, entry: { icon: string; label: string; path: string }) {
  const pathPattern = entry.path.replace(/\//g, "\\/");
  assert.match(
    html,
    new RegExp(
      `<a(?=[^>]*href="${pathPattern}")[\\s\\S]*?<span[^>]*data-shell-nav-icon="${entry.icon}"[\\s\\S]*?<\\/span>[\\s\\S]*?<span>${entry.label}<\\/span>[\\s\\S]*?<\\/a>`
    )
  );
}

test("playback footer renders route icons beside the existing labels without changing route structure", () => {
  const html = renderFooter("/overview");
  const expectedEntries = [
    { icon: "overview", label: "總覽", path: "/overview" },
    { icon: "solar", label: "太陽能", path: "/solar" },
    { icon: "factory-circuit", label: "迴路", path: "/factory-circuit" },
    { icon: "images", label: "圖庫", path: "/images" },
    { icon: "sustainability", label: "永續", path: "/sustainability" }
  ];

  for (const entry of expectedEntries) {
    assertIconLabelEntry(html, entry);
  }

  assert.deepEqual(
    expectedEntries.map((entry) => html.indexOf(`data-shell-nav-icon="${entry.icon}"`)).sort((left, right) => left - right),
    expectedEntries.map((entry) => html.indexOf(`data-shell-nav-icon="${entry.icon}"`))
  );
  assert.equal((html.match(/data-shell-nav-icon=/g) ?? []).length, expectedEntries.length);
});

test("registry-backed playback footer entries inherit the icon from their template route", () => {
  const pages = [
    createPlaybackPage({
      id: 1,
      pageKey: "overview",
      route: "/overview-campus",
      routeSlug: "overview-campus",
      templateKey: "overview",
      displayNameZh: "校園總覽"
    }),
    createPlaybackPage({
      id: 2,
      pageKey: "images",
      route: "/images-gallery",
      routeSlug: "images-gallery",
      templateKey: "images",
      displayNameZh: "圖像展區",
      displayOrder: 2
    })
  ];
  const html = renderFooter("/overview-campus", {
    playbackEntries: buildPlaybackFooterEntries(pages),
    resolvedPlaybackRouteMeta: resolvePlaybackRouteMeta("/overview-campus", pages)
  });

  assertIconLabelEntry(html, { icon: "overview", label: "校園總覽", path: "/overview-campus" });
  assertIconLabelEntry(html, { icon: "images", label: "圖像展區", path: "/images-gallery" });
});

test("management footer keeps existing entries without route icons", () => {
  const html = renderFooter("/settings/mqtt");

  assert.doesNotMatch(html, /data-shell-nav-icon=/);
  assert.match(html, />回總覽</);
  assert.match(html, />MQTT</);
});
