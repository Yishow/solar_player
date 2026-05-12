import { FlowNode } from "../../components/FlowNode";
import { FlowConnector } from "../../components/FlowConnector";
import { MetricCard } from "../../components/MetricCard";
import { DataCardGrid } from "../../components/DataCardGrid";
import { PanelCard } from "../../components/PanelCard";
import { SectionTitle } from "../../components/SectionTitle";
import { PageScaffold } from "../shared/PageScaffold";
import { circuitMocks } from "../../mocks/circuits";

export function FactoryCircuit() {
  const totalPower = circuitMocks.reduce((sum, c) => sum + c.powerKw, 0);
  const maxCapacity = 650; // kW assumed rated capacity

  return (
    <PageScaffold
      path="/factory-circuit"
      description="廠區各用電迴路即時數據與負載狀態。"
    >
      <SectionTitle title="廠區用電迴路" subtitle="FACTORY CIRCUIT" />

      {/* Flow Diagram */}
      <PanelCard title="配電流程" subtitle="POWER DISTRIBUTION">
        <div className="flex items-center gap-3">
          <FlowNode icon="☀️" label="太陽能板" value="586 kW" footnote="發電端" />
          <FlowConnector direction="horizontal" label="DC" />
          <FlowNode icon="🔄" label="逆變器" value="AC" footnote="轉交流電" />
          <FlowConnector direction="horizontal" label="AC" />
          <FlowNode icon="🔌" label="配電盤" value={`${totalPower} kW`} footnote="總用電" />
        </div>
      </PanelCard>

      {/* Circuit Cards */}
      <PanelCard title="迴路用電" subtitle="CIRCUIT CONSUMPTION">
        <div className="space-y-4">
          {circuitMocks.map((circuit) => {
            const percentage = circuit.powerKw > 0 ? Math.round((circuit.powerKw / (maxCapacity / circuitMocks.length)) * 100) : 0;
            const barColor =
              percentage > 80
                ? "bg-red-500"
                : percentage > 60
                  ? "bg-yellow-500"
                  : "bg-green-500";

            return (
              <div
                key={circuit.id}
                className="flex items-center gap-4 rounded-lg border border-white/60 bg-white/80 p-4"
              >
                <div className="w-28 text-sm font-semibold text-neutral-800">{circuit.id}</div>
                <div className="w-36 text-sm text-neutral-700">{circuit.label}</div>
                <div className="min-w-40 flex-1">
                  <div className="h-3 overflow-hidden rounded-full bg-neutral-100">
                    <div
                      className={`h-full rounded-full ${barColor}`}
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                  </div>
                </div>
                <div className="w-20 text-right text-lg font-bold text-brand-900">
                  {circuit.powerKw} <span className="text-sm font-normal text-neutral-500">kW</span>
                </div>
                <div className="w-20 text-right text-sm text-neutral-500">{percentage}%</div>
              </div>
            );
          })}
        </div>
      </PanelCard>

      {/* Bottom KPI */}
      <DataCardGrid columns={3}>
        <MetricCard icon="🔌" label="總用電量" value={`${totalPower}`} unit="kW" helper="6 個迴路加總" />
        <MetricCard icon="☀️" label="太陽能佔比" value="44" unit="%" helper="綠電覆蓋率" />
        <MetricCard icon="🏭" label="市電補充" value={`${maxCapacity - totalPower}`} unit="kW" helper="電網補足" />
      </DataCardGrid>
    </PageScaffold>
  );
}
