import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { createDisplayPageMediaEffects } from "@solar-display/shared";
import { buildDisplayPageMediaPresentation, buildDisplayPageMediaStyle } from "./displayPageMediaStyle";
import {
  imagesMainStageMediaEffectResolverOptions,
  overviewHeroMediaEffectResolverOptions,
  solarHeroMediaEffectResolverOptions,
  sustainabilityHeroMediaEffectResolverOptions
} from "./shared/displayPageMediaEffectConfig";

const overviewSource = readFileSync(path.join(import.meta.dirname, "Overview", "index.tsx"), "utf8");
const imagesSource = readFileSync(path.join(import.meta.dirname, "Images", "index.tsx"), "utf8");
const solarSource = readFileSync(path.join(import.meta.dirname, "Solar", "index.tsx"), "utf8");
const sustainabilitySource = readFileSync(path.join(import.meta.dirname, "Sustainability", "index.tsx"), "utf8");

test("display page media style uses align anchors for contain mode", () => {
  const style = buildDisplayPageMediaStyle({
    alignX: 0.2,
    alignY: 0.75,
    fitMode: "contain",
    src: "/overview-placement.png"
  });

  assert.deepEqual(style, {
    objectFit: "contain",
    objectPosition: "20% 75%"
  });
});

test("display page media style uses focus anchors for cover mode", () => {
  const style = buildDisplayPageMediaStyle({
    fitMode: "cover",
    focusX: 0.3,
    focusY: 0.6,
    src: "/images-placement.png"
  });

  assert.deepEqual(style, {
    objectFit: "cover",
    objectPosition: "30% 60%"
  });
});

test("display page media presentation clamps canonical full-frame and localized layers into bounded overlay output", () => {
  const presentation = buildDisplayPageMediaPresentation(
    {
      effects: {
        layers: [
          { kind: "blur", strength: 40, zone: "full-frame" },
          { kind: "opacity", strength: 1.4, zone: "full-frame" },
          { kind: "mist", blur: 40, coverage: 0, strength: 1.4, zone: "top" }
        ]
      },
      fitMode: "cover",
      focusX: 0.3,
      focusY: 0.6,
      src: "/overview-effects.png"
    },
    overviewHeroMediaEffectResolverOptions
  );

  assert.deepEqual(
    presentation.overlayLayers.map((layer) => ({
      className: layer.className,
      kind: layer.kind,
      style: layer.style,
      zone: layer.zone
    })),
    [
      {
        className: "display-surface-media-overlay display-surface-media-overlay--mist display-surface-media-overlay--top",
        kind: "mist",
        style: {
          "--display-photo-effect-blur": "24px",
          "--display-photo-effect-coverage": "5%",
          "--display-photo-effect-feather": "58%",
          "--display-photo-effect-strength": "100%"
        },
        zone: "top"
      }
    ]
  );
  assert.deepEqual(presentation.mediaStyle, {
    filter: "blur(24px)",
    objectFit: "cover",
    objectPosition: "30% 60%",
    opacity: 1
  });
});

test("display page media presentation preserves same-zone stacking order for localized effects", () => {
  const presentation = buildDisplayPageMediaPresentation(
    {
      effects: {
        layers: [
          { coverage: 0.42, kind: "fade", strength: 1, zone: "left" },
          { coverage: 0.42, feather: 0.36, kind: "blur", strength: 14, zone: "left" }
        ]
      },
      src: "/overview-mist.png"
    },
    overviewHeroMediaEffectResolverOptions
  );

  assert.deepEqual(
    presentation.overlayLayers.map((layer) => ({
      kind: layer.kind,
      zone: layer.zone
    })),
    [
      { kind: "fade", zone: "left" },
      { kind: "blur", zone: "left" }
    ]
  );
  assert.deepEqual(presentation.mediaStyle, {
    objectFit: "cover",
    objectPosition: "50% 50%"
  });
});

