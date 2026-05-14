import { useState } from "react";
import { ReferenceGlyph } from "../../components/ReferenceGlyph";
import { imageMocks } from "../../mocks/images";
import { imagesAssetRuntimeMap } from "./assets";
import {
  imagesArrowLayout,
  imagesCopyLayout,
  imagesCounterLayout,
  imagesGoldLayout,
  imagesInfoLayout,
  imagesMainLayout,
  imagesThumbLayout,
  imagesThumbSize,
  imagesTitleLayout
} from "./layout";
import "./images.css";
import { buildImagesViewModel } from "./viewModel";

const CONTENT_TOP_OFFSET = 146;

const assetSources = [
  imagesAssetRuntimeMap.main,
  imagesAssetRuntimeMap.thumbs[0],
  imagesAssetRuntimeMap.thumbs[1],
  imagesAssetRuntimeMap.thumbs[2],
  null
];

function withContentOffset<T extends { top: number }>(layout: T) {
  return {
    ...layout,
    top: layout.top - CONTENT_TOP_OFFSET
  };
}

export function Images() {
  const [activeIndex, setActiveIndex] = useState(0);
  const viewModel = buildImagesViewModel({
    activeIndex,
    assetSources,
    slides: imageMocks
  });
  const visibleStart = Math.min(Math.max(activeIndex - 1, 0), Math.max(viewModel.thumbnails.length - 4, 0));
  const visibleThumbnails = viewModel.thumbnails.slice(visibleStart, visibleStart + 4);

  const titleLayout = withContentOffset(imagesTitleLayout);
  const copyLayout = withContentOffset(imagesCopyLayout);
  const goldLayout = withContentOffset(imagesGoldLayout);
  const counterLayout = withContentOffset(imagesCounterLayout);
  const mainLayout = withContentOffset(imagesMainLayout);
  const infoLayout = withContentOffset(imagesInfoLayout);

  return (
    <section className="images-display-page">
      <section
        className="images-title-group"
        style={{
          left: `${titleLayout.left}px`,
          top: `${titleLayout.top}px`,
          width: `${titleLayout.width}px`
        }}
      >
        <p className="images-eyebrow">{viewModel.hero.eyebrow}</p>
        <h2 className="images-display-title">
          <em>綠能</em>現場影像
        </h2>
        <p className="images-hero-subtitle">{viewModel.hero.subtitle}</p>
      </section>

      <p
        className="images-copy-block"
        style={{
          left: `${copyLayout.left}px`,
          top: `${copyLayout.top}px`,
          width: `${copyLayout.width}px`
        }}
      >
        {viewModel.hero.copyLines.map((line) => (
          <span key={line} className="block">
            {line}
          </span>
        ))}
      </p>

      <div
        className="images-gold-ornament"
        style={{
          height: `${goldLayout.height}px`,
          left: `${goldLayout.left}px`,
          top: `${goldLayout.top}px`,
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
        <b>{viewModel.counter.current}</b>
        <span>/ {viewModel.counter.total}</span>
        <p>自動輪播中，每 15 秒切換一張</p>
        <div
          className="images-progress-line"
          style={{
            ["--progress-width" as string]: `${((activeIndex + 1) / Math.max(viewModel.thumbnails.length, 1)) * 100}%`
          }}
        />
      </section>

      <figure
        className="images-main-stage"
        style={{
          height: `${mainLayout.height}px`,
          left: `${mainLayout.left}px`,
          top: `${mainLayout.top}px`,
          width: `${mainLayout.width}px`
        }}
      >
        {viewModel.active.hasAsset ? (
          <img alt={viewModel.active.title} src={viewModel.active.assetSource ?? undefined} />
        ) : (
          <div className="images-main-placeholder">
            <div className="glyph-shell">
              <ReferenceGlyph name="image" />
            </div>
            <h3>{viewModel.active.title}</h3>
            <p>{viewModel.active.placeholderLabel}</p>
          </div>
        )}
      </figure>

      <article
        className="images-info-card"
        style={{
          height: `${infoLayout.height}px`,
          left: `${infoLayout.left}px`,
          top: `${infoLayout.top}px`,
          width: `${infoLayout.width}px`
        }}
      >
        <div className="images-info-icon">
          <ReferenceGlyph name="image" />
        </div>
        <h3>{viewModel.active.title}</h3>
        <p>廠區播放素材會優先使用已同步資產；若素材缺漏，仍保留完整圖片版型與資訊欄位。</p>
        <small>
          {viewModel.active.id} · {viewModel.active.area} · {viewModel.active.resolution} · {viewModel.active.durationSec} 秒 · {viewModel.active.updatedAt}
        </small>
      </article>

      <button
        className="images-gallery-arrow"
        style={{
          left: `${imagesArrowLayout.left.left}px`,
          top: `${imagesArrowLayout.left.top - CONTENT_TOP_OFFSET}px`
        }}
        onClick={() =>
          setActiveIndex((index) => (index > 0 ? index - 1 : viewModel.thumbnails.length - 1))
        }
      >
        ‹
      </button>
      <button
        className="images-gallery-arrow"
        style={{
          left: `${imagesArrowLayout.right.left}px`,
          top: `${imagesArrowLayout.right.top - CONTENT_TOP_OFFSET}px`
        }}
        onClick={() => setActiveIndex((index) => (index < viewModel.thumbnails.length - 1 ? index + 1 : 0))}
      >
        ›
      </button>

      {visibleThumbnails.map((thumbnail, thumbIndex) => {
        const layout = imagesThumbLayout[thumbIndex]!;
        const runtimeThumb = imagesAssetRuntimeMap.thumbs[(visibleStart + thumbIndex) % imagesAssetRuntimeMap.thumbs.length];

        return (
          <button
            key={thumbnail.id}
            className={[
              "images-thumb",
              thumbnail.isActive ? "images-thumb-active" : ""
            ].join(" ")}
            style={{
              height: `${imagesThumbSize.height}px`,
              left: `${layout.left}px`,
              top: `${layout.top - CONTENT_TOP_OFFSET}px`,
              width: `${imagesThumbSize.width}px`
            }}
            onClick={() => setActiveIndex(visibleStart + thumbIndex)}
          >
            {thumbnail.hasAsset ? (
              <img alt={thumbnail.title} src={runtimeThumb ?? thumbnail.assetSource ?? undefined} />
            ) : (
              <div className="images-thumb-placeholder">
                <ReferenceGlyph name="image" />
              </div>
            )}
          </button>
        );
      })}
    </section>
  );
}
