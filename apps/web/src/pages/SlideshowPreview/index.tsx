import { usePageRotation } from "../../hooks/usePageRotation";
import { slideshowPreviewAssetRuntimeMap } from "./assets";
import { slideshowCardOffsets, slideshowLayout } from "./layout";
import "./preview.css";
import { buildSlideshowPreviewViewModel } from "./viewModel";

function PlayGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="currentColor"
      aria-hidden
    >
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

export function SlideshowPreview() {
  const {
    countdown,
    currentPage,
    errorMessage,
    isIdle,
    isLoading,
    isPlaying,
    nextPage,
    pages,
    prevPage,
    progress,
    settings,
    togglePlay
  } = usePageRotation();

  const viewModel = buildSlideshowPreviewViewModel({
    countdown,
    currentPage,
    errorMessage,
    isIdle,
    isLoading,
    isPlaying,
    pages,
    progress,
    settings
  });
  const visibleCards = viewModel.queueCards.slice(0, 5);

  return (
    <section className="sp-page">
      <section
        className="sp-title"
        style={{ left: slideshowLayout.title.left, top: slideshowLayout.title.top }}
      >
        <h1>
          輪播<em>預覽</em>
        </h1>
        <p>Slideshow Preview</p>
      </section>

      {/* === Status rail === */}
      <aside
        className="sp-status"
        style={{
          left: slideshowLayout.status.left,
          top: slideshowLayout.status.top,
          width: slideshowLayout.status.width
        }}
      >
        <div className="sp-status-card">
          <span className="sp-status-card__label">
            播放狀態
            <small>Playback Status</small>
          </span>
          <span className="sp-status-card__value">{viewModel.statusLabel}</span>
          <span className="sp-status-card__detail">{viewModel.statusDetail}</span>
          <span className="sp-status-card__icon">
            <PlayGlyph />
          </span>
        </div>

        <div className="sp-status-card">
          <span className="sp-status-card__label">
            目前頁面
            <small>Current Slide</small>
          </span>
          <span className="sp-status-card__value is-large">{viewModel.currentIndexLabel}</span>
          <span className="sp-status-card__detail">{viewModel.currentPageLabel}</span>
        </div>

        <div className="sp-status-card">
          <span className="sp-status-card__label">
            倒數與進度
            <small>Countdown</small>
          </span>
          <span className="sp-status-card__value is-neutral">
            {countdown}
            <small style={{ fontSize: 14, fontWeight: 400, color: "#6f766f", marginLeft: 4 }}>
              秒
            </small>
          </span>
          <div
            className="sp-progress"
            style={{ ["--progress-width" as string]: viewModel.progressLabel }}
          />
          <span className="sp-status-card__detail">{viewModel.progressLabel}</span>
        </div>
      </aside>

      {/* === Bottom-left controls === */}
      <div
        className="sp-controls"
        style={{
          height: slideshowLayout.controls.height,
          left: slideshowLayout.controls.left,
          top: slideshowLayout.controls.top,
          width: slideshowLayout.controls.width
        }}
      >
        <button type="button" className="sp-control" onClick={prevPage}>
          上一頁
        </button>
        <button type="button" className="sp-control primary" onClick={togglePlay}>
          {isPlaying ? "Pause" : "Play"}
        </button>
        <button type="button" className="sp-control" onClick={nextPage}>
          下一頁
        </button>
      </div>

      {/* === Carousel === */}
      <section
        className="sp-carousel"
        style={{
          height: slideshowLayout.carousel.height,
          left: slideshowLayout.carousel.left,
          top: slideshowLayout.carousel.top,
          width: slideshowLayout.carousel.width
        }}
      >
        {visibleCards.map((card, index) => {
          const asset =
            slideshowPreviewAssetRuntimeMap[
              card.previewAssetKey as keyof typeof slideshowPreviewAssetRuntimeMap
            ] ?? slideshowPreviewAssetRuntimeMap.fallback;
          return (
            <article
              key={card.id}
              className={`sp-card ${card.isCurrent ? "active" : ""}`}
              style={{ left: slideshowCardOffsets[index] ?? 0 }}
            >
              <img alt={card.labelZh} src={asset} />
              <h3>{card.labelZh}</h3>
              <p>{card.labelEn}</p>
              <small>{card.statusLabel}</small>
            </article>
          );
        })}
        <button type="button" className="sp-arrow prev" onClick={prevPage} aria-label="上一張">
          ‹
        </button>
        <button type="button" className="sp-arrow next" onClick={nextPage} aria-label="下一張">
          ›
        </button>
        <div className="sp-dots">
          {visibleCards.map((card) => (
            <i key={card.id} className={card.isCurrent ? "on" : ""} />
          ))}
        </div>
      </section>

      {/* === Summary === */}
      <section
        className="sp-summary"
        style={{
          height: slideshowLayout.summary.height,
          left: slideshowLayout.summary.left,
          top: slideshowLayout.summary.top,
          width: slideshowLayout.summary.width
        }}
      >
        <h2>
          播放設定摘要
          <small>Playback Summary</small>
        </h2>
        {viewModel.summaryRows.map((row, index) => (
          <div key={row.label} className={index === 3 && isPlaying ? "is-on" : ""}>
            <b>{row.label}</b>
            <span>{row.value}</span>
          </div>
        ))}
      </section>
    </section>
  );
}
