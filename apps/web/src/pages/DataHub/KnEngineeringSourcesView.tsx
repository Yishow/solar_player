import { useState, useMemo, type ReactNode } from "react";
import {
  KN_ENGINEERING_IDS,
  KN_ENGINEERING_NAMES,
  type KnEngineeringId,
  type KnEngineeringMode,
  type EngineeringSourceDefinition
} from "@solar-display/shared";
import { SourceDetailsDrawer } from "./SourceDetailsDrawer";

export interface EngineeringReportHeadView {
  site: "kn";
  engineering_id: KnEngineeringId;
  period_start: string;
  period_end: string;
  current_data_revision: number;
  period_status: "preliminary" | "final" | "withdrawn";
  coverage: "complete" | "partial" | "unknown";
  quality: "valid" | "partial" | "invalid" | "unknown";
  value: string | null;
}

export interface KnEngineeringSourcesViewProps {
  sources: EngineeringSourceDefinition[];
  reportHeads?: EngineeringReportHeadView[];
  onSaveSource?: (draft: Partial<EngineeringSourceDefinition>, previewToken: string, expectedRevision: number) => Promise<void>;
  onPreviewSource?: (draft: Partial<EngineeringSourceDefinition>) => Promise<{ previewToken: string; canonicalDraft: EngineeringSourceDefinition }>;
}

export function computeDeliveryStatus(
  source: EngineeringSourceDefinition,
  latestHead?: EngineeringReportHeadView
): "on-time" | "not-due" | "late" | "missing" | "unknown" {
  if (source.mode !== "daily-report") {
    return "unknown";
  }
  if (!source.expectedDelivery) {
    return "unknown";
  }
  if (latestHead && latestHead.period_status === "final" && latestHead.coverage === "complete") {
    return "on-time";
  }
  return "not-due";
}