test("display page media presentation expands all-edge layers into bounded per-edge overlays", () => {
  const presentation = buildDisplayPageMediaPresentation(
    {
      effects: {
        layers: [
          { coverage: 0.4, kind: "fade", strength: 1, zone: "all-edges" }
        ]
      },
      src: "/all-edges-effects.png"
    },
    overviewHeroMediaEffectResolverOptions
  );

  assert.deepEqual(
    presentation.overlayLayers.map((layer) => layer.zone),
    ["top", "right", "bottom", "left"]
  );
});

test("display page media presentation drops unsupported canonical layers without hiding the media", () => {
  const presentation = buildDisplayPageMediaPresentation(
    {
      effects: {
        layers: [
          { kind: "mist", strength: 0.72, zone: "left" },
          { kind: "opacity", strength: 0.82, zone: "full-frame" }
        ]
      },
      src: "/unsupported-effects.png"
    },
    {
      defaults: createDisplayPageMediaEffects(),
      support: {
        opacity: {
          zones: ["full-frame"]
        }
      }
    }
  );

  assert.deepEqual(presentation.overlayLayers, []);
  assert.deepEqual(presentation.mediaStyle, {
    objectFit: "cover",
    objectPosition: "50% 50%",
    opacity: 0.82
  });
});

test("display page media presentation composes tone filters with blur and opacity", () => {
  const presentation = buildDisplayPageMediaPresentation(
    {
      effects: {
        layers: [
          { kind: "blur", strength: 8, zone: "full-frame" },
          { contrast: 1.08, kind: "tone", saturation: 1.18, zone: "full-frame" },
          { kind: "opacity", strength: 0.82, zone: "full-frame" }
        ]
      },
      fitMode: "cover",
      src: "/tone-effects.png"
    },
    overviewHeroMediaEffectResolverOptions
  );

  assert.deepEqual(presentation.mediaStyle, {
    filter: "blur(8px) saturate(1.18) contrast(1.08)",
    objectFit: "cover",
    objectPosition: "50% 50%",
    opacity: 0.82
  });
});

test("playback runtime wires shared media presentation into supported media treatment surfaces", () => {
  assert.match(
    overviewSource,
    /buildDisplayPageMediaPresentation\(\s*resolvedConfig\.heroMedia,\s*overviewHeroMediaEffectResolverOptions\s*\)/
  );
  assert.match(
    imagesSource,
    /buildDisplayPageMediaPresentation\(\s*resolvedConfig\.mainStage,\s*imagesMainStageMediaEffectResolverOptions\s*\)/
  );
  assert.match(
    solarSource,
    /buildDisplayPageMediaPresentation\(\s*resolvedConfig\.heroMedia,\s*solarHeroMediaEffectResolverOptions\s*\)/
  );
  assert.match(
    sustainabilitySource,
    /buildDisplayPageMediaPresentation\(\s*resolvedConfig\.heroMedia,\s*sustainabilityHeroMediaEffectResolverOptions\s*\)/
  );
});

test("new playback media treatment defaults resolve without mutating source placement fields", () => {
  const solarPresentation = buildDisplayPageMediaPresentation(
    {
      alignX: 0.4,
      alignY: 0.45,
      effects: undefined,
      fitMode: "cover",
      focusX: 0.46,
      focusY: 0.51,
      src: "/solar-hero.png"
    },
    solarHeroMediaEffectResolverOptions
  );
  const sustainabilityPresentation = buildDisplayPageMediaPresentation(
    {
      alignX: 0.5,
      alignY: 0.48,
      effects: undefined,
      fitMode: "cover",
      focusX: 0.5,
      focusY: 0.48,
      src: "/sustainability-hero.png"
    },
    sustainabilityHeroMediaEffectResolverOptions
  );

  assert.equal(solarPresentation.mediaStyle.objectPosition, "46% 51%");
  assert.equal(sustainabilityPresentation.mediaStyle.objectPosition, "50% 48%");
  assert.equal(solarPresentation.overlayLayers.length > 0, true);
  assert.equal(sustainabilityPresentation.overlayLayers.length > 0, true);
});
