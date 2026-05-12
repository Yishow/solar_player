import { MetricCard } from "../../components/MetricCard";
import { DataCardGrid } from "../../components/DataCardGrid";
import { PanelCard } from "../../components/PanelCard";
import { PageScaffold } from "../shared/PageScaffold";
import { sustainabilitySummary, sustainabilityHighlights } from "../../mocks/sustainability";

export function Sustainability() {
  return (
    <PageScaffold
      path="/sustainability"
      description="永續成果展示：累積發電、CO₂ 減量、ESG 貢獻。"
    >
      {/* Hero */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-green-600/85 to-emerald-700/80 p-8 text-white shadow-panel">
        <div className="absolute right-12 top-6 opacity-15">
          <svg width="160" height="160" viewBox="0 0 100 100" fill="currentColor">
            <path d="M50 10 C30 10 15 30 15 50 C15 70 30 90 50 90 C70 90 85 70 85 50 C85 30 70 10 50 10 Z M50 20 C60 20 70 30 75 42 C68 36 58 32 50 32 C42 32 32 36 25 42 C30 30 40 20 50 20 Z" />
          </svg>
        </div>
        <h1 className="text-4xl font-bold">永續成果展示</h1>
        <p className="mt-3 text-lg opacity-90">Sustainability Achievements — 從太陽能到 ESG 的完整成果</p>
      </div>

      {/* Big Numbers */}
      <DataCardGrid columns={3}>
        <div className="rounded-xl border border-white/70 bg-white/85 p-8 text-center shadow-card backdrop-blur">
          <p className="text-5xl font-bold text-brand-900">{sustainabilitySummary.accumulatedGenerationMwh.toLocaleString()}</p>
          <p className="mt-2 text-lg font-medium text-neutral-700">MWh</p>
          <p className="mt-1 text-sm text-neutral-500">累積發電量</p>
        </div>
        <div className="rounded-xl border border-white/70 bg-white/85 p-8 text-center shadow-card backdrop-blur">
          <p className="text-5xl font-bold text-green-700">{sustainabilitySummary.accumulatedCarbonReductionTons.toLocaleString()}</p>
          <p className="mt-2 text-lg font-medium text-neutral-700">tons CO₂e</p>
          <p className="mt-1 text-sm text-neutral-500">累積碳減量</p>
        </div>
        <div className="rounded-xl border border-white/70 bg-white/85 p-8 text-center shadow-card backdrop-blur">
          <p className="text-5xl font-bold text-emerald-700">{sustainabilitySummary.plantedTreeEquivalent.toLocaleString()}</p>
          <p className="mt-2 text-lg font-medium text-neutral-700">株 🌳</p>
          <p className="mt-1 text-sm text-neutral-500">等效植樹</p>
        </div>
      </DataCardGrid>

      {/* Highlights */}
      <PanelCard title="永續亮點" subtitle="SUSTAINABILITY HIGHLIGHTS">
        <DataCardGrid columns={4}>
          {sustainabilityHighlights.map((item) => (
            <MetricCard
              key={item.label}
              icon={item.unit === "株" ? "🌳" : item.unit === "%" ? "📊" : item.unit === "MWh" ? "⚡" : "🌿"}
              label={item.label}
              value={item.value}
              unit={item.unit}
            />
          ))}
        </DataCardGrid>
      </PanelCard>

      {/* ESG */}
      <PanelCard title="ESG 貢獻" subtitle="ESG CONTRIBUTIONS">
        <div className="grid grid-cols-3 gap-6 text-center">
          <div>
            <p className="text-3xl font-bold text-brand-800">71%</p>
            <p className="mt-1 text-neutral-600">綠電自用率</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-brand-800">{sustainabilitySummary.annualHouseholdSupply}</p>
            <p className="mt-1 text-neutral-600">等效家庭年用電</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-brand-800">98.6%</p>
            <p className="mt-1 text-neutral-600">設備可用率</p>
          </div>
        </div>
      </PanelCard>
    </PageScaffold>
  );
}
