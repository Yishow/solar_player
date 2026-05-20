import assert from "node:assert/strict";
import test from "node:test";
import type { DisplayPageInstance } from "@solar-display/shared";
import { resolveDisplayPageRouteInstance } from "./displayPageRouteResolver";

test("display page route host resolves duplicate route slugs to the correct registry instance", () => {
  const registryPages: DisplayPageInstance[] = [
    {
      archivedAt: null,
      createdAt: "2026-05-20T00:00:00.000Z",
      displayOrder: 1,
      displayNameEn: "Overview",
      displayNameZh: "總覽",
      draftVersion: 1,
      durationSeconds: 15,
      enabled: true,
      hasDraftChanges: false,
      id: 1,
      lastPublishedAt: "2026-05-20T00:00:00.000Z",
      liveVersion: 1,
      pageKey: "overview",
      route: "/overview",
      routeSlug: "overview",
      templateKey: "overview"
      ,
      updatedAt: "2026-05-20T00:00:00.000Z"
    },
    {
      archivedAt: null,
      createdAt: "2026-05-20T00:00:00.000Z",
      displayOrder: 2,
      displayNameEn: "Images Secondary",
      displayNameZh: "綠能影像副本",
      draftVersion: 2,
      durationSeconds: 22,
      enabled: true,
      hasDraftChanges: false,
      id: 6,
      lastPublishedAt: "2026-05-20T00:00:00.000Z",
      liveVersion: 2,
      pageKey: "images-2",
      route: "/images-secondary",
      routeSlug: "images-secondary",
      templateKey: "images"
      ,
      updatedAt: "2026-05-20T00:00:00.000Z"
    },
    {
      archivedAt: "2026-05-20T01:00:00.000Z",
      createdAt: "2026-05-20T00:00:00.000Z",
      displayOrder: 3,
      displayNameEn: "Images Archived",
      displayNameZh: "綠能影像封存",
      draftVersion: null,
      durationSeconds: 18,
      enabled: false,
      hasDraftChanges: false,
      id: 7,
      lastPublishedAt: null,
      liveVersion: null,
      pageKey: "images-3",
      route: "/images-archived",
      routeSlug: "images-archived",
      templateKey: "images",
      updatedAt: "2026-05-20T01:00:00.000Z"
    }
  ];

  const resolved = resolveDisplayPageRouteInstance(registryPages, "/images-secondary");

  assert.equal(resolved?.pageKey, "images-2");
  assert.equal(resolved?.templateKey, "images");
  assert.equal(resolveDisplayPageRouteInstance(registryPages, "/images-archived"), null);
  assert.equal(resolveDisplayPageRouteInstance(registryPages, "/missing-page"), null);
});
