import { KioskButton } from "../../components/KioskButton";
import { usePageRotation } from "../../hooks/usePageRotation";
import { PageScaffold } from "../shared/PageScaffold";
import { buildSlideshowPreviewViewModel } from "./viewModel";

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

  return (
    <PageScaffold
      path="/slideshow-preview"
      description="預覽輪播引擎目前會播放哪一頁、剩餘倒數、進度條與實際套用中的播放規則。"
    >
      <div className="grid grid-cols-12 gap-6">
        <aside className="col-span-3 grid gap-4">
          <div className="rounded-[28px] border border-white/70 bg-white/92 p-5 shadow-card">
            <p className="text-sm font-medium tracking-[0.08em] text-neutral-500">播放狀態</p>
            <p className="mt-3 text-3xl font-bold text-brand-900">{viewModel.statusLabel}</p>
            <p className="mt-3 text-sm leading-6 text-neutral-600">{viewModel.statusDetail}</p>
          </div>
          <div className="rounded-[28px] border border-white/70 bg-white/92 p-5 shadow-card">
            <p className="text-sm font-medium tracking-[0.08em] text-neutral-500">目前頁面</p>
            <p className="mt-3 text-4xl font-bold text-brand-900">{viewModel.currentIndexLabel}</p>
            <p className="mt-3 text-lg font-semibold text-neutral-900">{viewModel.currentPageLabel}</p>
            <p className="mt-2 text-sm text-neutral-500">{viewModel.currentRouteLabel}</p>
          </div>
          <div className="rounded-[28px] border border-white/70 bg-white/92 p-5 shadow-card">
            <p className="text-sm font-medium tracking-[0.08em] text-neutral-500">停留與進度</p>
            <p className="mt-3 text-4xl font-bold text-brand-900">{countdown} 秒</p>
            <p className="mt-2 text-sm text-neutral-500">下一頁切換倒數</p>
            <div className="mt-4 h-2 rounded-full bg-brand-100">
              <div
                className="h-full rounded-full bg-brand-900 transition-[width] duration-300"
                style={{ width: viewModel.progressLabel }}
              />
            </div>
            <p className="mt-3 text-sm text-neutral-500">目前進度 {viewModel.progressLabel}</p>
          </div>
        </aside>

        <section className="col-span-9">
          <div className="rounded-[32px] border border-white/70 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.95),_rgba(214,232,201,0.72)_40%,_rgba(57,107,72,0.86)_100%)] p-8 shadow-panel">
            <div className="flex items-start justify-between gap-6">
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-white/72">Slideshow Preview</p>
                <p className="mt-4 text-5xl font-bold text-white">{viewModel.currentPageLabel}</p>
                <p className="mt-3 text-xl text-white/78">
                  {currentPage?.labelEn ?? "No Enabled Pages"}
                </p>
              </div>
              <div className="rounded-full bg-white/16 px-4 py-2 text-sm font-semibold text-white backdrop-blur">
                {viewModel.currentIndexLabel}
              </div>
            </div>

            <div className="mt-8 grid grid-cols-3 gap-4">
              {viewModel.queueCards.map((card) => (
                <article
                  key={card.id}
                  className={[
                    "rounded-[24px] border p-4 transition-colors",
                    card.isCurrent
                      ? "border-white/70 bg-white/18 text-white shadow-card"
                      : card.enabled
                        ? "border-white/40 bg-white/10 text-white/88"
                        : "border-white/20 bg-black/10 text-white/52"
                  ].join(" ")}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-lg font-semibold">
                      {card.displayOrder}. {card.labelZh}
                    </p>
                    <span className="rounded-full bg-white/18 px-3 py-1 text-xs font-semibold">
                      {card.durationLabel}
                    </span>
                  </div>
                  <p className="mt-2 text-sm">{card.labelEn}</p>
                  <p className="mt-3 text-xs uppercase tracking-[0.18em]">{card.routeLabel}</p>
                  <p className="mt-4 text-sm">{card.statusLabel}</p>
                </article>
              ))}
            </div>

            <div className="mt-8 flex gap-3">
              <KioskButton variant="secondary" onClick={prevPage}>
                上一頁
              </KioskButton>
              <KioskButton onClick={togglePlay}>{isPlaying ? "Pause" : "Play"}</KioskButton>
              <KioskButton variant="ghost" onClick={nextPage}>
                下一頁
              </KioskButton>
            </div>
          </div>
        </section>
      </div>

      <div className="mt-6 rounded-[28px] border border-white/70 bg-white/92 p-6 shadow-card">
        <p className="text-lg font-semibold text-brand-900">播放設定摘要</p>
        <div className="mt-5 grid grid-cols-5 gap-4">
          {viewModel.summaryRows.map((row) => (
            <div key={row.label} className="rounded-2xl bg-brand-50/60 px-4 py-4">
              <p className="text-sm font-medium tracking-[0.08em] text-neutral-500">{row.label}</p>
              <p className="mt-3 text-base font-semibold leading-7 text-neutral-900">{row.value}</p>
            </div>
          ))}
        </div>
      </div>
    </PageScaffold>
  );
}
