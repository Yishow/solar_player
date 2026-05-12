import { circuitMocks } from "../../mocks/circuits";
import { FlowConnector } from "../../components/FlowConnector";
import { FlowNode } from "../../components/FlowNode";
import { PanelCard } from "../../components/PanelCard";
import { StatusBadge } from "../../components/StatusBadge";
import { PageScaffold } from "../shared/PageScaffold";

export function FactoryCircuit() {
  return (
    <PageScaffold
      path="/factory-circuit"
      description="展示工廠綠電流向與各迴路功率配置，讓現場能快速理解發電與用電分配。"
    >
      <PanelCard title="綠電流向圖" subtitle="ENERGY FLOW">
        <div className="grid grid-cols-[1fr_120px_1fr_120px_1fr] items-center gap-4">
          <FlowNode icon="☀️" label="太陽能板陣列" value="586 kW" footnote="主來源" />
          <FlowConnector label="INPUT" />
          <FlowNode icon="🔋" label="PCS / 匯流箱" value="548 kW" footnote="轉換效率 93.5%" />
          <FlowConnector label="ROUTE" />
          <FlowNode icon="🏭" label="中廠用電端" value="417 kW" footnote="自用率 71%" />
        </div>
      </PanelCard>
      <PanelCard title="迴路詳細資料" subtitle="CIRCUIT DETAIL">
        <div className="grid grid-cols-3 gap-4">
          {circuitMocks.map((circuit) => (
            <div key={circuit.id} className="rounded-xl border border-neutral-100 bg-white/92 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-neutral-800">{circuit.label}</p>
                  <p className="text-sm text-neutral-500">{circuit.zone}</p>
                </div>
                <StatusBadge status={circuit.status} />
              </div>
              <div className="mt-4 flex items-end justify-between">
                <p className="text-3xl font-bold text-brand-900">{circuit.powerKw} kW</p>
                <p className="text-sm text-neutral-500">效率 {circuit.efficiency}%</p>
              </div>
            </div>
          ))}
        </div>
      </PanelCard>
    </PageScaffold>
  );
}
