import type { CircuitConfig } from "@solar-display/shared";
import { useEffect, useState } from "react";
import { FlowNode } from "../../components/FlowNode";
import { FlowConnector } from "../../components/FlowConnector";
import { MetricCard } from "../../components/MetricCard";
import { DataCardGrid } from "../../components/DataCardGrid";
import { PanelCard } from "../../components/PanelCard";
import { SectionTitle } from "../../components/SectionTitle";
import { requestJson } from "../../services/api";
import { PageScaffold } from "../shared/PageScaffold";

type CircuitWithLive = CircuitConfig & { livePowerKw: number };

function getStatusColor(percentage: number, circuit: CircuitConfig): string {
  if (percentage <= 0) return "text-neutral-400";
  const warnMin = circuit.warningMin ?? 0;
  const attenMin = circuit.attentionMin ?? 0;
  if (percentage >= warnMin) return "text-red-500";
  if (percentage >= attenMin) return "text-yellow-500";
  return "text-green-500";
}

function getStatusLabel(percentage: number, circuit: CircuitConfig): string {
  if (percentage <= 0) return "離線";
  const warnMin = circuit.warningMin ?? 0;
  const attenMin = circuit.attentionMin ?? 0;
  if (percentage >= warnMin) return "警告";
  if (percentage >= attenMin) return "注意";
  return "正常";
}

function getBarColor(percentage: number, circuit: CircuitConfig): string {
  if (percentage <= 0) return "bg-neutral-300";
  const warnMin = circuit.warningMin ?? 0;
  const attenMin = circuit.attentionMin ?? 0;
  if (percentage >= warnMin) return "bg-red-500";
  if (percentage >= attenMin) return "bg-yellow-500";
  return "bg-green-500";
}

export function FactoryCircuit() {
  const [circuits, setCircuits] = useState<CircuitWithLive[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const data = await requestJson<{ success: boolean; data: CircuitConfig[] }>("/api/circuits");
        if (active) {
          setCircuits(
            data.data
              .filter((c) => c.enabled)
              .map((c) => ({ ...c, livePowerKw: Math.round((c.ratedCapacity ?? 0) * 0.6 * 10) / 10 }))
          );
        }
      } catch {
        // fallback to empty on error
      } finally {
        if (active) setIsLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, []);

  const totalPower = circuits.reduce((sum, c) => sum + c.livePowerKw, 0);
  const totalCapacity = circuits.reduce((sum, c) => sum + (c.ratedCapacity ?? 0), 0);

  return (
    <PageScaffold path="/factory-circuit" description="廠區各用電迴路即時數據與負載狀態。">
      <SectionTitle title="廠區用電迴路" subtitle="FACTORY CIRCUIT" />

      <PanelCard title="配電流程" subtitle="POWER DISTRIBUTION">
        <div className="flex items-center gap-3">
          <FlowNode icon="☀️" label="太陽能板" value="586 kW" footnote="發電端" />
          <FlowConnector direction="horizontal" label="DC" />
          <FlowNode icon="🔄" label="逆變器" value="AC" footnote="轉交流電" />
          <FlowConnector direction="horizontal" label="AC" />
          <FlowNode icon="🔌" label="配電盤" value={`${Math.round(totalPower)} kW`} footnote="總用電" />
        </div>
      </PanelCard>

      <PanelCard title="迴路用電" subtitle="CIRCUIT CONSUMPTION">
        {isLoading ? (
          <p className="text-center text-neutral-500">載入中...</p>
        ) : (
          <div className="space-y-4">
            {circuits.map((circuit) => {
              const percentage = circuit.ratedCapacity && circuit.ratedCapacity > 0
                ? Math.round((circuit.livePowerKw / circuit.ratedCapacity) * 100)
                : 0;

              return (
                <div
                  key={circuit.id}
                  className="flex items-center gap-4 rounded-lg border border-white/60 bg-white/80 p-4"
                >
                  <div className="w-10 text-center text-xl">
                    {circuit.icon === "factory" ? "🏭" : circuit.icon === "wind" ? "❄️" : circuit.icon === "lightbulb" ? "💡" : circuit.icon === "building-2" ? "🏢" : circuit.icon === "battery-charging" ? "🔋" : "⚙️"}
                  </div>
                  <div className="w-36">
                    <div className="text-sm font-semibold text-neutral-800">{circuit.nameZh}</div>
                    <div className="text-xs text-neutral-500">{circuit.nameEn}</div>
                  </div>
                  <div className="min-w-40 flex-1">
                    <div className="h-3 overflow-hidden rounded-full bg-neutral-100">
                      <div
                        className={`h-full rounded-full ${getBarColor(percentage, circuit)} transition-[width] duration-500`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="w-24 text-right text-lg font-bold text-brand-900">
                    {circuit.livePowerKw} <span className="text-sm font-normal text-neutral-500">kW</span>
                  </div>
                  <div className={`w-16 text-right text-sm font-semibold ${getStatusColor(percentage, circuit)}`}>
                    {getStatusLabel(percentage, circuit)}
                  </div>
                  <div className="w-14 text-right text-sm text-neutral-500">{percentage}%</div>
                </div>
              );
            })}
          </div>
        )}
      </PanelCard>

      <DataCardGrid columns={3}>
        <MetricCard icon="🔌" label="總用電量" value={`${Math.round(totalPower)}`} unit="kW" helper={`${circuits.length} 個迴路加總`} />
        <MetricCard icon="☀️" label="太陽能佔比" value={String(totalCapacity > 0 ? Math.round((586 / totalCapacity) * 100) : 0)} unit="%" helper="綠電覆蓋率" />
        <MetricCard icon="🏭" label="市電補充" value={`${Math.max(0, Math.round(totalCapacity - totalPower))}`} unit="kW" helper="電網補足" />
      </DataCardGrid>
    </PageScaffold>
  );
}
