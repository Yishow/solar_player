import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type {
  DisplayEditorFieldSchema,
  DisplayEditorRegionSchema
} from "../../../../../packages/shared/src/displayEditorSchema";
import { setValueAtPath } from "../../hooks/displayPageConfigPaths";
import { applyDraftConfigUpdate, createDraftSession, resetDraftPaths } from "../../hooks/displayPageDraftSession";
import {
  createOverviewDisplayPageSeedConfig,
  overviewDisplayPageEditorRegions
} from "../Overview/displayPageConfig";
import {
  createSolarDisplayPageSeedConfig,
  solarDisplayPageEditorRegions
} from "../Solar/displayPageConfig";
import {
  createSustainabilityDisplayPageSeedConfig,
  sustainabilityDisplayPageEditorRegions
} from "../Sustainability/displayPageConfig";
import {
  DisplayEditorCanvasOverlay,
  DisplayEditorInspectorFields,
  resolveDisplayEditorRegions,
  resolveDisplayEditorFieldIssues,
  type ResolvedDisplayEditorField
} from "./inspectorFields";
import {
  defaultDisplayEditorOverlayPreset,
  resolveDisplayEditorOverlayState
} from "./canvasOverlayState";

function createField(
  schema: DisplayEditorFieldSchema,
  value: unknown,
  dirty = false
): ResolvedDisplayEditorField {
  return {
    dirty,
    path: schema.path,
    schema,
    value
  };
}

function createRegionSchema(id: string, label: string): DisplayEditorRegionSchema {
  return {
    fields: [],
    id,
    label
  };
}

test("display editor inspector renders typed controls for text, number, toggle, select, array, and asset fields", () => {
  const fields: ResolvedDisplayEditorField[] = [
    createField({ fieldType: "text", id: "title", label: "Title", path: ["title"] }, "Overview"),
    createField(
      { fieldType: "number", id: "width", label: "Width", path: ["width"], step: 1 },
      642,
      true
    ),
    createField({ fieldType: "toggle", id: "enabled", label: "Enabled", path: ["enabled"] }, true),
    createField(
      {
        fieldType: "select",
        id: "fit-mode",
        label: "Fit Mode",
        options: [
          { label: "Contain", value: "contain" },
          { label: "Cover", value: "cover" }
        ],
        path: ["fitMode"]
      },
      "cover"
    ),
    createField({ fieldType: "asset", id: "src", label: "Image Source", path: ["media", "src"] }, "/hero.png"),
    createField(
      {
        fieldType: "array",
        id: "highlight-items",
        itemFields: [
          { fieldType: "text", id: "label", label: "Label", path: ["label"] },
          { fieldType: "text", id: "value", label: "Value", path: ["value"] }
        ],
        itemLabel: "Highlight Item",
        label: "Highlight Items",
        path: ["items"]
      },
      [
        { label: "今日減碳", value: "240" },
        { label: "累積減碳", value: "18,420" }
      ]
    )
  ];

  const html = renderToStaticMarkup(
    React.createElement(DisplayEditorInspectorFields, {
      fields,
      onChange: () => {}
    })
  );

  assert.match(html, /type="text"/);
  assert.match(html, /type="number"/);
  assert.match(html, /type="checkbox"/);
  assert.match(html, /<select/);
  assert.match(html, /圖片來源/);
  assert.match(html, /高亮項目 1/);
  assert.match(html, /已修改/);
});

test("display editor inspector surfaces range, required, and select compatibility validation errors", () => {
  assert.deepEqual(
    resolveDisplayEditorFieldIssues(
      createField(
        {
          constraints: { min: 0 },
          fieldType: "number",
          id: "width",
          label: "Width",
          path: ["width"]
        },
        -24
      )
    ),
    ["寬度必須大於或等於 0。"]
  );

  assert.deepEqual(
    resolveDisplayEditorFieldIssues(
      createField(
        {
          constraints: { required: true },
          fieldType: "text",
          id: "headline",
          label: "Headline",
          path: ["headline"]
        },
        ""
      )
    ),
    ["標題文案為必填欄位。"]
  );

  assert.deepEqual(
    resolveDisplayEditorFieldIssues(
      createField(
        {
          fieldType: "select",
          id: "fit-mode",
          label: "Fit Mode",
          options: [
            { label: "Contain", value: "contain" },
            { label: "Cover", value: "cover" }
          ],
          path: ["fitMode"]
        },
        "stretch"
      )
    ),
    ["填滿模式的值與可用選項不相容。"]
  );

  assert.deepEqual(
    resolveDisplayEditorFieldIssues(
      createField(
        {
          constraints: { required: true },
          fieldType: "asset",
          id: "hero-managed-asset",
          label: "Managed Asset Ref",
          path: ["heroMedia", "assetId"]
        },
        42
      )
    ),
    []
  );
});

