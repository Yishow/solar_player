import { MediaSlot } from "../../components/MediaSlot";
import { Sparkline } from "../../components/Sparkline";
import { StatusBadge } from "../../components/StatusBadge";
import { useLiveMetrics } from "../../hooks/useLiveMetrics";
import { trendSeries } from "../../mocks/metrics";
import { PageScaffold } from "../shared/PageScaffold";
import { buildOverviewViewModel } from "./viewModel";
import overviewHeroImage from "../../../../../docs/reference/kuozui-green-fhd-html-prototype/assets/provisional/overview-hero-ref.jpg";

export function Overview() {
  const { connectionState, isSocketConnected, snapshot } = useLiveMetrics();
  const viewModel = buildOverviewViewModel({
    connectionState,
    isSocketConnected,
    snapshot
  });

  return (
    <PageScaffold
      path="/overview"
      description="總覽儀表板：即時發電、累積發電、CO₂ 減量等核心 KPI。"
    >
      <section className="relative grid min-h-[540px] grid-cols-12 gap-6 overflow-hidden">
        <div className="pointer-events-none absolute left-[22%] top-[62%] h-32 w-72 rounded-full bg-brand-100/60 blur-3xl" />
        <div className="pointer-events-none absolute left-0 top-[66%] h-px w-[44%] bg-gradient-to-r from-accent-sun-500/0 via-accent-sun-500/70 to-accent-sun-500/0" />

        <div className="col-span-4 flex flex-col justify-between py-3">
          <div>
            <p className="font-en text-sm uppercase tracking-[0.28em] text-brand-700">
              {viewModel.hero.eyebrow}
            </p>
            <h2 className="mt-6 text-[68px] font-bold leading-[1.08] tracking-[0.08em] text-brand-900">
              {viewModel.hero.titleLines.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </h2>
            <p className="mt-8 max-w-md text-2xl leading-[1.45] text-neutral-600">
              {viewModel.hero.subtitle}
            </p>
          </div>

          <div className="max-w-sm space-y-4">
            <StatusBadge
              density="playback"
              status={viewModel.summary.status}
              label={viewModel.summary.statusLabel}
            />
            <p className="text-lg leading-8 text-neutral-600">
              聚焦即時功率、日發電量、自發自用與減碳成果，作為播放首頁的第一層敘事。
            </p>
          </div>
        </div>

        <MediaSlot density="playback" className="col-span-8 h-[540px] rounded-[34px] p-0">
          <img
            alt="國瑞汽車中廠綠能展示場域"
            className="h-full w-full object-cover object-center"
            src={overviewHeroImage}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-white/18 via-transparent to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white/28 via-white/8 to-transparent" />
        </MediaSlot>
      </section>

      <section className="grid grid-cols-5 gap-4">
        {viewModel.metrics.map((metric) => (
          <article
            key={metric.label}
            className="rounded-[28px] border border-white/75 bg-white/92 px-6 py-5 shadow-card backdrop-blur"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold tracking-[0.08em] text-neutral-600">
                  {metric.label}
                </p>
                <p className="mt-1 font-en text-xs uppercase tracking-[0.18em] text-brand-700">
                  Overview KPI
                </p>
              </div>
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-2xl shadow-soft">
                {metric.icon}
              </div>
            </div>
            <div className="mt-8 flex items-end gap-3">
              <p className="text-[54px] font-bold leading-none text-brand-900">{metric.value}</p>
              <span className="pb-1 font-en text-lg font-semibold uppercase tracking-[0.14em] text-brand-700">
                {metric.unit}
              </span>
            </div>
            <Sparkline className="mt-4 h-14" values={trendSeries} />
            <p className="mt-3 text-sm leading-6 text-neutral-600">{metric.helper}</p>
          </article>
        ))}
      </section>
    </PageScaffold>
  );
}
