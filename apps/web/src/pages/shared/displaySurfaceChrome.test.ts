import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  buildCopyTypographyFields,
  buildCopyTypographyStyleVars,
  buildDisplayGreenPaletteFields,
  buildDisplayGreenPaletteStyleVars,
  createCopyTypographyConfig,
  createDisplayGreenPaletteConfig,
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
  assert.match(displaySurfaceChromeCss, /\.display-surface-ring-ornament\s*\{/);
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
    rotationDeg: -30,
    scale: 1,
    source: {
      mode: "builtin",
      ornamentKey: "leaf"
    }
  });
});

test("shared display chrome config exposes copy typography palette and leaf rotation controls", () => {
  assert.deepEqual(createCopyTypographyConfig(), {
    fontSize: 18,
    letterSpacing: 0,
    lineHeight: 1.6,
    secondaryFontSize: 16,
    secondaryLineHeight: 1.55,
    secondaryMarginTop: 16
  });
  assert.deepEqual(
    buildCopyTypographyStyleVars(
      createCopyTypographyConfig({
        fontSize: 24,
        letterSpacing: 0.4,
        lineHeight: 1.72,
        secondaryFontSize: 14,
        secondaryLineHeight: 1.82,
        secondaryMarginTop: 14
      })
    ),
    {
      "--display-copy-font-size": "24px",
      "--display-copy-letter-spacing": "0.4px",
      "--display-copy-line-height": 1.72,
      "--display-copy-secondary-font-size": "14px",
      "--display-copy-secondary-line-height": 1.82,
      "--display-copy-secondary-margin-top": "14px"
    }
  );
  assert.deepEqual(createDisplayGreenPaletteConfig(), {
    accentColor: "#5b8046",
    iconColor: "#6a8a50",
    valueColor: "#57774a"
  });
  assert.deepEqual(
    buildDisplayGreenPaletteStyleVars(
      createDisplayGreenPaletteConfig({
        accentColor: "not-a-color",
        iconColor: "#123456",
        valueColor: "rgb(10, 20, 30)"
      })
    ),
    {
      "--display-green-accent-color": "#5b8046",
      "--display-green-icon-color": "#123456",
      "--display-green-value-color": "rgb(10, 20, 30)"
    }
  );
  assert.deepEqual(
    buildCopyTypographyFields({ idPrefix: "copy", path: ["chrome", "copyTypography"] }).map((field) => field.id),
    [
      "copy-copy-font-size",
      "copy-copy-line-height",
      "copy-copy-letter-spacing",
      "copy-copy-secondary-font-size",
      "copy-copy-secondary-line-height",
      "copy-copy-secondary-margin-top"
    ]
  );
  assert.deepEqual(
    buildDisplayGreenPaletteFields({ idPrefix: "sustainability", path: ["chrome", "palette"] }).map((field) => field.id),
    [
      "sustainability-green-value-color",
      "sustainability-green-icon-color",
      "sustainability-green-accent-color"
    ]
  );
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
        "display-surface-gold-line",
        /buildDisplayPageMediaPresentation/,
        /solarHeroMediaEffectResolverOptions/
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
        "display-surface-leaf-ornament",
        "display-surface-ring-ornament",
        /sustainabilityHeroMediaEffectResolverOptions/
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
