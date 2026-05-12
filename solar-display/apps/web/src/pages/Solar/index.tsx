import { liveMetrics, trendSeries } from "../../mocks/metrics";
import { DataCardGrid } from "../../components/DataCardGrid";
import { MetricCard } from "../../components/MetricCard";
import { PanelCard } from "../../components/PanelCard";
import { Sparkline } from "../../components/Sparkline";
import { StatusBadge } from "../../components/StatusBadge";
import { PageScaffold } from "../shared/PageScaffold";

const inverterStatus = [
  { label: "INV-01", power: "128 kW", status: "connected" as const },
  { label: "INV-02", power: "122 kW", status: "connected" as const },
  { label: "INV-03", power: "117 kW", status: "connected" as const },
  { label: "INV-04", power: "96 kW", status: "connecting" as const }
];

export function Solar() {
  return (
    <PageScaffold
      path="/solar"
      description="播放頁中的太陽能主視角，顯示發電輸出、逆變器運作與日照對應資訊。"
    >
      <DataCardGrid columns={4}>
        {liveMetrics.slice(0, 4).map((metric) => (
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
        <PanelCard title="日照與輸出" subtitle="SOLAR OUTPUT" className="col-span-7">
          <div className="grid grid-cols-2 gap-5">
            <div className="rounded-xl bg-brand-900 p-5 text-white">
              <p className="font-en text-xs uppercase tracking-[0.22em] text-brand-100">Irradiance</p>
              <p className="mt-4 text-5xl font-bold">782</p>
              <p className="mt-2 text-lg text-brand-100">W/m²</p>
            </div>
            <div className="rounded-xl bg-neutral-100 p-5">
              <p className="font-en text-xs uppercase tracking-[0.22em] text-neutral-500">Module Temp</p>
              <p className="mt-4 text-5xl font-bold text-brand-900">43</p>
              <p className="mt-2 text-lg text-neutral-600">°C</p>
            </div>
          </div>
          <Sparkline values={trendSeries} className="mt-8" />
        </PanelCard>
        <PanelCard title="逆變器狀態" subtitle="INVERTER" className="col-span-5">
          <div className="space-y-4">
            {inverterStatus.map((item) => (
              <div key={item.label} className="flex items-center justify-between rounded-xl bg-white/95 p-4 shadow-soft">
                <div>
                  <p className="text-lg font-semibold text-neutral-800">{item.label}</p>
                  <p className="text-sm text-neutral-500">{item.power}</p>
                </div>
                <StatusBadge status={item.status} />
              </div>
            ))}
          </div>
        </PanelCard>
      </div>
    </PageScaffold>
  );
}
