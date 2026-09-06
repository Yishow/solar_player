import { Link, Outlet, useLocation } from "react-router-dom";
import {
  DATA_HUB_ROOT_PATH,
  DATA_HUB_SECTIONS,
  filterVisibleDataHubSections,
  resolveDataHubSection,
  type DataHubManagementScope
} from "../../app/dataHub";
import {
  getConfiguredHiddenManagementRoutePaths,
  isManagementRouteHidden
} from "../../app/managementRouteVisibility";
import { PageScaffold } from "../shared/PageScaffold";
import { DataHubDraftGuardProvider, useDataHubDraftGuard } from "./draftGuard";
import { useDataHubWorkspace } from "./workspaceContext";

const scopeLabels: Record<DataHubManagementScope, string> = {
  all: "全部",
  cl: "CL",
  global: "全域",
  kn: "KN"
};

const hiddenManagementRoutePaths = getConfiguredHiddenManagementRoutePaths();

function DataHubWorkspaceShell() {
  const { pathname } = useLocation();
  const workspace = useDataHubWorkspace();
  const draftGuard = useDataHubDraftGuard();
  const isTaskHome = pathname === DATA_HUB_ROOT_PATH || pathname === `${DATA_HUB_ROOT_PATH}/`;
  const section = isTaskHome ? null : resolveDataHubSection(pathname) ?? DATA_HUB_SECTIONS[0];
  const visibleSections = filterVisibleDataHubSections(
    DATA_HUB_SECTIONS,
    (path) => isManagementRouteHidden(path, hiddenManagementRoutePaths)
  );
  const search = workspace.searchParams.toString();
  const query = search ? `?${search}` : "";

  const updateScope = (nextScope: DataHubManagementScope) => {
    draftGuard.requestNavigation(() => {
      workspace.updateWorkspace({ managementScope: nextScope });
    });
  };

  return (
    <PageScaffold path={section?.path ?? DATA_HUB_ROOT_PATH} description="從任務開始管理資料接入、修改與排查，專業頁仍可直接開啟。">
      <div className="space-y-6">
        {workspace.scopeCorrectionMessage ? (
          <div className="mgmt-status is-warning" data-workspace-scope-correction role="status">
            {workspace.scopeCorrectionMessage}
          </div>
        ) : null}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#92a294]/20 pb-4">
          <nav aria-label="Data Hub sections" className="flex flex-wrap gap-2">
            <Link
              aria-current={isTaskHome ? "page" : undefined}
              className={isTaskHome ? "mgmt-action primary min-h-[40px]" : "mgmt-action min-h-[40px]"}
              to={`${DATA_HUB_ROOT_PATH}${query}`}
            >
              工作首頁
            </Link>
            {visibleSections.map((entry) => (
              <Link
                aria-current={entry.key === section?.key ? "page" : undefined}
                className={entry.key === section?.key ? "mgmt-action primary min-h-[40px]" : "mgmt-action min-h-[40px]"}
                key={entry.key}
                to={`${entry.path}${query}`}
              >
                {entry.label}
              </Link>
            ))}
          </nav>
          <label className="flex items-center gap-2 text-[13px] text-[#4d554f]">
            管理範圍
            <select
              aria-label="管理範圍"
              className="mgmt-input min-h-[40px] text-[14px]"
              onChange={(event) => updateScope(event.target.value as DataHubManagementScope)}
              value={workspace.managementScope}
            >
              {(["all", "cl", "kn", "global"] as const).map((value) => (
                <option key={value} value={value}>{scopeLabels[value]}</option>
              ))}
            </select>
          </label>
        </div>
        <Outlet />
      </div>
    </PageScaffold>
  );
}

export function DataHub() {
  return (
    <DataHubDraftGuardProvider>
      <DataHubWorkspaceShell />
    </DataHubDraftGuardProvider>
  );
}
