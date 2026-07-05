import type { DisplayPageFreeformObject } from "@solar-display/shared";
import { memo, useMemo, useState, useEffect, type CSSProperties } from "react";
import { DisplayPageObjectLayer } from "../../components/DisplayPageObjectLayer";
import { DisplayPageLoadingState } from "../../components/DisplayPageLoadingState";
import { useBodyClass } from "../../hooks/useBodyClass";
import {
  shouldDeferDisplayPageRuntimeRender,
  useDisplayPageConfig
} from "../../hooks/useDisplayPageConfig";
import { useDisplayStoryRuntime } from "../../hooks/useDisplayStoryRuntime";
import { useMqttStatus } from "../../hooks/useMqttStatus";
import { useOverviewWeather } from "../../hooks/useOverviewWeather";
import {
  resolveDisplayPageMediaSource
} from "@solar-display/shared";
import { buildDisplayPageMediaPresentation } from "../displayPageMediaStyle";
import { DisplayLeafOrnament } from "../shared/DisplayLeafOrnament";
import {
  overviewHeroMediaEffectResolverOptions
} from "../shared/displayPageMediaEffectConfig";
import {
  resolveRuntimeFallbackBannerState,
  RuntimeConfigFallbackBanner
} from "../runtimeConfigHydration";
import { overviewAssetRuntimeMap } from "./assets";
import { pickOverviewBackground } from "./backgroundPool";
import {
  createOverviewDisplayPageSeedConfig,
  resolveOverviewModernDefaultConfig,
  type OverviewDisplayPageConfig
} from "./displayPageConfig";
import {
  overviewGoldLineLayout,
  overviewLeafLayout
} from "./layout";
import "../../components/displayPageCards.css";
import "./overview.css";
import { resolveOverviewWeatherSnapshot } from "./viewModel";
import { OverviewRuntimeContent } from "./runtimeContent";

const CONTENT_TOP_OFFSET = 146;

const overviewCardOrder = [
  {
    englishLabel: "Real-time Power",
    key: "power"
  },
  {
    englishLabel: "Today's Generation",
    key: "today"
  },
  {
    englishLabel: "Total Generation",
    key: "total"
  },
  {
    englishLabel: "Today's CO2 Reduction",
    key: "co2Today"
  },
  {
    englishLabel: "Total CO2 Reduction",
    key: "co2Total"
  }
] as const;

function withContentOffset<T extends { top: number }>(layout: T) {
  return {
    ...layout,
    top: layout.top - CONTENT_TOP_OFFSET
  };
}

function renderOverviewTitleLine(line: string) {
  const emphasisText = "綠色";
  const emphasisIndex = line.indexOf(emphasisText);

  if (emphasisIndex === -1) {
    return line;
  }

  return (
    <>
      {line.slice(0, emphasisIndex)}
      <em>{emphasisText}</em>
      {line.slice(emphasisIndex + emphasisText.length)}
    </>
  );
}

