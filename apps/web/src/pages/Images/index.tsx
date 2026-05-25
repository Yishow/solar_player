import { useMemo, useState } from "react";
import { resolveDisplayPageMediaSource } from "@solar-display/shared";
import { renderDisplayPageIcon } from "../../components/displayPageIconResolver";
import {
  DisplayCardFooter,
  DisplayCardFrame,
  DisplayCardHeader
} from "../../components/displayPageCards";
import { DisplayPageLoadingState } from "../../components/DisplayPageLoadingState";
import { useBodyClass } from "../../hooks/useBodyClass";
import {
  shouldDeferDisplayPageRuntimeRender,
  useDisplayPageConfig
} from "../../hooks/useDisplayPageConfig";
import { useImagesAutoplay } from "../../hooks/useImagesAutoplay";
import { useImagePlaylistRuntime } from "../../hooks/useImagePlaylistRuntime";
import { buildDisplayPageMediaStyle } from "../displayPageMediaStyle";
import { createDisplayCardStyleConfig } from "../shared/displayCardStyleConfig";
import {
  resolveRuntimeFallbackBannerState,
  RuntimeConfigFallbackBanner
} from "../runtimeConfigHydration";
import { imagesAssetRuntimeMap } from "./assets";
import {
  createImagesDisplayPageSeedConfig,
  type ImagesDisplayPageConfig
} from "./displayPageConfig";
import {
  imagesCounterLayout,
  imagesGoldLayout,
  imagesTitleLayout
} from "./layout";
import "../../components/displayPageCards.css";
import "./images.css";
import { buildImagesViewModel } from "./viewModel";

const CONTENT_TOP_OFFSET = 146;

const thumbSlotOrder = ["thumb1", "thumb2", "thumb3", "thumb4"] as const;

function withContentOffset<T extends { top: number }>(layout: T) {
  return {
    ...layout,
    top: layout.top - CONTENT_TOP_OFFSET
  };
}

function splitImagesTitle(title: string) {
  if (title.length <= 2) {
    return {
      emphasis: title,
      suffix: ""
    };
  }

  return {
    emphasis: title.slice(0, 2),
    suffix: title.slice(2)
  };
}

