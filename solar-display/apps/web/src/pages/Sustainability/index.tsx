import { sustainabilityHighlights, sustainabilitySummary } from "../../mocks/sustainability";
import { DataCardGrid } from "../../components/DataCardGrid";
import { LeafOrnament } from "../../components/LeafOrnament";
import { MetricCard } from "../../components/MetricCard";
import { PanelCard } from "../../components/PanelCard";
import { PageScaffold } from "../shared/PageScaffold";

export function Sustainability() {
  return (
    <PageScaffold
      path="/sustainability"
      description="永續成果頁以累積綠電、碳減量與等效植樹等數據，展示整體 ESG 效益。"
    >
      <DataCardGrid columns={4}>
        {sustainabilityHighlights.map((item) => (
          <MetricCard key={item.label} icon="🌱" label={item.label} value={item.value} unit={item.unit} />
        ))}
      </DataCardGrid>
      <div className="grid grid-cols-12 gap-6">
        <PanelCard title="年度累積成果" subtitle="CUMULATIVE IMPACT" className="col-span-8">
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-brand-900 p-5 text-white">
              <p className="font-en text-xs uppercase tracking-[0.22em] text-brand-100">Generation</p>
              <p className="mt-4 text-5xl font-bold">{sustainabilitySummary.accumulatedGenerationMwh}</p>
              <p className="mt-2 text-lg text-brand-100">MWh</p>
            </div>
            <div className="rounded-xl bg-white/95 p-5">
              <p className="font-en text-xs uppercase tracking-[0.22em] text-neutral-500">Carbon Reduction</p>
              <p className="mt-4 text-5xl font-bold text-brand-900">
                {sustainabilitySummary.accumulatedCarbonReductionTons}
              </p>
              <p className="mt-2 text-lg text-neutral-600">tCO₂e</p>
            </div>
          </div>
        </PanelCard>
        <PanelCard title="永續換算" subtitle="EQUIVALENT" className="col-span-4">
          <div className="flex h-full flex-col justify-between rounded-xl bg-brand-100 p-5">
            <LeafOrnament />
            <div className="space-y-3">
              <p className="text-3xl font-bold text-brand-900">
                {sustainabilitySummary.plantedTreeEquivalent.toLocaleString()} 株
              </p>
              <p className="text-sm leading-7 text-neutral-600">
                約可供應 {sustainabilitySummary.annualHouseholdSupply} 戶家庭一年用電，作為現場 ESG 展示主敘事。
              </p>
            </div>
          </div>
        </PanelCard>
      </div>
    </PageScaffold>
  );
}
