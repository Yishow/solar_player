import { MediaSlot } from "../../components/MediaSlot";
import { Sparkline } from "../../components/Sparkline";
import { useLiveMetrics } from "../../hooks/useLiveMetrics";
import { trendSeries } from "../../mocks/metrics";
import { PageScaffold } from "../shared/PageScaffold";
import { buildSolarViewModel } from "./viewModel";
import solarHeroImage from "../../../../../docs/reference/kuozui-green-fhd-html-prototype/assets/generated/02-solar/solar-carport-hero.png";
import solarPanelImage from "../../../../../docs/reference/kuozui-green-fhd-html-prototype/assets/generated/02-solar/solar-panel-display-source.png";
import inverterImage from "../../../../../docs/reference/kuozui-green-fhd-html-prototype/assets/generated/02-solar/inverter-display-source.png";
import factoryImage from "../../../../../docs/reference/kuozui-green-fhd-html-prototype/assets/generated/02-solar/factory-consumption-display-source.png";
import carbonImage from "../../../../../docs/reference/kuozui-green-fhd-html-prototype/assets/generated/02-solar/carbon-reduction-display-source.png";

const flowImages = [solarPanelImage, inverterImage, factoryImage, carbonImage];

export function Solar() {
  const { isSocketConnected, snapshot } = useLiveMetrics();
  const viewModel = buildSolarViewModel({
    isSocketConnected,
    snapshot
  });

  return (
    <PageScaffold
      path="/solar"
      description="太陽能發電流程：面板 → 變流器 → 配電 → 效益。"
    >
      <section className="relative grid min-h-[560px] grid-cols-12 gap-6 overflow-hidden">
        <div className="pointer-events-none absolute left-0 top-[58%] h-px w-[58%] bg-gradient-to-r from-accent-sun-500/0 via-accent-sun-500/70 to-accent-sun-500/0" />
        <div className="pointer-events-none absolute left-[30%] top-[34%] h-24 w-56 rounded-full bg-brand-100/60 blur-3xl" />

        <div className="col-span-7 flex min-h-[560px] flex-col justify-between">
          <div className="pt-2">
            <p className="font-en text-sm uppercase tracking-[0.28em] text-brand-700">
              {viewModel.hero.eyebrow}
            </p>
            <h2 className="mt-5 text-[64px] font-bold leading-[1.05] tracking-[0.08em] text-brand-900">
              {viewModel.hero.titleLines[0]}
              <br />
              {viewModel.hero.titleLines[1]}
            </h2>
            <p className="mt-5 max-w-2xl text-2xl leading-[1.45] text-neutral-600">
              {viewModel.hero.subtitleLines[0]}
            </p>
            <p className="mt-2 max-w-xl font-en text-xl leading-[1.35] text-brand-700">
              {viewModel.hero.subtitleLines[1]}
            </p>
          </div>

          <MediaSlot density="playback" className="h-[220px] rounded-[30px] p-0">
            <img
              alt="太陽能車棚與綠能展示場域"
              className="h-full w-full object-cover object-center"
              src={solarHeroImage}
            />
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white/28 via-white/6 to-transparent" />
          </MediaSlot>
        </div>

        <div className="col-span-5 rounded-[32px] border border-white/70 bg-white/62 p-5 shadow-panel backdrop-blur">
          <div className="grid grid-cols-2 gap-4">
            {viewModel.flowNodes.map((node, index) => (
              <article
                key={node.label}
                className={[
                  "rounded-[28px] border border-[#d5b55f]/50 bg-white/82 p-5 shadow-card",
                  index === viewModel.flowNodes.length - 1 ? "col-span-2" : ""
                ].join(" ")}
              >
                <div className="flex h-full flex-col items-center text-center">
                  <img
                    alt={node.label}
                    className="h-24 w-24 object-contain"
                    src={flowImages[index]}
                  />
                  <h3 className="mt-5 text-2xl font-semibold tracking-[0.14em] text-brand-900">
                    {node.label}
                  </h3>
                  <p className="mt-2 font-en text-sm uppercase tracking-[0.24em] text-neutral-500">
                    {node.footnote}
                  </p>
                  <p className="mt-6 text-4xl font-bold text-brand-900">{node.value}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-5 gap-4">
        {viewModel.kpis.map((metric) => (
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
                  Solar KPI
                </p>
              </div>
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-2xl shadow-soft">
                {metric.icon}
              </div>
            </div>
            <div className="mt-8 flex items-end gap-3">
              <p className="text-[50px] font-bold leading-none text-brand-900">{metric.value}</p>
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
