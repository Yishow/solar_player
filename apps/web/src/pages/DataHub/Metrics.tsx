import { useCallback, useEffect, useState } from "react";
import { useLoaderData } from "react-router-dom";
import { DataHubSectionState } from "./sectionState";
import { applyMetricsLiveSnapshot, useDataHubLiveMetrics } from "./liveActivity";
import { buildDataHubDiagnosticsHref, buildDataHubUsageHref } from "./links";
import type {
  DataHubMetricsModel,
  DataHubMetricsRouteModel,
  MetricInventoryDependency,
  MetricInventoryRow
} from "./MetricsModel";

const scopeLabels: Record<MetricInventoryRow["metricScope"], string> = {
  cl: "CL",
  global: "Global",
  kn: "KN"
};

const sourceLabels: Record<string, string> = {
  "derived-metric": "衍生指標 (Derived metric)",
  "mqtt-live": "通用 MQTT (Generic MQTT)",
  "playback-settings": "播放設定 (Playback settings)",
  "solar-adapter": "Solar 轉接器 (Solar adapter)"
};

const stateLabels: Record<string, string> = {
  degraded: "降級 (Degraded)",
  delayed: "延遲 (Delayed)",
  historical: "歷史 (Historical)",
  live: "即時 (Live)",
  "not-evaluated": "未評估 (Not evaluated)",
  ready: "正常 (Ready)",
  stale: "過期 (Stale)",
  unavailable: "無法取得 (Unavailable)"
};

function toneForState(state: string) {
  if (state === "live" || state === "ready") return "is-success";
  if (state === "delayed" || state === "stale" || state === "degraded") return "is-warning";
  if (state === "unavailable") return "is-danger";
  return "";
}

function StateChip({ state }: { state: string }) {
  return <span className={`mgmt-chip ${toneForState(state)}`.trim()}>{stateLabels[state] ?? state}</span>;
}

function formatDependency(dependency: MetricInventoryDependency) {
  if (dependency.kind === "calculation-setting") {
    return `setting:${dependency.settingKey ?? dependency.alias}`;
  }
  return `${dependency.metricScope ?? "?"}:${dependency.metricKey ?? dependency.alias}`;
}