test("display editor inspector renders validation feedback inline for invalid fields", () => {
  const html = renderToStaticMarkup(
    React.createElement(DisplayEditorInspectorFields, {
      fields: [
        createField(
          {
            constraints: { min: 0 },
            fieldType: "number",
            id: "width",
            label: "Width",
            path: ["width"]
          },
          -24,
          true
        )
      ],
      onChange: () => {}
    })
  );

  assert.match(html, /寬度必須大於或等於 0。/);
  assert.match(html, /role="alert"/);
  assert.match(html, /已修改/);
});

test("display editor canvas overlay exposes localized accessibility labels for selected regions", () => {
  const regions = [
    {
      fields: [],
      geometry: { height: 280, left: 160, top: 120, width: 640 },
      id: "overview-hero-media",
      label: "Overview Hero Media",
      nodeType: "region" as const,
      schema: createRegionSchema("overview-hero-media", "Overview Hero Media")
    }
  ];
  const selectedRegion = regions[0]!;
  const html = renderToStaticMarkup(
    React.createElement(DisplayEditorCanvasOverlay, {
      isInteractive: true,
      lockedRegionIds: [],
      onSelect: () => {},
      onSelectTemporaryMeasureTarget: () => {},
      onStartInteraction: () => {},
      onStartMeasurementHandleDrag: () => {},
      overlayState: resolveDisplayEditorOverlayState({
        canvasHeight: 934,
        canvasWidth: 1920,
        lockedRegionIds: [],
        overlayPreset: defaultDisplayEditorOverlayPreset,
        regions,
        selectedRegion
      }),
      regions,
      selectedRegionId: "overview-hero-media",
      selectedRegionIds: ["overview-hero-media"],
      temporaryMeasureMode: false
    })
  );

  assert.match(html, /主視覺圖片/);
  assert.match(html, /主視覺圖片 調整大小控制點/);
  assert.doesNotMatch(html, /Overview Hero Media resize handle/);
  assert.match(html, /160 × 324|640 × 324|640 × 323|640 × 324/);
});

test("display editor canvas overlay renders full-canvas guides and region labels when preset options are enabled", () => {
  const regions = [
    {
      fields: [],
      geometry: { height: 280, left: 160, top: 120, width: 640 },
      id: "overview-hero-media",
      label: "Overview Hero Media",
      nodeType: "region" as const,
      schema: createRegionSchema("overview-hero-media", "Overview Hero Media")
    },
    {
      fields: [],
      geometry: { height: 180, left: 920, top: 132, width: 320 },
      id: "overview-hero-copy",
      label: "Overview Hero Copy",
      nodeType: "region" as const,
      schema: createRegionSchema("overview-hero-copy", "Overview Hero Copy")
    }
  ];
  const selectedRegion = regions[0]!;
  const html = renderToStaticMarkup(
    React.createElement(DisplayEditorCanvasOverlay, {
      isInteractive: true,
      lockedRegionIds: [],
      onSelect: () => {},
      onSelectTemporaryMeasureTarget: () => {},
      onStartInteraction: () => {},
      onStartMeasurementHandleDrag: () => {},
      overlayState: resolveDisplayEditorOverlayState({
        canvasHeight: 934,
        canvasWidth: 1920,
        lockedRegionIds: [],
        overlayPreset: {
          ...defaultDisplayEditorOverlayPreset,
          displayMode: "full-canvas",
          showCenterLines: true,
          showRegionLabels: true
        },
        regions,
        selectedRegion
      }),
      regions,
      selectedRegionId: "overview-hero-media",
      selectedRegionIds: ["overview-hero-media"],
      temporaryMeasureMode: false
    })
  );

  assert.match(html, /data-guide-kind="boundary"/);
  assert.match(html, /data-guide-kind="center"/);
  assert.match(html, /主視覺圖片/);
  assert.match(html, /主視覺文案/);
});

