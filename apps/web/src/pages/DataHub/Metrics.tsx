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
  "derived-metric": "Derived metric",
  "mqtt-live": "Generic MQTT",
  "playback-settings": "Playback settings",
  "solar-adapter": "Solar adapter"
};

const stateLabels: Record<string, string> = {
  degraded: "Degraded",
  delayed: "Delayed",
  historical: "Historical",
  live: "Live",
  "not-evaluated": "Not evaluated",
  ready: "Ready",
  stale: "Stale",
  unavailable: "Unavailable"
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
    return <span>尚無 provenance</span>;
  }

  return (
    <div className="space-y-1" data-metric-provenance>
      {sourceId ? <div>Source: <code>{sourceId}</code></div> : null}
      {sourceTopic ? <div>Topic: <code>{sourceTopic}</code></div> : null}
      {sourceTimestamp ? <div>Observed: {sourceTimestamp}</div> : null}
      {dependencies.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          Dependencies:
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
  return (
    <article
      className="mgmt-card space-y-4 p-5"
      data-metric-id={row.id}
      data-metric-key={row.metricKey}
      data-metric-scope={row.metricScope}
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[#687169]">{scopeLabels[row.metricScope]} · {sourceLabels[row.sourceClass] ?? row.sourceClass}</p>
          <h3 className="text-lg font-semibold text-[#27322b]">{row.label}</h3>
          <code className="text-sm text-[#687169]">{row.metricKey}</code>
        </div>
        <span className="mgmt-chip is-accent">{row.ownership}</span>
      </header>
      <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="text-xs uppercase tracking-wide text-[#7b857d]">Current value</dt>
          <dd><strong className="text-xl text-[#27322b]">{value}</strong>{row.unit ? ` ${row.unit}` : ""}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-[#7b857d]">Freshness</dt>
          <dd><StateChip state={row.freshnessState} /></dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-[#7b857d]">Evaluation</dt>
          <dd><StateChip state={row.evaluationState} /></dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-[#7b857d]">Identity</dt>
          <dd><code>{row.id}</code></dd>
        </div>
      </dl>
      <div className="border-t border-[#e1e8e2] pt-3 text-xs text-[#687169]">
        <ProvenanceSummary row={row} />
      </div>
      <nav aria-label={`${row.metricKey} actions`} className="flex flex-wrap gap-2 border-t border-[#e1e8e2] pt-3">
        <a
          className="mgmt-action"
          data-metric-action="usage"
          href={buildDataHubUsageHref(row.metricKey, row.metricScope)}
        >
          Usage
        </a>
        <a
          className="mgmt-action"
          data-metric-action="diagnostics"
          href={buildDataHubDiagnosticsHref(row.metricKey, row.metricScope)}
        >
          Diagnostics
        </a>
      </nav>
    </article>
  );
}

export function DataHubMetricsContent({ model }: { model: DataHubMetricsModel }) {
  if (model.metrics.length === 0) {
    return <DataHubSectionState message="此範圍目前沒有 semantic metrics。" status="empty" />;
  }

  return (
    <div className="space-y-5 px-5 pb-8" data-data-hub-section="metrics">
      <header>
        <p className="text-xs uppercase tracking-[0.2em] text-[#687169]">Data Hub / Metrics</p>
        <h2 className="text-2xl font-semibold text-[#27322b]">語意指標</h2>
        <p className="mt-1 max-w-3xl text-sm text-[#687169]">依 scope 查看 current value、freshness、evaluation、source ownership 與安全的 provenance 摘要。</p>
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
