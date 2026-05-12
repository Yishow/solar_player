import type { CircuitConfig } from "@solar-display/shared";
import { useEffect, useState } from "react";
import { KioskButton } from "../../components/KioskButton";
import { KioskInput } from "../../components/KioskInput";
import { PanelCard } from "../../components/PanelCard";
import { requestJson } from "../../services/api";
import { PageScaffold } from "../shared/PageScaffold";

async function getCircuits() {
  const resp = await requestJson<{ success: boolean; data: CircuitConfig[] }>("/api/circuits");
  return resp.data;
}

async function createCircuit(data: Partial<CircuitConfig>) {
  const resp = await requestJson<{ success: boolean; data: CircuitConfig }>("/api/circuits", {
    method: "POST",
    body: JSON.stringify(data)
  });
  return resp.data;
}

async function updateCircuit(id: number, data: Partial<CircuitConfig>) {
  const resp = await requestJson<{ success: boolean; data: CircuitConfig }>(`/api/circuits/${id}`, {
    method: "PUT",
    body: JSON.stringify(data)
  });
  return resp.data;
}

async function deleteCircuit(id: number) {
  await requestJson<{ success: boolean }>(`/api/circuits/${id}`, { method: "DELETE" });
}

export function CircuitSettings() {
  const [circuits, setCircuits] = useState<CircuitConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("正在載入迴路設定...");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const data = await getCircuits();
        if (active) {
          setCircuits(data);
          setMessage("迴路設定已同步。");
        }
      } catch (e) {
        if (active) setErrorMessage(e instanceof Error ? e.message : "載入失敗");
      } finally {
        if (active) setIsLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, []);

  const handleAdd = async () => {
    try {
      const newCircuit = await createCircuit({
        nameZh: "新迴路",
        nameEn: "New Circuit",
        icon: "bolt",
        unit: "kW",
        ratedCapacity: 100
      });
      setCircuits((prev) => [...prev, newCircuit]);
      setMessage("已新增迴路。");
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "新增失敗");
    }
  };

  const handleUpdate = async (id: number, field: keyof CircuitConfig, value: string | number | boolean | null) => {
    setCircuits((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  };

  const handleSave = async (circuit: CircuitConfig) => {
    try {
      const updated = await updateCircuit(circuit.id, circuit);
      setCircuits((prev) => prev.map((c) => (c.id === circuit.id ? updated : c)));
      setMessage("已儲存。");
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "儲存失敗");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteCircuit(id);
      setCircuits((prev) => prev.filter((c) => c.id !== id));
      setMessage("已刪除。");
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "刪除失敗");
    }
  };

  return (
    <PageScaffold path="/settings/circuits" description="管理廠區用電迴路設定與 MQTT topic 對應。">
      <div className="grid grid-cols-12 gap-6">
        <PanelCard title="迴路清單" subtitle="CIRCUIT LIST" className="col-span-8">
          <div className="grid gap-4">
            {circuits.map((circuit) => (
              <div
                key={circuit.id}
                className="grid grid-cols-[1fr_1fr_140px_100px] items-center gap-4 rounded-xl border border-white/70 bg-white/95 p-4 shadow-soft"
              >
                <div>
                  <input
                    className="text-lg font-semibold text-neutral-800 bg-transparent border-none outline-none w-full"
                    value={circuit.nameZh ?? ""}
                    onChange={(e) => handleUpdate(circuit.id, "nameZh", e.target.value)}
                  />
                  <p className="text-sm text-neutral-500">{circuit.nameEn ?? ""}</p>
                </div>
                <KioskInput
                  label="MQTT Topic"
                  value={circuit.mqttTopic ?? ""}
                  onChange={(e) => handleUpdate(circuit.id, "mqttTopic", e.target.value)}
                />
                <KioskInput
                  label="額定容量 (kW)"
                  type="number"
                  value={String(circuit.ratedCapacity ?? 0)}
                  onChange={(e) => handleUpdate(circuit.id, "ratedCapacity", Number(e.target.value) || 0)}
                />
                <div className="flex gap-2">
                  <KioskButton variant="secondary" onClick={() => void handleSave(circuit)}>
                    儲存
                  </KioskButton>
                  <KioskButton variant="ghost" onClick={() => void handleDelete(circuit.id)}>
                    刪除
                  </KioskButton>
                </div>
              </div>
            ))}
          </div>
        </PanelCard>

        <PanelCard title="操作" subtitle="ACTIONS" className="col-span-4">
          <div className="grid gap-3">
            <KioskButton onClick={() => void handleAdd()}>新增迴路</KioskButton>
          </div>
          <div className="mt-4 rounded-xl border border-white/70 bg-white/90 p-4">
            <p className="text-sm font-medium text-neutral-600">{errorMessage || message}</p>
          </div>
        </PanelCard>
      </div>
    </PageScaffold>
  );
}
