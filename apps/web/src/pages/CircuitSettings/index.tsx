import type { CircuitConfig } from "@solar-display/shared";
import { useEffect, useMemo, useState } from "react";
import { RemoteSyncBanner } from "../../components/management/RemoteSyncBanner";
import { useDisplaySyncDraftGuard } from "../../hooks/displaySyncDraftGuard";
import { useDisplayReadiness } from "../../hooks/useDisplayReadiness";
import { useDisplaySyncRefresh } from "../../hooks/useDisplaySyncRefresh";
import { requestJson } from "../../services/api";
import "./circuitSettings.css";
import { CircuitSettingsContent } from "./CircuitSettingsContent";
import { buildCircuitSettingsViewModel } from "./viewModel";
import { CIRCUIT_SETTINGS_DISPLAY_SYNC_SCOPES } from "../managementDisplaySyncScopes";

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
    displaySlot: null,
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
  const {
    errorMessage: readinessErrorMessage,
    isLoading: readinessLoading,
    readiness,
    reload: reloadReadiness
  } = useDisplayReadiness();

  const loadCircuits = async ({
    silent = false,
    propagateError = false
  }: {
    silent?: boolean;
    propagateError?: boolean;
  } = {}) => {
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
      const nextError = error instanceof Error ? error : new Error("載入迴路設定失敗。");
      setErrorMessage(nextError.message);
      if (propagateError) {
        throw nextError;
      }
    } finally {
      if (silent) {
        setIsReloading(false);
      } else {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    void loadCircuits();
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
      await reloadReadiness();
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
      await reloadReadiness();
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
      await reloadReadiness();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "刪除迴路失敗。");
    } finally {
      setDeletingId(null);
    }
  };

  const syncDraftGuard = useDisplaySyncDraftGuard({
    isDirty: dirtyIds.length > 0,
    relevantScopes: CIRCUIT_SETTINGS_DISPLAY_SYNC_SCOPES,
    reloadNow: async () => {
      await Promise.all([loadCircuits({ propagateError: true, silent: true }), reloadReadiness()]);
    }
  });

  useDisplaySyncRefresh(syncDraftGuard.handleDisplaySync, CIRCUIT_SETTINGS_DISPLAY_SYNC_SCOPES);

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
        message,
        readiness
      }),
    [circuits, deletingId, dirtyIds, errorMessage, isAdding, isLoading, isReloading, isSaving, message, readiness]
  );

  return (
    <CircuitSettingsContent
      dirtyCount={dirtyIds.length}
      handleAdd={handleAdd}
      handleDelete={handleDelete}
      handleFieldChange={handleFieldChange}
      isLoading={isLoading}
      loadCircuits={loadCircuits}
      parseNumberInput={parseNumberInput}
      readiness={readiness}
      readinessErrorMessage={readinessErrorMessage}
      readinessLoading={readinessLoading}
      remoteSyncBanner={
        syncDraftGuard.hasPendingRemoteChange ? (
          <RemoteSyncBanner
            onKeepEditing={syncDraftGuard.keepEditing}
            onReloadNow={() => syncDraftGuard.discardAndReload().catch(() => {})}
          />
        ) : null
      }
      saveAll={handleSaveAll}
      viewModel={viewModel}
    />
  );
}
