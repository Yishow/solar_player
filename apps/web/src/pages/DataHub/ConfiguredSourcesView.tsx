import { useRef } from "react";
import type { MetricScope } from "@solar-display/shared";
import type { DataHubSourcesModel, GenericMappingPatch, SourceRow } from "./SourcesModel";
import { SourceHealthChip, SourceSummaryRow } from "./SourceCards";
import { SourceDetailsDrawer } from "./SourceDetailsDrawer";
import { sourceDisplayName, type SourceListQuery } from "./sourceWorkspace";
import type { DataHubListFilter, DataHubSection } from "./workspaceContext";
import { SourceInspectorOverview } from "./SourceInspectorOverview";
import { SourceInspectorMappingForm } from "./SourceInspectorMappingForm";
import { SourceInspectorUsagePanel } from "./SourceInspectorUsagePanel";

export type ConfiguredSourcesViewProps = {
  errorMessage: string;
  isDirty: boolean;
  isSaving: boolean;
  message: string;
  model: DataHubSourcesModel;
  onAddFromReceived: () => void;
  onAddGenericMapping: () => void;
  onCloseDrawer: () => void;
  onDeleteGenericMapping: (id: number) => void;
  onDiscardSingle: (id: number) => void;
  onGenericChange: (id: number, patch: GenericMappingPatch) => void;
  onOpenDrawer: (rowId: string) => void;
  onPublishTest: (metricScope: MetricScope, metricKey: string, value: number) => Promise<void>;
  onRefresh?: () => Promise<void>;
  onSave?: () => Promise<void>;
  onSaveSingle: (id: number) => Promise<void>;
  openRowId: string | null;
  pendingSiteChoiceIds: number[];
  query: SourceListQuery & { hasExplicitSection?: boolean; panel?: "drawer" | "full"; section?: DataHubSection };
  rows: SourceRow[];
  summary: { custom: number; issues: number; managed: number; total: number };
  updateQuery: (patch: Partial<SourceListQuery & { panel?: "drawer" | "full"; section?: DataHubSection }>) => void;
  visibleRows: SourceRow[];
};

