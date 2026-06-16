import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  OpsActionRow,
  OpsInfoBanner,
  OpsSurface,
  OpsSurfaceTitle
} from "../../components/management";
import { getDataSourceOverview, type DataSourceOverviewResponse } from "../../services/api";
import { PageScaffold } from "../shared/PageScaffold";
import { buildDataSourceSettingsViewModel } from "./viewModel";

let cachedDataSourceOverview: DataSourceOverviewResponse | null = null;
let cachedDataSourceErrorMessage = "";

export async function loadDataSourceSettingsRoute() {
  try {
    cachedDataSourceOverview = await getDataSourceOverview();
    cachedDataSourceErrorMessage = "";
  } catch (error) {
    cachedDataSourceErrorMessage = error instanceof Error ? error.message : "資料來源診斷同步失敗。";
  }

  return null;
}

export function DataSourceSettings() {
  const [overview, setOverview] = useState<DataSourceOverviewResponse | null>(cachedDataSourceOverview);
  const [errorMessage, setErrorMessage] = useState(cachedDataSourceErrorMessage);
  const [isLoading, setIsLoading] = useState(cachedDataSourceOverview === null && !cachedDataSourceErrorMessage);

  useEffect(() => {
    if (cachedDataSourceOverview !== null || cachedDataSourceErrorMessage) {
      return;
    }

    let active = true;

    const loadOverview = async () => {
      setIsLoading(overview === null && !errorMessage);
      try {
        const nextOverview = await getDataSourceOverview();
        if (!active) return;
        cachedDataSourceOverview = nextOverview;
        cachedDataSourceErrorMessage = "";
        setOverview(nextOverview);
        setErrorMessage("");
      } catch (error) {
        if (!active) return;
        const nextErrorMessage = error instanceof Error ? error.message : "資料來源診斷同步失敗。";
        cachedDataSourceErrorMessage = nextErrorMessage;
        setErrorMessage(nextErrorMessage);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void loadOverview();

    return () => {
      active = false;
    };
  }, []);

  const viewModel = useMemo(
    () => buildDataSourceSettingsViewModel({
      errorMessage,
      overview,
      state: isLoading ? "loading" : errorMessage && !overview ? "error" : "ready"
    }),
    [errorMessage, isLoading, overview]
  );

  return (
    <PageScaffold
      path="/settings/data-source"
      description="目前資料來源、儲存位置與建議維運項目"
    >
      <div className="grid gap-5 px-10 pb-10">
        <OpsInfoBanner
          detail={viewModel.banner.detail}
          title={viewModel.banner.title}
          tone={viewModel.banner.tone}
        />

        <div className="grid grid-cols-3 gap-4">
          {viewModel.sections.map((section) => (
            <OpsSurface as="article" family="operations" key={section.title}>
              <OpsSurfaceTitle caption={section.detail} title={section.title} />
              <div className="mt-4 flex flex-wrap gap-2">
                {section.metrics.map((metric) => (
                  <span className="mgmt-chip" key={metric}>{metric}</span>
                ))}
              </div>
              {section.tone !== "ready" ? (
                <OpsInfoBanner
                  className="mt-4"
                  detail="請先檢查服務狀態或檔案權限。"
                  title="此區塊目前降級"
                  tone="warning"
                />
              ) : null}
            </OpsSurface>
          ))}
        </div>

        <OpsSurface family="operations">
          <OpsSurfaceTitle
            caption="只導向既有管理功能，不在此頁寫入資料來源設定"
            title="相關維運入口"
          />
          <OpsActionRow className="mt-4">
            {viewModel.relatedActions.map((action) => (
              <Link className="mgmt-btn" key={action.path} to={action.path}>
                {action.label}
                <small>{action.path}</small>
              </Link>
            ))}
          </OpsActionRow>
        </OpsSurface>

        <OpsSurface family="operations">
          <OpsSurfaceTitle
            caption="推薦項目需另開 change 才會成為可執行控制"
            title="推薦後續功能"
          />
          <div className="mt-4 grid grid-cols-2 gap-4">
            {viewModel.recommendations.map((recommendation) => (
              <div className="mgmt-card" key={recommendation.title}>
                <strong>{recommendation.title}</strong>
                <p>{recommendation.description}</p>
                <span className="mgmt-chip is-accent">Recommendation</span>
              </div>
            ))}
          </div>
        </OpsSurface>
      </div>
    </PageScaffold>
  );
}
