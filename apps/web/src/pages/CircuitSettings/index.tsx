import type { CircuitConfig } from "@solar-display/shared";
import { useEffect, useMemo, useState } from "react";
import { KioskButton } from "../../components/KioskButton";
import { PanelCard } from "../../components/PanelCard";
import { StatusBadge } from "../../components/StatusBadge";
import { requestJson } from "../../services/api";
import { PageScaffold } from "../shared/PageScaffold";
import { buildCircuitSettingsViewModel } from "./viewModel";

type CircuitListResponse = {
  success: boolean;
  data: CircuitConfig[];
  error?: string;
};

type CircuitMutationResponse = {
  success: boolean;
  data: CircuitConfig | null;
  error?: string;
};

type CircuitDeleteResponse = {
  success: boolean;
  data?: { id: number };
  error?: string;
};

function SummaryCard({
  helper,
  label,
  value
}: {
  helper: string;
  label: string;
  value: string;
}) {
  return (
    <article className="rounded-[28px] border border-white/75 bg-[linear-gradient(145deg,rgba(255,255,255,0.98),rgba(241,246,235,0.82))] p-5 shadow-card">
      <p className="text-sm font-medium tracking-[0.08em] text-neutral-600">{label}</p>
      <p className="mt-3 text-3xl font-bold leading-tight text-brand-900">{value}</p>
      <p className="mt-3 text-sm text-neutral-500">{helper}</p>
    </article>
  );
}

function readCircuitOrThrow(response: CircuitMutationResponse, fallbackMessage: string) {
  if (!response.success || !response.data) {
    throw new Error(response.error ?? fallbackMessage);
  }

  return response.data;
}

async function getCircuits() {
  const response = await requestJson<CircuitListResponse>("/api/circuits");

  if (!response.success) {
    throw new Error(response.error ?? "載入迴路設定失敗。");
  }

  return response.data;
}

async function createCircuit(data: Partial<CircuitConfig>) {
  const response = await requestJson<CircuitMutationResponse>("/api/circuits", {
    body: JSON.stringify(data),
    method: "POST"
  });

  return readCircuitOrThrow(response, "新增迴路失敗。");
}

async function updateCircuit(id: number, data: Partial<CircuitConfig>) {
  const response = await requestJson<CircuitMutationResponse>(`/api/circuits/${id}`, {
    body: JSON.stringify(data),
    method: "PUT"
  });

  return readCircuitOrThrow(response, "儲存迴路設定失敗。");
}

async function deleteCircuit(id: number) {
  const response = await requestJson<CircuitDeleteResponse>(`/api/circuits/${id}`, {
    method: "DELETE"
  });

  if (!response.success) {
    throw new Error(response.error ?? "刪除迴路失敗。");
  }
}

function toCircuitPayload(circuit: CircuitConfig): Omit<CircuitConfig, "id"> {
  const { id: _id, ...payload } = circuit;
  return payload;
}

function buildNewCircuitDraft(circuits: CircuitConfig[]): Partial<CircuitConfig> {
  const nextOrder =
    circuits.reduce((maxOrder, circuit) => Math.max(maxOrder, circuit.displayOrder ?? 0), 0) + 1;

  return {
    attentionMax: 90,
    attentionMin: 70,
    displayOrder: nextOrder,
    enabled: true,
    icon: "bolt",
    mqttTopic: "",
    nameEn: "New Circuit",
    nameZh: "新迴路",
    normalMax: 70,
    normalMin: 0,
    ratedCapacity: 100,
    unit: "kW",
    warningMax: 100,
    warningMin: 90
  };
}

function parseNumberInput(value: string, fallback = 0) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function renderFeedbackTone(tone: "error" | "loading" | "ready") {
  switch (tone) {
    case "error":
      return "border-[rgba(230,0,18,0.18)] bg-[rgba(255,241,241,0.96)]";
    case "loading":
      return "border-[rgba(138,148,132,0.18)] bg-[rgba(249,249,247,0.92)]";
    default:
      return "border-[rgba(78,121,55,0.18)] bg-[rgba(244,248,239,0.92)]";
  }
}

