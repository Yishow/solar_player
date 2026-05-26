import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { createDisplayPageMediaEffects } from "@solar-display/shared";
import {
  buildDisplayPageMediaPresentation,
  buildDisplayPageMediaStyle
} from "./displayPageMediaStyle";
import {
  imagesMainStageMediaEffectResolverOptions,
  overviewHeroMediaEffectResolverOptions
} from "./shared/displayPageMediaEffectConfig";

const overviewSource = readFileSync(path.join(import.meta.dirname, "Overview", "index.tsx"), "utf8");
const imagesSource = readFileSync(path.join(import.meta.dirname, "Images", "index.tsx"), "utf8");

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

test("display page media presentation clamps supported effect settings into shared classes and safe values", () => {
  const presentation = buildDisplayPageMediaPresentation(
    {
      effects: {
        blur: {
          amount: 40,
          enabled: true
        },
        bottomFade: {
          enabled: true,
          height: 0
        },
        edgeFade: {
          direction: "left",
          enabled: true,
          width: 1.4
        },
        opacity: {
          enabled: true,
          value: 1.4
        }
      },
      fitMode: "cover",
      focusX: 0.3,
      focusY: 0.6,
      src: "/overview-effects.png"
    },
    overviewHeroMediaEffectResolverOptions
  );

  assert.equal(
    presentation.stageClassName,
    "display-surface-media-fade-left display-surface-media-mist-left display-surface-media-fade-bottom display-surface-media-mist-bottom"
  );
  assert.deepEqual(presentation.stageStyle, {
    "--display-photo-fade-bottom-height": "5%",
    "--display-photo-fade-edge-width": "100%",
    "--display-photo-mist-blur": "24px",
    "--display-photo-mist-bottom-height": "5%",
    "--display-photo-mist-edge-width": "100%",
    "--display-photo-mist-opacity": "0.72"
  });
  assert.deepEqual(presentation.mediaStyle, {
    filter: "blur(24px)",
    objectFit: "cover",
    objectPosition: "30% 60%",
    opacity: 1
  });
});

test("display page media presentation derives localized mist from edge and bottom fade controls", () => {
  const presentation = buildDisplayPageMediaPresentation(
    {
      effects: {
        bottomFade: {
          enabled: true,
          height: 0.32
        },
        edgeFade: {
          direction: "right",
          enabled: true,
          width: 0.42
        }
      },
      src: "/overview-mist.png"
    },
    overviewHeroMediaEffectResolverOptions
  );

  assert.equal(
    presentation.stageClassName,
    "display-surface-media-fade-right display-surface-media-mist-right display-surface-media-fade-bottom display-surface-media-mist-bottom"
  );
  assert.deepEqual(presentation.stageStyle, {
    "--display-photo-fade-bottom-height": "32%",
    "--display-photo-fade-edge-width": "42%",
    "--display-photo-mist-blur": "16px",
    "--display-photo-mist-bottom-height": "32%",
    "--display-photo-mist-edge-width": "42%",
    "--display-photo-mist-opacity": "0.72"
  });
  assert.deepEqual(presentation.mediaStyle, {
    objectFit: "cover",
    objectPosition: "50% 50%"
  });
});

test("display page media presentation drops unsupported effect groups without hiding the media", () => {
  const presentation = buildDisplayPageMediaPresentation(
    {
      effects: {
        blur: {
          amount: 12,
          enabled: true
        },
        edgeFade: {
          direction: "right",
          enabled: true,
          width: 0.4
        }
      },
      src: "/unsupported-effects.png"
    },
    {
      defaults: createDisplayPageMediaEffects(),
      support: {
        blur: false,
        bottomFade: false,
        edgeFade: false,
        opacity: false
      }
    }
  );

  assert.equal(presentation.stageClassName, "");
  assert.deepEqual(presentation.stageStyle, {});
  assert.deepEqual(presentation.mediaStyle, {
    objectFit: "cover",
    objectPosition: "50% 50%"
  });
});

test("overview and images runtime wire shared media presentation into hero and main stage media", () => {
  assert.match(
    overviewSource,
    /buildDisplayPageMediaPresentation\(\s*resolvedConfig\.heroMedia,\s*overviewHeroMediaEffectResolverOptions\s*\)/
  );
  assert.match(
    imagesSource,
    /buildDisplayPageMediaPresentation\(\s*resolvedConfig\.mainStage,\s*imagesMainStageMediaEffectResolverOptions\s*\)/
  );
});
