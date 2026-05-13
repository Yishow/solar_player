import { useState } from "react";
import { MediaSlot } from "../../components/MediaSlot";
import { imageMocks } from "../../mocks/images";
import { PageScaffold } from "../shared/PageScaffold";
import { buildImagesViewModel } from "./viewModel";
import imagesMainRef from "../../../../../docs/reference/kuozui-green-fhd-html-prototype/assets/provisional/images-main-ref.jpg";
import thumbFactorySolar from "../../../../../docs/reference/kuozui-green-fhd-html-prototype/assets/provisional/thumb-factory-solar.jpg";
import thumbGreenTrees from "../../../../../docs/reference/kuozui-green-fhd-html-prototype/assets/provisional/thumb-green-trees.jpg";
import thumbSolarAerial from "../../../../../docs/reference/kuozui-green-fhd-html-prototype/assets/provisional/thumb-solar-aerial.jpg";
import thumbShowroom from "../../../../../docs/reference/kuozui-green-fhd-html-prototype/assets/provisional/thumb-showroom.jpg";

const assetSources = [
  imagesMainRef,
  thumbFactorySolar,
  thumbGreenTrees,
  thumbSolarAerial,
  null
];

const thumbnailPreviewSources = [
  thumbFactorySolar,
  thumbGreenTrees,
  thumbSolarAerial,
  thumbShowroom,
  null
];

