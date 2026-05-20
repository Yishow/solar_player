import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { DisplayEditorFieldSchema } from "../../../../../packages/shared/src/displayEditorSchema";
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
  DisplayEditorInspectorFields,
  resolveDisplayEditorRegions,
  resolveDisplayEditorFieldIssues,
  type ResolvedDisplayEditorField
} from "./inspectorFields";

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
  assert.match(html, /Image Source/);
  assert.match(html, /Highlight Item 1/);
  assert.match(html, /dirty/);
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
    ["Width 必須大於或等於 0。"]
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
    ["Headline 為必填欄位。"]
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
    ["Fit Mode 的值與可用選項不相容。"]
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

  assert.match(html, /Width 必須大於或等於 0。/);
  assert.match(html, /role="alert"/);
  assert.match(html, /dirty/);
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
    "Sustainability Icon 的值與可用選項不相容。"
  ]);
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
