import type { DisplayCardDataRow, DerivedMetricDependencyIdentity } from "@solar-display/shared";
import { useEffect, useMemo, useState } from "react";
import { DataHubSectionState } from "./sectionState";
import {
  buildCardDataRowKey,
  fetchCardDataDiagnosticsModel,
  filterCardDataRows,
  type CardDataDiagnosticsModel,
  type CardDataDiagnosticsSelection
} from "./CardDataDiagnosticsModel";
import { clearDisplayCardOverride, saveDisplayCardOverride } from "../../services/api";

const scopeLabels = {
  cl: "CL",
  global: "Global",
  kn: "KN"
} as const;

function resolvePageLabel(pageId: DisplayCardDataRow["pageId"]) {
  if (pageId === "factory-circuit") return "Factory Circuit";
  if (pageId === "factory-circuit-guanyin") return "Factory Circuit (Guanyin)";
  if (pageId === "overview") return "Overview";
  if (pageId === "solar") return "Solar";
  if (pageId === "sustainability") return "Sustainability";
  return pageId;
}

function formatDerivedDependency(dependency: DerivedMetricDependencyIdentity): string {
  const identity = dependency.kind === "metric"
    ? `${dependency.metricScope ?? "?"}/${dependency.metricKey ?? dependency.alias}`
    : `setting/${dependency.settingKey ?? dependency.alias}`;
  const value = dependency.value === null ? "--" : String(dependency.value);
  return `${identity}=${value}`;
}

function formatDerivedProvenance(dependencies: DerivedMetricDependencyIdentity[]): string {
  const entries: string[] = [];
  const visit = (dependency: DerivedMetricDependencyIdentity) => {
    entries.push(formatDerivedDependency(dependency));
    dependency.upstream?.forEach(visit);
  };
  dependencies.forEach(visit);
  return entries.join(" → ");
}

