import { FlowNode } from "../../components/FlowNode";
import { FlowConnector } from "../../components/FlowConnector";
import { MetricCard } from "../../components/MetricCard";
import { DataCardGrid } from "../../components/DataCardGrid";
import { PanelCard } from "../../components/PanelCard";
import { SectionTitle } from "../../components/SectionTitle";
import { PageScaffold } from "../shared/PageScaffold";
import { liveMetrics } from "../../mocks/metrics";

export function Solar() {
  return (
    <PageScaffold
      path="/solar"
      description="太陽能發電流程：面板 → 變流器 → 配電 → 效益。"
    >
      <SectionTitle title="太陽能發電流程" subtitle="SOLAR POWER FLOW" />

      {/* Flow Diagram */}
      <PanelCard title="發電流程" subtitle="POWER GENERATION FLOW">
        <div className="flex items-center gap-3">
          <FlowNode icon="☀️" label="太陽能板" value="586 kW" footnote="14 組陣列在線" />
          <FlowConnector direction="horizontal" label="DC" />
          <FlowNode icon="🔄" label="變流器" value="96.2%" footnote="轉換效率" />
          <FlowConnector direction="horizontal" label="AC" />
          <FlowNode icon="🏭" label="工廠用電" value="412 kW" footnote="自用 71%" />
          <FlowConnector direction="horizontal" label="CO₂" />
          <FlowNode icon="🌿" label="CO₂ 效益" value="1.24 t" footnote="本日減量" />
        </div>
      </PanelCard>

      {/* KPI Cards */}
      <PanelCard title="即時數據" subtitle="LIVE DATA">
        <DataCardGrid columns={3}>
          <MetricCard icon="⚡" label="即時發電功率" value="586" unit="kW" helper="峰值 642 kW" />
          <MetricCard icon="📊" label="系統效率" value="96.2" unit="%" helper="逆變器轉換率" />
          <MetricCard icon="☀️" label="今日發電量" value="2,340" unit="kWh" helper="目標 78%" />
        </DataCardGrid>
      </PanelCard>
    </PageScaffold>
  );
}
