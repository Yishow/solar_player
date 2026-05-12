import { KioskButton } from "../../components/KioskButton";
import { KioskInput } from "../../components/KioskInput";
import { KioskSelect } from "../../components/KioskSelect";
import { KioskToggle } from "../../components/KioskToggle";
import { PanelCard } from "../../components/PanelCard";
import { StatusBadge } from "../../components/StatusBadge";
import { PageScaffold } from "../shared/PageScaffold";

export function MqttSettings() {
  return (
    <PageScaffold
      path="/settings/mqtt"
      description="MQTT 連線設定與監看頁，提供 broker、topic 與連線健康度的 mock 管理介面。"
    >
      <div className="grid grid-cols-12 gap-6">
        <PanelCard title="Broker 設定" subtitle="MQTT BROKER" className="col-span-7">
          <div className="grid grid-cols-2 gap-4">
            <KioskInput label="Host" defaultValue="mqtt.kuozui.local" />
            <KioskInput label="Port" defaultValue="1883" />
            <KioskInput label="Publish Topic" defaultValue="solar/live/metrics" />
            <KioskSelect
              label="QoS"
              defaultValue="1"
              options={[
                { label: "QoS 0", value: "0" },
                { label: "QoS 1", value: "1" },
                { label: "QoS 2", value: "2" }
              ]}
            />
          </div>
        </PanelCard>
        <PanelCard title="連線狀態" subtitle="CONNECTION" className="col-span-5">
          <div className="space-y-4">
            <StatusBadge status="connected" label="Broker 已連線" />
            <KioskToggle checked label="啟用 TLS" description="正式環境建議開啟" />
            <KioskButton>重新連線</KioskButton>
          </div>
        </PanelCard>
      </div>
    </PageScaffold>
  );
}
