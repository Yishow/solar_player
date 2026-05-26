import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { displayPageTemplateKeys, type DisplayPageInstance, type DisplayPageTemplateKey } from "@solar-display/shared";
import { DisplayPagesEditor } from "./index";
import { mediaPlacementFields } from "./runtimeFieldBuilders";
import { resolvePageRegionSchemas } from "./pageRegionSchemas";
import { buildRegistryPageDefinitions } from "./registryPageDefinitions";

const editorRuntimeSource = readFileSync(path.join(import.meta.dirname, "runtime.tsx"), "utf8");
const runtimeDefinitionsSource = readFileSync(
  path.join(import.meta.dirname, "runtimePageDefinitions.tsx"),
  "utf8"
);
const displayEditorIndexSource = readFileSync(path.join(import.meta.dirname, "index.tsx"), "utf8");

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

test("runtime page definitions keep supported pages on the shared schema-aware inspector contract", () => {
  assert.match(runtimeDefinitionsSource, /overviewRuntimePageDefinition/);
  assert.match(runtimeDefinitionsSource, /solarRuntimePageDefinition/);
  assert.match(runtimeDefinitionsSource, /factoryCircuitRuntimePageDefinition/);
  assert.match(runtimeDefinitionsSource, /imagesRuntimePageDefinition/);
  assert.match(runtimeDefinitionsSource, /sustainabilityRuntimePageDefinition/);

  for (const templateKey of displayPageTemplateKeys) {
    assert.equal(resolvePageRegionSchemas(templateKey).length > 0, true);
  }

  assert.doesNotMatch(displayEditorIndexSource, /buildEditableRegions\?:/);

  for (const runtimeFile of [
    "runtimeOverview.tsx",
    "runtimeSolar.tsx",
    "runtimeFactoryCircuit.tsx",
    "runtimeImages.tsx",
    "runtimeSustainability.tsx"
  ]) {
    const runtimeSource = readFileSync(path.join(import.meta.dirname, runtimeFile), "utf8");
    assert.doesNotMatch(runtimeSource, /buildEditableRegions:/);
  }
});

test("page region schemas expose composable effect support matrices only on the rolled-out media surfaces", () => {
  const overviewHeroRegion = resolvePageRegionSchemas("overview").find((region) => region.id === "overview-hero-media");
  const imagesStageRegion = resolvePageRegionSchemas("images").find((region) => region.id === "images-main-stage");
  const solarHeroRegion = resolvePageRegionSchemas("solar").find((region) => region.id === "solar-hero-media");
  const sustainabilityHeroRegion = resolvePageRegionSchemas("sustainability").find((region) => region.id === "sustainability-hero-media");

  assert.equal(
    overviewHeroRegion?.mediaEffectSurface?.status,
    "supported"
  );
  assert.equal(
    imagesStageRegion?.mediaEffectSurface?.status,
    "supported"
  );
  assert.equal(
    solarHeroRegion?.mediaEffectSurface?.status,
    "unsupported"
  );
  assert.equal(
    sustainabilityHeroRegion?.mediaEffectSurface?.status,
    "unsupported"
  );
  assert.deepEqual(
    overviewHeroRegion?.mediaEffectSurface?.support?.fade?.zones,
    ["top", "bottom", "left", "right", "top-bottom", "left-right", "all-edges"]
  );
  assert.deepEqual(
    imagesStageRegion?.mediaEffectSurface?.support?.blur?.zones,
    ["top", "bottom", "left", "right", "top-bottom", "left-right", "all-edges", "full-frame"]
  );
  assert.match(
    solarHeroRegion?.mediaEffectSurface?.reason ?? "",
    /尚未/
  );
  assert.match(
    sustainabilityHeroRegion?.mediaEffectSurface?.reason ?? "",
    /尚未/
  );
});

test("display page editor no longer falls back to the phase-only inspector message for supported runtime pages", () => {
  const pageLabels: Record<DisplayPageTemplateKey, string> = {
    "factory-circuit": "Factory Circuit",
    images: "Images",
    overview: "Overview",
    solar: "Solar",
    sustainability: "Sustainability"
  };
  const pageDefinitions = displayPageTemplateKeys.map((templateKey) => ({
    createSeedConfig: () => ({}),
    id: templateKey,
    label: pageLabels[templateKey],
    templateKey
  }));

  for (const templateKey of displayPageTemplateKeys) {
    const firstRegion = resolvePageRegionSchemas(templateKey)[0];
    assert.ok(firstRegion);

    const html = renderToStaticMarkup(
      React.createElement(
        MemoryRouter,
        {
          initialEntries: [`/display-pages/editor?page=${templateKey}`]
        },
        React.createElement(DisplayPagesEditor, {
          initialEditorState: {
            editMode: true,
            selectedRegionId: firstRegion.id
          },
          pageDefinitions,
          renderPreview: false
        })
      )
    );

    assert.doesNotMatch(html, /page-specific editor 尚未在本 phase 展開/);
    assert.match(html, new RegExp(firstRegion.id));
  }
});
