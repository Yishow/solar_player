import { useState } from "react";
import type { MetricScope } from "@solar-display/shared";
import {
  getMetricScopeLabel,
  type GenericMappingPatch,
  type GenericMqttMapping,
  type GenericSourceRow,
  type ManagedSourceRow,
  type SourceHealth,
  type SourceResource
} from "./SourcesModel";

export function SourceHealthChip({ health }: { health: SourceHealth }) {
  return <span className={`mgmt-chip ${health.tone === "default" ? "" : `is-${health.tone}`}`.trim()}>{health.label}</span>;
}

export function SourceResourceList({ resources }: { resources: SourceResource[] }) {
  if (resources.length === 0) {
    return <p className="text-sm text-[#687169]">尚未發現額外資源。</p>;
  }

  return (
    <ul className="space-y-2" data-source-resources>
      {resources.map((resource) => (
        <li className="rounded border border-[#d9e2dc] bg-white/60 p-3" key={`${resource.label}:${resource.detail}`}>
          <strong className="block text-sm text-[#27322b]">{resource.label}</strong>
          <small className="block text-[#687169]">{resource.detail}</small>
          {resource.metrics.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-2" data-source-resource-metrics>
              {resource.metrics.map((metric) => <code className="rounded bg-[#edf4ee] px-2 py-1 text-xs" key={metric}>{metric}</code>)}
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export function SourceRowMeta({ row }: { row: ManagedSourceRow | GenericSourceRow }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[#637166] border-b border-[#edf2ee] pb-3" data-source-meta>
      <div className="flex items-center gap-3">
        <span className="font-semibold text-[#1e2821]" data-source-scope={row.metricScope}>
          範圍：{getMetricScopeLabel(row.metricScope)}
        </span>
        <span className="text-[#cbd6ce]">·</span>
        <SourceHealthChip health={row.health} />
      </div>
      <div className="font-mono text-[11px] text-[#738075]" data-source-activity title={row.activity}>
        最近活動：{row.activity}
      </div>
    </div>
  );
}

export function ManagedSourceCard({ row }: { row: ManagedSourceRow }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <article className="mgmt-card space-y-3 p-4 rounded-xl border border-[#d6dfd8] bg-white shadow-xs transition-all" data-source-id={row.id} data-source-kind="managed" data-source-ownership={row.ownership} data-source-row>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#637166]">{row.sourceType}</span>
            <span className="font-mono text-xs text-[#2d5538] bg-[#f0f6f1] border border-[#cbd8ce] px-2.5 py-0.5 rounded-md">{row.sourceTopic}</span>
          </div>
          <span className="text-[#cbd6ce]">·</span>
          <h3 className="text-sm font-bold text-[#1e2821]">Solar 轉接器 · {getMetricScopeLabel(row.metricScope)}</h3>
          <span className="text-[#cbd6ce]">·</span>
          <SourceHealthChip health={row.health} />
          <span className="text-xs text-[#738075]">（自動探索 {row.resources.length} 個分區）</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="mgmt-chip is-accent">託管轉接器 (Managed)</span>
          <button
            type="button"
            className="text-xs font-semibold text-[#375a2d] hover:text-[#25401d] flex items-center gap-1 py-1 px-2.5 rounded-md hover:bg-[#edf4ee] transition-colors cursor-pointer"
            onClick={() => setIsExpanded((prev) => !prev)}
          >
            <span>{isExpanded ? "收合詳情 ▲" : "展開詳情 ▼"}</span>
          </button>
        </div>
      </header>

      <SourceRowMeta row={row} />

      {isExpanded ? (
        <div className="space-y-4 border-t border-[#edf2ee] pt-3">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-[#e2e8e3] bg-[#fbfcfb] p-3.5 space-y-2">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#637166]">擁有的語意指標</h4>
              <div className="flex flex-wrap gap-1.5" data-source-owned-metrics>
                {row.ownedMetrics.map((metric) => <code className="rounded bg-white border border-[#cbd6ce] px-2 py-0.5 text-xs font-mono text-[#27342a]" key={metric}>{metric}</code>)}
              </div>
            </div>
            <div className="rounded-lg border border-[#e2e8e3] bg-[#fbfcfb] p-3.5 space-y-2">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#637166]">自動探索資源</h4>
              <SourceResourceList resources={row.resources} />
            </div>
          </div>
          <p className="text-xs text-[#738075]">由 Solar 轉接器託管的指標由系統自動同步，映射控制維持唯讀。</p>
        </div>
      ) : (
        <div className="hidden" aria-hidden="true">
          <div data-source-owned-metrics>
            {row.ownedMetrics.map((metric) => <code key={metric}>{metric}</code>)}
          </div>
          <SourceResourceList resources={row.resources} />
        </div>
      )}
    </article>
  );
}

export function GenericSourceCard({
  row,
  onChange,
  onDelete,
  onPublishTest
}: {
  row: GenericSourceRow;
  onChange: (id: number, patch: GenericMappingPatch) => void;
  onDelete?: (id: number) => void;
  onPublishTest?: (metricScope: MetricScope, metricKey: string, value: number) => Promise<void>;
}) {
  const disabled = !row.editable;
  const [testValue, setTestValue] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const inputClass = "h-9 w-full rounded-lg border border-[#cbd6ce] bg-white px-3 text-[13px] text-[#1e2821] shadow-2xs transition-all placeholder:text-[#9ea7a0] focus:border-[#4c753b] focus:ring-2 focus:ring-[#4c753b]/15 disabled:cursor-not-allowed disabled:bg-[#f0f3f1] disabled:text-[#7b857d] outline-none";

  return (
    <article
      className={`mgmt-card space-y-4 p-5 rounded-xl border border-[#d6dfd8] bg-white shadow-xs transition-shadow hover:shadow-sm ${disabled ? "opacity-90" : ""}`}
      data-source-id={row.id}
      data-source-kind="generic"
      data-source-ownership={row.ownership}
      data-source-row
    >
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#637166]">{row.sourceType}</span>
            <span className="font-mono text-xs text-[#2d5538] bg-[#f0f6f1] border border-[#cbd8ce] px-2.5 py-0.5 rounded-md">{row.sourceTopic}</span>
          </div>
          <h3 className="text-base font-bold text-[#1e2821] mt-1">{row.metricKey}</h3>
        </div>
        <div className="flex items-center gap-2.5">
          <label className="flex items-center gap-1.5 text-xs font-medium text-[#27342a] cursor-pointer select-none bg-[#f4f7f4] border border-[#cbd6ce] px-2.5 py-1 rounded-lg hover:bg-[#ebf1ec] transition-colors">
            <input
              checked={row.mapping.enabled}
              className="h-3.5 w-3.5 rounded border-[#cbd6ce] text-[#4c753b] focus:ring-[#4c753b]"
              disabled={disabled}
              name="enabled"
              onChange={(event) => onChange(row.mapping.id, { enabled: event.target.checked })}
              type="checkbox"
            />
            <span>啟用</span>
          </label>
          <span className={`mgmt-chip ${disabled ? "is-warning" : "is-accent"}`}>
            {disabled ? "Solar 轉接器保留" : "維運自訂"}
          </span>
          {row.editable && onDelete ? (
            <button
              type="button"
              className="text-xs font-semibold text-[#c14a4a] hover:bg-[#c14a4a]/10 rounded px-2.5 py-1 transition-colors"
              onClick={() => onDelete(row.mapping.id)}
              title="刪除此主題映射"
            >
              刪除
            </button>
          ) : null}
        </div>
      </header>

      <SourceRowMeta row={row} />

      {disabled ? (
        <p className="rounded-lg border border-[#ead7aa] bg-[#fff8e8] p-3 text-xs text-[#6b5524]" role="note">
          此指標由 Solar Adapter 託管，Topic 映射控制為唯讀。
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-12" data-source-generic-fields>
        {/* 第 1 行：識別與連線 (12 欄) */}
        <label className="block space-y-1 text-xs font-medium text-[#37443a] sm:col-span-1 md:col-span-1 lg:col-span-3">
          <span>指標代碼 (Metric Key)</span>
          <input className={inputClass} disabled={disabled} name="metricKey" onChange={(event) => onChange(row.mapping.id, { metricKey: event.target.value })} value={row.mapping.metricKey} />
        </label>
        <label className="block space-y-1 text-xs font-medium text-[#37443a] sm:col-span-1 md:col-span-1 lg:col-span-2">
          <span>指標範圍 (Metric Scope)</span>
          <select
            className={inputClass}
            disabled={disabled}
            name="metricScope"
            value={row.mapping.metricScope}
            onChange={(event) => onChange(row.mapping.id, { metricScope: event.target.value as GenericMqttMapping["metricScope"] })}
          >
            <option value="cl">CL (中壢)</option>
            <option value="kn">KN (觀音)</option>
            <option value="global">全域 (Global)</option>
          </select>
        </label>
        <label className="block space-y-1 text-xs font-medium text-[#37443a] sm:col-span-2 md:col-span-2 lg:col-span-4">
          <span>MQTT 主題 (Topic)</span>
          <input className={inputClass} disabled={disabled} name="topic" onChange={(event) => onChange(row.mapping.id, { topic: event.target.value })} value={row.mapping.topic} />
        </label>
        <label className="block space-y-1 text-xs font-medium text-[#37443a] sm:col-span-1 md:col-span-1 lg:col-span-2">
          <span>單位 (Unit)</span>
          <input className={inputClass} disabled={disabled} name="unit" onChange={(event) => onChange(row.mapping.id, { unit: event.target.value })} value={row.mapping.unit} />
        </label>
        <label className="block space-y-1 text-xs font-medium text-[#37443a] sm:col-span-1 md:col-span-1 lg:col-span-1">
          <span>乘數 (Multiplier)</span>
          <input className={inputClass} disabled={disabled} inputMode="decimal" name="multiplier" onChange={(event) => onChange(row.mapping.id, { multiplier: Number(event.target.value) || 1 })} step="0.01" type="number" value={row.mapping.multiplier ?? 1} />
        </label>

        {/* 第 2 行：解析、名稱與發佈 (4 欄均分 · 12 欄) */}
        <label className="block space-y-1 text-xs font-medium text-[#37443a] sm:col-span-1 md:col-span-1 lg:col-span-3">
          <span>值路徑 (Value Path)</span>
          <input className={inputClass} disabled={disabled} name="valuePath" placeholder="例如: $.value" onChange={(event) => onChange(row.mapping.id, { valuePath: event.target.value })} value={row.mapping.valuePath} />
        </label>
        <label className="block space-y-1 text-xs font-medium text-[#37443a] sm:col-span-1 md:col-span-1 lg:col-span-3">
          <span>中文名稱</span>
          <input className={inputClass} disabled={disabled} name="nameZh" placeholder="自訂中文名稱" onChange={(event) => onChange(row.mapping.id, { nameZh: event.target.value })} value={row.mapping.nameZh ?? ""} />
        </label>
        <label className="block space-y-1 text-xs font-medium text-[#37443a] sm:col-span-1 md:col-span-1 lg:col-span-3">
          <span>英文名稱</span>
          <input className={inputClass} disabled={disabled} name="nameEn" placeholder="自訂英文名稱" onChange={(event) => onChange(row.mapping.id, { nameEn: event.target.value })} value={row.mapping.nameEn ?? ""} />
        </label>

        {onPublishTest ? (
          <div className="block space-y-1 text-xs font-medium text-[#37443a] sm:col-span-1 md:col-span-1 lg:col-span-3">
            <span>測試發佈 (Test Publish)</span>
            <div className="flex items-center gap-2">
              <input
                className={`${inputClass} font-mono flex-1 min-w-0`}
                disabled={isPublishing}
                placeholder="輸入測試數值"
                type="number"
                value={testValue}
                onChange={(e) => setTestValue(e.target.value)}
              />
              <button
                type="button"
                className="h-9 min-h-[36px] px-3 text-xs font-semibold rounded-lg shrink-0 inline-flex items-center justify-center bg-[#4c753b] text-white hover:bg-[#3d602f] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xs active:scale-98 cursor-pointer"
                disabled={isPublishing || !testValue.trim()}
                onClick={async () => {
                  if (!testValue.trim()) return;
                  setIsPublishing(true);
                  await onPublishTest(row.mapping.metricScope, row.mapping.metricKey, Number(testValue));
                  setIsPublishing(false);
                }}
              >
                {isPublishing ? "發佈中..." : "發佈測試值"}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </article>
  );
}