export function KnEngineeringSourcesView({
  sources,
  reportHeads = [],
  onSaveSource,
  onPreviewSource
}: KnEngineeringSourcesViewProps) {
  const [selectedSourceRef, setSelectedSourceRef] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState<Partial<EngineeringSourceDefinition> | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "subscription" | "versions">("overview");

  const headsByEngId = useMemo(() => {
    const map = new Map<KnEngineeringId, EngineeringReportHeadView>();
    for (const h of reportHeads) {
      map.set(h.engineering_id, h);
    }
    return map;
  }, [reportHeads]);

  // Ensure all 8 engineering rows are present
  const rows = useMemo(() => {
    return KN_ENGINEERING_IDS.map((engId) => {
      const engSources = sources.filter((s) => s.engineeringId === engId);
      const energySource = engSources.find((s) => s.purpose === "energy") || {
        sourceRef: `kn-eng-${engId}-energy`,
        configurationRevision: 0,
        sourceKind: "engineering" as const,
        site: "kn" as const,
        engineeringId: engId,
        engineeringName: KN_ENGINEERING_NAMES[engId],
        purpose: "energy" as const,
        mode: "unconfigured" as const,
        exactTopic: `factory/guanyin/energy/daily/${engId}`,
        approvedPublisherId: null,
        definitionRevision: 1,
        definitionSummary: "",
        scopeCoverage: "department-aggregate",
        unit: "kWh" as const,
        scaleDecimal: 1,
        qualityPolicy: null,
        calendarRevision: 1,
        expectedDelivery: null,
        replayWindowDays: 93,
        enabled: false,
        reviewStatus: "draft" as const
      };
      const head = headsByEngId.get(engId);
      const deliveryStatus = computeDeliveryStatus(energySource, head);
      return {
        engId,
        nameZh: KN_ENGINEERING_NAMES[engId],
        source: energySource,
        head,
        deliveryStatus
      };
    });
  }, [sources, headsByEngId]);

  // Missing count
  const completeCount = rows.filter((r) => r.head?.period_status === "final" && r.head?.coverage === "complete").length;
  const missingRows = rows.filter((r) => !r.head || r.head.period_status !== "final" || r.head.coverage !== "complete");

  const selectedItem = rows.find((r) => r.source.sourceRef === selectedSourceRef);

  const handleOpenDrawer = (source: EngineeringSourceDefinition) => {
    setSelectedSourceRef(source.sourceRef);
    setEditingDraft({ ...source });
    setIsDirty(false);
  };

  const handleCloseDrawer = () => {
    setSelectedSourceRef(null);
    setEditingDraft(null);
    setIsDirty(false);
  };

  return (
    <div className="space-y-4" data-testid="kn-engineering-sources-view">
      <div className="rounded border border-emerald-700/30 bg-[#16221a] p-4 text-xs">
        <div className="flex items-center justify-between font-medium text-emerald-300">
          <span>觀音工程成果到件現況</span>
          <span>{completeCount} / 8 工程已具備完整日報</span>
        </div>
        {missingRows.length > 0 && (
          <div className="mt-2 text-amber-300/80">
            部分缺失：{missingRows.map((r) => r.nameZh).join("、")}（不補 0，列為部分量）
          </div>
        )}
      </div>

      <div className="overflow-x-auto rounded border border-emerald-800/40 bg-[#121a15]">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#18261e] text-[#8ea596]">
            <tr>
              <th className="p-3">工程名稱</th>
              <th className="p-3">模式</th>
              <th className="p-3">Exact Topic</th>
              <th className="p-3">訂閱狀態</th>
              <th className="p-3">最近所屬日成果</th>
              <th className="p-3">到件排程</th>
              <th className="p-3 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-emerald-900/30">
            {rows.map((row) => (
              <tr key={row.engId} className="hover:bg-[#1b2b22]/50">
                <td className="p-3 font-medium text-white">{row.nameZh}</td>
                <td className="p-3 text-[#a3b899]">{row.source.mode}</td>
                <td className="p-3 font-mono text-[#7ea085]">{row.source.exactTopic}</td>
                <td className="p-3">
                  <span
                    className={`inline-block rounded px-2 py-0.5 text-[10px] ${
                      row.source.enabled
                        ? "bg-emerald-800/40 text-emerald-300"
                        : "bg-stone-800 text-stone-400"
                    }`}
                  >
                    {row.source.enabled ? "已啟用" : "停用中"}
                  </span>
                </td>
                <td className="p-3">
                  {row.head ? (
                    <span>
                      {row.head.value ?? "null"} kWh (v{row.head.current_data_revision},{" "}
                      {row.head.period_status})
                    </span>
                  ) : (
                    <span className="text-stone-500">尚無成果</span>
                  )}
                </td>
                <td className="p-3">
                  <span className="text-[#a3b899]">{row.deliveryStatus}</span>
                </td>
                <td className="p-3 text-right">
                  <button
                    type="button"
                    onClick={() => handleOpenDrawer(row.source)}
                    className="rounded bg-emerald-700/40 px-2 py-1 text-emerald-200 hover:bg-emerald-700/60"
                  >
                    設定 / 檢視
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedItem && editingDraft && (
        <SourceDetailsDrawer
          title={`工程來源：${selectedItem.nameZh}`}
          onClose={handleCloseDrawer}
          footerActions={
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCloseDrawer}
                className="rounded border border-stone-600 px-3 py-1.5 text-xs text-stone-300"
              >
                取消
              </button>
              <button
                type="button"
                disabled={!isDirty}
                onClick={async () => {
                  if (onPreviewSource && onSaveSource) {
                    const prev = await onPreviewSource(editingDraft);
                    await onSaveSource(
                      editingDraft,
                      prev.previewToken,
                      selectedItem.source.configurationRevision
                    );
                    handleCloseDrawer();
                  }
                }}
                className={`rounded px-3 py-1.5 text-xs text-white ${
                  isDirty ? "bg-emerald-600 hover:bg-emerald-500" : "bg-stone-700 text-stone-500"
                }`}
              >
                儲存設定
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="flex gap-2 border-b border-emerald-800/40 pb-2 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab("overview")}
                className={`px-2 py-1 ${activeTab === "overview" ? "border-b-2 border-emerald-400 font-bold text-white" : "text-stone-400"}`}
              >
                概覽
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("subscription")}
                className={`px-2 py-1 ${activeTab === "subscription" ? "border-b-2 border-emerald-400 font-bold text-white" : "text-stone-400"}`}
              >
                訂閱與欄位
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("versions")}
                className={`px-2 py-1 ${activeTab === "versions" ? "border-b-2 border-emerald-400 font-bold text-white" : "text-stone-400"}`}
              >
                期間與版本
              </button>
            </div>

            {activeTab === "overview" && (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-stone-400">工程名稱</label>
                  <input
                    type="text"
                    value={editingDraft.engineeringName || ""}
                    onChange={(e) => {
                      setEditingDraft({ ...editingDraft, engineeringName: e.target.value });
                      setIsDirty(true);
                    }}
                    className="w-full rounded border border-emerald-800 bg-[#16221a] p-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-stone-400">資料模式</label>
                  <select
                    value={editingDraft.mode || "unconfigured"}
                    onChange={(e) => {
                      setEditingDraft({ ...editingDraft, mode: e.target.value as KnEngineeringMode });
                      setIsDirty(true);
                    }}
                    className="w-full rounded border border-emerald-800 bg-[#16221a] p-2 text-white"
                  >
                    <option value="unconfigured">unconfigured (未配置)</option>
                    <option value="daily-report">daily-report (日報)</option>
                    <option value="cumulative-energy">cumulative-energy (累積計數)</option>
                    <option value="power-gauge">power-gauge (即時功率)</option>
                  </select>
                </div>
                <div>
                  <label className="flex items-center gap-2 text-stone-300">
                    <input
                      type="checkbox"
                      checked={Boolean(editingDraft.enabled)}
                      onChange={(e) => {
                        setEditingDraft({ ...editingDraft, enabled: e.target.checked });
                        setIsDirty(true);
                      }}
                    />
                    啟用此工程來源接收
                  </label>
                </div>
              </div>
            )}

            {activeTab === "subscription" && (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-stone-400">Exact Topic</label>
                  <input
                    type="text"
                    value={editingDraft.exactTopic || ""}
                    onChange={(e) => {
                      setEditingDraft({ ...editingDraft, exactTopic: e.target.value });
                      setIsDirty(true);
                    }}
                    className="w-full rounded border border-emerald-800 bg-[#16221a] p-2 font-mono text-white"
                  />
                </div>
                <div>
                  <label className="block text-stone-400">批准發布端 (Approved PublisherId)</label>
                  <input
                    type="text"
                    value={editingDraft.approvedPublisherId || ""}
                    placeholder="例如: pub-kn-gateway"
                    onChange={(e) => {
                      setEditingDraft({ ...editingDraft, approvedPublisherId: e.target.value });
                      setIsDirty(true);
                    }}
                    className="w-full rounded border border-emerald-800 bg-[#16221a] p-2 text-white"
                  />
                </div>
              </div>
            )}

            {activeTab === "versions" && (
              <div className="space-y-3 text-xs">
                <div className="text-stone-300">
                  目前快照：{selectedItem.head ? `v${selectedItem.head.current_data_revision} (${selectedItem.head.period_status}) - ${selectedItem.head.value} kWh` : "尚無成果"}
                </div>
                <div className="text-stone-400">
                  期間：{selectedItem.head?.period_start ?? "N/A"} ~ {selectedItem.head?.period_end ?? "N/A"}
                </div>
              </div>
            )}
          </div>
        </SourceDetailsDrawer>
      )}
    </div>
  );
}
