import { useLoaderData } from "react-router-dom";
import type { DataHubManagementScope } from "../../app/dataHub";
import { DataHubSectionState } from "./sectionState";
import {
  buildMetricUsageDiagnosticsHref,
  buildMetricUsageDisplayEditorHref
} from "./links";
import type { DataHubUsageModel, DataHubUsageRouteModel, MetricUsageRow } from "./UsageModel";

const scopeLabels: Record<string, string> = {
  cl: "CL",
  global: "Global",
  kn: "KN"
};

function pageLabel(row: MetricUsageRow) {
  return row.pageLabelZh || row.pageLabelEn || row.labelZh || row.labelEn || row.pageKey;
}

function configuredScopeLabel(row: MetricUsageRow) {
  if (row.inherited || row.configuredScope === "inherit-device") return "Inherited";
  if (row.configuredScope) return scopeLabels[row.configuredScope] ?? row.configuredScope;
  return row.scopeLabel === "registered" ? "Registered" : row.scopeLabel;
}

function UsageRow({ modelScope, row }: { modelScope: DataHubManagementScope; row: MetricUsageRow }) {
  const editorHref = buildMetricUsageDisplayEditorHref(row);
  return (
    <article
      className="mgmt-card space-y-4 p-5"
      data-usage-consumer-id={row.consumerId}
      data-usage-page-instance={row.pageInstanceId ?? "registered"}
      data-usage-row={`${row.consumerType}:${row.consumerId}`}
      data-usage-scope={row.configuredScope ?? "registered"}
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[#687169]">{row.consumerType}</p>
          <h3 className="text-lg font-semibold text-[#27322b]">{row.metricKey}</h3>
        </div>
        <span className={`mgmt-chip ${row.inherited ? "is-warning" : "is-accent"}`}>
          {configuredScopeLabel(row)}
        </span>
      </header>
      <dl className="grid gap-x-6 gap-y-3 text-sm text-[#4d554f] sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="text-xs uppercase tracking-wide text-[#7b857d]">Page instance / label</dt>
          <dd data-usage-page-label>
            {row.pageInstanceId === null ? "Registered" : `#${row.pageInstanceId}`} · {pageLabel(row)}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-[#7b857d]">Item / consumer id</dt>
          <dd>
            <code>{row.itemId ?? "—"}</code> · <code>{row.consumerId}</code>
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-[#7b857d]">Consumer type</dt>
          <dd data-usage-consumer-type={row.consumerType}>{row.consumerType}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-[#7b857d]">Configured scope</dt>
          <dd data-usage-configured-scope={row.configuredScope ?? "registered"}>
            {configuredScopeLabel(row)}
          </dd>
        </div>
      </dl>
      <nav aria-label={`${row.metricKey} consumer actions`} className="flex flex-wrap gap-2 border-t border-[#e1e8e2] pt-3">
        {editorHref ? (
          <a className="mgmt-action" data-usage-action="display-editor" href={editorHref}>
            Display Editor
          </a>
        ) : null}
        <a
          className="mgmt-action"
          data-usage-action="diagnostics"
          href={buildMetricUsageDiagnosticsHref(row, modelScope)}
        >
          Diagnostics
        </a>
      </nav>
    </article>
  );
}

export function DataHubUsageContent({
  errorMessage = "",
  model
}: {
  errorMessage?: string;
  model: DataHubUsageModel | null;
}) {
  if (!model) {
    return <DataHubSectionState message={errorMessage || "Usage 資料同步失敗。"} status="error" />;
  }
  if (model.usage.length === 0) {
    return <DataHubSectionState message="此範圍目前沒有 metric consumers。" status="empty" />;
  }

  return (
    <div className="space-y-5 px-5 pb-8" data-data-hub-section="usage">
      <header>
        <p className="text-xs uppercase tracking-[0.2em] text-[#687169]">Data Hub / Usage</p>
        <h2 className="text-2xl font-semibold text-[#27322b]">使用情形</h2>
        <p className="mt-1 max-w-3xl text-sm text-[#687169]">
          依 semantic metric 查看已發布頁面、Widget 與 registered story/readiness consumers；source topic 不是 Usage identity。
        </p>
      </header>
      <div className="mgmt-card flex flex-wrap justify-between gap-3 p-4 text-sm text-[#4d554f]">
        <span>Scope: <strong>{model.scope === "all" ? "All" : scopeLabels[model.scope] ?? model.scope}</strong></span>
        <span>{model.usage.length} consumers · Generated {model.generatedAt}</span>
      </div>
      <section className="grid gap-4 xl:grid-cols-2">
        {model.usage.map((row) => (
          <UsageRow key={`${row.consumerType}:${row.consumerId}:${row.metricKey}`} modelScope={model.scope} row={row} />
        ))}
      </section>
    </div>
  );
}

export function DataHubUsage() {
  const routeModel = useLoaderData() as DataHubUsageRouteModel | undefined;
  if (!routeModel) {
    return <DataHubSectionState status="loading" />;
  }
  return <DataHubUsageContent errorMessage={routeModel.errorMessage} model={routeModel.model} />;
}
