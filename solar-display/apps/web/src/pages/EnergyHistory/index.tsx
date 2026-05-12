import { KioskButton } from "../../components/KioskButton";
import { KioskInput } from "../../components/KioskInput";
import { PanelCard } from "../../components/PanelCard";
import { Sparkline } from "../../components/Sparkline";
import { PageScaffold } from "../shared/PageScaffold";

const historyTrend = [30, 44, 39, 52, 66, 63, 72, 68, 75, 83, 79, 88];

export function EnergyHistory() {
  return (
    <PageScaffold
      path="/history"
      description="管理者可查閱歷史發電紀錄與指定期間，用 placeholder 顯示日報查詢外觀。"
    >
      <div className="grid grid-cols-12 gap-6">
        <PanelCard title="查詢條件" subtitle="QUERY FILTER" className="col-span-4">
          <div className="space-y-4">
            <KioskInput label="開始日期" defaultValue="2026/05/01" />
            <KioskInput label="結束日期" defaultValue="2026/05/13" />
            <KioskButton>查詢歷史紀錄</KioskButton>
          </div>
        </PanelCard>
        <PanelCard title="歷史趨勢" subtitle="HISTORY TREND" className="col-span-8">
          <Sparkline values={historyTrend} className="h-32" />
          <div className="mt-5 grid grid-cols-3 gap-4">
            <div className="rounded-xl bg-white/95 p-4">
              <p className="text-sm text-neutral-500">區間總發電</p>
              <p className="mt-3 text-3xl font-bold text-brand-900">28.4 MWh</p>
            </div>
            <div className="rounded-xl bg-white/95 p-4">
              <p className="text-sm text-neutral-500">區間平均</p>
              <p className="mt-3 text-3xl font-bold text-brand-900">2.19 MWh</p>
            </div>
            <div className="rounded-xl bg-white/95 p-4">
              <p className="text-sm text-neutral-500">最高單日</p>
              <p className="mt-3 text-3xl font-bold text-brand-900">3.02 MWh</p>
            </div>
          </div>
        </PanelCard>
      </div>
    </PageScaffold>
  );
}
