import type { DisplayPageFreeformObject, SustainabilityPeriodKey } from "@solar-display/shared";
import {
  type DisplayPageHouseholdEquivalentCard,
  type DisplayPageHouseholdEquivalentCardPayload,
  resolveDisplayPageMediaSource,
  type DisplayPageMetricHighlightCard,
  type DisplayPageMetricHighlightCardPayload
} from "@solar-display/shared";
import type { CSSProperties } from "react";
import { useMemo, useState } from "react";
import { DisplayPageObjectLayer } from "../../components/DisplayPageObjectLayer";
import { renderDisplayPageIcon } from "../../components/displayPageIconResolver";
import { Sparkline } from "../../components/Sparkline";
import {
  DisplayCardFooter,
  DisplayCardFrame,
  DisplayCardHeader,
  DisplayCardValueRow
} from "../../components/displayPageCards";
import { DisplayPageLoadingState } from "../../components/DisplayPageLoadingState";
import { useBodyClass } from "../../hooks/useBodyClass";
import {
  shouldDeferDisplayPageRuntimeRender,
  useDisplayPageConfig
} from "../../hooks/useDisplayPageConfig";
import { useSustainabilityStoryRuntime } from "../../hooks/useSustainabilityStoryRuntime";
import { trendSeries } from "../../mocks/metrics";
import { buildDisplayPageMediaPresentation } from "../displayPageMediaStyle";
import { createDisplayCardStyleConfig } from "../shared/displayCardStyleConfig";
import {
  buildCopyTypographyStyleVars,
  buildDisplayGreenPaletteStyleVars,
  createCopyTypographyConfig,
  createDisplayGreenPaletteConfig,
  createLeafOrnamentChromeConfig,
  createRingOrnamentChromeConfig
} from "../shared/displayPageChromeConfig";
import {
  buildSustainabilityHighlightRhythmStyle,
  resolveSustainabilityHighlightRhythmConfig
} from "../shared/displayPageFhdRhythmConfig";
import { sustainabilityHeroMediaEffectResolverOptions } from "../shared/displayPageMediaEffectConfig";
import { DisplayLeafOrnament } from "../shared/DisplayLeafOrnament";
import {
  resolveRuntimeFallbackBannerState,
  RuntimeConfigFallbackBanner
} from "../runtimeConfigHydration";
import { resolveDisplayPageCardRailCards } from "../shared/displayPageCardRailRenderer";
import {
  createSustainabilityDisplayPageSeedConfig,
  type SustainabilityDisplayPageConfig
} from "./displayPageConfig";
import { resolveHouseholdEquivalentRuntimePayload } from "./householdEquivalentRuntime";
import {
  sustainabilityAssetMap,
  sustainabilityContentTopOffset,
  sustainabilityCopyLayout,
  sustainabilityKpiLayout,
  sustainabilityStatLayout,
  sustainabilityTitleLayout
} from "./layout";
import "../../components/displayPageCards.css";
import "./sustainability.css";
import { buildSustainabilityViewModel } from "./viewModel";
import { SustainabilityGlyph } from "./iconRegistry";

const CONTENT_TOP_OFFSET = sustainabilityContentTopOffset;

function withContentOffset<T extends { top: number }>(layout: T) {
  return {
    ...layout,
    top: layout.top - CONTENT_TOP_OFFSET
  };
}

function periodLabel(period: SustainabilityPeriodKey) {
  switch (period) {
    case "month":
      return "月";
    case "quarter":
      return "季";
    case "year":
      return "年";
    default:
      return "累積";
  }
}

const sustainabilityKpiOrder = [
  "totalGeneration",
  "totalCo2",
  "annualSaving"
] as const;

const sustainabilityStatOrder = ["procure", "esg", "trees"] as const;