test("display editor canvas overlay renders relational rulers without replacing the current selection", () => {
  const regions = [
    {
      fields: [],
      geometry: { height: 280, left: 920, top: 120, width: 320 },
      id: "overview-hero-copy",
      label: "Overview Hero Copy",
      nodeType: "region" as const,
      schema: createRegionSchema("overview-hero-copy", "Overview Hero Copy")
    },
    {
      fields: [],
      geometry: { height: 360, left: 160, top: 96, width: 620 },
      id: "overview-hero-media",
      label: "Overview Hero Media",
      nodeType: "region" as const,
      schema: createRegionSchema("overview-hero-media", "Overview Hero Media")
    }
  ];
  const selectedRegion = regions[0]!;
  const html = renderToStaticMarkup(
    React.createElement(DisplayEditorCanvasOverlay, {
      isInteractive: true,
      lockedRegionIds: [],
      onSelect: () => {},
      onSelectTemporaryMeasureTarget: () => {},
      onStartInteraction: () => {},
      onStartMeasurementHandleDrag: () => {},
      overlayState: resolveDisplayEditorOverlayState({
        canvasHeight: 934,
        canvasWidth: 1920,
        lockedRegionIds: [],
        measurementTargetRegion: regions[1],
        overlayPreset: defaultDisplayEditorOverlayPreset,
        regions,
        selectedRegion,
        selectedRegionIds: ["overview-hero-copy"],
        temporaryMeasureMode: true
      }),
      regions,
      selectedRegionId: "overview-hero-copy",
      selectedRegionIds: ["overview-hero-copy"],
      temporaryMeasureMode: true
    })
  );

  assert.match(html, /data-ruler-axis="x"/);
  assert.match(html, /調整 水平 量測/);
  assert.match(html, /140/);
  assert.match(html, /aria-pressed="true"/);
});

test("display editor canvas overlay renders multi-select bounds and snap feedback labels", () => {
  const regions = [
    {
      fields: [],
      geometry: { height: 140, left: 120, top: 220, width: 180 },
      id: "overview-stat-a",
      label: "Overview Stat A",
      nodeType: "region" as const,
      schema: createRegionSchema("overview-stat-a", "Overview Stat A")
    },
    {
      fields: [],
      geometry: { height: 160, left: 420, top: 260, width: 220 },
      id: "overview-stat-b",
      label: "Overview Stat B",
      nodeType: "region" as const,
      schema: createRegionSchema("overview-stat-b", "Overview Stat B")
    }
  ];
  const selectedRegion = regions[0]!;
  const html = renderToStaticMarkup(
    React.createElement(DisplayEditorCanvasOverlay, {
      isInteractive: true,
      lockedRegionIds: [],
      onSelect: () => {},
      onSelectTemporaryMeasureTarget: () => {},
      onStartInteraction: () => {},
      onStartMeasurementHandleDrag: () => {},
      overlayState: resolveDisplayEditorOverlayState({
        activeInteraction: {
          boundaryClamped: false,
          constraintRect: { height: 934, left: 0, top: 0, width: 1920 },
          guides: [{ axis: "x", label: "Center Line", position: 960, targetType: "center-line" }],
          rect: regions[0]!.geometry!,
          type: "drag"
        },
        canvasHeight: 934,
        canvasWidth: 1920,
        lockedRegionIds: [],
        overlayPreset: defaultDisplayEditorOverlayPreset,
        regions,
        selectedRegion,
        selectedRegionIds: ["overview-stat-a", "overview-stat-b"],
        selectionFeedbackLabel: "水平分布"
      }),
      regions,
      selectedRegionId: "overview-stat-a",
      selectedRegionIds: ["overview-stat-a", "overview-stat-b"],
      temporaryMeasureMode: false
    })
  );

  assert.match(html, /data-selection-bounds="true"/);
  assert.match(html, /水平分布/);
  assert.match(html, /data-guide-kind="snap-center-line"/);
  assert.match(html, />Center Line</);
});

