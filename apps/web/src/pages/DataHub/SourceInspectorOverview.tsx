import type { SourceRow } from "./SourcesModel";
import { SourceHealthChip, SourceResourceList } from "./SourceCards";
import { sourceDisplayName } from "./sourceWorkspace";

export function SourceInspectorOverview({
  onNavigateToMapping,
  row
}: {
  onNavigateToMapping?: () => void;
  row: SourceRow;
}) {
  const isManaged = row.kind === "managed";
  const title = sourceDisplayName(row);
  const scopeLabel = (row.metricScope ?? "all").toUpperCase();

  const valueDisplay = row.kind === "generic"
    ? (row.mapping.lastValue !== null ? `${row.mapping.lastValue} ${row.mapping.unit || ""}`.trim() : "尚無讀值")
    : "由轉接器同步";
  const timestampDisplay = row.kind === "generic"
    ? (row.mapping.lastReceivedAt ?? "尚未更新")
    : row.activity;

  return (
    <div className="space-y-4" data-inspector-overview>
      {/* Human-readable primary identification */}
      <div className="mgmt-card space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#edf2ee] pb-3">
          <div>
            <h3 className="text-[16px] font-bold text-[#1e2821]">{title}</h3>
            <span className="text-xs text-[#687169]">{row.sourceType} · {scopeLabel}</span>
          </div>
          <SourceHealthChip health={row.health} />
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="block text-xs text-[#7b857d]">正式讀值</span>
            <strong className="text-[15px] text-[#1e2821]">{valueDisplay}</strong>
          </div>
          <div>
            <span className="block text-xs text-[#7b857d]">資料時間</span>
            <span className="text-xs text-[#4d554f]">{timestampDisplay}</span>
          </div>
          <div>
            <span className="block text-xs text-[#7b857d]">擁有權</span>
            <span className="text-xs text-[#4d554f]">
              {row.ownership === "managed" ? "系統託管" : "使用者自訂"}
            </span>
          </div>
        </div>

        {row.sourceTopic ? (
          <div className="rounded bg-[#f8faf9] p-2.5 text-xs">
            <span className="block font-medium text-[#687169]">MQTT Topic:</span>
            <code className="break-all font-mono text-[#1e293b]">{row.sourceTopic}</code>
          </div>
        ) : null}
      </div>

      {isManaged ? (
        <div className="mgmt-card space-y-3 p-4" data-overview-managed-section>
          <div className="rounded-lg border border-[#ead7aa] bg-[#fff8e8] p-3 text-[13px] text-[#6b5524]" role="note">
            <strong>系統託管來源 (SolarSourceAdapter)</strong>
            <p className="mt-0.5 text-[12px]">
              這是系統託管的 Solar 轉接器來源，對應欄位由轉接器同步，因此無法在這裡修改。此來源由系統轉接器統一排程擷取並提供 canonical 指標。
            </p>
          </div>
          <h4 className="text-[13px] font-semibold text-[#4d554f]">包含的發電與分區資源</h4>
          <SourceResourceList resources={row.resources} />
        </div>
      ) : (
        <div className="mgmt-card space-y-3 p-4" data-overview-generic-section>
          <div className="flex items-center justify-between">
            <h4 className="text-[13px] font-semibold text-[#4d554f]">對應與轉換摘要</h4>
            {onNavigateToMapping && row.editable ? (
              <button
                className="text-xs font-semibold text-[#1b4332] hover:underline"
                onClick={onNavigateToMapping}
                type="button"
              >
                編輯設定 →
              </button>
            ) : null}
          </div>

          <div className="space-y-2 text-xs text-[#4d554f]">
            <div><strong>指標代碼：</strong><code>{row.mapping.metricKey}</code></div>
            <div><strong>單位：</strong>{row.mapping.unit}</div>
            <div><strong>倍率：</strong>{row.mapping.multiplier ?? 1}</div>
            <div><strong>狀態：</strong>{row.mapping.enabled ? "已啟用" : "已停用"}</div>
          </div>
        </div>
      )}
    </div>
  );
}
