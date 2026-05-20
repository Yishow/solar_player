import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import type { DisplayPageInstance, DisplayPageTemplateKey } from "@solar-display/shared";
import { mediaPlacementFields } from "./runtimeFieldBuilders";
import { buildRegistryPageDefinitions } from "./registryPageDefinitions";

const editorRuntimeSource = readFileSync(path.join(import.meta.dirname, "runtime.tsx"), "utf8");

test("media placement field builder exposes fit, focus, and align controls for editor regions", () => {
  const fields = mediaPlacementFields(
    "images-stage",
    ["mainStage"],
    {
      alt: "Stage image",
      src: "/images-stage.jpg"
    },
    () => {}
  );

  assert.deepEqual(
    fields.map((field) => field.id),
    [
      "images-stage-fit-mode",
      "images-stage-focus-x",
      "images-stage-focus-y",
      "images-stage-align-x",
      "images-stage-align-y"
    ]
  );
  assert.equal(fields[0]?.value, "cover");
  assert.equal(fields[1]?.value, 0.5);
});

test("runtime page definitions expand registry-backed duplicate instances into independent editor tabs", () => {
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
      draftVersion: 1,
      durationSeconds: 22,
      enabled: true,
      hasDraftChanges: true,
      id: 6,
      lastPublishedAt: null,
      liveVersion: null,
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

  const definitions = buildRegistryPageDefinitions(
    registryPages,
    new Map([
      ["overview", { createSeedConfig: () => ({}), label: "Overview", templateKey: "overview" }],
      ["images", { createSeedConfig: () => ({}), label: "Images", templateKey: "images" }]
    ])
  );

  assert.deepEqual(
    definitions.map((definition) => ({
      id: definition.id,
      label: definition.label,
      templateKey: definition.templateKey
    })),
    [
      { id: "overview", label: "Overview", templateKey: "overview" },
      { id: "images-2", label: "Images Secondary", templateKey: "images" }
    ]
  );
});

test("runtime page definitions rebuild from a refreshed registry snapshot after a create mutation", () => {
  const initialPages: DisplayPageInstance[] = [
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
      templateKey: "overview",
      updatedAt: "2026-05-20T00:00:00.000Z"
    }
  ];
  const refreshedPages: DisplayPageInstance[] = [
    ...initialPages,
    {
      archivedAt: null,
      createdAt: "2026-05-20T00:30:00.000Z",
      displayOrder: 2,
      displayNameEn: "Sustainability",
      displayNameZh: "永續營運",
      draftVersion: 1,
      durationSeconds: 18,
      enabled: true,
      hasDraftChanges: false,
      id: 8,
      lastPublishedAt: "2026-05-20T00:30:00.000Z",
      liveVersion: 1,
      pageKey: "sustainability-2",
      route: "/sustainability-2",
      routeSlug: "sustainability-2",
      templateKey: "sustainability",
      updatedAt: "2026-05-20T00:30:00.000Z"
    }
  ];

  const definitionTemplates = new Map<DisplayPageTemplateKey, {
    createSeedConfig: () => {};
    label: string;
    templateKey: DisplayPageTemplateKey;
  }>([
    ["overview", { createSeedConfig: () => ({}), label: "Overview", templateKey: "overview" }],
    ["sustainability", { createSeedConfig: () => ({}), label: "Sustainability", templateKey: "sustainability" }]
  ]);

  assert.match(editorRuntimeSource, /buildRuntimePageDefinitions\(registry\.pages\)/);
  assert.deepEqual(
    buildRegistryPageDefinitions(initialPages, definitionTemplates).map((definition) => definition.id),
    ["overview"]
  );
  assert.deepEqual(
    buildRegistryPageDefinitions(refreshedPages, definitionTemplates).map((definition) => definition.id),
    ["overview", "sustainability-2"]
  );
});