export function Images() {
  const [activeIndex, setActiveIndex] = useState(0);
  const viewModel = buildImagesViewModel({
    activeIndex,
    assetSources,
    slides: imageMocks
  });

  return (
    <PageScaffold
      path="/images"
      description="綠能現場影像與播放素材資訊，保留完整媒體 fallback 版型。"
    >
      <section className="relative grid min-h-[620px] grid-cols-12 gap-6 overflow-hidden">
        <div className="pointer-events-none absolute left-[2%] top-[37%] h-px w-[28%] bg-gradient-to-r from-brand-700 via-accent-sun-500/60 to-accent-sun-500/0" />

        <div className="col-span-8 flex flex-col gap-5">
          <div className="max-w-xl">
            <p className="font-en text-sm uppercase tracking-[0.28em] text-brand-700">
              {viewModel.hero.eyebrow}
            </p>
            <h2 className="mt-5 text-[64px] font-bold leading-[1.06] tracking-[0.08em] text-brand-900">
              <span className="text-accent-sun-600">綠能</span>現場影像
            </h2>
            <p className="mt-4 font-en text-xl tracking-[0.18em] text-neutral-500">
              {viewModel.hero.subtitle}
            </p>
            <div className="mt-8 space-y-1 text-[22px] leading-[1.55] text-neutral-700">
              {viewModel.hero.copyLines.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          </div>

          <MediaSlot density="playback" className="relative h-[420px] rounded-[34px] p-0">
            {viewModel.active.hasAsset ? (
              <img
                alt={viewModel.active.title}
                className="h-full w-full object-cover object-center"
                src={viewModel.active.assetSource ?? undefined}
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(224,161,42,0.18),_transparent_45%),linear-gradient(135deg,_rgba(255,253,247,0.96),_rgba(240,244,236,0.92))] text-center">
                <div className="flex h-24 w-24 items-center justify-center rounded-[28px] bg-brand-100 text-[52px] shadow-soft">
                  🖼️
                </div>
                <p className="mt-6 text-2xl font-semibold tracking-[0.08em] text-brand-900">
                  {viewModel.active.title}
                </p>
                <p className="mt-2 max-w-md text-base leading-7 text-neutral-600">
                  {viewModel.active.placeholderLabel}
                </p>
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white/26 via-white/8 to-transparent" />
            <button
              className="absolute left-5 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-2xl text-brand-900 shadow-card"
              onClick={() =>
                setActiveIndex((index) => (index > 0 ? index - 1 : viewModel.thumbnails.length - 1))
              }
            >
              ‹
            </button>
            <button
              className="absolute right-5 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-2xl text-brand-900 shadow-card"
              onClick={() =>
                setActiveIndex((index) => (index < viewModel.thumbnails.length - 1 ? index + 1 : 0))
              }
            >
              ›
            </button>
          </MediaSlot>
        </div>

        <div className="col-span-4 flex flex-col gap-5">
          <article className="rounded-[30px] border border-white/75 bg-white/92 px-6 py-5 shadow-card backdrop-blur">
            <div className="flex items-end gap-2 font-en text-brand-900">
              <b className="text-[54px] leading-none">{viewModel.counter.current}</b>
              <span className="pb-1 text-xl text-neutral-500">/ {viewModel.counter.total}</span>
            </div>
            <p className="mt-2 text-sm leading-6 text-neutral-500">自動輪播中，每 15 秒切換一張</p>
            <div className="mt-4 h-1.5 rounded-full bg-neutral-100">
              <div
                className="h-full rounded-full bg-accent-sun-500"
                style={{
                  width: `${((activeIndex + 1) / Math.max(viewModel.thumbnails.length, 1)) * 100}%`
                }}
              />
            </div>
          </article>

          <article className="rounded-[30px] border border-white/75 bg-white/92 px-6 py-6 shadow-card backdrop-blur">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-2xl shadow-soft">
              ☀️
            </div>
            <h3 className="mt-5 text-[28px] font-semibold tracking-[0.06em] text-brand-900">
              {viewModel.active.title}
            </h3>
            <p className="mt-4 text-base leading-7 text-neutral-600">
              廠區播放素材會優先使用已同步資產；若素材缺漏，仍保留完整圖片版型與資訊欄位。
            </p>
            <div className="mt-6 space-y-4 text-sm">
              <div>
                <p className="font-semibold tracking-[0.08em] text-neutral-500">編號</p>
                <p className="mt-1 font-en text-base text-brand-900">{viewModel.active.id}</p>
              </div>
              <div>
                <p className="font-semibold tracking-[0.08em] text-neutral-500">使用區域</p>
                <p className="mt-1 text-base text-brand-900">{viewModel.active.area}</p>
              </div>
              <div>
                <p className="font-semibold tracking-[0.08em] text-neutral-500">解析度</p>
                <p className="mt-1 text-base text-brand-900">{viewModel.active.resolution}</p>
              </div>
              <div>
                <p className="font-semibold tracking-[0.08em] text-neutral-500">停留時間</p>
                <p className="mt-1 text-base text-brand-900">{viewModel.active.durationSec} 秒</p>
              </div>
              <div>
                <p className="font-semibold tracking-[0.08em] text-neutral-500">更新時間</p>
                <p className="mt-1 text-base text-brand-900">{viewModel.active.updatedAt}</p>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section className="grid grid-cols-5 gap-4">
        {viewModel.thumbnails.map((thumbnail, index) => (
          <button
            key={thumbnail.id}
            className={[
              "rounded-[24px] border px-3 py-3 text-left shadow-card transition",
              thumbnail.isActive
                ? "border-accent-sun-500 bg-white/96"
                : "border-white/70 bg-white/86 hover:border-brand-300"
            ].join(" ")}
            onClick={() => setActiveIndex(index)}
          >
            <div className="overflow-hidden rounded-[18px]">
              {thumbnail.hasAsset ? (
                <img
                  alt={thumbnail.title}
                  className="h-28 w-full object-cover object-center"
                  src={thumbnailPreviewSources[index] ?? thumbnail.assetSource ?? undefined}
                />
              ) : (
                <div className="flex h-28 items-center justify-center bg-neutral-100 text-3xl text-neutral-400">
                  ☐
                </div>
              )}
            </div>
            <p className="mt-3 font-en text-xs uppercase tracking-[0.18em] text-brand-700">
              {thumbnail.orderLabel}
            </p>
            <p className="mt-1 truncate text-sm font-semibold text-brand-900">{thumbnail.title}</p>
          </button>
        ))}
      </section>
    </PageScaffold>
  );
}