const OverviewStaticShell = memo(function OverviewStaticShell({
  bgTransition,
  goldLineStyle,
  heroBannerStyle,
  heroMediaPresentation,
  leafOrnamentStyle,
  resolvedConfig,
  selectedBackground,
  subtitleStyle,
  titleGroupStyle,
  titleStyle,
  eyebrowStyle
}: {
  bgTransition: {
    current: string | undefined;
    prev: string | undefined;
    fadeCurrent: boolean;
  };
  goldLineStyle: {
    height: string;
    left: string;
    opacity: number;
    top: string;
    width: string;
  };
  heroBannerStyle: {
    height: string;
    left: string;
    top: string;
    width: string;
  };
  heroMediaPresentation: ReturnType<typeof buildDisplayPageMediaPresentation>;
  leafOrnamentStyle: CSSProperties;
  resolvedConfig: OverviewDisplayPageConfig;
  selectedBackground: ReturnType<typeof pickOverviewBackground> | undefined;
  subtitleStyle: {
    fontSize: string;
    lineHeight: number;
    marginTop: string;
  };
  titleGroupStyle: {
    left: string;
    top: string;
    width: string;
  };
  titleStyle: {
    fontSize: string;
    fontWeight: number;
    letterSpacing: string;
    lineHeight: number;
  };
  eyebrowStyle: {
    fontSize: string;
    letterSpacing: string;
    marginBottom: string;
  };
}) {
  return (
    <>
      <DisplayLeafOrnament
        className="overview-leaf-watermark display-surface-leaf-ornament"
        config={resolvedConfig.chrome.ornaments.leaf}
        style={leafOrnamentStyle}
      />

      <div
        className="overview-gold-line display-surface-gold-line"
        style={goldLineStyle}
      />

      <section
        className="overview-title-group display-surface-hero-group"
        style={titleGroupStyle}
      >
        <p
          className="overview-eyebrow display-surface-hero-eyebrow"
          style={eyebrowStyle}
        >
          {resolvedConfig.heroCopy.eyebrow}
        </p>
        <h2
          className="overview-display-title display-surface-hero-title"
          style={titleStyle}
        >
          {renderOverviewTitleLine(resolvedConfig.heroCopy.titleLines[0])}
          <br />
          {renderOverviewTitleLine(resolvedConfig.heroCopy.titleLines[1])}
        </h2>
        <p
          className="overview-hero-subtitle display-surface-hero-subtitle"
          style={subtitleStyle}
        >
          {resolvedConfig.heroCopy.subtitleLines[0]}
          <br />
          {resolvedConfig.heroCopy.subtitleLines[1]}
        </p>
      </section>

      <figure
        className={`overview-hero-banner display-surface-media-stage${heroMediaPresentation.stageClassName ? ` ${heroMediaPresentation.stageClassName}` : ""}`}
        style={heroBannerStyle}
      >
        {bgTransition.prev && (
          <img
            alt=""
            src={bgTransition.prev}
            style={{
              ...heroMediaPresentation.mediaStyle,
              position: "absolute",
              inset: 0,
              zIndex: 1
            }}
          />
        )}
        <img
          alt={selectedBackground?.alt ?? resolvedConfig.heroMedia.alt}
          src={bgTransition.current}
          style={{
            ...heroMediaPresentation.mediaStyle,
            opacity: bgTransition.fadeCurrent ? 0 : 1,
            transition: bgTransition.fadeCurrent ? "none" : "opacity 1000ms ease-in-out",
            position: "absolute",
            inset: 0,
            zIndex: 2
          }}
        />
        {heroMediaPresentation.overlayLayers.map((layer) => (
          <span
            key={layer.id}
            aria-hidden="true"
            className={layer.className}
            style={{
              ...layer.style,
              zIndex: 3
            }}
          />
        ))}
      </figure>
    </>
  );
});