export function Images({ config, pageId = "images" }: { config?: ImagesDisplayPageConfig; pageId?: string }) {
  useBodyClass("page-hero-shell");
  const runtimeHydrationEnabled = config === undefined;
  const runtimeStage = "live" as const;
  const seedConfig = useMemo(
    () => createImagesDisplayPageSeedConfig(imagesAssetRuntimeMap.main),
    []
  );
  const runtimeConfig = useDisplayPageConfig(pageId, seedConfig, {
    enabled: runtimeHydrationEnabled,
    stage: runtimeStage
  });
  const [requestedIndex, setRequestedIndex] = useState(0);
  const playlistRuntime = useImagePlaylistRuntime(requestedIndex, {
    enabled: runtimeHydrationEnabled
  });
  const autoplay = useImagesAutoplay({
    activeEntry: playlistRuntime.payload?.activeEntry ?? null,
    entries: playlistRuntime.payload?.entries ?? [],
    requestedIndex,
    setRequestedIndex
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

  const resolvedConfig = config ?? runtimeConfig.config;
  const mainStageSource = resolveDisplayPageMediaSource(
    resolvedConfig.mainStage,
    seedConfig.mainStage.src
  );
  const viewModel = buildImagesViewModel({
    activeEntry: playlistRuntime.payload?.activeEntry ?? null,
    activeIndex: autoplay.activeIndex,
    assets: [],
    coverAssetSource: mainStageSource,
    entries: playlistRuntime.payload?.entries ?? []
  });
  const runtimeFallbackBanner = resolveRuntimeFallbackBannerState({
    configErrorMessage: runtimeHydrationEnabled ? runtimeConfig.errorMessage : "",
    runtimeErrorMessage: runtimeHydrationEnabled ? playlistRuntime.errorMessage : "",
    usesRuntimeFallback: playlistRuntime.usesFallback
  });
  const heroTypography = resolvedConfig.chrome.heroTypography;
  const visibleStart = Math.min(Math.max(viewModel.activeIndex - 1, 0), Math.max(viewModel.thumbnails.length - 4, 0));
  const visibleThumbnails = viewModel.thumbnails.slice(visibleStart, visibleStart + 4);

  const titleLayout = withContentOffset(imagesTitleLayout);
  const copyLayout = withContentOffset(resolvedConfig.textBlocks.copy);
  const goldLayout = withContentOffset(imagesGoldLayout);
  const counterLayout = withContentOffset(imagesCounterLayout);
  const mainLayout = withContentOffset(resolvedConfig.mainStage);
  const infoLayout = withContentOffset(resolvedConfig.infoPanel);
  const infoCardStyle = createDisplayCardStyleConfig(resolvedConfig.cardStyles.infoPanel);
  const titleTokens = splitImagesTitle(resolvedConfig.hero.title);

  return (
    <section className="images-display-page">
      <RuntimeConfigFallbackBanner {...runtimeFallbackBanner} />
      <section
        className="images-title-group display-surface-hero-group"
        style={{
          left: `${titleLayout.left}px`,
          top: `${titleLayout.top}px`,
          width: `${titleLayout.width}px`
        }}
      >
        <p
          className="images-eyebrow display-surface-hero-eyebrow"
          style={{
            fontSize: `${resolvedConfig.chrome.heroTypography.eyebrowFontSize}px`,
            letterSpacing: `${resolvedConfig.chrome.heroTypography.eyebrowLetterSpacing}px`,
            marginBottom: `${resolvedConfig.chrome.heroTypography.eyebrowMarginBottom}px`
          }}
        >
          {resolvedConfig.hero.eyebrow}
        </p>
        <h2
          className="images-display-title display-surface-hero-title"
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
            {titleTokens.emphasis}
          </em>
          {titleTokens.suffix}
        </h2>
        <p
          className="images-hero-subtitle display-surface-hero-subtitle"
          style={{
            fontSize: `${resolvedConfig.chrome.heroTypography.subtitleFontSize}px`,
            lineHeight: resolvedConfig.chrome.heroTypography.subtitleLineHeight,
            marginTop: `${resolvedConfig.chrome.heroTypography.subtitleMarginTop}px`
          }}
        >
          {resolvedConfig.hero.subtitle}
        </p>
      </section>

      <p
        className="images-copy-block"
        style={{
          left: `${copyLayout.left}px`,
          top: `${copyLayout.top}px`,
          width: `${copyLayout.width}px`
        }}
      >
        {resolvedConfig.hero.copyLines.map((line) => (
          <span key={line} className="block">
            {line}
          </span>
        ))}
      </p>

      <div
        className="images-gold-ornament display-surface-gold-ornament"
        style={{
          height: `${goldLayout.height}px`,
          left: `${goldLayout.left}px`,
          opacity: resolvedConfig.chrome.ornaments.goldLine.opacity,
          top: `${goldLayout.top + resolvedConfig.chrome.ornaments.goldLine.offsetY}px`,
          transform: `scaleY(${resolvedConfig.chrome.ornaments.goldLine.thickness})`,
          transformOrigin: "top left",
          width: `${goldLayout.width}px`
        }}
      />

      <section
        className="images-slide-counter"
        style={{
          height: `${counterLayout.height}px`,
          left: `${counterLayout.left}px`,
          top: `${counterLayout.top}px`,
          width: `${counterLayout.width}px`
        }}
      >
        <b style={{ fontSize: `${resolvedConfig.chrome.modules.counter.currentFontSize}px` }}>
          {viewModel.counter.current}
        </b>
        <span style={{ fontSize: `${resolvedConfig.chrome.modules.counter.totalFontSize}px` }}>/ {viewModel.counter.total}</span>
        <p
          style={{
            fontSize: `${resolvedConfig.chrome.modules.counter.bodyFontSize}px`,
            marginTop: `${resolvedConfig.chrome.modules.counter.bodyMarginTop}px`
          }}
        >
          自動輪播中，目前素材停留 {viewModel.active.durationSeconds} 秒
        </p>
        <div
          className="images-progress-line"
          style={{
            height: `${resolvedConfig.chrome.modules.counter.progressThickness}px`,
            top: `${resolvedConfig.chrome.modules.counter.progressTopOffset}px`,
            ["--progress-width" as string]: `${((autoplay.activeIndex + 1) / Math.max(viewModel.thumbnails.length, 1)) * 100}%`
          }}
        />
      </section>

      <figure
        className="images-main-stage display-surface-media-stage display-surface-media-fade-left display-surface-media-fade-bottom"
        style={{
          height: `${mainLayout.height}px`,
          left: `${mainLayout.left}px`,
          top: `${mainLayout.top}px`,
          width: `${mainLayout.width}px`
        }}
      >
        {viewModel.active.assetSource ? (
          <img
            alt={resolvedConfig.mainStage.alt || viewModel.active.title}
            src={viewModel.active.assetSource ?? mainStageSource ?? undefined}
            style={buildDisplayPageMediaStyle(resolvedConfig.mainStage)}
          />
        ) : (
          <div className="images-main-placeholder">
            <div className="glyph-shell">
              {renderDisplayPageIcon({
                alt: resolvedConfig.mainStage.alt || viewModel.active.title,
                className: "h-full w-full",
                seedSource: seedConfig.iconSources.mainStagePlaceholder,
                source: resolvedConfig.iconSources.mainStagePlaceholder
              })}
            </div>
            <h3>{viewModel.active.title}</h3>
            <p>{viewModel.active.placeholderLabel}</p>
          </div>
        )}
      </figure>

      <DisplayCardFrame
        cardStyle={infoCardStyle}
        className="images-info-card"
        surface="info"
        style={{
          height: `${infoLayout.height}px`,
          left: `${infoLayout.left}px`,
          top: `${infoLayout.top}px`,
          width: `${infoLayout.width}px`
        }}
      >
        <DisplayCardHeader
          icon={renderDisplayPageIcon({
            alt: "Images Info Icon",
            className: "h-full w-full",
            seedSource: seedConfig.iconSources.infoPanel,
            source: resolvedConfig.iconSources.infoPanel
          })}
          iconContainerClassName="images-info-icon"
          title={viewModel.active.infoPanel.title}
        />
        <p className="images-info-card-body">
          {viewModel.active.infoPanel.description}
        </p>
        <DisplayCardFooter>
          <small className="images-info-card-meta">
            {viewModel.active.infoPanel.area} · {viewModel.active.durationSeconds} 秒
            {viewModel.active.infoPanel.capturedAt !== "尚未同步"
              ? ` · ${viewModel.active.infoPanel.capturedAt}`
              : ""}
          </small>
        </DisplayCardFooter>
      </DisplayCardFrame>

      <button
        className="images-gallery-arrow"
        style={{
          borderRadius: `${resolvedConfig.chrome.modules.arrows.borderRadius}px`,
          fontSize: `${resolvedConfig.chrome.modules.arrows.fontSize}px`,
          height: `${resolvedConfig.chrome.modules.arrows.buttonSize}px`,
          left: `${resolvedConfig.arrows.left.left}px`,
          top: `${resolvedConfig.arrows.left.top - CONTENT_TOP_OFFSET}px`,
          width: `${resolvedConfig.chrome.modules.arrows.buttonSize}px`
        }}
        onClick={() => autoplay.prev()}
      >
        ‹
      </button>
      <button
        className="images-gallery-arrow"
        style={{
          borderRadius: `${resolvedConfig.chrome.modules.arrows.borderRadius}px`,
          fontSize: `${resolvedConfig.chrome.modules.arrows.fontSize}px`,
          height: `${resolvedConfig.chrome.modules.arrows.buttonSize}px`,
          left: `${resolvedConfig.arrows.right.left}px`,
          top: `${resolvedConfig.arrows.right.top - CONTENT_TOP_OFFSET}px`,
          width: `${resolvedConfig.chrome.modules.arrows.buttonSize}px`
        }}
        onClick={() => autoplay.next()}
      >
        ›
      </button>

      {visibleThumbnails.map((thumbnail, thumbIndex) => {
        const layout = resolvedConfig.thumbnailSlots[thumbSlotOrder[thumbIndex]!];
        const runtimeThumb = imagesAssetRuntimeMap.thumbs[(visibleStart + thumbIndex) % imagesAssetRuntimeMap.thumbs.length];

        return (
          <button
            key={thumbnail.entryId}
            className={[
              "images-thumb",
              thumbnail.isActive ? "images-thumb-active" : ""
            ].join(" ")}
            style={{
              height: `${layout.height}px`,
              left: `${layout.left}px`,
              top: `${layout.top - CONTENT_TOP_OFFSET}px`,
              width: `${layout.width}px`
            }}
            onClick={() => autoplay.selectIndex(visibleStart + thumbIndex)}
          >
            {thumbnail.assetSource ? (
              <img alt={thumbnail.infoPanel.title} src={runtimeThumb ?? thumbnail.assetSource ?? undefined} />
            ) : (
              <div className="images-thumb-placeholder">
                {renderDisplayPageIcon({
                  alt: thumbnail.infoPanel.title,
                  className: "h-full w-full",
                  seedSource: seedConfig.iconSources.thumbnailSlots[thumbSlotOrder[thumbIndex]!],
                  source: resolvedConfig.iconSources.thumbnailSlots[thumbSlotOrder[thumbIndex]!]
                })}
              </div>
            )}
          </button>
        );
      })}
    </section>
  );
}
