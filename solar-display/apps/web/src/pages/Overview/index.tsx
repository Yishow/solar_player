import { circuitMocks } from "../../mocks/circuits";
import { imageMocks } from "../../mocks/images";
import { liveMetrics, trendSeries } from "../../mocks/metrics";
import { DataCardGrid } from "../../components/DataCardGrid";
import { MetricCard } from "../../components/MetricCard";
import { PanelCard } from "../../components/PanelCard";
import { Sparkline } from "../../components/Sparkline";
import { StatusBadge } from "../../components/StatusBadge";
import { PageScaffold } from "../shared/PageScaffold";

export function Overview() {
  return (
    <PageScaffold
      path="/overview"
      description="播放模式首頁，集中顯示即時發電、設備在線、輪播素材與工廠綠能摘要。"
    >
      <DataCardGrid columns={5}>
        {liveMetrics.map((metric) => (
          <MetricCard
            key={metric.label}
            icon={metric.icon}
            label={metric.label}
            value={metric.value}
            unit={metric.unit}
            helper={metric.helper}
          />
        ))}
      </DataCardGrid>
      <div className="grid grid-cols-12 gap-6">
        <PanelCard title="即時功率曲線" subtitle="LIVE TREND" className="col-span-8">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="font-en text-sm uppercase tracking-[0.22em] text-neutral-500">Output Window</p>
              <p className="mt-3 text-4xl font-bold text-brand-900">09:00 - 12:00</p>
            </div>
            <StatusBadge status="connected" label="資料串流穩定" />
          </div>
          <Sparkline values={trendSeries} className="mt-8" />
        </PanelCard>
        <PanelCard title="輪播摘要" subtitle="SLIDESHOW" className="col-span-4">
          <div className="space-y-4">
            <div className="rounded-xl bg-brand-100 p-4">
              <p className="text-lg font-semibold text-brand-900">{imageMocks[0]?.title}</p>
              <p className="mt-1 text-sm text-neutral-600">{imageMocks[0]?.resolution}</p>
            </div>
            <p className="text-sm leading-7 text-neutral-600">
              目前播放清單共 {imageMocks.length} 張素材，主要用於首頁、趨勢頁與永續頁輪播展示。
            </p>
          </div>
        </PanelCard>
      </div>
      <PanelCard title="迴路在線摘要" subtitle="CIRCUIT STATUS">
        <div className="grid grid-cols-3 gap-4">
          {circuitMocks.slice(0, 6).map((circuit) => (
            <div key={circuit.id} className="rounded-xl border border-neutral-100 bg-white/92 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-lg font-semibold text-neutral-800">{circuit.label}</p>
                <StatusBadge status={circuit.status} />
              </div>
              <p className="mt-3 text-3xl font-bold text-brand-900">{circuit.powerKw} kW</p>
              <p className="mt-1 text-sm text-neutral-500">{circuit.zone}</p>
            </div>
          ))}
        </div>
      </PanelCard>
    </PageScaffold>
  );
}
