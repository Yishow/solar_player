import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  appendDisplayPageMediaEffectLayer,
  applyDisplayPageMediaEffectPreset,
  moveDisplayPageMediaEffectLayer,
  removeDisplayPageMediaEffectLayer,
  resolveDisplayPageMediaEffectGuardrails
} from "./displayPageMediaEffectAuthoring";
import { DisplayPageMediaEffectInspector } from "./mediaEffectInspector";
import type { ResolvedDisplayEditorRegion } from "./inspectorFields";
import { firstBatchDisplayPageMediaEffectSupport } from "../shared/displayPageMediaEffectConfig";

function region(status: "supported" | "unsupported"): ResolvedDisplayEditorRegion {
  return {
    fields: [],
    id: "overview-hero-media",
    label: "Overview Hero Media",
    nodeType: "region",
    schema: {
      fields: [],
      id: "overview-hero-media",
      label: "Overview Hero Media",
      mediaEffectSurface:
        status === "supported"
          ? {
              bindingPath: ["heroMedia"],
              status: "supported",
              support: firstBatchDisplayPageMediaEffectSupport
            }
          : {
              bindingPath: ["heroMedia"],
              reason: "此頁面的主視覺素材尚未開放可組合媒體效果。",
              status: "unsupported"
            }
    }
  };
}

test("effect authoring helpers support add move remove and editable presets", () => {
  const added = appendDisplayPageMediaEffectLayer([], firstBatchDisplayPageMediaEffectSupport, "mist");
  assert.equal(added.length, 1);
  assert.equal(added[0]?.kind, "mist");

  const withPreset = applyDisplayPageMediaEffectPreset(added, "full-frame-soft-focus");
  assert.deepEqual(
    withPreset.map((layer) => layer.kind),
    ["mist", "blur", "opacity"]
  );

  const moved = moveDisplayPageMediaEffectLayer(withPreset, 2, 1);
  assert.deepEqual(
    moved.map((layer) => layer.kind),
    ["mist", "opacity", "blur"]
  );

  const removed = removeDisplayPageMediaEffectLayer(moved, 0);
  assert.deepEqual(
    removed.map((layer) => layer.kind),
    ["opacity", "blur"]
  );
});

test("effect authoring guardrails warn on extreme same-zone stacks", () => {
  const guardrails = resolveDisplayPageMediaEffectGuardrails(
    [
      { blur: 24, coverage: 0.92, feather: 0.9, kind: "mist", strength: 0.9, zone: "top" },
      { coverage: 0.9, feather: 0.85, kind: "blur", strength: 22, zone: "top" }
    ],
    firstBatchDisplayPageMediaEffectSupport
  );

  assert.equal(guardrails.length >= 3, true);
  assert.match(guardrails.join("\n"), /覆蓋範圍過大/);
  assert.match(guardrails.join("\n"), /羽化過強/);
  assert.match(guardrails.join("\n"), /top 區域已有多層效果/);
});

test("media effect inspector renders presets summaries and guardrails for supported surfaces", () => {
  const html = renderToStaticMarkup(
    React.createElement(DisplayPageMediaEffectInspector, {
      availableRegions: [region("supported")],
      config: {
        heroMedia: {
          effects: {
            layers: [
              { blur: 24, coverage: 0.92, feather: 0.9, kind: "mist", strength: 0.9, zone: "top" },
              { coverage: 0.9, feather: 0.85, kind: "blur", strength: 22, zone: "top" }
            ]
          }
        }
      },
      onConfigChange: () => {},
      selectedRegion: region("supported")
    })
  );

  assert.match(html, /媒體效果/);
  assert.match(html, /新增效果層/);
  assert.match(html, /上緣霧化/);
  assert.match(html, /四邊淡出/);
  assert.match(html, /效果提示/);
  assert.match(html, /目前效果堆疊/);
  assert.match(html, /效果層 1/);
  assert.match(html, /效果層 2/);
  assert.doesNotMatch(html, /來源連接/);
});

test("media effect inspector explains unsupported surfaces explicitly", () => {
  const html = renderToStaticMarkup(
    React.createElement(DisplayPageMediaEffectInspector, {
      availableRegions: [region("unsupported")],
      config: {
        heroMedia: {}
      },
      onConfigChange: () => {},
      selectedRegion: region("unsupported")
    })
  );

  assert.match(html, /尚未開放可組合媒體效果/);
  assert.doesNotMatch(html, /新增效果層/);
});