export function Overview({ config, pageId = "overview" }: { config?: OverviewDisplayPageConfig; pageId?: string }) {
  useBodyClass("page-hero-shell");
  const runtimeHydrationEnabled = config === undefined;
  const weatherSnapshot = useOverviewWeather(runtimeHydrationEnabled);
  const { status: mqttStatus } = useMqttStatus(undefined, { enabled: runtimeHydrationEnabled });
  const resolvedWeatherSnapshot = resolveOverviewWeatherSnapshot(
    weatherSnapshot,
    runtimeHydrationEnabled && mqttStatus.reason === "mock"
  );
  const runtimeStage = "live" as const;
  const seedConfig = useMemo(
    () =>
      createOverviewDisplayPageSeedConfig(
        overviewAssetRuntimeMap.hero,
        undefined,
        overviewAssetRuntimeMap.backgrounds
      ),
    []
  );
  const runtimeConfig = useDisplayPageConfig(pageId, seedConfig, {
    enabled: runtimeHydrationEnabled,
    stage: runtimeStage
  });
  const storyRuntime = useDisplayStoryRuntime("overview", {
    enabled: runtimeHydrationEnabled
  });

  const resolvedConfig = useMemo(
    () => resolveOverviewModernDefaultConfig(config ?? runtimeConfig.config, seedConfig),
    [config, runtimeConfig.config, seedConfig]
  );
  const backgroundPoolSources = resolvedConfig.backgroundPool.sources;
  const backgroundPoolSignature = backgroundPoolSources
    .map((source) => source.src ?? source.assetId ?? "")
    .join("|");
  const selectedBackground = useMemo(
    () => pickOverviewBackground(backgroundPoolSources),
    // Re-randomise only when the candidate pool changes; each rotation entry
    // remounts the page (route host `key`), so mount = fresh random pick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [backgroundPoolSignature]
  );

  const storyOverviewPayload = storyRuntime.payload ?? undefined;
  const backgroundSource = useMemo(
    () =>
      selectedBackground
        ? resolveDisplayPageMediaSource(selectedBackground, selectedBackground.src ?? null)
        : null,
    [selectedBackground]
  );
  const heroMediaSource = useMemo(
    () => resolveDisplayPageMediaSource(resolvedConfig.heroMedia, seedConfig.heroMedia.src),
    [resolvedConfig.heroMedia, seedConfig.heroMedia.src]
  );
  const heroMediaPresentation = useMemo(
    () =>
      buildDisplayPageMediaPresentation(resolvedConfig.heroMedia, overviewHeroMediaEffectResolverOptions),
    [resolvedConfig.heroMedia]
  );

  const activeBackgroundSrc = backgroundSource ?? heroMediaSource ?? undefined;
  const [bgTransition, setBgTransition] = useState<{
    current: string | undefined;
    prev: string | undefined;
    fadeCurrent: boolean;
  }>({
    current: activeBackgroundSrc,
    prev: undefined,
    fadeCurrent: false
  });

  useEffect(() => {
    if (activeBackgroundSrc !== bgTransition.current) {
      if (!runtimeHydrationEnabled) {
        setBgTransition({
          current: activeBackgroundSrc,
          prev: undefined,
          fadeCurrent: false
        });
        return;
      }

      setBgTransition((prev) => ({
        current: activeBackgroundSrc,
        prev: prev.current,
        fadeCurrent: true
      }));
    }
  }, [activeBackgroundSrc, bgTransition.current, runtimeHydrationEnabled]);

  useEffect(() => {
    if (bgTransition.fadeCurrent) {
      const frame = requestAnimationFrame(() => {
        setBgTransition((prev) => ({
          ...prev,
          fadeCurrent: false
        }));
      });

      const timer = setTimeout(() => {
        setBgTransition((prev) => ({
          ...prev,
          prev: undefined
        }));
      }, 1000);

      return () => {
        cancelAnimationFrame(frame);
        clearTimeout(timer);
      };
    }
  }, [bgTransition.fadeCurrent]);

  const heroTypography = resolvedConfig.chrome.heroTypography;
  const freeformObjects =
    (resolvedConfig as typeof resolvedConfig & { freeformObjects?: DisplayPageFreeformObject[] }).freeformObjects ?? [];

  const titleLayout = useMemo(() => withContentOffset(resolvedConfig.heroCopyLayout), [resolvedConfig.heroCopyLayout]);
  const heroLayout = useMemo(() => withContentOffset(resolvedConfig.heroContainer), [resolvedConfig.heroContainer]);
  const leafLayout = useMemo(() => withContentOffset(overviewLeafLayout), []);
  const goldLineLayout = useMemo(() => withContentOffset(overviewGoldLineLayout), []);

  const leafOrnamentStyle = useMemo(
    () => ({
      height: `${leafLayout.height}px`,
      left: `${leafLayout.left + resolvedConfig.chrome.ornaments.leaf.offsetX}px`,
      top: `${leafLayout.top + resolvedConfig.chrome.ornaments.leaf.offsetY}px`,
      width: `${leafLayout.width}px`,
      "--display-leaf-opacity": resolvedConfig.chrome.ornaments.leaf.opacity,
      "--display-leaf-scale": resolvedConfig.chrome.ornaments.leaf.scale
    } as CSSProperties),
    [leafLayout, resolvedConfig.chrome.ornaments.leaf]
  );
  const goldLineStyle = useMemo(
    () => ({
      height: `${resolvedConfig.chrome.ornaments.goldLine.thickness}px`,
      left: `${goldLineLayout.left}px`,
      opacity: resolvedConfig.chrome.ornaments.goldLine.opacity,
      top: `${goldLineLayout.top + resolvedConfig.chrome.ornaments.goldLine.offsetY}px`,
      width: `${goldLineLayout.width}px`
    }),
    [goldLineLayout, resolvedConfig.chrome.ornaments.goldLine]
  );
  const titleGroupStyle = useMemo(
    () => ({
      left: `${titleLayout.left}px`,
      top: `${titleLayout.top}px`,
      width: `${titleLayout.width}px`
    }),
    [titleLayout]
  );
  const eyebrowStyle = useMemo(
    () => ({
      fontSize: `${heroTypography.eyebrowFontSize}px`,
      letterSpacing: `${heroTypography.eyebrowLetterSpacing}px`,
      marginBottom: `${heroTypography.eyebrowMarginBottom}px`
    }),
    [heroTypography]
  );
  const titleStyle = useMemo(
    () => ({
      fontSize: `${heroTypography.titleFontSize}px`,
      fontWeight: heroTypography.titleEmphasisWeight,
      letterSpacing: `${heroTypography.titleLetterSpacing}px`,
      lineHeight: heroTypography.titleLineHeight
    }),
    [heroTypography]
  );
  const subtitleStyle = useMemo(
    () => ({
      fontSize: `${heroTypography.subtitleFontSize}px`,
      lineHeight: heroTypography.subtitleLineHeight,
      marginTop: `${heroTypography.subtitleMarginTop}px`
    }),
    [heroTypography]
  );
  const heroBannerStyle = useMemo(
    () => ({
      ...heroMediaPresentation.stageStyle,
      height: `${heroLayout.height}px`,
      left: `${heroLayout.left}px`,
      top: `${heroLayout.top}px`,
      width: `${heroLayout.width}px`
    }),
    [heroMediaPresentation.stageStyle, heroLayout]
  );
  const runtimeFallbackBanner = resolveRuntimeFallbackBannerState({
    configErrorMessage: runtimeHydrationEnabled ? runtimeConfig.errorMessage : "",
    runtimeErrorMessage: runtimeHydrationEnabled ? storyRuntime.errorMessage : "",
    usesRuntimeFallback: storyRuntime.usesFallback
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

  return (
    <section className="overview-display-page">
      <RuntimeConfigFallbackBanner {...runtimeFallbackBanner} />
      <OverviewStaticShell
        bgTransition={bgTransition}
        goldLineStyle={goldLineStyle}
        heroBannerStyle={heroBannerStyle}
        heroMediaPresentation={heroMediaPresentation}
        leafOrnamentStyle={leafOrnamentStyle}
        resolvedConfig={resolvedConfig}
        selectedBackground={selectedBackground}
        subtitleStyle={subtitleStyle}
        titleGroupStyle={titleGroupStyle}
        titleStyle={titleStyle}
        eyebrowStyle={eyebrowStyle}
      />
      <OverviewRuntimeContent
        resolvedConfig={resolvedConfig}
        resolvedWeatherSnapshot={resolvedWeatherSnapshot}
        seedConfig={seedConfig}
        storyOverviewPayload={storyOverviewPayload}
      />
      <DisplayPageObjectLayer objects={freeformObjects} />
    </section>
  );
}