function CardDataRow({
  row,
  draftValue,
  isSaving,
  onDraftChange,
  onSave,
  onClear
}: {
  row: DisplayCardDataRow;
  draftValue: string;
  isSaving: boolean;
  onDraftChange: (value: string) => void;
  onSave: (value: number) => void;
  onClear: () => void;
}) {
  const rowKey = buildCardDataRowKey(row);
  const trimmedDraftValue = draftValue.trim();
  const numericDraftValue = Number(trimmedDraftValue);
  const draftInvalid = trimmedDraftValue !== "" && !Number.isFinite(numericDraftValue);
  const canSetOverride = row.actions.some((action) => action.type === "set-display-override");
  const canSaveOverride = canSetOverride && trimmedDraftValue !== "" && !draftInvalid && !isSaving;
  const canClearOverride = canSetOverride && row.override !== null && !isSaving;

  return (
    <article
      className="mgmt-card space-y-4 p-4"
      data-data-hub-card-data-row={rowKey}
      data-data-hub-card-data-scope={row.metricScope}
      data-data-hub-card-data-status={row.status}
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-[#687169]">{resolvePageLabel(row.pageId)}</p>
          <h3 className="text-base font-semibold text-[#27322b]">{row.label}</h3>
          <code className="text-xs text-[#687169]">{row.metricKey}</code>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="mgmt-chip" data-data-hub-card-data-scope-chip={row.metricScope}>Scope: {scopeLabels[row.metricScope]}</span>
          <span className="mgmt-chip is-accent">Status: {row.status}</span>
          <span className="mgmt-chip">Unit: {row.unit || "--"}</span>
        </div>
      </header>

      <dl className="grid gap-x-5 gap-y-2 text-sm text-[#4d554f] sm:grid-cols-3">
        <div>
          <dt className="text-[#7b857d]">Current value / 目前值</dt>
          <dd>{row.originalValue ?? row.displayValue} {row.unit}</dd>
        </div>
        <div>
          <dt className="text-[#7b857d]">Original value / 原始值</dt>
          <dd>{row.originalValue ?? "--"} {row.unit}</dd>
        </div>
        <div>
          <dt className="text-[#7b857d]">Display value / 展示值</dt>
          <dd>{row.displayValue} {row.unit}</dd>
        </div>
        <div>
          <dt className="text-[#7b857d]">Last update / 最後更新</dt>
          <dd>{row.lastUpdatedAt ?? "--"}</dd>
        </div>
      </dl>

      <dl className="grid gap-x-5 gap-y-2 text-xs text-[#4d554f] sm:grid-cols-2">
        <div>
          <dt className="text-[#7b857d]">Source classification / 來源分類</dt>
          <dd>{row.sourceClassification}</dd>
        </div>
        <div>
          <dt className="text-[#7b857d]">Source topics / 來源 topics</dt>
          <dd>
            {row.sourceTopics.length > 0
              ? row.sourceTopics.map((topic) => `${topic.metricScope}/${topic.metricKey}=${topic.topic}`).join(", ")
              : "--"}
          </dd>
        </div>
        <div>
          <dt className="text-[#7b857d]">Formula / 公式</dt>
          <dd>{row.formula ?? "--"}</dd>
        </div>
        <div>
          <dt className="text-[#7b857d]">Dependencies / 依賴</dt>
          <dd>
            {row.dependencies.length > 0
              ? row.dependencies.map((dependency) =>
                `${dependency.metricScope}/${dependency.metricKey}=${dependency.latestValue ?? "--"}${dependency.topic ? ` (${dependency.topic})` : ""} [${dependency.status}]`
              ).join(", ")
              : "--"}
          </dd>
        </div>
        <div>
          <dt className="text-[#7b857d]">Calculation fields / 計算欄位</dt>
          <dd>{row.calculationFields.length > 0 ? row.calculationFields.join(", ") : "--"}</dd>
        </div>
        <div>
          <dt className="text-[#7b857d]">Override state / 覆寫狀態</dt>
          <dd data-data-hub-card-override-state={row.override?.active ? "active" : row.override ? "inactive" : "none"}>
            {row.override
              ? `${row.override.active ? "Active" : "Inactive"} · ${row.override.displayValue} ${row.override.unit ?? row.unit}`
              : "No override"}
          </dd>
        </div>
        {row.derivedMetric ? (
          <>
            <div>
              <dt className="text-[#7b857d]">Derived evaluation / 衍生評估</dt>
              <dd>
                Registry r{row.derivedMetric.definitionRevision} · {scopeLabels[row.derivedMetric.effectiveOutputScope]} · {row.derivedMetric.evaluation?.status ?? "unavailable"} · {row.derivedMetric.evaluation?.freshnessState ?? "unavailable"}
              </dd>
            </div>
            <div>
              <dt className="text-[#7b857d]">Derived provenance / 衍生 provenance</dt>
              <dd>{formatDerivedProvenance(row.derivedMetric.provenance) || "--"}</dd>
            </div>
          </>
        ) : null}
      </dl>

      {canSetOverride ? (
        <div
          className="flex flex-wrap items-end gap-2"
          data-data-hub-card-override-row={rowKey}
          data-data-hub-card-override-invalid={draftInvalid ? "true" : "false"}
          title="只改播放頁顯示值，不寫回 MQTT 或歷史資料"
        >
          <label className="grid gap-1 text-xs text-[#4d554f]" htmlFor={`data-hub-card-override-${rowKey}`}>
            Display override / 展示覆寫
            <input
              className="mgmt-input"
              id={`data-hub-card-override-${rowKey}`}
              inputMode="decimal"
              placeholder={row.originalValue ?? row.displayValue}
              type="number"
              value={draftValue}
              onChange={(event) => onDraftChange(event.target.value)}
            />
          </label>
          <button
            className="mgmt-action mgmt-action-primary"
            disabled={!canSaveOverride}
            type="button"
            onClick={() => onSave(numericDraftValue)}
          >
            {isSaving ? "Applying..." : "Apply display override / 套用展示值"}
          </button>
          <button
            className="mgmt-action"
            disabled={!canClearOverride}
            type="button"
            onClick={onClear}
          >
            Clear override / 清除覆寫
          </button>
          {draftInvalid ? <small className="text-[#b42318]">請輸入有限數字</small> : null}
        </div>
      ) : null}
    </article>
  );
}

export function DataHubCardDataDiagnostics({
  initialErrorMessage = "",
  model,
  selection
}: {
  initialErrorMessage?: string;
  model: CardDataDiagnosticsModel | null;
  selection: CardDataDiagnosticsSelection | null;
}) {
  const [localModel, setLocalModel] = useState<CardDataDiagnosticsModel | null>(
    selection && model ? filterCardDataRows(model, selection) : null
  );
  const [errorMessage, setErrorMessage] = useState(initialErrorMessage);
  const [isLoading, setIsLoading] = useState(false);
  const [savingRowKey, setSavingRowKey] = useState<string | null>(null);
  const [overrideDrafts, setOverrideDrafts] = useState<Record<string, string>>({});

  const selectionKey = selection ? `${selection.scope}:${selection.metricKey}` : "";
  const filteredModel = useMemo(
    () => selection && model ? filterCardDataRows(model, selection) : null,
    [model, selectionKey]
  );

  useEffect(() => {
    let active = true;
    setErrorMessage(initialErrorMessage);
    setOverrideDrafts({});
    if (!selection) {
      setLocalModel(null);
      setIsLoading(false);
      return () => {
        active = false;
      };
    }
    if (filteredModel) {
      setLocalModel(filteredModel);
      setIsLoading(false);
      return () => {
        active = false;
      };
    }

    setLocalModel(null);
    setIsLoading(true);
    void fetchCardDataDiagnosticsModel(selection)
      .then((nextModel) => {
        if (active) {
          setLocalModel(nextModel);
          setErrorMessage("");
        }
      })
      .catch((error) => {
        if (active) {
          setLocalModel(null);
          setErrorMessage(error instanceof Error ? error.message : "載入卡片資料診斷失敗。");
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [filteredModel, initialErrorMessage, selection, selectionKey]);

  const refresh = async () => {
    if (!selection) return;
    setIsLoading(true);
    try {
      const nextModel = await fetchCardDataDiagnosticsModel(selection);
      setLocalModel(nextModel);
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "載入卡片資料診斷失敗。");
    } finally {
      setIsLoading(false);
    }
  };

  const saveOverride = async (row: DisplayCardDataRow, value: number) => {
    const rowKey = buildCardDataRowKey(row);
    if (!Number.isFinite(value)) {
      setErrorMessage("展示覆寫值必須是有限數字。");
      return;
    }
    setSavingRowKey(rowKey);
    try {
      await saveDisplayCardOverride(row.cardId, row.metricScope, value);
      setOverrideDrafts((current) => ({ ...current, [rowKey]: "" }));
      setErrorMessage("");
      await refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "套用展示覆寫失敗。");
    } finally {
      setSavingRowKey(null);
    }
  };

  const clearOverride = async (row: DisplayCardDataRow) => {
    const rowKey = buildCardDataRowKey(row);
    setSavingRowKey(rowKey);
    try {
      await clearDisplayCardOverride(row.cardId, row.metricScope);
      setOverrideDrafts((current) => ({ ...current, [rowKey]: "" }));
      setErrorMessage("");
      await refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "清除展示覆寫失敗。");
    } finally {
      setSavingRowKey(null);
    }
  };

  return (
    <section aria-labelledby="data-hub-card-data-heading" className="space-y-3" data-data-hub-card-data="true">
      <header>
        <h3 className="text-lg font-semibold text-[#27322b]" id="data-hub-card-data-heading">Card Data diagnostics</h3>
        <p className="text-sm text-[#687169]">保留現有卡片的目前值、展示覆寫、來源、公式與衍生 provenance；每列使用 scope/card identity。</p>
      </header>

      {!selection ? (
        <DataHubSectionState message="請先選擇 concrete metricKey 與 scope，才能載入 Card Data。" status="empty" />
      ) : errorMessage ? (
        <DataHubSectionState message={errorMessage} status="error" />
      ) : isLoading && !localModel ? (
        <DataHubSectionState message="正在載入 Card Data diagnostics..." status="loading" />
      ) : !localModel || localModel.rows.length === 0 ? (
        <DataHubSectionState message="此 metric scope 目前沒有 Card Data rows。" status="empty" />
      ) : (
        <div className="grid gap-3" data-data-hub-card-data-list>
          {localModel.rows.map((row) => {
            const rowKey = buildCardDataRowKey(row);
            return (
              <CardDataRow
                draftValue={overrideDrafts[rowKey] ?? ""}
                isSaving={savingRowKey === rowKey}
                key={rowKey}
                onClear={() => void clearOverride(row)}
                onDraftChange={(value) => setOverrideDrafts((current) => ({ ...current, [rowKey]: value }))}
                onSave={(value) => void saveOverride(row, value)}
                row={row}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}
