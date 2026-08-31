import { Link, Outlet, useLocation, useSearchParams } from "react-router-dom";
import {
  DATA_HUB_SECTIONS,
  filterVisibleDataHubSections,
  isDataHubManagementScope,
  resolveDataHubSection,
  type DataHubManagementScope
} from "../../app/dataHub";
import {
  getConfiguredHiddenManagementRoutePaths,
  isManagementRouteHidden
} from "../../app/managementRouteVisibility";
import { PageScaffold } from "../shared/PageScaffold";

const scopeLabels: Record<DataHubManagementScope, string> = {
  all: "全部",
  cl: "CL",
  global: "全域",
  kn: "KN"
};

const hiddenManagementRoutePaths = getConfiguredHiddenManagementRoutePaths();

export function DataHub() {
  const { pathname } = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const section = resolveDataHubSection(pathname) ?? DATA_HUB_SECTIONS[0];
  const visibleSections = filterVisibleDataHubSections(
    DATA_HUB_SECTIONS,
    (path) => isManagementRouteHidden(path, hiddenManagementRoutePaths)
  );
  const requestedScope = searchParams.get("scope");
  const scope: DataHubManagementScope = isDataHubManagementScope(requestedScope) ? requestedScope : "all";

  const updateScope = (nextScope: DataHubManagementScope) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set("scope", nextScope);
      return next;
    });
  };

  return (
    <div className="space-y-5">
      <PageScaffold path={section.path} description="集中管理資料連線、來源、語意指標與外部資料。">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <nav aria-label="Data Hub sections" className="flex flex-wrap gap-2">
            {visibleSections.map((entry) => (
              <Link
                aria-current={entry.key === section.key ? "page" : undefined}
                className={entry.key === section.key ? "mgmt-action mgmt-action-primary" : "mgmt-action"}
                key={entry.key}
                to={`${entry.path}?${searchParams.toString()}`}
              >
                {entry.label}
              </Link>
            ))}
          </nav>
          <label className="flex items-center gap-2 text-sm text-[#4d554f]">
            管理範圍
            <select
              aria-label="管理範圍"
              className="mgmt-input"
              onChange={(event) => updateScope(event.target.value as DataHubManagementScope)}
              value={scope}
            >
              {(["all", "cl", "kn", "global"] as const).map((value) => (
                <option key={value} value={value}>{scopeLabels[value]}</option>
              ))}
            </select>
          </label>
        </div>
      </PageScaffold>
      <Outlet />
    </div>
  );
}