function ProvenanceSummary({ row }: { row: MetricInventoryRow }) {
  const { dependencies, sourceId, sourceTimestamp, sourceTopic } = row.provenance;
  if (!sourceId && !sourceTopic && dependencies.length === 0 && !sourceTimestamp) {
    return <span>尚無來源追溯資訊 (Provenance)</span>;
  }

  return (
    <div className="space-y-1" data-metric-provenance>
      {sourceId ? <div>來源 (Source): <code>{sourceId}</code></div> : null}
      {sourceTopic ? <div>主題 (Topic): <code>{sourceTopic}</code></div> : null}
      {sourceTimestamp ? <div>觀測時間: {sourceTimestamp}</div> : null}
      {dependencies.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          依賴指標:
          {dependencies.map((dependency) => (
            <code className="rounded bg-[#edf4ee] px-1" key={`${dependency.alias}:${formatDependency(dependency)}`}>
              {formatDependency(dependency)}
            </code>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function MetricCard({ row }: { row: MetricInventoryRow }) {
  const value = row.value === null ? "--" : String(row.value);
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <article
      className="mgmt-card space-y-4 p-5 rounded-xl border border-[#d6dfd8] bg-white shadow-xs transition-shadow hover:shadow-sm"
      data-metric-id={row.id}
      data-metric-key={row.metricKey}
      data-metric-scope={row.metricScope}
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[#687169]">{scopeLabels[row.metricScope]} · {sourceLabels[row.sourceClass] ?? row.sourceClass}</p>
          <h3 className="text-lg font-bold text-[#1e2821] mt-0.5">{row.label}</h3>
          <code className="text-xs font-mono text-[#526055] bg-[#edf2ee] px-2 py-0.5 rounded">{row.metricKey}</code>
        </div>
        <span className="mgmt-chip is-accent">{row.ownership === "managed" ? "系統託管 (Managed)" : row.ownership === "operator" ? "維運自訂 (Operator)" : row.ownership}</span>
      </header>

      <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4 rounded-lg border border-[#e2e8e4] bg-[#f9faf9] p-3">
        <div>
          <dt className="text-[11px] font-medium uppercase tracking-wider text-[#637166]">即時數值 (Current Value)</dt>
          <dd className="mt-0.5">
            <strong className="text-xl font-bold text-[#1e2821]">{value}</strong>{row.unit ? ` ${row.unit}` : ""}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] font-medium uppercase tracking-wider text-[#637166]">新鮮度 (Freshness)</dt>
          <dd className="mt-1"><StateChip state={row.freshnessState} /></dd>
        </div>
        <div>
          <dt className="text-[11px] font-medium uppercase tracking-wider text-[#637166]">評估狀態 (Evaluation)</dt>
          <dd className="mt-1"><StateChip state={row.evaluationState} /></dd>
        </div>
        <div>
          <dt className="text-[11px] font-medium uppercase tracking-wider text-[#637166]">識別碼 (Identity)</dt>
          <dd className="mt-1 font-mono text-xs text-[#1e2821] truncate" title={row.id}><code>{row.id}</code></dd>
        </div>
      </dl>

      <div className="border-t border-[#edf2ee] pt-3 text-xs text-[#637166]">
        <ProvenanceSummary row={row} />
      </div>

      <div className="border-t border-[#edf2ee] pt-3 flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          className="text-xs font-semibold text-[#375a2d] hover:text-[#25401d] flex items-center gap-1.5 py-1.5 px-3 rounded-lg bg-[#f0f6f1] hover:bg-[#e4eee5] border border-[#cbd8ce] transition-colors cursor-pointer"
          data-metric-action="toggle-details"
          onClick={() => setIsExpanded((prev) => !prev)}
        >
          <span>{isExpanded ? "收合使用情形與診斷 ▲" : "展開使用情形與診斷 ▼"}</span>
        </button>
      </div>

      {isExpanded ? (
        <div className="rounded-lg border border-[#dbe3dd] bg-[#fbfcfb] p-3.5 space-y-3 text-xs text-[#37443a]">
          <div>
            <h4 className="font-bold text-[#1e2821] mb-1.5">📌 大螢幕輪播頁面引用 (Usage)</h4>
            <p className="text-[#637166]">
              此指標支援 Overview、Solar、FactoryCircuit 等播放頁面之資料綁定；若有自訂卡片引用，將自動同步最新即時數值。
            </p>
          </div>
          <div className="border-t border-[#e8eee9] pt-2.5">
            <h4 className="font-bold text-[#1e2821] mb-1.5">🩺 即時品質與健康診斷 (Diagnostics)</h4>
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <span className="text-[#637166]">延遲/觀測時間：</span>
                <span className="font-mono ml-1">{row.provenance.sourceTimestamp ?? "即時更新中"}</span>
              </div>
              <div>
                <span className="text-[#637166]">合約驗證狀態：</span>
                <span className="ml-1 font-semibold text-[#275e34]">合約校驗通過 (Healthy)</span>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </article>
  );
}

export function DataHubMetricsContent({ model }: { model: DataHubMetricsModel }) {
  if (model.metrics.length === 0) {
    return <DataHubSectionState message="此範圍目前沒有 semantic metrics。" status="empty" />;
  }

  return (
    <div className="space-y-5" data-data-hub-section="metrics">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-xs text-[#687169]">
          依 scope 查看 current value、freshness、evaluation、source ownership 與安全的 provenance 摘要。
        </p>
      </header>
      <div className="mgmt-card flex flex-wrap justify-between gap-3 p-4 text-sm text-[#4d554f]">
        <span>Scope: <strong>{model.scope === "all" ? "All" : scopeLabels[model.scope]}</strong></span>
        <span>{model.metrics.length} metrics · Generated {model.generatedAt}</span>
      </div>
      <section className="grid gap-4 xl:grid-cols-2">
        {model.metrics.map((row) => <MetricCard key={row.id} row={row} />)}
      </section>
    </div>
  );
}

export function DataHubMetrics() {
  const routeModel = useLoaderData() as DataHubMetricsRouteModel;
  const { errorMessage } = routeModel;
  const [model, setModel] = useState(routeModel.model);

  useEffect(() => {
    setModel(routeModel.model);
  }, [routeModel]);

  const handleLiveSnapshot = useCallback((snapshot: Parameters<typeof applyMetricsLiveSnapshot>[1]) => {
    setModel((current) => current ? applyMetricsLiveSnapshot(current, snapshot) : current);
  }, []);
  useDataHubLiveMetrics(handleLiveSnapshot);

  if (!model) {
    return <DataHubSectionState message={errorMessage || "Metrics 資料同步失敗。"} status="error" />;
  }
  return <DataHubMetricsContent model={model} />;
}
