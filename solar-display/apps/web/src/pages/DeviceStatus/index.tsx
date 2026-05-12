import { deviceMetrics } from "../../mocks/metrics";
import { DataCardGrid } from "../../components/DataCardGrid";
import { MetricCard } from "../../components/MetricCard";
import { PanelCard } from "../../components/PanelCard";
import { StatusBadge } from "../../components/StatusBadge";
import { PageScaffold } from "../shared/PageScaffold";

const serviceStatus = [
  { label: "Web Player", status: "connected" as const, detail: "Port 5173 Active" },
  { label: "Fastify API", status: "connected" as const, detail: "Port 3000 /health OK" },
  { label: "MQTT Worker", status: "connecting" as const, detail: "Retrying Broker Session" },
  { label: "Image Cache", status: "connected" as const, detail: "5 Assets Synced" }
];

export function DeviceStatus() {
  return (
    <PageScaffold
      path="/device-status"
      description="裝置狀態頁用於現場維運，集中顯示播放器主機資源與各服務健康度。"
    >
      <DataCardGrid columns={4}>
        {deviceMetrics.map((metric) => (
          <MetricCard key={metric.label} icon="🖥️" label={metric.label} value={metric.value} unit={metric.unit} />
        ))}
      </DataCardGrid>
      <PanelCard title="服務健康度" subtitle="SERVICE HEALTH">
        <div className="grid grid-cols-2 gap-4">
          {serviceStatus.map((service) => (
            <div key={service.label} className="flex items-center justify-between rounded-xl bg-white/95 p-4 shadow-soft">
              <div>
                <p className="text-lg font-semibold text-neutral-800">{service.label}</p>
                <p className="text-sm text-neutral-500">{service.detail}</p>
              </div>
              <StatusBadge status={service.status} />
            </div>
          ))}
        </div>
      </PanelCard>
    </PageScaffold>
  );
}