test("display editor canvas overlay falls back to alternate ruler label placement when the canvas is crowded", () => {
  const regions = [
    {
      fields: [],
      geometry: { height: 180, left: 240, top: 240, width: 280 },
      id: "overview-kpi-a",
      label: "Overview KPI A",
      nodeType: "region" as const,
      schema: createRegionSchema("overview-kpi-a", "Overview KPI A")
    },
    {
      fields: [],
      geometry: { height: 180, left: 240, top: 450, width: 280 },
      id: "overview-kpi-b",
      label: "Overview KPI B",
      nodeType: "region" as const,
      schema: createRegionSchema("overview-kpi-b", "Overview KPI B")
    }
  ];
  const selectedRegion = regions[0]!;
  const html = renderToStaticMarkup(
    React.createElement(DisplayEditorCanvasOverlay, {
      isInteractive: true,
      lockedRegionIds: [],
      onSelect: () => {},
      onSelectTemporaryMeasureTarget: () => {},
      onStartInteraction: () => {},
      onStartMeasurementHandleDrag: () => {},
      overlayState: resolveDisplayEditorOverlayState({
        canvasHeight: 934,
        canvasWidth: 1920,
        lockedRegionIds: [],
        measurementTargetRegion: regions[1],
        overlayPreset: defaultDisplayEditorOverlayPreset,
        regions,
        selectedRegion,
        selectedRegionIds: ["overview-kpi-a"],
        temporaryMeasureMode: true
      }),
      regions,
      selectedRegionId: "overview-kpi-a",
      selectedRegionIds: ["overview-kpi-a"],
      temporaryMeasureMode: true
    })
  );

  assert.match(html, /data-ruler-axis="y"/);
  assert.match(html, /data-ruler-label-placement="after"|data-ruler-label-placement="before"/);
});

test("display editor canvas overlay keeps relational handles disabled when selection or geometry is missing", () => {
  const regions = [
    {
      fields: [],
      geometry: { height: 180, left: 240, top: 240, width: 280 },
      id: "overview-kpi-a",
      label: "Overview KPI A",
      nodeType: "region" as const,
      schema: createRegionSchema("overview-kpi-a", "Overview KPI A")
    },
    {
      fields: [],
      id: "overview-kpi-b",
      label: "Overview KPI B",
      nodeType: "region" as const,
      schema: createRegionSchema("overview-kpi-b", "Overview KPI B")
    }
  ];
  const html = renderToStaticMarkup(
    React.createElement(DisplayEditorCanvasOverlay, {
      isInteractive: true,
      lockedRegionIds: [],
      onSelect: () => {},
      onSelectTemporaryMeasureTarget: () => {},
      onStartInteraction: () => {},
      onStartMeasurementHandleDrag: () => {},
      overlayState: resolveDisplayEditorOverlayState({
        canvasHeight: 934,
        canvasWidth: 1920,
        lockedRegionIds: [],
        measurementTargetRegion: regions[1],
        overlayPreset: defaultDisplayEditorOverlayPreset,
        regions,
        selectedRegion: null,
        selectedRegionIds: [],
        temporaryMeasureMode: true
      }),
      regions,
      selectedRegionId: null,
      selectedRegionIds: [],
      temporaryMeasureMode: true
    })
  );

  assert.doesNotMatch(html, /調整 水平 量測/);
  assert.doesNotMatch(html, /調整 垂直 量測/);
});

test("display editor inspector resolves only the payload fields owned by the selected media source mode", () => {
  const [region] = resolveDisplayEditorRegions(
    {
      heroMedia: {
        alt: "Overview hero",
        assetId: 42,
        sourceMode: "direct-src",
        src: "/uploads/images/overview-direct.png"
      }
    },
    [
      {
        fields: [
          {
            fieldType: "select",
            id: "hero-source-mode",
            label: "Source Mode",
            options: [
              { label: "Managed Asset", value: "managed-asset" },
              { label: "Direct Src", value: "direct-src" },
              { label: "Seed Default", value: "seed-default" }
            ],
            path: ["heroMedia", "sourceMode"]
          },
          {
            fieldType: "asset",
            id: "hero-managed-asset",
            label: "Managed Asset Ref",
            path: ["heroMedia", "assetId"],
            visibleWhen: {
              equals: "managed-asset",
              path: ["heroMedia", "sourceMode"]
            }
          },
          {
            fieldType: "text",
            id: "hero-direct-src",
            label: "Direct Src",
            path: ["heroMedia", "src"],
            visibleWhen: {
              equals: "direct-src",
              path: ["heroMedia", "sourceMode"]
            }
          },
          { fieldType: "text", id: "hero-alt", label: "Image Alt", path: ["heroMedia", "alt"] }
        ],
        id: "overview-hero-media",
        label: "Overview Hero Media"
      }
    ],
    {
      heroMedia: {
        alt: "Seed hero",
        sourceMode: "seed-default",
        src: "/brand-logo.png"
      }
    }
  );

  assert.deepEqual(
    region?.fields.map((field) => field.schema.id),
    ["hero-source-mode", "hero-direct-src", "hero-alt"]
  );
});

