import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  createGoldLineChromeConfig,
  createHeroTypographyConfig,
  createLeafOrnamentChromeConfig
} from "./displayPageChromeConfig";

const sharedDir = path.resolve(import.meta.dirname);
const displaySurfaceChromeCss = fs.readFileSync(path.join(sharedDir, "displaySurfaceChrome.css"), "utf8");

test("shared display chrome css exposes hero typography, composable media overlays, and ornament primitives", () => {
  assert.match(displaySurfaceChromeCss, /\.display-surface-hero-eyebrow\s*\{/);
  assert.match(displaySurfaceChromeCss, /\.display-surface-hero-title\s*\{/);
  assert.match(displaySurfaceChromeCss, /\.display-surface-hero-title-emphasis\s*\{/);
  assert.match(displaySurfaceChromeCss, /\.display-surface-hero-subtitle\s*\{/);
  assert.match(displaySurfaceChromeCss, /\.display-surface-media-stage\s*\{/);
  assert.match(displaySurfaceChromeCss, /\.display-surface-media-overlay\s*\{/);
  assert.match(displaySurfaceChromeCss, /\.display-surface-media-overlay--fade/);
  assert.match(displaySurfaceChromeCss, /\.display-surface-media-overlay--mist/);
  assert.match(displaySurfaceChromeCss, /\.display-surface-media-overlay--blur/);
  assert.match(displaySurfaceChromeCss, /\.display-surface-media-overlay--top/);
  assert.match(displaySurfaceChromeCss, /\.display-surface-media-overlay--left/);
  assert.match(displaySurfaceChromeCss, /\.display-surface-media-overlay--bottom/);
  assert.match(displaySurfaceChromeCss, /\.display-surface-media-overlay--right/);
  assert.match(displaySurfaceChromeCss, /backdrop-filter:\s*blur\(var\(--display-photo-effect-blur, 16px\)\)/);
  assert.match(displaySurfaceChromeCss, /\.display-surface-leaf-ornament\s*\{/);
  assert.match(displaySurfaceChromeCss, /\.display-surface-gold-line\s*\{/);
  assert.match(displaySurfaceChromeCss, /\.display-surface-gold-ornament::before\s*\{/);
  assert.match(displaySurfaceChromeCss, /\.display-surface-gold-ornament::after\s*\{/);
});

test("shared media effect stages keep mist layers bounded inside the owning media layer", () => {
  assert.match(displaySurfaceChromeCss, /\.display-surface-media-stage\s*\{[\s\S]*?overflow:\s*hidden;/);
  assert.match(displaySurfaceChromeCss, /\.display-surface-media-stage\s*\{[\s\S]*?isolation:\s*isolate;/);
  assert.doesNotMatch(displaySurfaceChromeCss, /\.display-surface-media-overlay[^{]+\{[\s\S]*?position:\s*fixed;/);
});

test("shared display chrome config defaults preserve the prototype rhythm and ornament controls", () => {
  assert.deepEqual(createHeroTypographyConfig(), {
    eyebrowFontSize: 24,
    eyebrowLetterSpacing: 9,
    eyebrowMarginBottom: 18,
    subtitleFontSize: 26,
    subtitleLineHeight: 1.4,
    subtitleMarginTop: 20,
    titleEmphasisWeight: 800,
    titleFontSize: 80,
    titleLetterSpacing: 6,
    titleLineHeight: 1.15
  });
  assert.deepEqual(createGoldLineChromeConfig(), {
    offsetY: 0,
    opacity: 0.82,
    thickness: 1
  });
  assert.deepEqual(createLeafOrnamentChromeConfig(), {
    offsetX: 0,
    offsetY: 0,
    opacity: 0.42,
    scale: 1,
    source: {
      mode: "builtin",
      ornamentKey: "leaf"
    }
  });
});

test("playback pages wire shared display chrome classes into hero, media, and ornament regions", () => {
  const pages = [
    {
      expected: [
        "display-surface-hero-eyebrow",
        "display-surface-hero-title",
        "display-surface-hero-subtitle",
        "display-surface-media-stage",
        "display-surface-leaf-ornament",
        "display-surface-gold-line",
        /buildDisplayPageMediaPresentation/,
        /overviewHeroMediaEffectResolverOptions/
      ],
      file: path.resolve(sharedDir, "../Overview/index.tsx")
    },
    {
      expected: [
        "display-surface-hero-eyebrow",
        "display-surface-hero-title",
        "display-surface-hero-title-emphasis",
        "display-surface-hero-subtitle",
        "display-surface-media-stage",
        "display-surface-leaf-ornament",
        "display-surface-gold-line"
      ],
      file: path.resolve(sharedDir, "../Solar/index.tsx")
    },
    {
      expected: [
        "display-surface-hero-eyebrow",
        "display-surface-hero-title",
        "display-surface-hero-subtitle",
        "display-surface-leaf-ornament",
        "display-surface-gold-line"
      ],
      file: path.resolve(sharedDir, "../FactoryCircuit/index.tsx")
    },
    {
      expected: [
        "display-surface-hero-eyebrow",
        "display-surface-hero-title",
        "display-surface-hero-title-emphasis",
        "display-surface-hero-subtitle",
        "display-surface-media-stage",
        "display-surface-gold-ornament",
        /buildDisplayPageMediaPresentation/,
        /imagesMainStageMediaEffectResolverOptions/
      ],
      file: path.resolve(sharedDir, "../Images/index.tsx")
    },
    {
      expected: [
        "display-surface-hero-eyebrow",
        "display-surface-hero-title",
        "display-surface-hero-title-emphasis",
        "display-surface-hero-subtitle",
        "display-surface-media-stage",
        "display-surface-leaf-ornament"
      ],
      file: path.resolve(sharedDir, "../Sustainability/index.tsx")
    }
  ];

  pages.forEach(({ expected, file }) => {
    const source = fs.readFileSync(file, "utf8");

    expected.forEach((pattern) => {
      assert.match(
        source,
        typeof pattern === "string" ? new RegExp(pattern.replaceAll("-", "\\-")) : pattern
      );
    });
  });
});
