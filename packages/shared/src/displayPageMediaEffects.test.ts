import assert from "node:assert/strict";
import test from "node:test";
import {
  resolveDisplayPageMediaEffects,
  type DisplayPageMediaEffectResolverOptions
} from "./displayPageMediaEffects.js";

const composableSupport: DisplayPageMediaEffectResolverOptions["support"] = {
  blur: {
    zones: ["top", "bottom", "left", "right", "top-bottom", "left-right", "all-edges", "full-frame"]
  },
  fade: {
    zones: ["top", "bottom", "left", "right", "top-bottom", "left-right", "all-edges"]
  },
  mist: {
    zones: ["top", "bottom", "left", "right", "top-bottom", "left-right", "all-edges"]
  },
  opacity: {
    zones: ["full-frame"]
  },
  tone: {
    zones: ["full-frame"]
  }
};

test("shared media effect resolver preserves canonical same-zone stacking order", () => {
  const resolved = resolveDisplayPageMediaEffects(
    {
      layers: [
        { coverage: 0.32, feather: 0.58, kind: "mist", strength: 0.72, zone: "top" },
        { coverage: 0.32, feather: 0.42, kind: "blur", strength: 14, zone: "top" }
      ]
    },
    {
      support: composableSupport
    }
  );

  assert.deepEqual(
    resolved.layers.map((layer) => ({
      kind: layer.kind,
      strength: layer.strength,
      zone: layer.zone
    })),
    [
      { kind: "mist", strength: 0.72, zone: "top" },
      { kind: "blur", strength: 14, zone: "top" }
    ]
  );
  assert.equal(resolved.usesCanonicalLayers, true);
  assert.equal(resolved.usesLegacyFields, false);
});

test("shared media effect resolver normalizes legacy fade blur and opacity fields into canonical layers", () => {
  const resolved = resolveDisplayPageMediaEffects(
    {
      blur: {
        amount: 18,
        enabled: true
      },
      bottomFade: {
        enabled: true,
        height: 0.28
      },
      edgeFade: {
        direction: "left",
        enabled: true,
        width: 0.4
      },
      opacity: {
        enabled: true,
        value: 0.6
      }
    },
    {
      support: composableSupport
    }
  );

  assert.deepEqual(
    resolved.layers.map((layer) => ({
      kind: layer.kind,
      strength: layer.strength,
      zone: layer.zone
    })),
    [
      { kind: "fade", strength: 1, zone: "left" },
      { kind: "mist", strength: 0.72, zone: "left" },
      { kind: "fade", strength: 1, zone: "bottom" },
      { kind: "mist", strength: 0.72, zone: "bottom" },
      { kind: "blur", strength: 18, zone: "full-frame" },
      { kind: "opacity", strength: 0.6, zone: "full-frame" }
    ]
  );
  assert.equal(resolved.usesCanonicalLayers, false);
  assert.equal(resolved.usesLegacyFields, true);
});

test("shared media effect resolver drops unsupported canonical layers instead of guessing page-local strings", () => {
  const resolved = resolveDisplayPageMediaEffects(
    {
      layers: [
        { coverage: 0.44, kind: "fade", strength: 1, zone: "all-edges" },
        { kind: "opacity", strength: 0.82, zone: "full-frame" },
        { kind: "mist", strength: 0.72, zone: "full-frame" }
      ]
    },
    {
      support: {
        fade: {
          zones: ["all-edges"]
        },
        opacity: {
          zones: ["full-frame"]
        }
      }
    }
  );

  assert.deepEqual(
    resolved.layers.map((layer) => ({
      kind: layer.kind,
      zone: layer.zone
    })),
    [
      { kind: "fade", zone: "all-edges" },
      { kind: "opacity", zone: "full-frame" }
    ]
  );
});

test("shared media effect resolver supports full-frame tone saturation and contrast", () => {
  const resolved = resolveDisplayPageMediaEffects(
    {
      layers: [
        { contrast: 1.08, kind: "tone", saturation: 1.18, zone: "full-frame" },
        { contrast: 2.4, kind: "tone", saturation: -1, zone: "full-frame" }
      ]
    },
    {
      support: composableSupport
    }
  );

  assert.deepEqual(
    resolved.layers.map((layer) => ({
      contrast: "contrast" in layer ? layer.contrast : null,
      kind: layer.kind,
      saturation: "saturation" in layer ? layer.saturation : null,
      zone: layer.zone
    })),
    [
      { contrast: 1.08, kind: "tone", saturation: 1.18, zone: "full-frame" },
      { contrast: 2, kind: "tone", saturation: 0, zone: "full-frame" }
    ]
  );
});
