import { useEffect, useState } from "react";
import { useLoaderData, useSearchParams } from "react-router-dom";
import { DataHubCardDataDiagnostics } from "./CardDataDiagnostics";
import { DataHubSectionState } from "./sectionState";
import type { CardDataDiagnosticsModel } from "./CardDataDiagnosticsModel";
import {
  buildMonitoringResetFeedback,
  buildMonitoringResetConfirmationMessage,
  canResetMonitoringSummary,
  resetMonitoringTodayTrend
} from "./DiagnosticsModel";
import type {
  DataHubDiagnosticsModel,
  DataHubDiagnosticsRouteModel,
  DataHubDiagnosticsSelection,
  DataHubMonitoringDiagnosticsModel,
  MetricProvenanceNode,
  MetricProvenanceNodeCategory
} from "./DiagnosticsModel";

const categoryLabels: Record<MetricProvenanceNodeCategory, string> = {
  "calculation-setting": "Calculation setting",
  "derived-metric": "Derived metric",
  "managed-source": "Managed source",
  "mqtt-topic": "MQTT topic",
  page: "Page",
  "readiness-consumer": "Readiness consumer",
  "semantic-metric": "Semantic metric",
  "source-connection": "Source connection",
  widget: "Widget"
};

const edgeLabels = {
  "depends-on": "Depends on",
  produces: "Produces",
  "used-by": "Used by"
} as const;

const scopeLabels = {
  cl: "CL",
  global: "Global",
  kn: "KN"
} as const;

const metadataAllowlist: Record<MetricProvenanceNodeCategory, readonly string[]> = {
  "calculation-setting": ["settingKey", "unit"],
  "derived-metric": ["expression", "fallbackPolicy", "managed", "metricKey", "outputUnit", "revision"],
  "managed-source": ["ownership", "sourceClass", "sourceId"],
  "mqtt-topic": ["sourceClass", "sourceId", "topic"],
  page: ["configuredScope", "consumerId", "consumerType", "inherited", "itemId", "pageInstanceId", "pageKey", "templateKey"],
  "readiness-consumer": ["configuredScope", "consumerId", "consumerType", "inherited", "itemId", "pageInstanceId", "pageKey", "templateKey"],
  "semantic-metric": ["evaluationState", "freshnessState", "metricKey", "ownership", "sourceClass", "sourceId", "sourceTimestamp", "unit", "value"],
  "source-connection": ["connectionType", "role"],
  widget: ["configuredScope", "consumerId", "consumerType", "inherited", "itemId", "pageInstanceId", "pageKey", "templateKey"]
};

const metadataLabels: Record<string, string> = {
  configuredScope: "Configured scope",
  connectionType: "Connection type",
  consumerId: "Consumer id",
  consumerType: "Consumer type",
  evaluationState: "Evaluation",
  expression: "Expression",
  fallbackPolicy: "Fallback policy",
  freshnessState: "Freshness",
  inherited: "Inherited",
  itemId: "Item id",
  managed: "Managed",
  metricKey: "Metric key",
  outputUnit: "Output unit",
  ownership: "Ownership",
  pageInstanceId: "Page instance",
  pageKey: "Page key",
  revision: "Revision",
  role: "Role",
  settingKey: "Setting key",
  sourceClass: "Source class",
  sourceId: "Source id",
  sourceTimestamp: "Source timestamp",
  templateKey: "Template key",
  topic: "Topic",
  unit: "Unit",
  value: "Value"
};

function formatScalarMetadataValue(value: unknown) {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : null;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value !== "string") return null;
  return value.trim() || null;
}

function readAllowedMetadata(node: MetricProvenanceNode) {
  const metadata = node.metadata;
  if (!metadata) return [];
  return metadataAllowlist[node.category].flatMap((key) => {
    const value = formatScalarMetadataValue(metadata[key]);
    return value === null ? [] : [{ key, label: metadataLabels[key] ?? key, value }];
  });
}

function scopeLabel(scope: MetricProvenanceNode["scope"]) {
  return scope ? scopeLabels[scope] : "Unscoped";
}

