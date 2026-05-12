import { trendSeries } from "../../mocks/metrics";
import { BilingualLabel } from "../../components/BilingualLabel";
import { KioskButton } from "../../components/KioskButton";
import { PanelCard } from "../../components/PanelCard";
import { Sparkline } from "../../components/Sparkline";
import { PageScaffold } from "../shared/PageScaffold";

export function EnergyTrend() {
  return (
    <PageScaffold
      path="/trends"
      description="管理頁中的趨勢檢視，用 mock 方式呈現日、週、月發電趨勢與觀測摘要。"
    >
      <div className="grid grid-cols-12 gap-6">
        <PanelCard title="期間切換" subtitle="RANGE SWITCH" className="col-span-4">
          <div className="grid grid-cols-2 gap-3">
            <KioskButton>日</KioskButton>
            <KioskButton variant="secondary">週</KioskButton>
            <KioskButton variant="secondary">月</KioskButton>
            <KioskButton variant="ghost">年</KioskButton>
          </div>
        </PanelCard>
        <PanelCard title="發電趨勢圖" subtitle="TREND CHART" className="col-span-8">
          <Sparkline values={trendSeries} className="h-32" />
        </PanelCard>
      </div>
      <PanelCard title="趨勢摘要" subtitle="INSIGHTS">
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl bg-white/92 p-4">
            <BilingualLabel title="尖峰時段" subtitle="Peak Window" accent />
            <p className="mt-4 text-3xl font-bold text-brand-900">11:40</p>
          </div>
          <div className="rounded-xl bg-white/92 p-4">
            <BilingualLabel title="平均功率" subtitle="Average Output" accent />
            <p className="mt-4 text-3xl font-bold text-brand-900">542 kW</p>
          </div>
          <div className="rounded-xl bg-white/92 p-4">
            <BilingualLabel title="波動幅度" subtitle="Variance" accent />
            <p className="mt-4 text-3xl font-bold text-brand-900">±8.2%</p>
          </div>
        </div>
      </PanelCard>
    </PageScaffold>
  );
}
