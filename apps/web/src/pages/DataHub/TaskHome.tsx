import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  DATA_HUB_SECTIONS,
  filterVisibleDataHubSections,
  type DataHubSection
} from "../../app/dataHub";
import {
  getConfiguredHiddenManagementRoutePaths,
  isManagementRouteHidden
} from "../../app/managementRouteVisibility";
import {
  buildWorkspaceHealthSummary,
  type WorkspaceHealthSummary
} from "./sourceWorkspace";
import {
  buildSourceRows,
  fetchDataHubSourcesModel,
  readCachedDataHubSourcesModel
} from "./SourcesModel";
import {
  DATA_HUB_TASKS,
  buildDataHubTaskHref,
  useDataHubWorkspace
} from "./workspaceContext";

const hiddenManagementRoutePaths = getConfiguredHiddenManagementRoutePaths();

export function DataHubTaskHomeContent({
  specialistSections = DATA_HUB_SECTIONS,
  summary,
  workspaceScope
}: {
  specialistSections?: readonly DataHubSection[];
  summary: WorkspaceHealthSummary;
  workspaceScope: ReturnType<typeof useDataHubWorkspace>["managementScope"];
}) {
  return (
    <div className="space-y-6" data-data-hub-task-home>
      <section className="space-y-3" aria-labelledby="data-hub-tasks-heading">
        <div>
          <h2 className="text-lg font-semibold text-[#1e2821]" id="data-hub-tasks-heading">要先做哪件事？</h2>
          <p className="text-sm text-[#687169]">用任務開始，不必先記住連線、來源或指標這些內部名稱。</p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {DATA_HUB_TASKS.map((task) => (
            <Link
              className="mgmt-card flex min-h-[40px] flex-col gap-2 p-4 text-left no-underline transition-shadow hover:shadow-sm"
              data-data-hub-task={task.key}
              key={task.key}
              to={buildDataHubTaskHref(task, workspaceScope)}
            >
              <strong className="text-base text-[#1e2821]">{task.label}</strong>
              <span className="text-sm text-[#526055]">{task.description}</span>
            </Link>
          ))}
        </div>
      </section>

      <section
        aria-labelledby="data-hub-health-heading"
        className="mgmt-card space-y-2 p-4"
        data-data-hub-health-summary
        data-data-hub-health-scope={workspaceScope}
      >
        <h2 className="text-base font-semibold text-[#1e2821]" id="data-hub-health-heading">
          {summary.scopeLabel}目前狀況
        </h2>
        {summary.hasData ? (
          <>
            <p className="text-sm text-[#4d554f]">
              共 {summary.sourceCount} 筆資料，其中 {summary.issueCount} 筆需要處理。
            </p>
            {summary.issueExplanations.length > 0 ? (
              <ul className="list-disc space-y-1 pl-5 text-sm text-[#8a4f18]">
                {summary.issueExplanations.map((explanation) => (
                  <li key={explanation}>{explanation}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-[#375a2d]">這個範圍目前沒有需要處理的異常。</p>
            )}
          </>
        ) : (
          <p className="text-sm text-[#687169]">{summary.emptyReason}</p>
        )}
      </section>

      <nav aria-label="專業頁面" className="space-y-2">
        <h2 className="text-base font-semibold text-[#1e2821]">直接開啟專業頁</h2>
        <div className="flex flex-wrap gap-2">
          {specialistSections.map((section) => (
            <Link
              className="mgmt-action min-h-[40px]"
              data-data-hub-specialist={section.key}
              key={section.key}
              to={`${section.path}?scope=${workspaceScope}`}
            >
              {section.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}

export function DataHubTaskHome() {
  const workspace = useDataHubWorkspace();
  const [summary, setSummary] = useState<WorkspaceHealthSummary>(() => {
    const cached = readCachedDataHubSourcesModel();
    return buildWorkspaceHealthSummary(cached ? buildSourceRows(cached) : [], workspace.managementScope);
  });

  useEffect(() => {
    let cancelled = false;
    void fetchDataHubSourcesModel().then((result) => {
      if (cancelled) {
        return;
      }
      setSummary(buildWorkspaceHealthSummary(buildSourceRows(result.model), workspace.managementScope));
    }).catch(() => {
      if (!cancelled) {
        setSummary(buildWorkspaceHealthSummary([], workspace.managementScope));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [workspace.managementScope]);

  const specialistSections = useMemo(
    () => filterVisibleDataHubSections(
      DATA_HUB_SECTIONS,
      (path) => isManagementRouteHidden(path, hiddenManagementRoutePaths)
    ),
    []
  );

  return (
    <DataHubTaskHomeContent
      specialistSections={specialistSections}
      summary={summary}
      workspaceScope={workspace.managementScope}
    />
  );
}