test("display editor inspector surfaces validation issues for invalid icon source payload options", () => {
  const [region] = resolveDisplayEditorRegions(
    {
      iconSources: {
        solar: {
          iconKey: "solar",
          mode: "page-icon-key",
          registry: "sustainability"
        }
      },
      nodes: {
        solar: {
          height: 120,
          left: 800,
          top: 240,
          width: 120
        }
      }
    },
    [
      {
        fields: [
          {
            fieldType: "select",
            id: "solar-icon-source-mode",
            label: "Icon Source Mode",
            options: [
              { label: "Asset Image", value: "asset-image" },
              { label: "Reference Glyph", value: "reference-glyph" },
              { label: "Page Icon Key", value: "page-icon-key" }
            ],
            path: ["iconSources", "solar", "mode"]
          },
          {
            fieldType: "select",
            id: "solar-icon-registry",
            label: "Icon Registry",
            options: [
              { label: "Factory Circuit", value: "factory-circuit" },
              { label: "Sustainability", value: "sustainability" }
            ],
            path: ["iconSources", "solar", "registry"],
            visibleWhen: {
              equals: "page-icon-key",
              path: ["iconSources", "solar", "mode"]
            }
          },
          {
            fieldType: "select",
            id: "solar-icon-key-sustainability",
            label: "Sustainability Icon",
            options: [
              { label: "bars", value: "bars" },
              { label: "co2", value: "co2" },
              { label: "esg-doc", value: "esg-doc" }
            ],
            path: ["iconSources", "solar", "iconKey"],
            visibleWhen: {
              equals: "sustainability",
              path: ["iconSources", "solar", "registry"]
            }
          }
        ],
        geometry: {
          heightPath: ["nodes", "solar", "height"],
          leftPath: ["nodes", "solar", "left"],
          topPath: ["nodes", "solar", "top"],
          widthPath: ["nodes", "solar", "width"]
        },
        id: "factory-node-solar",
        label: "Factory Node Solar"
      }
    ],
    {
      iconSources: {
        solar: {
          iconKey: "esg-doc",
          mode: "page-icon-key",
          registry: "sustainability"
        }
      },
      nodes: {
        solar: {
          height: 120,
          left: 800,
          top: 240,
          width: 120
        }
      }
    }
  );

  const invalidField = region?.fields.find((field) => field.schema.id === "solar-icon-key-sustainability");
  assert.ok(invalidField);
  assert.deepEqual(resolveDisplayEditorFieldIssues(invalidField), [
    "永續成果圖示的值與可用選項不相容。"
  ]);
});

test("display editor inspector exposes managed asset controls for card icon sources", () => {
  const solarConfig = createSolarDisplayPageSeedConfig("/solar-hero.png");
  solarConfig.iconSources.kpiCards.generation = {
    assetId: 42,
    fallbackSrc: "/uploads/images/generation-icon.png",
    mode: "managed-asset"
  };

  const [generationRegion] = resolveDisplayEditorRegions(
    solarConfig as unknown as Record<string, unknown>,
    solarDisplayPageEditorRegions.filter((region) => region.id === "solar-kpi-generation"),
    createSolarDisplayPageSeedConfig("/solar-hero.png") as unknown as Record<string, unknown>
  );

  assert.ok(generationRegion);
  assert.equal(
    generationRegion.fields.some(
      (field) =>
        field.schema.id === "generation-icon-managed-asset" &&
        field.path.join(".") === "iconSources.kpiCards.generation.assetId" &&
        field.value === 42
    ),
    true
  );
});

test("display editor inspector resolves persisted card-style controls for eligible shared-card regions", () => {
  const overviewConfig = createOverviewDisplayPageSeedConfig("/overview-hero.png");
  const solarConfig = createSolarDisplayPageSeedConfig("/solar-hero.png");
  const [overviewSummary] = resolveDisplayEditorRegions(
    overviewConfig as unknown as Record<string, unknown>,
    overviewDisplayPageEditorRegions.filter((region) => region.id === "overview-summary"),
    overviewConfig as unknown as Record<string, unknown>
  );
  const [solarGeneration] = resolveDisplayEditorRegions(
    solarConfig as unknown as Record<string, unknown>,
    solarDisplayPageEditorRegions.filter((region) => region.id === "solar-kpi-generation"),
    solarConfig as unknown as Record<string, unknown>
  );

  assert.deepEqual(
    overviewSummary?.fields
      .filter((field) => field.schema.id.startsWith("overview-summary-card-"))
      .map((field) => field.schema.label),
    [
      "Title Font Size",
      "Subtitle Font Size",
      "Value Font Size",
      "Unit Font Size",
      "Padding Top",
      "Padding Right",
      "Padding Bottom",
      "Padding Left",
      "Corner Radius",
      "Header Gap",
      "Icon Box Size",
      "Footer Padding Top",
      "Value Margin Top",
      "Unit Padding Bottom",
      "Value Row Align"
    ]
  );
  assert.equal(
    solarGeneration?.fields.some((field) => field.path.join(".") === "cardStyles.generation.valueRowAlign"),
    true
  );
});

