import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { DisplayEditorFieldSchema } from "../../../../../packages/shared/src/displayEditorSchema";
import {
  DisplayEditorInspectorFields,
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
});