export function CircuitSettings() {
  const [circuits, setCircuits] = useState<CircuitConfig[]>([]);
  const [dirtyIds, setDirtyIds] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isReloading, setIsReloading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [message, setMessage] = useState("正在載入迴路設定...");
  const [errorMessage, setErrorMessage] = useState("");

  const loadCircuits = async ({ silent = false }: { silent?: boolean } = {}) => {
    if (silent) {
      setIsReloading(true);
    } else {
      setIsLoading(true);
    }

    try {
      const nextCircuits = await getCircuits();
      setCircuits(nextCircuits);
      setDirtyIds([]);
      setMessage("迴路設定已同步。");
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "載入迴路設定失敗。");
    } finally {
      if (silent) {
        setIsReloading(false);
      } else {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      try {
        const nextCircuits = await getCircuits();

        if (!active) {
          return;
        }

        setCircuits(nextCircuits);
        setDirtyIds([]);
        setMessage("迴路設定已同步。");
        setErrorMessage("");
      } catch (error) {
        if (!active) {
          return;
        }

        setErrorMessage(error instanceof Error ? error.message : "載入迴路設定失敗。");
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void bootstrap();

    return () => {
      active = false;
    };
  }, []);

  const viewModel = useMemo(
    () =>
      buildCircuitSettingsViewModel({
        circuits,
        errorMessage,
        isLoading,
        message
      }),
    [circuits, errorMessage, isLoading, message]
  );

  const markDirty = (id: number, nextMessage = "迴路設定已變更，尚未儲存。") => {
    setDirtyIds((current) => (current.includes(id) ? current : [...current, id]));
    setMessage(nextMessage);
    setErrorMessage("");
  };

  const handleFieldChange = <Key extends keyof CircuitConfig>(
    id: number,
    key: Key,
    value: CircuitConfig[Key]
  ) => {
    markDirty(id);
    setCircuits((current) =>
      current.map((circuit) =>
        circuit.id === id
          ? {
              ...circuit,
              [key]: value
            }
          : circuit
      )
    );
  };

  const handleAdd = async () => {
    setIsAdding(true);
    setErrorMessage("");

    try {
      const created = await createCircuit(buildNewCircuitDraft(circuits));
      setCircuits((current) => [...current, created]);
      setMessage("已新增迴路，請補齊欄位後按下儲存設定。");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "新增迴路失敗。");
    } finally {
      setIsAdding(false);
    }
  };

  const handleSaveAll = async () => {
    if (dirtyIds.length === 0) {
      setMessage("目前沒有待儲存的變更。");
      setErrorMessage("");
      return;
    }

    setIsSaving(true);
    setErrorMessage("");
    setMessage(`正在儲存 ${dirtyIds.length} 筆迴路設定...`);

    try {
      const dirtySet = new Set(dirtyIds);
      const updatedCircuits = await Promise.all(
        circuits
          .filter((circuit) => dirtySet.has(circuit.id))
          .map(async (circuit) => ({
            id: circuit.id,
            updated: await updateCircuit(circuit.id, toCircuitPayload(circuit))
          }))
      );

      setCircuits((current) =>
        current.map((circuit) => updatedCircuits.find((entry) => entry.id === circuit.id)?.updated ?? circuit)
      );
      setDirtyIds([]);
      setMessage("迴路設定已儲存。");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "儲存迴路設定失敗。");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    setErrorMessage("");

    try {
      await deleteCircuit(id);
      setCircuits((current) => current.filter((circuit) => circuit.id !== id));
      setDirtyIds((current) => current.filter((currentId) => currentId !== id));
      setMessage("已刪除迴路。");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "刪除迴路失敗。");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <PageScaffold path="/settings/circuits" description="管理廠區用電迴路設定與 MQTT topic 對應。">
      <div className="grid grid-cols-4 gap-4">
        <SummaryCard
          label="迴路總數"
          value={String(viewModel.summary.totalCircuitCount)}
          helper="目前 circuits route 已建立的設定筆數"
        />
        <SummaryCard
          label="顯示中"
          value={String(viewModel.summary.enabledCircuitCount)}
          helper="會在展示頁與 live metrics 中出現的迴路數量"
        />
        <SummaryCard
          label="隱藏中"
          value={String(viewModel.summary.disabledCircuitCount)}
          helper="保留設定但暫時不顯示的迴路數量"
        />
        <SummaryCard
          label="額定容量總和"
          value={viewModel.summary.capacityLabel}
          helper="所有迴路額定容量加總，方便對照門檻設定"
        />
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-9">
          <PanelCard title="迴路設定表" subtitle="CIRCUIT SETTINGS TABLE">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm leading-6 text-neutral-500">
                  對照 prototype 保留新增迴路、儲存設定、門檻欄位與顯示開關；本 change 僅處理
                  `/settings/circuits` 的 CRUD 與訊息回饋。
                </p>
                <p className="mt-1 text-sm leading-6 text-neutral-500">
                  門檻欄位延續既有 circuits API 數值，不變更 payload schema。
                </p>
              </div>
              <div className="flex shrink-0 gap-3">
                <KioskButton variant="secondary" disabled={isAdding} onClick={() => void handleAdd()}>
                  {isAdding ? "新增中..." : "新增迴路"}
                </KioskButton>
                <KioskButton disabled={isSaving} onClick={() => void handleSaveAll()}>
                  {isSaving ? "儲存中..." : "儲存設定"}
                </KioskButton>
              </div>
            </div>

            {isLoading ? (
              <div className="rounded-[28px] border border-dashed border-brand-200 bg-brand-50/60 px-6 py-10 text-center">
                <p className="text-2xl font-semibold text-brand-900">正在載入迴路設定</p>
                <p className="mt-3 text-sm leading-6 text-neutral-600">
                  先同步 circuits route，再建立可編輯的 CRUD table。
                </p>
              </div>
            ) : viewModel.emptyState ? (
              <div className="rounded-[28px] border border-dashed border-brand-200 bg-brand-50/60 px-6 py-10 text-center">
                <p className="text-2xl font-semibold text-brand-900">{viewModel.emptyState.title}</p>
                <p className="mt-3 text-sm leading-6 text-neutral-600">{viewModel.emptyState.description}</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-[28px] border border-white/70 bg-white/78">
                <table className="min-w-[1280px] text-left text-sm text-neutral-700">
                  <thead className="border-b border-neutral-200 bg-white/95 text-xs uppercase tracking-[0.18em] text-neutral-500">
                    <tr>
                      <th className="px-4 py-3">拖曳</th>
                      <th className="px-4 py-3">順序</th>
                      <th className="px-4 py-3">迴路名稱</th>
                      <th className="px-4 py-3">圖示</th>
                      <th className="px-4 py-3">單位</th>
                      <th className="px-4 py-3">MQTT Topic</th>
                      <th className="px-4 py-3">Normal</th>
                      <th className="px-4 py-3">Attention</th>
                      <th className="px-4 py-3">Warning</th>
                      <th className="px-4 py-3">顯示</th>
                      <th className="px-4 py-3">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewModel.rows.map((row) => {
                      const isDirty = dirtyIds.includes(row.id);

                      return (
                        <tr
                          key={row.id}
                          className={[
                            "border-b border-neutral-100 align-top last:border-b-0",
                            isDirty ? "bg-brand-50/45" : "bg-white/88"
                          ].join(" ")}
                        >
                          <td className="px-4 py-4 text-lg text-neutral-400">⠿</td>
                          <td className="px-4 py-4">
                            <input
                              type="number"
                              min={1}
                              value={row.displayOrder ?? 0}
                              onChange={(event) =>
                                handleFieldChange(row.id, "displayOrder", parseNumberInput(event.target.value, 1))
                              }
                              className="h-11 w-20 rounded-xl border border-neutral-200 bg-white px-3 text-sm shadow-soft outline-none focus:border-brand-500"
                            />
                            <p className="mt-2 text-xs text-neutral-400">目前排序：{row.orderLabel}</p>
                          </td>
                          <td className="px-4 py-4">
                            <input
                              value={row.nameZh ?? ""}
                              onChange={(event) => handleFieldChange(row.id, "nameZh", event.target.value)}
                              className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold shadow-soft outline-none focus:border-brand-500"
                            />
                            <input
                              value={row.nameEn ?? ""}
                              onChange={(event) => handleFieldChange(row.id, "nameEn", event.target.value)}
                              className="mt-2 h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm text-neutral-500 shadow-soft outline-none focus:border-brand-500"
                            />
                            <p className="mt-2 text-xs text-neutral-400">
                              額定容量 {row.ratedCapacity ?? 0} {row.unitLabel}
                            </p>
                          </td>
                          <td className="px-4 py-4">
                            <input
                              value={row.icon ?? ""}
                              onChange={(event) => handleFieldChange(row.id, "icon", event.target.value)}
                              className="h-11 w-28 rounded-xl border border-neutral-200 bg-white px-3 text-sm shadow-soft outline-none focus:border-brand-500"
                            />
                            <p className="mt-2 text-xs text-neutral-400">目前：{row.iconLabel}</p>
                          </td>
                          <td className="px-4 py-4">
                            <input
                              value={row.unit ?? ""}
                              onChange={(event) => handleFieldChange(row.id, "unit", event.target.value)}
                              className="h-11 w-20 rounded-xl border border-neutral-200 bg-white px-3 text-sm shadow-soft outline-none focus:border-brand-500"
                            />
                          </td>
                          <td className="px-4 py-4">
                            <input
                              value={row.mqttTopic ?? ""}
                              onChange={(event) => handleFieldChange(row.id, "mqttTopic", event.target.value)}
                              placeholder="factory/power/..."
                              className="h-11 w-full min-w-[220px] rounded-xl border border-neutral-200 bg-white px-3 text-sm shadow-soft outline-none focus:border-brand-500"
                            />
                            <p className="mt-2 text-xs text-neutral-400">{row.topicLabel}</p>
                          </td>
                          <td className="px-4 py-4">
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="number"
                                value={row.normalMin ?? 0}
                                onChange={(event) =>
                                  handleFieldChange(row.id, "normalMin", parseNumberInput(event.target.value))
                                }
                                className="h-11 rounded-xl border border-neutral-200 bg-white px-3 text-sm shadow-soft outline-none focus:border-brand-500"
                              />
                              <input
                                type="number"
                                value={row.normalMax ?? 0}
                                onChange={(event) =>
                                  handleFieldChange(row.id, "normalMax", parseNumberInput(event.target.value))
                                }
                                className="h-11 rounded-xl border border-neutral-200 bg-white px-3 text-sm shadow-soft outline-none focus:border-brand-500"
                              />
                            </div>
                            <p className="mt-2 text-xs text-neutral-400">{row.normalRangeLabel}</p>
                          </td>
                          <td className="px-4 py-4">
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="number"
                                value={row.attentionMin ?? 0}
                                onChange={(event) =>
                                  handleFieldChange(row.id, "attentionMin", parseNumberInput(event.target.value))
                                }
                                className="h-11 rounded-xl border border-[#e0b448] bg-[#fff7e4] px-3 text-sm shadow-soft outline-none focus:border-[#c79218]"
                              />
                              <input
                                type="number"
                                value={row.attentionMax ?? 0}
                                onChange={(event) =>
                                  handleFieldChange(row.id, "attentionMax", parseNumberInput(event.target.value))
                                }
                                className="h-11 rounded-xl border border-[#e0b448] bg-[#fff7e4] px-3 text-sm shadow-soft outline-none focus:border-[#c79218]"
                              />
                            </div>
                            <p className="mt-2 text-xs text-[#9b7121]">{row.attentionRangeLabel}</p>
                          </td>
                          <td className="px-4 py-4">
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="number"
                                value={row.warningMin ?? 0}
                                onChange={(event) =>
                                  handleFieldChange(row.id, "warningMin", parseNumberInput(event.target.value))
                                }
                                className="h-11 rounded-xl border border-[#dd8f78] bg-[#fff2ec] px-3 text-sm shadow-soft outline-none focus:border-[#c96745]"
                              />
                              <input
                                type="number"
                                value={row.warningMax ?? 0}
                                onChange={(event) =>
                                  handleFieldChange(row.id, "warningMax", parseNumberInput(event.target.value))
                                }
                                className="h-11 rounded-xl border border-[#dd8f78] bg-[#fff2ec] px-3 text-sm shadow-soft outline-none focus:border-[#c96745]"
                              />
                            </div>
                            <p className="mt-2 text-xs text-[#9f4324]">{row.warningRangeLabel}</p>
                          </td>
                          <td className="px-4 py-4">
                            <label className="inline-flex items-center gap-3 rounded-full bg-brand-50 px-3 py-2">
                              <input
                                type="checkbox"
                                checked={row.enabled}
                                onChange={(event) => handleFieldChange(row.id, "enabled", event.target.checked)}
                                className="h-4 w-4 accent-brand-700"
                              />
                              <span className="text-sm font-semibold text-brand-900">{row.visibilityLabel}</span>
                            </label>
                            <div className="mt-3">
                              <StatusBadge status={row.visibilityTone} label={row.statusLabel} />
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex flex-col items-start gap-3">
                              <button
                                type="button"
                                onClick={() => void handleDelete(row.id)}
                                disabled={deletingId === row.id}
                                className="text-sm font-semibold text-[var(--color-status-error-500)] disabled:opacity-60"
                              >
                                {deletingId === row.id ? "刪除中..." : "刪除"}
                              </button>
                              <StatusBadge
                                status={isDirty ? "connecting" : row.statusTone}
                                label={isDirty ? "待儲存" : row.visibilityLabel}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-5 rounded-2xl border border-dashed border-brand-200 bg-brand-50/70 px-5 py-4 text-sm text-brand-900">
              <p className="font-semibold">狀態說明 / Status Legend</p>
              <p className="mt-2 leading-6">
                Normal 代表負載在日常區間內，Attention 代表接近上限，Warning 代表已進入警示範圍。這些欄位維持
                circuits API 既有數值語意，不在本 change 內重設 schema。
              </p>
            </div>
          </PanelCard>
        </div>

        <div className="col-span-3">
          <PanelCard title="CRUD 狀態" subtitle="ACTION FEEDBACK">
            <div
              className={[
                "rounded-[28px] border px-5 py-5 shadow-soft",
                renderFeedbackTone(viewModel.feedbackBanner.tone)
              ].join(" ")}
            >
              <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">目前訊息</p>
              <p className="mt-3 text-2xl font-semibold text-neutral-800">{viewModel.feedbackBanner.title}</p>
              <p className="mt-3 text-sm leading-6 text-neutral-600">{viewModel.feedbackBanner.detail}</p>
            </div>

            <div className="mt-4 grid gap-4">
              <div className="rounded-2xl border border-white/70 bg-white/90 p-4 shadow-soft">
                <p className="text-sm font-medium tracking-[0.08em] text-neutral-500">待儲存變更</p>
                <p className="mt-2 text-3xl font-semibold text-brand-900">{dirtyIds.length}</p>
                <p className="mt-2 text-sm text-neutral-500">只要欄位被編輯，就會在儲存前維持待儲存標記。</p>
              </div>

              <div className="rounded-2xl border border-white/70 bg-white/90 p-4 shadow-soft">
                <p className="text-sm font-medium tracking-[0.08em] text-neutral-500">目前範圍</p>
                <p className="mt-2 text-lg font-semibold text-neutral-800">只處理 /settings/circuits</p>
                <p className="mt-2 text-sm leading-6 text-neutral-500">
                  本 phase 不改 MQTT 設定、不改 monitoring 頁面，也不改 circuits API schema。
                </p>
              </div>

              <div className="grid gap-3">
                <KioskButton variant="ghost" disabled={isReloading} onClick={() => void loadCircuits({ silent: true })}>
                  {isReloading ? "重新整理中..." : "重新整理"}
                </KioskButton>
                <KioskButton variant="secondary" disabled={isSaving || dirtyIds.length === 0} onClick={() => void handleSaveAll()}>
                  {isSaving ? "儲存中..." : "只存目前變更"}
                </KioskButton>
              </div>
            </div>
          </PanelCard>
        </div>
      </div>
    </PageScaffold>
  );
}
