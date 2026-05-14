import type { CircuitConfig } from "@solar-display/shared";
import { useEffect, useMemo, useState } from "react";
import { requestJson } from "../../services/api";
import { Switch } from "../../components/management";
import "./circuitSettings.css";
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

const ICON_GLYPH_MAP: Record<string, string> = {
  bolt: "⚡",
  car: "🚗",
  fan: "❄",
  light: "☀"
};

function iconGlyph(icon: string | null | undefined) {
  if (!icon) return "·";
  return ICON_GLYPH_MAP[icon] ?? "·";
}

function chipClass(tone: string) {
  if (tone === "success") return "mgmt-chip is-success";
  if (tone === "warning") return "mgmt-chip is-warning";
  if (tone === "danger") return "mgmt-chip is-danger";
  if (tone === "accent") return "mgmt-chip is-accent";
  return "mgmt-chip";
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
        if (!active) return;
        setCircuits(nextCircuits);
        setDirtyIds([]);
        setMessage("迴路設定已同步。");
        setErrorMessage("");
      } catch (error) {
        if (!active) return;
        setErrorMessage(error instanceof Error ? error.message : "載入迴路設定失敗。");
      } finally {
        if (active) setIsLoading(false);
      }
    };
    void bootstrap();
    return () => {
      active = false;
    };
  }, []);

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
      current.map((circuit) => (circuit.id === id ? { ...circuit, [key]: value } : circuit))
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
        current.map(
          (circuit) => updatedCircuits.find((entry) => entry.id === circuit.id)?.updated ?? circuit
        )
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

  const viewModel = useMemo(
    () =>
      buildCircuitSettingsViewModel({
        circuits,
        deletingId,
        dirtyIds,
        errorMessage,
        isAdding,
        isLoading,
        isReloading,
        isSaving,
        message
      }),
    [circuits, deletingId, dirtyIds, errorMessage, isAdding, isLoading, isReloading, isSaving, message]
  );

  const statusVariant =
    viewModel.feedbackBanner.tone === "error"
      ? "is-error"
      : viewModel.feedbackBanner.tone === "loading"
        ? "is-loading"
        : "";

  return (
    <div className="cs-page">
      <section className="cs-title">
        <h1>
          迴路<em>設定</em>
        </h1>
        <p>Circuit Settings</p>
      </section>

      <button
        type="button"
        className="mgmt-action cs-resync"
        disabled={viewModel.actions.reloadDisabled}
        onClick={() => void loadCircuits({ silent: true })}
      >
        {viewModel.actions.reloadLabel}
        <small>Resync</small>
      </button>
      <button
        type="button"
        className="mgmt-action cs-add"
        disabled={viewModel.actions.addDisabled}
        onClick={() => void handleAdd()}
      >
        {viewModel.actions.addLabel}
        <small>Add Circuit</small>
      </button>
      <button
        type="button"
        className="mgmt-action primary cs-save"
        disabled={viewModel.actions.saveDisabled}
        onClick={() => void handleSaveAll()}
      >
        {viewModel.actions.saveLabel}
        <small>Save Settings</small>
      </button>

      <div className={`mgmt-status cs-status ${statusVariant}`} role="status">
        {viewModel.feedbackBanner.title}
        {viewModel.feedbackBanner.detail ? (
          <>
            　·
            <span style={{ opacity: 0.78 }}>{viewModel.feedbackBanner.detail}</span>
          </>
        ) : null}
      </div>

      <section className="settings-card cs-card">
        <div className="settings-card__title">
          廠區用電迴路
          <small>Factory Circuits · 共 {viewModel.summary.totalCircuitCount} 筆</small>
        </div>

        <div className="cs-stats">
          <div className="cs-stat">
            <span className="cs-stat__label">
              迴路總數
              <small>Total</small>
            </span>
            <span className="cs-stat__value">{viewModel.summary.totalCircuitCount}</span>
          </div>
          <div className="cs-stat">
            <span className="cs-stat__label">
              顯示中
              <small>Visible</small>
            </span>
            <span className="cs-stat__value">{viewModel.summary.enabledCircuitCount}</span>
          </div>
          <div className="cs-stat">
            <span className="cs-stat__label">
              隱藏中
              <small>Hidden</small>
            </span>
            <span className="cs-stat__value" style={{ color: "#888d86" }}>
              {viewModel.summary.disabledCircuitCount}
            </span>
          </div>
          <div className="cs-stat">
            <span className="cs-stat__label">
              額定容量總和
              <small>Capacity</small>
            </span>
            <span className="cs-stat__value">{viewModel.summary.capacityLabel}</span>
          </div>
          <div className="cs-stat">
            <span className="cs-stat__label">
              待儲存
              <small>Dirty</small>
            </span>
            <span
              className="cs-stat__value"
              style={{ color: dirtyIds.length > 0 ? "#c9881a" : "#888d86" }}
            >
              {dirtyIds.length}
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="cs-empty">
            <strong>正在載入迴路設定</strong>
            <span style={{ fontSize: 13 }}>同步 circuits route 中，請稍候。</span>
          </div>
        ) : viewModel.emptyState ? (
          <div className="cs-empty">
            <strong>{viewModel.emptyState.title}</strong>
            <span style={{ fontSize: 13 }}>{viewModel.emptyState.description}</span>
          </div>
        ) : (
          <div className="cs-table-wrap">
            <table className="cs-table">
              <thead>
                <tr>
                  <th className="col-order">順序</th>
                  <th className="col-name">迴路名稱</th>
                  <th className="col-icon">圖示 / 單位</th>
                  <th className="col-topic">MQTT Topic</th>
                  <th className="col-thr">Normal</th>
                  <th className="col-thr">Attention</th>
                  <th className="col-thr">Warning</th>
                  <th className="col-display">顯示 / 驗證</th>
                  <th className="col-ops">操作</th>
                </tr>
              </thead>
              <tbody>
                {viewModel.rows.map((row) => (
                  <tr
                    key={row.id}
                    className={`${row.isDirty ? "is-dirty" : ""} ${row.enabled ? "" : "is-disabled"}`}
                  >
                    <td className="col-order">
                      <input
                        className="cs-input cs-input--order"
                        type="number"
                        min={1}
                        value={row.displayOrder ?? 0}
                        onChange={(event) =>
                          handleFieldChange(
                            row.id,
                            "displayOrder",
                            parseNumberInput(event.target.value, 1)
                          )
                        }
                      />
                    </td>
                    <td className="col-name">
                      <div className="cs-name-stack">
                        <input
                          className="cs-input cs-input--zh"
                          placeholder="中文名稱"
                          value={row.nameZh ?? ""}
                          onChange={(event) =>
                            handleFieldChange(row.id, "nameZh", event.target.value)
                          }
                        />
                        <input
                          className="cs-input"
                          placeholder="English"
                          value={row.nameEn ?? ""}
                          onChange={(event) =>
                            handleFieldChange(row.id, "nameEn", event.target.value)
                          }
                        />
                        <p className="cs-cell-caption">
                          額定 {row.ratedCapacity ?? 0} {row.unitLabel}
                        </p>
                      </div>
                    </td>
                    <td className="col-icon">
                      <div className="cs-icon-stack">
                        <div className="cs-icon-row">
                          <span className="cs-icon-glyph">{iconGlyph(row.icon)}</span>
                          <input
                            className="cs-input"
                            placeholder="bolt"
                            value={row.icon ?? ""}
                            onChange={(event) =>
                              handleFieldChange(row.id, "icon", event.target.value)
                            }
                          />
                        </div>
                        <input
                          className="cs-input"
                          placeholder="kW"
                          value={row.unit ?? ""}
                          onChange={(event) =>
                            handleFieldChange(row.id, "unit", event.target.value)
                          }
                        />
                      </div>
                    </td>
                    <td className="col-topic">
                      <input
                        className="cs-input"
                        placeholder="factory/power/..."
                        value={row.mqttTopic ?? ""}
                        onChange={(event) =>
                          handleFieldChange(row.id, "mqttTopic", event.target.value)
                        }
                      />
                      <p className="cs-cell-caption">{row.topicLabel}</p>
                    </td>
                    <td className="col-thr">
                      <div className="cs-thr">
                        <input
                          className="cs-input is-narrow"
                          type="number"
                          value={row.normalMin ?? 0}
                          onChange={(event) =>
                            handleFieldChange(
                              row.id,
                              "normalMin",
                              parseNumberInput(event.target.value)
                            )
                          }
                        />
                        <small>—</small>
                        <input
                          className="cs-input is-narrow"
                          type="number"
                          value={row.normalMax ?? 0}
                          onChange={(event) =>
                            handleFieldChange(
                              row.id,
                              "normalMax",
                              parseNumberInput(event.target.value)
                            )
                          }
                        />
                      </div>
                      <p className="cs-cell-caption is-success">{row.normalRangeLabel}</p>
                    </td>
                    <td className="col-thr">
                      <div className="cs-thr">
                        <input
                          className="cs-input is-narrow"
                          type="number"
                          value={row.attentionMin ?? 0}
                          onChange={(event) =>
                            handleFieldChange(
                              row.id,
                              "attentionMin",
                              parseNumberInput(event.target.value)
                            )
                          }
                        />
                        <small>—</small>
                        <input
                          className="cs-input is-narrow"
                          type="number"
                          value={row.attentionMax ?? 0}
                          onChange={(event) =>
                            handleFieldChange(
                              row.id,
                              "attentionMax",
                              parseNumberInput(event.target.value)
                            )
                          }
                        />
                      </div>
                      <p className="cs-cell-caption is-warning">{row.attentionRangeLabel}</p>
                    </td>
                    <td className="col-thr">
                      <div className="cs-thr">
                        <input
                          className="cs-input is-narrow"
                          type="number"
                          value={row.warningMin ?? 0}
                          onChange={(event) =>
                            handleFieldChange(
                              row.id,
                              "warningMin",
                              parseNumberInput(event.target.value)
                            )
                          }
                        />
                        <small>—</small>
                        <input
                          className="cs-input is-narrow"
                          type="number"
                          value={row.warningMax ?? 0}
                          onChange={(event) =>
                            handleFieldChange(
                              row.id,
                              "warningMax",
                              parseNumberInput(event.target.value)
                            )
                          }
                        />
                      </div>
                      <p className="cs-cell-caption is-error">{row.warningRangeLabel}</p>
                    </td>
                    <td className="col-display">
                      <div className="cs-display-stack">
                        <div className="cs-toggle">
                          <Switch
                            ariaLabel={`${row.nameZh ?? "迴路"} 顯示`}
                            on={row.enabled}
                            onChange={(next) => handleFieldChange(row.id, "enabled", next)}
                          />
                          <span className="cs-toggle-label">{row.visibilityLabel}</span>
                        </div>
                        <span className={chipClass(row.validationTone)}>
                          {row.validationLabel}
                        </span>
                        <p className="cs-cell-caption">{row.validationDetail}</p>
                      </div>
                    </td>
                    <td className="col-ops">
                      <div className="cs-ops">
                        <span className={chipClass(row.dirtyTone)}>{row.dirtyLabel}</span>
                        <button
                          type="button"
                          className="cs-delete"
                          disabled={row.deleting}
                          onClick={() => void handleDelete(row.id)}
                        >
                          {row.deleting ? "刪除中..." : "刪除"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