function ProvenanceNode({ node }: { node: MetricProvenanceNode }) {
  const metadata = readAllowedMetadata(node);
  return (
    <li
      className="mgmt-card space-y-3 p-4"
      data-provenance-node-category={node.category}
      data-provenance-node-id={node.id}
      data-provenance-node-scope={node.scope ?? "none"}
      data-provenance-node-status={node.status ?? "unknown"}
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-[#687169]">{categoryLabels[node.category]}</p>
          <h4 className="text-base font-semibold text-[#27322b]">{node.label}</h4>
          <code className="text-xs text-[#687169]">{node.id}</code>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="mgmt-chip">{scopeLabel(node.scope)}</span>
          <span className="mgmt-chip is-accent">{node.status ?? "Unknown"}</span>
        </div>
      </header>
      {metadata.length > 0 ? (
        <dl className="grid gap-x-5 gap-y-2 text-xs text-[#4d554f] sm:grid-cols-2">
          {metadata.map(({ key, label, value }) => (
            <div data-provenance-metadata-key={key} key={key}>
              <dt className="text-[#7b857d]">{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </li>
  );
}

function ProvenanceEdge({
  fromLabel,
  edge,
  toLabel
}: {
  edge: DataHubDiagnosticsModel["edges"][number];
  fromLabel: string;
  toLabel: string;
}) {
  return (
    <li
      className="mgmt-card flex flex-wrap items-center gap-2 p-3 text-sm text-[#4d554f]"
      data-provenance-edge={`${edge.from}:${edge.kind}:${edge.to}`}
    >
      <code>{fromLabel}</code>
      <span className="mgmt-chip is-accent">{edgeLabels[edge.kind]}</span>
      <code>{toLabel}</code>
    </li>
  );
}

function MonitoringSummary({
  onReset,
  resetPending,
  showReset,
  summary
}: {
  onReset: () => void;
  resetPending: boolean;
  showReset: boolean;
  summary: DataHubMonitoringDiagnosticsModel["summaries"][number];
}) {
  const scopeLabel = scopeLabels[summary.metricScope];
  const dayStatus = summary.hasCurrentDaySnapshots
    ? `今日 snapshots: ${summary.currentDaySnapshotCount}（examined sample；檢查最近最多 ${summary.snapshotSampleLimit} 筆）`
    : `今日尚無 snapshots（examined sample；檢查最近最多 ${summary.snapshotSampleLimit} 筆）`;

  return (
    <article
      className="mgmt-card space-y-3 p-4"
      data-monitoring-summary-scope={summary.metricScope}
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-[#687169]">Monitoring day</p>
          <h4 className="text-base font-semibold text-[#27322b]">{scopeLabel}</h4>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {showReset ? (
            <button
              aria-label={`重設 ${scopeLabel} 今日曲線`}
              className="mgmt-action"
              data-monitoring-reset-confirmation={buildMonitoringResetConfirmationMessage(summary.metricScope)}
              data-monitoring-reset-scope={summary.metricScope}
              disabled={resetPending}
              onClick={onReset}
              type="button"
            >
              {resetPending ? "重設中…" : "重設今日曲線"}
            </button>
          ) : null}
          <span className="mgmt-chip is-accent">{summary.hasCurrentDaySnapshots ? "今日" : "空"}</span>
        </div>
      </header>
      <dl className="grid gap-x-5 gap-y-2 text-sm text-[#4d554f] sm:grid-cols-2">
        <div>
          <dt className="text-[#7b857d]">Current local date</dt>
          <dd>{summary.localDate}</dd>
        </div>
        <div>
          <dt className="text-[#7b857d]">Today snapshot count</dt>
          <dd>{dayStatus}</dd>
        </div>
        <div>
          <dt className="text-[#7b857d]">Latest snapshot</dt>
          <dd>{summary.latestSnapshotDate ?? "無"}{summary.latestSnapshotAt ? ` · ${summary.latestSnapshotAt}` : ""}</dd>
        </div>
        <div>
          <dt className="text-[#7b857d]">Examined recent snapshot sample</dt>
          <dd>{summary.snapshotCount} / {summary.snapshotSampleLimit}</dd>
        </div>
      </dl>
      {summary.anomalyMessages.length > 0 ? (
        <ul aria-label={`${scopeLabel} monitoring anomalies`} className="space-y-1 text-sm text-[#8a4f18]">
          {summary.anomalyMessages.map((message) => <li key={message}>{message}</li>)}
        </ul>
      ) : null}
    </article>
  );
}

function MonitoringDiagnostics({
  errorMessage,
  model
}: {
  errorMessage: string;
  model: DataHubMonitoringDiagnosticsModel | null;
}) {
  const [currentModel, setCurrentModel] = useState(model);
  const [resetFeedback, setResetFeedback] = useState("");
  const [resetFeedbackStatus, setResetFeedbackStatus] = useState<"error" | "success" | "warning" | null>(null);
  const [resetPending, setResetPending] = useState(false);

  useEffect(() => {
    setCurrentModel(model);
    setResetFeedback("");
    setResetFeedbackStatus(null);
    setResetPending(false);
  }, [model]);

  const requestedScopeLabel = currentModel?.requestedScope === "all"
    ? "全部"
    : currentModel?.requestedScope
      ? scopeLabels[currentModel.requestedScope]
      : "";

  const runReset = async (summary: DataHubMonitoringDiagnosticsModel["summaries"][number]) => {
    if (!canResetMonitoringSummary(currentModel, summary) || resetPending) return;
    if (!window.confirm(buildMonitoringResetConfirmationMessage(summary.metricScope))) return;

    setResetPending(true);
    setResetFeedback("");
    setResetFeedbackStatus(null);
    try {
      const { monitoring, reloadErrorMessage, reset } = await resetMonitoringTodayTrend(summary.metricScope);
      if (monitoring) {
        setCurrentModel(monitoring);
      }
      setResetFeedback(buildMonitoringResetFeedback(summary.metricScope, reset.deletedSnapshots, reloadErrorMessage));
      setResetFeedbackStatus(reloadErrorMessage === null ? "success" : "warning");
    } catch (error) {
      setResetFeedback(error instanceof Error ? error.message : "今日曲線重設失敗。");
      setResetFeedbackStatus("error");
    } finally {
      setResetPending(false);
    }
  };

  return (
    <section aria-labelledby="monitoring-diagnostics-heading" className="space-y-3" data-monitoring-diagnostics>
      <header>
        <p className="text-xs uppercase tracking-[0.2em] text-[#687169]">Monitoring day diagnostics</p>
        <h3 className="text-lg font-semibold text-[#27322b]" id="monitoring-diagnostics-heading">今日 monitoring snapshot</h3>
        {requestedScopeLabel ? <p className="text-sm text-[#687169]">Requested scope: {requestedScopeLabel}</p> : null}
      </header>
      {resetFeedback ? (
        <p
          aria-live="polite"
          className="mgmt-card p-3 text-sm text-[#4d554f]"
          data-monitoring-reset-feedback
          data-monitoring-reset-feedback-state={resetFeedbackStatus ?? "unknown"}
          role={resetFeedbackStatus === "error" ? "alert" : "status"}
        >
          {resetFeedback}
        </p>
      ) : null}
      {!currentModel ? (
        errorMessage ? <DataHubSectionState message={errorMessage} status="error" /> : <DataHubSectionState status="loading" />
      ) : currentModel.summaries.length === 0 ? (
        <DataHubSectionState message="目前沒有 monitoring day summaries。" status="empty" />
      ) : (
        <div className="grid gap-3 xl:grid-cols-3">
          {currentModel.summaries.map((summary) => (
            <MonitoringSummary
              key={summary.metricScope}
              onReset={() => void runReset(summary)}
              resetPending={resetPending}
              showReset={canResetMonitoringSummary(currentModel, summary)}
              summary={summary}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export function DataHubDiagnosticsContent({
  errorMessage = "",
  cardData = null,
  cardDataErrorMessage = "",
  monitoring = null,
  monitoringErrorMessage = "",
  model,
  requestedMetricKey,
  requestedScope,
  selection,
  selectionMessage = ""
}: {
  cardData?: CardDataDiagnosticsModel | null;
  cardDataErrorMessage?: string;
  errorMessage?: string;
  monitoring?: DataHubMonitoringDiagnosticsModel | null;
  monitoringErrorMessage?: string;
  model: DataHubDiagnosticsModel | null;
  requestedMetricKey?: string;
  requestedScope?: string;
  selection?: DataHubDiagnosticsSelection | null;
  selectionMessage?: string;
}) {
  const metricKey = requestedMetricKey ?? selection?.metricKey ?? "";
  const selectedScope = requestedScope ?? selection?.scope ?? "";
  const scopeValue = ["cl", "kn", "global"].includes(selectedScope) ? selectedScope : "";

  return (
    <div className="space-y-5 px-5 pb-8" data-data-hub-section="diagnostics">
      <header>
        <p className="text-xs uppercase tracking-[0.2em] text-[#687169]">Data Hub / Diagnostics</p>
        <h2 className="text-2xl font-semibold text-[#27322b]">Provenance diagnostics</h2>
        <p className="mt-1 max-w-3xl text-sm text-[#687169]">選取一個 semantic metric identity，查看有界且去重的資料來源、依賴與消費者鏈。</p>
        <a className="mgmt-action mt-3 inline-flex" href="/settings/data-hub/diagnostics/operations">進階資料維運</a>
      </header>

      <form className="mgmt-card flex flex-wrap items-end gap-3 p-4" method="get">
        <label className="grid gap-1 text-sm text-[#4d554f]" htmlFor="diagnostics-metric-key">
          Semantic metricKey
          <input
            className="mgmt-input min-w-64"
            defaultValue={metricKey}
            id="diagnostics-metric-key"
            name="metricKey"
            placeholder="realTimePower"
          />
        </label>
        <label className="grid gap-1 text-sm text-[#4d554f]" htmlFor="diagnostics-scope">
          Concrete scope
          <select className="mgmt-input" defaultValue={scopeValue} id="diagnostics-scope" name="scope">
            <option value="">Select CL / KN / Global</option>
            <option value="cl">CL</option>
            <option value="kn">KN</option>
            <option value="global">Global</option>
          </select>
        </label>
        <button className="mgmt-action mgmt-action-primary" type="submit">Inspect provenance</button>
      </form>

      <MonitoringDiagnostics errorMessage={monitoringErrorMessage} model={monitoring} />

      {!model ? (
        errorMessage ? (
          <DataHubSectionState message={errorMessage} status="error" />
        ) : selectionMessage ? (
          <DataHubSectionState message={selectionMessage} status="empty" />
        ) : (
          <DataHubSectionState status="loading" />
        )
      ) : model.nodes.length === 0 ? (
        <DataHubSectionState message="此選取目前沒有 provenance nodes。" status="empty" />
      ) : (
        <>
          <div className="mgmt-card flex flex-wrap justify-between gap-3 p-4 text-sm text-[#4d554f]" data-provenance-summary>
            <span>Metric: <strong>{model.metricKey}</strong></span>
            <span>Scope: <strong>{scopeLabels[model.scope]}</strong></span>
            <span>{model.nodes.length} nodes · {model.edges.length} edges · Generated {model.generatedAt}</span>
          </div>
          {model.truncated ? (
            <p aria-live="polite" className="mgmt-card border border-[#e9c46a] p-4 text-sm text-[#6a5310]" data-provenance-truncated role="alert">
              Provenance result is bounded: traversal may be truncated at depth {model.maxDepth} or {model.maxNodes} nodes.
            </p>
          ) : null}
          <section aria-labelledby="diagnostics-nodes-heading" className="space-y-3">
            <h3 className="text-lg font-semibold text-[#27322b]" id="diagnostics-nodes-heading">Provenance nodes</h3>
            <ul aria-label="Provenance nodes" className="grid gap-3 xl:grid-cols-2">
              {model.nodes.map((node) => <ProvenanceNode key={node.id} node={node} />)}
            </ul>
          </section>
          <section aria-labelledby="diagnostics-edges-heading" className="space-y-3">
            <h3 className="text-lg font-semibold text-[#27322b]" id="diagnostics-edges-heading">Provenance edges</h3>
            {model.edges.length > 0 ? (
              <ul aria-label="Provenance edges" className="grid gap-2">
                {model.edges.map((edge) => {
                  const fromLabel = model.nodes.find((node) => node.id === edge.from)?.label ?? edge.from;
                  const toLabel = model.nodes.find((node) => node.id === edge.to)?.label ?? edge.to;
                  return <ProvenanceEdge edge={edge} fromLabel={fromLabel} key={`${edge.from}:${edge.kind}:${edge.to}`} toLabel={toLabel} />;
                })}
              </ul>
            ) : (
              <DataHubSectionState message="此選取目前沒有 provenance edges。" status="empty" />
            )}
          </section>
        </>
      )}

      {selection ? (
        <DataHubCardDataDiagnostics
          initialErrorMessage={cardDataErrorMessage}
          model={cardData}
          selection={selection}
        />
      ) : null}
    </div>
  );
}

export function DataHubDiagnostics() {
  const routeModel = useLoaderData() as DataHubDiagnosticsRouteModel | undefined;
  const [searchParams] = useSearchParams();
  const requestedMetricKey = searchParams.get("metricKey") ?? routeModel?.selection?.metricKey ?? "";
  const requestedScope = searchParams.get("scope") ?? routeModel?.selection?.scope ?? "";

  return (
    <DataHubDiagnosticsContent
      cardData={routeModel?.cardData}
      cardDataErrorMessage={routeModel?.cardDataErrorMessage}
      errorMessage={routeModel?.errorMessage}
      monitoring={routeModel?.monitoring}
      monitoringErrorMessage={routeModel?.monitoringErrorMessage}
      model={routeModel?.model ?? null}
      requestedMetricKey={requestedMetricKey}
      requestedScope={requestedScope}
      selection={routeModel?.selection}
      selectionMessage={routeModel?.selectionMessage}
    />
  );
}
