import { PanelCard } from "../../components/PanelCard";
import { DataCardGrid } from "../../components/DataCardGrid";
import { MetricCard } from "../../components/MetricCard";
import { PageScaffold } from "../shared/PageScaffold";

// Mock daily summary data
const dailySummaries = Array.from({ length: 14 }, (_, i) => {
  const day = new Date();
  day.setDate(day.getDate() - (13 - i));
  const generation = 1800 + Math.random() * 1000;
  const consumption = 2200 + Math.random() * 800;
  const co2 = generation * 0.494;
  return {
    date: `${day.getMonth() + 1}/${day.getDate()}`,
    generation: Math.round(generation),
    consumption: Math.round(consumption),
    selfConsumption: Math.round(generation * (0.6 + Math.random() * 0.2)),
    co2: Math.round(co2),
    peakGeneration: Math.round(400 + Math.random() * 200),
    peakGenerationTime: `${6 + Math.floor(Math.random() * 8)}:${String(Math.floor(Math.random() * 60)).padStart(2, "0")}`,
    peakConsumption: Math.round(200 + Math.random() * 150),
    peakConsumptionTime: `${9 + Math.floor(Math.random() * 8)}:${String(Math.floor(Math.random() * 60)).padStart(2, "0")}`
  };
});

export function EnergyHistory() {
  const totals = dailySummaries.reduce(
    (acc, d) => ({
      generation: acc.generation + d.generation,
      consumption: acc.consumption + d.consumption,
      co2: acc.co2 + d.co2
    }),
    { generation: 0, consumption: 0, co2: 0 }
  );

  return (
    <PageScaffold
      path="/history"
      description="發電歷史紀錄：每日彙總、峰值數據、累積統計。"
    >
      <PanelCard title="發電歷史" subtitle="ENERGY DATA HISTORY">
        {/* Cumulative summary */}
        <DataCardGrid columns={3} className="mb-6">
          <MetricCard icon="☀️" label="14 日總發電" value={totals.generation.toLocaleString()} unit="kWh" />
          <MetricCard icon="🔌" label="14 日總用電" value={totals.consumption.toLocaleString()} unit="kWh" />
          <MetricCard icon="🌿" label="14 日 CO₂ 減量" value={totals.co2.toLocaleString()} unit="kg" />
        </DataCardGrid>

        {/* Daily summary table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-brand-100 text-left text-xs uppercase tracking-[0.15em] text-neutral-500">
                <th className="pb-3 pl-2">日期</th>
                <th className="pb-3">發電 (kWh)</th>
                <th className="pb-3">用電 (kWh)</th>
                <th className="pb-3">自用 (kWh)</th>
                <th className="pb-3">CO₂ (kg)</th>
                <th className="pb-3">峰值發電</th>
                <th className="pb-3">峰值用電</th>
              </tr>
            </thead>
            <tbody>
              {dailySummaries.map((d) => (
                <tr key={d.date} className="border-b border-neutral-100 hover:bg-brand-50/40">
                  <td className="py-3 pl-2 font-medium text-neutral-800">{d.date}</td>
                  <td className="py-3 text-brand-800">{d.generation.toLocaleString()}</td>
                  <td className="py-3 text-blue-700">{d.consumption.toLocaleString()}</td>
                  <td className="py-3 text-neutral-700">{d.selfConsumption.toLocaleString()}</td>
                  <td className="py-3 text-green-700">{d.co2.toLocaleString()}</td>
                  <td className="py-3 text-neutral-600">
                    {d.peakGeneration} <span className="text-xs text-neutral-400">kW</span>
                    <br />
                    <span className="text-xs text-neutral-400">{d.peakGenerationTime}</span>
                  </td>
                  <td className="py-3 text-neutral-600">
                    {d.peakConsumption} <span className="text-xs text-neutral-400">kW</span>
                    <br />
                    <span className="text-xs text-neutral-400">{d.peakConsumptionTime}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PanelCard>
    </PageScaffold>
  );
}