test("display editor inspector keeps sustainability page-specific fields bound to the active draft session", () => {
  const seedConfig = createSustainabilityDisplayPageSeedConfig("/sustainability-hero.png");
  const heroCopySchema = sustainabilityDisplayPageEditorRegions.filter(
    (region) => region.id === "sustainability-hero-copy"
  );
  const fallbackPolicy = {
    emptyContent: "show-placeholder",
    missingAsset: "show-seed",
    staleData: "show-placeholder"
  } as const;

  const initialSession = createDraftSession(seedConfig, null, fallbackPolicy);
  const titlePath = ["hero", "title", 0] as const;
  const draftSession = applyDraftConfigUpdate(initialSession, (current) =>
    setValueAtPath(current, [...titlePath], "草稿中的永續成果")
  );

  const [draftRegion] = resolveDisplayEditorRegions(
    draftSession.config as unknown as Record<string, unknown>,
    heroCopySchema,
    seedConfig as unknown as Record<string, unknown>
  );
  const titleField = draftRegion?.fields.find((field) => field.schema.id === "sustainability-title-1");
  assert.ok(titleField);
  assert.equal(titleField.value, "草稿中的永續成果");
  assert.equal(titleField.dirty, true);

  const resetSession = resetDraftPaths(draftSession, seedConfig, [[...titlePath]]);
  const [resetRegion] = resolveDisplayEditorRegions(
    resetSession.config as unknown as Record<string, unknown>,
    heroCopySchema,
    seedConfig as unknown as Record<string, unknown>
  );
  const resetField = resetRegion?.fields.find((field) => field.schema.id === "sustainability-title-1");
  assert.ok(resetField);
  assert.equal(resetField.value, seedConfig.hero.title[0]);
  assert.equal(resetField.dirty, false);
});

test("display editor resolves card rail child nodes as first-class authoring regions", () => {
  const seedConfig = createSustainabilityDisplayPageSeedConfig();
  const regions = resolveDisplayEditorRegions(
    seedConfig as unknown as Record<string, unknown>,
    sustainabilityDisplayPageEditorRegions,
    seedConfig as unknown as Record<string, unknown>
  );

  const railRegion = regions.find((region) => region.id === "sustainability-highlight-rail");
  const todayCard = regions.find((region) => region.id === "sustainability-highlight-rail/household-today");
  const cumulativeCard = regions.find(
    (region) => region.id === "sustainability-highlight-rail/household-cumulative"
  );

  assert.ok(railRegion);
  assert.ok(todayCard);
  assert.ok(cumulativeCard);
  assert.equal(todayCard?.parentId, railRegion?.id);
  assert.equal(cumulativeCard?.parentId, railRegion?.id);
  assert.equal(todayCard?.schema.id, "sustainability-highlight-rail-card");
  assert.deepEqual(
    todayCard?.fields.map((field) => field.schema.id),
    [
      "card-eyebrow",
      "card-household-count-display",
      "card-household-label",
      "card-supporting-line",
      "card-disclaimer",
      "card-basis-source-label",
      "card-frame-left",
      "card-frame-top",
      "card-frame-width",
      "card-frame-height"
    ]
  );
});

test("display editor inspector renders household-equivalent template fields from the card rail schema", () => {
  const seedConfig = createSustainabilityDisplayPageSeedConfig();
  const cardRegion = resolveDisplayEditorRegions(
    seedConfig as unknown as Record<string, unknown>,
    sustainabilityDisplayPageEditorRegions,
    seedConfig as unknown as Record<string, unknown>
  ).find((region) => region.id === "sustainability-highlight-rail/household-today");

  assert.ok(cardRegion);

  const html = renderToStaticMarkup(
    React.createElement(DisplayEditorInspectorFields, {
      fields: cardRegion.fields,
      onChange: () => {}
    })
  );

  assert.match(html, /頁眉短標/);
  assert.match(html, /家庭等值數值/);
  assert.match(html, /補充說明/);
  assert.match(html, /免責說明/);
  assert.match(html, /基準來源標籤/);
});