type ResolvedHighlightCard =
  | {
      frame: DisplayPageMetricHighlightCard["frame"];
      id: string;
      kind: "metric-highlight";
      payload: DisplayPageMetricHighlightCardPayload;
    }
  | {
      frame: DisplayPageHouseholdEquivalentCard["frame"];
      id: string;
      kind: "household-equivalent";
      payload: DisplayPageHouseholdEquivalentCardPayload;
    };

export function Sustainability({
  config,
  pageId = "sustainability"
}: {
  config?: SustainabilityDisplayPageConfig;
  pageId?: string;
}) {
  useBodyClass("page-hero-shell");
  const runtimeHydrationEnabled = config === undefined;
  const runtimeStage = "live" as const;
  const seedConfig = useMemo(
    () => createSustainabilityDisplayPageSeedConfig(sustainabilityAssetMap.hero.src),
    []
  );
  const runtimeConfig = useDisplayPageConfig(pageId, seedConfig, {
    enabled: runtimeHydrationEnabled,
    stage: runtimeStage
  });
  const [selectedPeriod, setSelectedPeriod] = useState<SustainabilityPeriodKey>("lifetime");
  const storyRuntime = useSustainabilityStoryRuntime(selectedPeriod, {
    enabled: runtimeHydrationEnabled
  });

  if (
    shouldDeferDisplayPageRuntimeRender({
      runtimeHydrationEnabled,
      isLoading: runtimeConfig.isLoading,
      lastLoadedEnvelope: runtimeConfig.lastLoadedEnvelope,
      stage: runtimeStage
    })
  ) {
    return <DisplayPageLoadingState />;
  }

  const runtimeResolvedConfig = config ?? runtimeConfig.config;
  const runtimeChrome = runtimeResolvedConfig.chrome ?? seedConfig.chrome;
  const runtimeOrnaments = runtimeChrome.ornaments ?? seedConfig.chrome.ornaments;
  const resolvedConfig: SustainabilityDisplayPageConfig = {
    ...runtimeResolvedConfig,
    chrome: {
      ...seedConfig.chrome,
      ...runtimeChrome,
      copyTypography: createCopyTypographyConfig({
        ...seedConfig.chrome.copyTypography,
        ...(runtimeChrome.copyTypography ?? {})
      }),
      modules: {
        ...seedConfig.chrome.modules,
        ...(runtimeChrome.modules ?? {})
      },
      ornaments: {
        ...seedConfig.chrome.ornaments,
        ...runtimeOrnaments,
        leaf: createLeafOrnamentChromeConfig({
          ...seedConfig.chrome.ornaments.leaf,
          ...(runtimeOrnaments.leaf ?? {})
        }),
        ring: createRingOrnamentChromeConfig({
          ...seedConfig.chrome.ornaments.ring,
          ...(runtimeOrnaments.ring ?? {})
        })
      },
      palette: createDisplayGreenPaletteConfig({
        ...seedConfig.chrome.palette,
        ...(runtimeChrome.palette ?? {})
      })
    },
    rhythm: {
      ...seedConfig.rhythm,
      ...(runtimeResolvedConfig.rhythm ?? {})
    }
  };
  const viewModel = useMemo(
    () =>
      buildSustainabilityViewModel({
        selectedPeriod,
        story: storyRuntime.payload ?? undefined
      }),
    [selectedPeriod, storyRuntime.payload]
  );
  const runtimeFallbackBanner = resolveRuntimeFallbackBannerState({
    configErrorMessage: runtimeHydrationEnabled ? runtimeConfig.errorMessage : "",
    runtimeErrorMessage: runtimeHydrationEnabled ? storyRuntime.errorMessage : "",
    usesRuntimeFallback: storyRuntime.usesFallback
  });
  const heroMediaSource = resolveDisplayPageMediaSource(resolvedConfig.heroMedia, seedConfig.heroMedia.src);
  const heroMediaPresentation = buildDisplayPageMediaPresentation(
    resolvedConfig.heroMedia,
    sustainabilityHeroMediaEffectResolverOptions
  );
  const ringOrnament = resolvedConfig.chrome.ornaments.ring;
  const heroTypography = resolvedConfig.chrome.heroTypography;
  const copyTypographyVars = buildCopyTypographyStyleVars(resolvedConfig.chrome.copyTypography);
  const paletteVars = buildDisplayGreenPaletteStyleVars(resolvedConfig.chrome.palette);
  const freeformObjects =
    (resolvedConfig as typeof resolvedConfig & { freeformObjects?: DisplayPageFreeformObject[] }).freeformObjects ?? [];
  const periodBoundContent = useMemo(() => {
    const metricHighlightCards = resolvedConfig.highlightRail.cards.filter(
      (card): card is DisplayPageMetricHighlightCard => card.template === "metric-highlight"
    );
    const householdCards = resolvedConfig.highlightRail.cards.filter(
      (card): card is DisplayPageHouseholdEquivalentCard => card.template === "household-equivalent"
    );
    const highlightContentByCardId = new Map<string, DisplayPageMetricHighlightCardPayload>();
    const householdContentByCardId = new Map<string, DisplayPageHouseholdEquivalentCardPayload>();
    metricHighlightCards.forEach((card, index) => {
      const runtimeItem = viewModel.highlights[index];
      const fallbackPayload = card.contentSource.payload;

      highlightContentByCardId.set(card.id, {
        label: runtimeItem?.label ?? fallbackPayload.label,
        provenance: runtimeItem?.provenance ?? fallbackPayload.provenance,
        unit: runtimeItem?.unit ?? fallbackPayload.unit,
        value: runtimeItem?.value ?? fallbackPayload.value
      });
    });
    householdCards.forEach((card) => {
      householdContentByCardId.set(
        card.id,
        resolveHouseholdEquivalentRuntimePayload(card, viewModel.householdEquivalents)
      );
    });
    const resolvedHighlightCards = resolveDisplayPageCardRailCards<
      {
        highlightContentByCardId: Map<string, DisplayPageMetricHighlightCardPayload>;
        householdContentByCardId: Map<string, DisplayPageHouseholdEquivalentCardPayload>;
      },
      ResolvedHighlightCard
    >(
      resolvedConfig.highlightRail,
      {
        highlightContentByCardId,
        householdContentByCardId
      },
      {
        "household-equivalent": (card, context) => {
          const payload = context.householdContentByCardId.get(card.id) ?? card.contentSource.payload;

          return {
            frame: card.frame,
            id: card.id,
            kind: "household-equivalent" as const,
            payload
          };
        },
        "metric-highlight": (card, context) => {
          const payload = context.highlightContentByCardId.get(card.id) ?? card.contentSource.payload;

          return {
            frame: card.frame,
            id: card.id,
            kind: "metric-highlight" as const,
            payload
          };
        }
      }
    );

    return {
      resolvedHighlightCards,
      shouldRenderHighlightRail: resolvedHighlightCards.some(
        (card) => card.kind === "metric-highlight" || card.payload.derivedStatus === "available"
      )
    };
  }, [resolvedConfig.highlightRail, viewModel]);

  const titleLayout = withContentOffset(sustainabilityTitleLayout);
  const copyLayout = withContentOffset(sustainabilityCopyLayout);
  const leafLayout = withContentOffset({
    height: resolvedConfig.chrome.ornaments.leaf.baseHeight,
    left: resolvedConfig.chrome.ornaments.leaf.baseLeft,
    top: resolvedConfig.chrome.ornaments.leaf.baseTop,
    width: resolvedConfig.chrome.ornaments.leaf.baseWidth
  });
  const heroLayout = withContentOffset(resolvedConfig.heroMedia);
  const highlightRhythm = resolveSustainabilityHighlightRhythmConfig(
    resolvedConfig.rhythm.highlightRail,
    seedConfig.rhythm.highlightRail
  );
  const ringSize = 286 * ringOrnament.scale;
  const shouldRenderPeriodChips = viewModel.periodOptions.length > 1;

  return (
    <section className="sustainability-display-page" style={paletteVars}>
      <RuntimeConfigFallbackBanner {...runtimeFallbackBanner} />
      <section
        className="sustainability-title display-surface-hero-group"
        style={{
          left: `${titleLayout.left}px`,
          top: `${titleLayout.top}px`,
          width: `${titleLayout.width}px`
        }}
      >
        <p
          className="sustainability-eyebrow display-surface-hero-eyebrow"
          style={{
            fontSize: `${resolvedConfig.chrome.heroTypography.eyebrowFontSize}px`,
            letterSpacing: `${resolvedConfig.chrome.heroTypography.eyebrowLetterSpacing}px`,
            marginBottom: `${resolvedConfig.chrome.heroTypography.eyebrowMarginBottom}px`
          }}
        >
          {resolvedConfig.hero.eyebrow}
        </p>
        <h2
          className="sustainability-display-title display-surface-hero-title"
          style={{
            fontSize: `${resolvedConfig.chrome.heroTypography.titleFontSize}px`,
            letterSpacing: `${resolvedConfig.chrome.heroTypography.titleLetterSpacing}px`,
            lineHeight: resolvedConfig.chrome.heroTypography.titleLineHeight
          }}
        >
          <em
            className="display-surface-hero-title-emphasis"
            style={{ fontWeight: heroTypography.titleEmphasisWeight }}
          >
            {resolvedConfig.hero.title[0]}
          </em>
          <br />
          {resolvedConfig.hero.title[1]}
        </h2>
        <p
          className="sustainability-subtitle display-surface-hero-subtitle"
          style={{
            fontSize: `${resolvedConfig.chrome.heroTypography.subtitleFontSize}px`,
            lineHeight: resolvedConfig.chrome.heroTypography.subtitleLineHeight,
            marginTop: `${resolvedConfig.chrome.heroTypography.subtitleMarginTop}px`
          }}
        >
          {resolvedConfig.hero.subtitle}
        </p>
      </section>

      {shouldRenderPeriodChips ? (
        <section
          style={{
            position: "absolute",
            right: "88px",
            top: `${titleLayout.top}px`,
            zIndex: 14,
            display: "flex"
          }}
        >
          <div style={{ display: "flex", gap: `${resolvedConfig.chrome.modules.periodChips.chipGap}px` }}>
            {viewModel.periodOptions.map((period) => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period)}
                style={{
                  border: "1px solid rgba(91, 128, 70, 0.24)",
                  borderRadius: `${resolvedConfig.chrome.modules.periodChips.radius}px`,
                  background: viewModel.selectedPeriod === period ? resolvedConfig.chrome.palette.accentColor : "rgba(255, 253, 247, 0.92)",
                  color: viewModel.selectedPeriod === period ? "#fffdf8" : resolvedConfig.chrome.palette.valueColor,
                  fontSize: `${resolvedConfig.chrome.modules.periodChips.fontSize}px`,
                  fontWeight: 700,
                  padding: `${resolvedConfig.chrome.modules.periodChips.chipPaddingY}px ${resolvedConfig.chrome.modules.periodChips.chipPaddingX}px`
                }}
              >
                {periodLabel(period)}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <div
        className="sustainability-copy"
        style={{
          ...copyTypographyVars,
          left: `${copyLayout.left}px`,
          top: `${copyLayout.top}px`,
          width: `${copyLayout.width}px`
        }}
      >
        {resolvedConfig.hero.copyZhLines.map((line) => (
          <p key={line} className="sustainability-copy-line">
            {line}
          </p>
        ))}
        <div className="sustainability-copy-en">
          {resolvedConfig.hero.copyEnLines.map((line) => (
            <p key={line} className="sustainability-copy-line">
              {line}
            </p>
          ))}
        </div>
      </div>

      <DisplayLeafOrnament
        className="sustainability-leaf-watermark display-surface-leaf-ornament"
        config={resolvedConfig.chrome.ornaments.leaf}
        style={{
          "--display-leaf-rotation": `${resolvedConfig.chrome.ornaments.leaf.rotationDeg}deg`,
          height: `${leafLayout.height}px`,
          left: `${leafLayout.left + resolvedConfig.chrome.ornaments.leaf.offsetX}px`,
          opacity: resolvedConfig.chrome.ornaments.leaf.opacity,
          top: `${leafLayout.top + resolvedConfig.chrome.ornaments.leaf.offsetY}px`,
          transform: `scale(${resolvedConfig.chrome.ornaments.leaf.scale})`,
          width: `${leafLayout.width}px`
        } as CSSProperties & Record<"--display-leaf-rotation", string>}
      />

      <div
        aria-hidden="true"
        className="sustainability-ring-ornament display-surface-ring-ornament"
        style={{
          "--display-ring-glow-opacity": ringOrnament.glowOpacity,
          "--display-ring-thickness": `${ringOrnament.thickness}px`,
          height: `${ringSize}px`,
          left: `${heroLayout.left - ringSize + ringOrnament.overlap + ringOrnament.offsetX}px`,
          opacity: ringOrnament.opacity,
          top: `${heroLayout.top + 52 + ringOrnament.offsetY}px`,
          width: `${ringSize}px`,
          zIndex: ringOrnament.zIndex
        } as CSSProperties & Record<"--display-ring-glow-opacity" | "--display-ring-thickness", number | string>}
      />

      <figure
        className={`sustainability-hero display-surface-media-stage${heroMediaPresentation.stageClassName ? ` ${heroMediaPresentation.stageClassName}` : ""}`}
        style={{
          height: `${heroLayout.height}px`,
          left: `${heroLayout.left}px`,
          top: `${heroLayout.top}px`,
          width: `${heroLayout.width}px`,
          ...heroMediaPresentation.stageStyle
        }}
      >
        <img
          alt={resolvedConfig.heroMedia.alt}
          src={heroMediaSource ?? undefined}
          style={heroMediaPresentation.mediaStyle}
        />
        {heroMediaPresentation.overlayLayers.map((layer) => (
          <div
            aria-hidden="true"
            className={layer.className}
            key={layer.id}
            style={layer.style}
          />
        ))}
      </figure>

      {periodBoundContent.shouldRenderHighlightRail ? (
        <section
          className="sustainability-highlight-rail"
          style={{
            ...buildSustainabilityHighlightRhythmStyle(highlightRhythm),
            height: `${resolvedConfig.highlightRail.container.height}px`,
            left: `${resolvedConfig.highlightRail.container.left}px`,
            top: `${resolvedConfig.highlightRail.container.top - CONTENT_TOP_OFFSET}px`,
            width: `${resolvedConfig.highlightRail.container.width}px`
          }}
        >
          {periodBoundContent.resolvedHighlightCards.map((card) => (
            <article
              key={card.id}
              className={
                card.kind === "household-equivalent"
                  ? "sustainability-highlight-item sustainability-highlight-item-household"
                  : "sustainability-highlight-item"
              }
              style={{
                height: `${card.frame.height}px`,
                left: `${card.frame.left}px`,
                top: `${card.frame.top}px`,
                width: `${card.frame.width}px`
              }}
            >
              {card.kind === "household-equivalent" ? (
                <>
                  <small className="sustainability-household-eyebrow">{card.payload.eyebrow}</small>
                  <strong>{card.payload.householdCountDisplay}</strong>
                  <span>{card.payload.householdLabel}</span>
                  <small>{card.payload.supportingLine}</small>
                </>
              ) : (
                <>
                  <strong>{card.payload.value}</strong>
                  <span>{card.payload.unit}</span>
                  <small>{card.payload.label}</small>
                </>
              )}
            </article>
          ))}
        </section>
      ) : null}

      {viewModel.bigNumbers.map((item, index) => {
        const cardKey = sustainabilityKpiOrder[index]!;
        const layout = withContentOffset(resolvedConfig.kpiCards[cardKey]);
        const cardStyle = createDisplayCardStyleConfig(resolvedConfig.cardStyles[cardKey]);

        return (
          <DisplayCardFrame
            cardStyle={cardStyle}
            key={item.label}
            className="sustainability-kpi-card"
            surface="metric"
            style={{
              height: `${layout.height}px`,
              left: `${layout.left}px`,
              top: `${layout.top}px`,
              width: `${layout.width}px`
            }}
          >
            <DisplayCardHeader
              icon={renderDisplayPageIcon({
                alt: item.label,
                className: "h-full w-full",
                seedSource: seedConfig.iconSources.kpiCards[cardKey],
                source: resolvedConfig.iconSources.kpiCards[cardKey]
              })}
              iconContainerClassName="sustainability-card-icon"
              subtitle={item.helper}
              title={item.label}
            />
            <DisplayCardValueRow align={cardStyle.valueRowAlign} unit={item.unit} value={item.value} />
            {index === 2 ? (
              <DisplayCardFooter className="sustainability-card-footer">
                <div className="sustainability-growth-note">
                  <span>{viewModel.comparison.label}</span>
                  {viewModel.comparison.state === "available" ? (
                    <SustainabilityGlyph name="trend" />
                  ) : null}
                </div>
              </DisplayCardFooter>
            ) : (
              <DisplayCardFooter className="sustainability-card-footer">
                <Sparkline className="sustainability-sparkline" values={trendSeries.map((value) => value - index * 1.8)} />
              </DisplayCardFooter>
            )}
          </DisplayCardFrame>
        );
      })}

      {viewModel.esgCards.map((card, index) => {
        const cardKey = sustainabilityStatOrder[index]!;
        const layout = withContentOffset(resolvedConfig.statCards[cardKey]);
        const cardStyle = createDisplayCardStyleConfig(resolvedConfig.cardStyles[cardKey]);

        return (
          <DisplayCardFrame
            cardStyle={cardStyle}
            key={card.label}
            className="sustainability-stat-card"
            surface="metric"
            style={{
              height: `${layout.height}px`,
              left: `${layout.left}px`,
              top: `${layout.top}px`,
              width: `${layout.width}px`
            }}
          >
            <DisplayCardHeader
              icon={renderDisplayPageIcon({
                alt: card.label,
                className: "h-full w-full",
                seedSource: seedConfig.iconSources.statCards[cardKey],
                source: resolvedConfig.iconSources.statCards[cardKey]
              })}
              iconContainerClassName="sustainability-card-icon"
              subtitle={card.subtitle}
              title={card.label}
            />
            {"value" in card ? (
              <>
                {index === 0 ? (
                  <DisplayCardFooter className="sustainability-card-footer">
                    <div className="sustainability-stat-procure">{card.value}</div>
                    <p className="sustainability-stat-desc">持續累積年度永續影響</p>
                  </DisplayCardFooter>
                ) : (
                  <>
                    <DisplayCardValueRow
                      align={cardStyle.valueRowAlign}
                      unit={"unit" in card ? card.unit : undefined}
                      value={card.value}
                    />
                    <DisplayCardFooter className="sustainability-card-footer">
                      <Sparkline className="sustainability-trees-sparkline" values={trendSeries.map((value) => value - 2)} />
                    </DisplayCardFooter>
                  </>
                )}
              </>
            ) : (
              <DisplayCardFooter className="sustainability-card-footer">
                <ul className="sustainability-esg-list">
                  {card.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </DisplayCardFooter>
            )}
          </DisplayCardFrame>
        );
      })}
      <DisplayPageObjectLayer objects={freeformObjects} />
    </section>
  );
}
