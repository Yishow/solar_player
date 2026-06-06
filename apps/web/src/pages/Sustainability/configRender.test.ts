import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import type { DisplayPageHouseholdEquivalentCard } from "@solar-display/shared";
import { createSustainabilityDisplayPageSeedConfig, sustainabilityDisplayPageEditorRegions } from "./displayPageConfig";
import { resolveHouseholdEquivalentRuntimePayload } from "./householdEquivalentRuntime";
import { buildSustainabilityViewModel } from "./viewModel";

const sustainabilitySource = readFileSync(path.join(import.meta.dirname, "index.tsx"), "utf8");

test("sustainability runtime reads resolved display config for hero, hero media, highlight rail, and bottom cards", () => {
  assert.match(sustainabilitySource, /resolvedConfig\.hero\.eyebrow/);
  assert.match(sustainabilitySource, /resolvedConfig\.hero\.title\[0\]/);
  assert.match(sustainabilitySource, /resolvedConfig\.hero\.copyZhLines/);
  assert.match(sustainabilitySource, /resolvedConfig\.chrome\.heroTypography\.eyebrowFontSize/);
  assert.match(sustainabilitySource, /resolvedConfig\.chrome\.heroTypography\.titleFontSize/);
  assert.match(sustainabilitySource, /resolvedConfig\.chrome\.heroTypography\.subtitleFontSize/);
  assert.match(sustainabilitySource, /buildCopyTypographyStyleVars\(resolvedConfig\.chrome\.copyTypography\)/);
  assert.match(sustainabilitySource, /buildDisplayGreenPaletteStyleVars\(resolvedConfig\.chrome\.palette\)/);
  assert.match(sustainabilitySource, /\.\.\.seedConfig\.chrome\.copyTypography/);
  assert.match(sustainabilitySource, /\.\.\.seedConfig\.chrome\.ornaments\.leaf/);
  assert.match(sustainabilitySource, /\.\.\.seedConfig\.chrome\.palette/);
  assert.match(sustainabilitySource, /resolvedConfig\.chrome\.ornaments\.leaf\.opacity/);
  assert.match(sustainabilitySource, /--display-leaf-rotation/);
  assert.match(sustainabilitySource, /resolvedConfig\.chrome\.ornaments\.leaf\.rotationDeg/);
  assert.match(sustainabilitySource, /ringOrnament = resolvedConfig\.chrome\.ornaments\.ring/);
  assert.match(sustainabilitySource, /ringOrnament\.overlap/);
  assert.match(sustainabilitySource, /ringOrnament\.glowOpacity/);
  assert.match(sustainabilitySource, /resolvedConfig\.chrome\.modules\.periodChips\.chipGap/);
  assert.match(sustainabilitySource, /resolvedConfig\.chrome\.modules\.periodChips\.fontSize/);
  assert.match(sustainabilitySource, /shouldRenderPeriodChips/);
  assert.match(sustainabilitySource, /viewModel\.periodOptions\.length > 1/);
  assert.match(sustainabilitySource, /resolveDisplayPageMediaSource\(resolvedConfig\.heroMedia, seedConfig\.heroMedia\.src\)/);
  assert.match(
    sustainabilitySource,
    /buildDisplayPageMediaPresentation\(\s*resolvedConfig\.heroMedia,\s*sustainabilityHeroMediaEffectResolverOptions\s*\)/
  );
  assert.match(sustainabilitySource, /resolvedConfig\.highlightRail\.cards/);
  assert.match(sustainabilitySource, /resolvedConfig\.highlightRail\.container/);
  assert.match(sustainabilitySource, /resolvedConfig\.rhythm\.highlightRail/);
  assert.match(sustainabilitySource, /buildSustainabilityHighlightRhythmStyle/);
  assert.match(sustainabilitySource, /shouldRenderHighlightRail/);
  assert.match(sustainabilitySource, /resolveDisplayPageCardRailCards/);
  assert.match(sustainabilitySource, /householdEquivalents/);
  assert.match(sustainabilitySource, /resolvedConfig\.kpiCards\[/);
  assert.match(sustainabilitySource, /resolvedConfig\.statCards\[/);
  assert.match(sustainabilitySource, /resolvedConfig\.cardStyles\[/);
  assert.match(sustainabilitySource, /DisplayCardFrame/);
  assert.match(sustainabilitySource, /DisplayCardValueRow/);
  assert.doesNotMatch(sustainabilitySource, /highlightRail\.items/);
  assert.doesNotMatch(sustainabilitySource, /資料來源：/);
  assert.doesNotMatch(sustainabilitySource, /同步狀態：/);
  assert.doesNotMatch(sustainabilitySource, /sourceClass/);
});

test("sustainability display page seed config captures the current hero and highlight rail contract", () => {
  const config = createSustainabilityDisplayPageSeedConfig("/sustainability-hero.jpg");

  assert.equal(config.hero.eyebrow, "綠能驅動・永續未來");
  assert.deepEqual(config.hero.title, ["永續成果", "持續累積"]);
  assert.equal(config.heroMedia.src, "/sustainability-hero.jpg");
  assert.equal(config.heroMedia.sourceMode, "seed-default");
  assert.equal(config.chrome.ornaments.ring.overlap, 118);
  assert.equal(config.chrome.ornaments.ring.opacity, 0.34);
  assert.equal(config.chrome.ornaments.leaf.rotationDeg, -28);
  assert.equal(config.chrome.copyTypography.fontSize, 17);
  assert.equal(config.chrome.copyTypography.secondaryFontSize, 14);
  assert.equal(config.chrome.copyTypography.secondaryLineHeight, 1.82);
  assert.equal(config.chrome.palette.valueColor, "#57774a");
  assert.equal(config.chrome.palette.iconColor, "#6a8a50");
  assert.equal(config.highlightRail.container.width, 470);
  assert.equal((config as any).rhythm?.highlightRail?.valueFontSize, 30);
  assert.equal((config as any).rhythm?.highlightRail?.cardPaddingX, 16);
  assert.equal(config.highlightRail.cards.length, 2);
  assert.equal(config.highlightRail.cards[0]?.template, "household-equivalent");
  assert.equal(config.highlightRail.cards[0]?.contentSource.mode, "static");
  assert.equal(
    config.highlightRail.cards[0]?.template === "household-equivalent"
      ? config.highlightRail.cards[0].contentSource.payload.householdLabel
      : null,
    "戶4口之家"
  );
  assert.equal(config.kpiCards.totalGeneration.width, 304);
  assert.equal(config.statCards.procure.left, 970);
});

test("sustainability editor exposes copy typography palette and leaf rotation fields", () => {
  const heroRegion = sustainabilityDisplayPageEditorRegions.find((region) => region.id === "sustainability-hero-copy");
  const leafRegion = sustainabilityDisplayPageEditorRegions.find((region) => region.id === "sustainability-ornament-leaf");

  assert.ok(heroRegion);
  assert.ok(leafRegion);
  assert.ok(heroRegion.fields.some((field) => field.id === "sustainability-copy-secondary-font-size"));
  assert.ok(heroRegion.fields.some((field) => field.id === "sustainability-green-value-color"));
  assert.ok(heroRegion.fields.some((field) => field.id === "sustainability-green-icon-color"));
  assert.ok(leafRegion.fields.some((field) => field.id === "sustainability-leaf-rotation"));
});

test("sustainability runtime resolves the shared story adapter and clears back to fallback data on request failure", () => {
  assert.match(sustainabilitySource, /useSustainabilityStoryRuntime\(selectedPeriod/);
  assert.match(sustainabilitySource, /enabled: runtimeHydrationEnabled/);
  assert.match(sustainabilitySource, /story:\s*storyRuntime\.payload \?\? undefined/);
  assert.match(sustainabilitySource, /runtimeErrorMessage: runtimeHydrationEnabled \? storyRuntime\.errorMessage : ""/);
  assert.match(sustainabilitySource, /usesRuntimeFallback: storyRuntime\.usesFallback/);
});

test("sustainability runtime resolves duplicated household cards by basis metadata instead of exact ids", () => {
  const config = createSustainabilityDisplayPageSeedConfig("/sustainability-hero.jpg");
  const duplicatedCard = structuredClone(
    config.highlightRail.cards[1]
  ) as DisplayPageHouseholdEquivalentCard;
  const viewModel = buildSustainabilityViewModel({
    selectedPeriod: "lifetime",
    story: {
      availablePeriods: ["lifetime"],
      householdEquivalents: {
        cumulative: {
          basisSourceLabel: "累積自發自用量",
          calcProfile: {
            id: "default-four-person",
            label: "預設四口之家"
          },
          derivedStatus: "available",
          disclaimer: "依四口之家平均用電與估算電價換算",
          eyebrow: "累積綠能成果",
          householdCountDisplay: "35",
          householdLabel: "戶4口之家",
          provenance: {
            label: "累積自發自用量",
            source: "cumulative-self-consumption",
            sourceClass: "derived-metric",
            syncState: "fresh",
            updatedAt: "2026-05-21T10:00:00.000Z"
          },
          supportingLine: "約相當於一個月電費"
        },
        today: {
          basisSourceLabel: "今日自發自用量",
          calcProfile: {
            id: "default-four-person",
            label: "預設四口之家"
          },
          derivedStatus: "available",
          disclaimer: "依四口之家平均用電與估算電價換算",
          eyebrow: "今日綠電效益",
          householdCountDisplay: "18",
          householdLabel: "戶4口之家",
          provenance: {
            label: "今日自發自用量",
            source: "daily-self-consumption",
            sourceClass: "derived-metric",
            syncState: "fresh",
            updatedAt: "2026-05-21T10:00:00.000Z"
          },
          supportingLine: "約可折抵一日電費"
        }
      },
      modules: [],
      periods: {
        lifetime: {
          bigNumbers: {
            accumulatedCarbonReductionTons: null,
            accumulatedGenerationGwh: null,
            annualEnergySavingPercent: null,
            plantedTreeEquivalent: null
          },
          comparison: {
            delta: null,
            fallbackReason: "comparison-baseline-missing",
            label: "缺少比較基準",
            state: "unavailable"
          },
          highlights: [],
          provenance: {
            label: "累積資料",
            source: "aggregate-missing",
            sourceClass: "missing",
            syncState: "missing",
            updatedAt: null
          }
        }
      },
      selectedPeriod: "lifetime"
    }
  });

  duplicatedCard.id = "household-cumulative-copy-1";

  const resolved = resolveHouseholdEquivalentRuntimePayload(
    duplicatedCard,
    viewModel.householdEquivalents
  );

  assert.equal(resolved.householdCountDisplay, "35");
  assert.equal(resolved.provenance.source, "cumulative-self-consumption");
});
