import { circuitMocks } from "../../mocks/circuits";
import { KioskSelect } from "../../components/KioskSelect";
import { KioskToggle } from "../../components/KioskToggle";
import { PanelCard } from "../../components/PanelCard";
import { PageScaffold } from "../shared/PageScaffold";

export function CircuitSettings() {
  return (
    <PageScaffold
      path="/settings/circuits"
      description="各迴路的顯示啟用、排序與群組設定頁，用 mock data 代表後續真實配置。"
    >
      <PanelCard title="顯示迴路設定" subtitle="CIRCUIT DISPLAY CONFIG">
        <div className="grid grid-cols-2 gap-4">
          {circuitMocks.map((circuit) => (
            <div key={circuit.id} className="rounded-xl border border-white/70 bg-white/92 p-4 shadow-soft">
              <div className="mb-4">
                <p className="text-lg font-semibold text-neutral-800">{circuit.label}</p>
                <p className="text-sm text-neutral-500">{circuit.id}</p>
              </div>
              <div className="space-y-3">
                <KioskSelect
                  label="分組"
                  defaultValue="production"
                  options={[
                    { label: "Production", value: "production" },
                    { label: "Monitoring", value: "monitoring" }
                  ]}
                />
                <KioskToggle checked={circuit.status !== "disconnected"} label="顯示於前台" />
              </div>
            </div>
          ))}
        </div>
      </PanelCard>
    </PageScaffold>
  );
}