export function ConfiguredSourcesView({
  errorMessage,
  isDirty,
  isSaving,
  message,
  model,
  onAddFromReceived,
  onAddGenericMapping,
  onCloseDrawer,
  onDeleteGenericMapping,
  onDiscardSingle,
  onGenericChange,
  onOpenDrawer,
  onPublishTest,
  onRefresh,
  onSave,
  onSaveSingle,
  openRowId,
  pendingSiteChoiceIds,
  query,
  rows,
  summary,
  updateQuery,
  visibleRows
}: ConfiguredSourcesViewProps) {
  const rowRefs = useRef(new Map<string, HTMLButtonElement>());
  const openRow = rows.find((row) => {
    if (row.id === openRowId) return true;
    if (openRowId?.startsWith("mqtt:") && row.kind === "generic") {
      const openParts = openRowId.split(":");
      const openMappingId = openParts[openParts.length - 1];
      if (openMappingId && String(row.mapping.id) === openMappingId) {
        return true;
      }
    }
    return false;
  }) ?? null;

  const activeSection: DataHubSection = query.hasExplicitSection
    ? (query.section ?? "overview")
    : (openRow?.kind === "generic" ? "mapping" : "overview");
  const isFullPanel = query.panel === "full";

  return (
    <div className="space-y-5" data-configured-sources-view>
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="text-[13px] text-[#687169]">
          先從摘要列表找到來源，再打開單筆詳情。進階傳輸欄位只在抽屜中展開。
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="mgmt-action min-h-[40px]" disabled={!onRefresh} onClick={() => void onRefresh?.()} type="button">
            重新整理
          </button>
          <button
            className="mgmt-action primary min-h-[40px]"
            disabled={!onSave || !isDirty || isSaving}
            onClick={() => void onSave?.()}
            type="button"
          >
            {isSaving ? "儲存中..." : "儲存 mappings"}
          </button>
        </div>
      </header>

      {errorMessage ? <div className="mgmt-status is-error" data-source-error role="alert">{errorMessage}</div> : null}
      {message ? <div className="mgmt-status is-success" role="status">{message}</div> : null}

      <div className="flex flex-wrap items-end gap-3">
        <label className="grid min-w-[16rem] flex-1 gap-1 text-[13px] text-[#4d554f]">
          搜尋名稱、代碼或主題
          <input
            aria-label="搜尋來源"
            className="mgmt-input min-h-[40px] text-[14px]"
            onChange={(event) => updateQuery({ search: event.target.value })}
            value={query.search}
          />
        </label>
        <label className="grid gap-1 text-[13px] text-[#4d554f]">
          篩選
          <select
            aria-label="來源篩選"
            className="mgmt-input min-h-[40px] text-[14px]"
            onChange={(event) => updateQuery({ filter: event.target.value as DataHubListFilter })}
            value={query.filter}
          >
            <option value="all">全部</option>
            <option value="issue">異常</option>
            <option value="managed">託管</option>
            <option value="custom">自訂</option>
          </select>
        </label>

        <div className="flex flex-wrap gap-2">
          <button
            className="mgmt-action primary min-h-[40px]"
            data-action-add-from-received
            onClick={onAddFromReceived}
            type="button"
          >
            從接收資料新增
          </button>
          <button
            className="mgmt-action min-h-[40px]"
            data-action-add-generic
            onClick={onAddGenericMapping}
            title="進階手動設定 MQTT 主題"
            type="button"
          >
            + 新增通用 MQTT 主題
          </button>
        </div>
      </div>

      <div className="mgmt-card grid gap-3 p-4 text-sm text-[#4d554f] sm:grid-cols-3" data-source-connection-summary>
        <div>
          <span className="block text-xs uppercase tracking-wide text-[#7b857d]">中央 Broker</span>
          <strong>{model.status.broker || "未設定"}</strong>
        </div>
        <div>
          <span className="block text-xs uppercase tracking-wide text-[#7b857d]">連線狀態</span>
          <SourceHealthChip
            health={model.status.connected ? { label: "正常連線 (Connected)", tone: "success" } : { label: "未連線 (Offline)", tone: "danger" }}
          />
        </div>
        <div>
          <span className="block text-xs uppercase tracking-wide text-[#7b857d]">這個範圍的摘要</span>
          <strong data-source-summary-counts>
            {summary.total} 筆 · {summary.issues} 筆異常 · {summary.managed} 託管 · {summary.custom} 自訂
          </strong>
        </div>
      </div>

      <section className="space-y-2" data-source-summary-list>
        {visibleRows.length > 0 ? (
          visibleRows.map((row) => (
            <SourceSummaryRow
              key={row.id}
              onOpen={() => onOpenDrawer(row.id)}
              row={row}
              rowRef={(node) => {
                if (node) rowRefs.current.set(row.id, node);
                else rowRefs.current.delete(row.id);
              }}
            />
          ))
        ) : (
          <div className="mgmt-card space-y-3 p-6 text-center" data-empty-sources-panel>
            <p className="text-sm text-[#687169]">
              目前範圍（{query.scope.toUpperCase()}）尚未配置任何資料來源。
            </p>
            <div className="flex justify-center gap-3">
              <button
                className="mgmt-action primary min-h-[40px]"
                onClick={onAddFromReceived}
                type="button"
              >
                從接收資料新增
              </button>
              <button
                className="mgmt-action min-h-[40px]"
                onClick={onAddGenericMapping}
                type="button"
              >
                新增通用 MQTT 主題
              </button>
            </div>
          </div>
        )}
      </section>

      {openRow ? (
        <SourceDetailsDrawer
          activeSection={activeSection}
          footerActions={
            openRow.kind === "generic" && openRow.editable ? (
              <>
                <button
                  className="mgmt-action primary min-h-[40px]"
                  disabled={isSaving}
                  onClick={() => void onSaveSingle(openRow.mapping.id)}
                  type="button"
                >
                  {isSaving ? "儲存中..." : "儲存此來源"}
                </button>
                <button
                  className="mgmt-action min-h-[40px]"
                  disabled={isSaving}
                  onClick={() => onDiscardSingle(openRow.mapping.id)}
                  type="button"
                >
                  捨棄此來源修改
                </button>
              </>
            ) : null
          }
          headerBadge={
            <div className="flex items-center gap-1 text-[11px]">
              <span className="rounded bg-[#f0f3f1] px-1.5 py-0.5 font-semibold text-[#4d554f]">
                {openRow.metricScope ? openRow.metricScope.toUpperCase() : "未指定廠區"}
              </span>
              <span className="rounded bg-[#e8f0fe] px-1.5 py-0.5 font-semibold text-[#1e40af]">
                {openRow.kind === "managed" ? "系統託管" : "自訂來源"}
              </span>
            </div>
          }
          isFullPanel={isFullPanel}
          onClose={onCloseDrawer}
          onSectionChange={(section) => updateQuery({ section })}
          onTogglePanelMode={() => updateQuery({ panel: isFullPanel ? "drawer" : "full" })}
          returnFocusRef={{ current: rowRefs.current.get(openRow.id) ?? null }}
          showSections={true}
          title={sourceDisplayName(openRow)}
        >
          {activeSection === "overview" ? (
            <SourceInspectorOverview
              onNavigateToMapping={() => updateQuery({ section: "mapping" })}
              row={openRow}
            />
          ) : activeSection === "mapping" ? (
            openRow.kind === "generic" ? (
              <SourceInspectorMappingForm
                onChange={onGenericChange}
                onDelete={onDeleteGenericMapping}
                onPublishTest={onPublishTest}
                row={openRow}
                siteChoicePending={pendingSiteChoiceIds.includes(openRow.mapping.id)}
              />
            ) : (
              <div className="mgmt-card p-4 text-sm text-[#687169]">
                此為系統託管來源，欄位與指標由 Solar 轉接器自動同步，不需亦無法在此手動設定對應。
              </div>
            )
          ) : activeSection === "samples" ? (
            <div className="mgmt-card space-y-3 p-4 text-sm">
              <h4 className="font-semibold text-[#4d554f]">最新觀測讀值與時間品質</h4>
              <div className="grid grid-cols-2 gap-2 text-xs text-[#687169]">
                <div>即時讀值：<strong>{openRow.kind === "generic" ? (openRow.mapping.lastValue !== null ? `${openRow.mapping.lastValue} ${openRow.mapping.unit}` : "尚無讀值") : "由轉接器同步"}</strong></div>
                <div>更新時間：{openRow.kind === "generic" ? (openRow.mapping.lastReceivedAt ?? "尚未更新") : openRow.activity}</div>
                <div className="col-span-full">Topic：<code>{openRow.sourceTopic}</code></div>
              </div>
            </div>
          ) : activeSection === "usage" ? (
            openRow.kind === "generic" ? (
              <SourceInspectorUsagePanel
                metricKey={openRow.mapping.metricKey}
                metricScope={openRow.mapping.metricScope ?? openRow.metricScope ?? ""}
              />
            ) : (
              <div className="mgmt-card p-4 text-sm text-[#687169]">
                系統託管來源提供標準發電與分區計量，廣泛應用於 Overview 與 Solar 儀表板。
              </div>
            )
          ) : null}
        </SourceDetailsDrawer>
      ) : null}
    </div>
  );
}
