import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  OpsActionRow,
  OpsInfoBanner,
  OpsSurface,
  OpsSurfaceTitle
} from "../../components/management";
import {
  getCalculationSettings,
  getDataSourceOverview,
  resetTodayTrend,
  updateCalculationSettings,
  type CalculationSettings,
  type DataSourceOverviewResponse
} from "../../services/api";
import { PageScaffold } from "../shared/PageScaffold";
import {
  buildDataSourceSettingsViewModel,
  createCalculationSettingsForm,
  type CalculationSettingsForm
} from "./viewModel";

function getFieldIcon(key: string) {
  switch (key) {
    case "carbonEmissionFactor":
      return (
        <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 002 2h2a2.5 2.5 0 002.5-2.5V8a2 2 0 00-2-2h-.5A2.5 2.5 0 0113 3.5V2.055m6 10.45a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case "treeEquivalentFactor":
      return (
        <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707-.707M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case "householdDailyUsageKwh":
      return (
        <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      );
    case "householdMonthlyUsageKwh":
      return (
        <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    case "estimatedTariffPerKwh":
      return (
        <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    default:
      return (
        <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 113.536 0V21h2v-2.73a5 5 0 01-1.002-1.002z" />
        </svg>
      );
  }
}

let cachedDataSourceOverview: DataSourceOverviewResponse | null = null;
let cachedDataSourceErrorMessage = "";
let cachedCalculationSettings: CalculationSettings | null = null;
let cachedCalculationSettingsErrorMessage = "";

type CalculationSettingsActionState = "loading" | "ready" | "saving" | "success" | "error";
type MonitoringResetActionState = "ready" | "resetting" | "success" | "error";

const emptyCalculationSettingsForm = createCalculationSettingsForm(null);

function buildCalculationSettingsPayload(
  draft: CalculationSettingsForm
): CalculationSettings {
  return {
    carbonEmissionFactor: Number(draft.carbonEmissionFactor),
    co2AutoConvertSmallToKg: draft.co2AutoConvertSmallToKg,
    estimatedTariffPerKwh: Number(draft.estimatedTariffPerKwh),
    householdDailyUsageKwh: Number(draft.householdDailyUsageKwh),
    householdMonthlyUsageKwh: Number(draft.householdMonthlyUsageKwh),
    treeEquivalentFactor: Number(draft.treeEquivalentFactor)
  };
}

export async function loadDataSourceSettingsRoute() {
  try {
    cachedDataSourceOverview = await getDataSourceOverview();
    cachedDataSourceErrorMessage = "";
  } catch (error) {
    cachedDataSourceErrorMessage = error instanceof Error ? error.message : "資料來源診斷同步失敗。";
  }

  try {
    cachedCalculationSettings = await getCalculationSettings();
    cachedCalculationSettingsErrorMessage = "";
  } catch (error) {
    cachedCalculationSettings = null;
    cachedCalculationSettingsErrorMessage = error instanceof Error ? error.message : "換算係數同步失敗。";
  }

  return null;
}

export function DataSourceSettings() {
  const [overview, setOverview] = useState<DataSourceOverviewResponse | null>(cachedDataSourceOverview);
  const [errorMessage, setErrorMessage] = useState(cachedDataSourceErrorMessage);
  const [isLoading, setIsLoading] = useState(cachedDataSourceOverview === null && !cachedDataSourceErrorMessage);
  const [calculationSettings, setCalculationSettings] = useState<CalculationSettings | null>(
    cachedCalculationSettings
  );
  const [calculationSettingsDraft, setCalculationSettingsDraft] = useState<CalculationSettingsForm>(
    cachedCalculationSettings ? createCalculationSettingsForm(cachedCalculationSettings) : emptyCalculationSettingsForm
  );
  const [calculationSettingsErrorMessage, setCalculationSettingsErrorMessage] = useState(
    cachedCalculationSettingsErrorMessage
  );
  const [calculationSettingsActionState, setCalculationSettingsActionState] =
    useState<CalculationSettingsActionState>(
      cachedCalculationSettings
        ? "ready"
        : cachedCalculationSettingsErrorMessage
          ? "error"
          : "loading"
    );
  const [monitoringResetActionState, setMonitoringResetActionState] =
    useState<MonitoringResetActionState>("ready");
  const [monitoringResetErrorMessage, setMonitoringResetErrorMessage] = useState("");

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

  useEffect(() => {
    if (cachedCalculationSettings !== null || cachedCalculationSettingsErrorMessage) {
      return;
    }

    let active = true;

    const loadCalculationSettings = async () => {
      setCalculationSettingsActionState("loading");

      try {
        const nextCalculationSettings = await getCalculationSettings();
        if (!active) return;
        cachedCalculationSettings = nextCalculationSettings;
        cachedCalculationSettingsErrorMessage = "";
        setCalculationSettings(nextCalculationSettings);
        setCalculationSettingsDraft(createCalculationSettingsForm(nextCalculationSettings));
        setCalculationSettingsErrorMessage("");
        setCalculationSettingsActionState("ready");
      } catch (error) {
        if (!active) return;
        const nextErrorMessage = error instanceof Error ? error.message : "換算係數同步失敗。";
        cachedCalculationSettings = null;
        cachedCalculationSettingsErrorMessage = nextErrorMessage;
        setCalculationSettingsErrorMessage(nextErrorMessage);
        setCalculationSettingsActionState("error");
      }
    };

    void loadCalculationSettings();

    return () => {
      active = false;
    };
  }, []);

  const viewModel = useMemo(
    () => buildDataSourceSettingsViewModel({
      calculationSettings,
      calculationSettingsDraft,
      calculationSettingsErrorMessage,
      calculationSettingsState: calculationSettingsActionState,
      errorMessage,
      monitoringResetErrorMessage,
      monitoringResetState: monitoringResetActionState,
      overview,
      state: isLoading ? "loading" : errorMessage && !overview ? "error" : "ready"
    }),
    [
      calculationSettings,
      calculationSettingsActionState,
      calculationSettingsDraft,
      calculationSettingsErrorMessage,
      errorMessage,
      isLoading,
      monitoringResetActionState,
      monitoringResetErrorMessage,
      overview
    ]
  );

  const handleCalculationSettingChange = <Key extends keyof CalculationSettingsForm>(
    key: Key,
    value: CalculationSettingsForm[Key]
  ) => {
    setCalculationSettingsActionState("ready");
    setCalculationSettingsErrorMessage("");
    setCalculationSettingsDraft((current) => ({
      ...current,
      [key]: value
    }));
  };

  const saveCalculationSettings = async () => {
    setCalculationSettingsActionState("saving");
    setCalculationSettingsErrorMessage("");

    try {
      const nextCalculationSettings = await updateCalculationSettings(
        buildCalculationSettingsPayload(calculationSettingsDraft)
      );
      cachedCalculationSettings = nextCalculationSettings;
      cachedCalculationSettingsErrorMessage = "";
      setCalculationSettings(nextCalculationSettings);
      setCalculationSettingsDraft(createCalculationSettingsForm(nextCalculationSettings));
      setCalculationSettingsActionState("success");
    } catch (error) {
      setCalculationSettingsActionState("error");
      setCalculationSettingsErrorMessage(
        error instanceof Error ? error.message : "換算係數儲存失敗。"
      );
    }
  };

  const runResetTodayTrend = async () => {
    setMonitoringResetActionState("resetting");
    setMonitoringResetErrorMessage("");

    try {
      await resetTodayTrend();
      const nextOverview = await getDataSourceOverview();
      cachedDataSourceOverview = nextOverview;
      cachedDataSourceErrorMessage = "";
      setOverview(nextOverview);
      setErrorMessage("");
      setMonitoringResetActionState("success");
    } catch (error) {
      setMonitoringResetActionState("error");
      setMonitoringResetErrorMessage(
        error instanceof Error ? error.message : "今日曲線重設失敗。"
      );
    }
  };

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

        <OpsSurface family="operations">
          <OpsSurfaceTitle
            caption="調整後會同步影響 Overview / Solar / Sustainability 的減碳、植樹與四口之家換算"
            title="換算係數"
          />
          <OpsInfoBanner
            className="mt-4"
            detail={viewModel.calculationSettingsCard.banner.detail}
            title={viewModel.calculationSettingsCard.banner.title}
            tone={viewModel.calculationSettingsCard.banner.tone}
          />
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {viewModel.calculationSettingsCard.fields.map((field) => (
              <label
                className="mgmt-card p-5 flex flex-col justify-between"
                key={field.key}
              >
                <div>
                  <span className="block text-sm font-semibold text-[#34383a]">{field.label}</span>
                  <span className="mt-1 block text-xs leading-5 text-[#6e746f]">{field.description}</span>
                </div>
                <div className="relative mt-4 flex items-center rounded-lg border border-[rgba(93,119,69,0.22)] bg-white focus-within:border-[#5d7745] focus-within:ring-2 focus-within:ring-[rgba(93,119,69,0.12)] transition duration-200 shadow-sm overflow-hidden h-[42px]">
                  <div className="pl-3 pr-2 flex items-center pointer-events-none border-r border-gray-100">
                    {getFieldIcon(field.key)}
                  </div>
                  <input
                    className="w-full h-full bg-transparent px-3 text-base text-[#34383a] outline-none"
                    inputMode="decimal"
                    step="any"
                    type="number"
                    value={field.value}
                    onChange={(event) => handleCalculationSettingChange(field.key, event.target.value)}
                  />
                  <span className="pr-3 pl-2 text-[10px] font-semibold text-[#6e746f] bg-gray-50 h-full flex items-center border-l border-gray-100 select-none">
                    {field.unit}
                  </span>
                </div>
              </label>
            ))}
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {viewModel.calculationSettingsCard.toggles.map((toggle) => (
              <div
                className="mgmt-card flex items-center justify-between gap-4 p-5"
                key={toggle.key}
              >
                <div className="flex flex-col gap-1">
                  <span className="block text-sm font-semibold text-[#34383a]">{toggle.label}</span>
                  <span className="block text-xs leading-5 text-[#6e746f]">{toggle.description}</span>
                </div>
                <button
                  type="button"
                  className={`mgmt-switch ${toggle.checked ? "on" : ""}`}
                  onClick={() => handleCalculationSettingChange(toggle.key, !toggle.checked)}
                  role="switch"
                  aria-checked={toggle.checked}
                />
              </div>
            ))}
          </div>
          <OpsActionRow className="mt-4">
            <button
              type="button"
              className="mgmt-action primary"
              disabled={viewModel.calculationSettingsCard.saveDisabled}
              onClick={() => void saveCalculationSettings()}
            >
              {viewModel.calculationSettingsCard.saveButtonLabel}
              <small>Save Coefficients</small>
            </button>
          </OpsActionRow>
        </OpsSurface>

        <OpsSurface family="operations">
          <OpsSurfaceTitle
            caption="當前日 snapshot 診斷與只清今日曲線的維運入口"
            title="今日曲線維運"
          />
          <OpsInfoBanner
            className="mt-4"
            detail={viewModel.monitoringCard.banner.detail}
            title={viewModel.monitoringCard.banner.title}
            tone={viewModel.monitoringCard.banner.tone}
          />
          <div className="mt-4 flex flex-wrap gap-2">
            {viewModel.monitoringCard.metrics.map((metric) => (
              <span className="mgmt-chip" key={metric}>{metric}</span>
            ))}
          </div>
          {viewModel.monitoringCard.anomalies.length > 0 ? (
            <div className="mt-4 grid gap-3">
              {viewModel.monitoringCard.anomalies.map((anomaly) => (
                <OpsInfoBanner
                  key={anomaly}
                  detail={anomaly}
                  title="時間異常提示"
                  tone="warning"
                />
              ))}
            </div>
          ) : null}
          <OpsActionRow className="mt-4">
            <button
              type="button"
              className="mgmt-action"
              disabled={viewModel.monitoringCard.resetButtonDisabled}
              onClick={() => void runResetTodayTrend()}
            >
              {viewModel.monitoringCard.resetButtonLabel}
              <small>Reset Today Trend</small>
            </button>
          </OpsActionRow>
        </OpsSurface>

        <div className="grid grid-cols-3 gap-4">
          {viewModel.sections.map((section) => (
            <OpsSurface
              as="article"
              family="operations"
              key={section.title}
              className={`transition-all duration-300 hover:shadow-[0_12px_28px_rgba(59,54,40,0.06)] ${
                section.tone === "ready"
                  ? "border-[rgba(82,124,67,0.22)] bg-gradient-to-b from-[#fafcf8] to-[#f5f9f2]"
                  : "border-[rgba(201,136,26,0.28)] bg-gradient-to-b from-[#fdfbf7] to-[#faf6ed]"
              }`}
            >
              <OpsSurfaceTitle caption={section.detail} title={section.title} />
              <div className="mt-4 flex flex-wrap gap-2">
                {section.metrics.map((metric) => (
                  <span
                    className={`mgmt-chip ${
                      section.tone === "ready" ? "is-success" : "is-warning"
                    }`}
                    key={metric}
                  >
                    {metric}
                  </span>
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
              <div className="mgmt-card p-4 flex flex-col gap-2 justify-between" key={recommendation.title}>
                <div>
                  <strong className="block text-sm font-semibold text-[#34383a]">{recommendation.title}</strong>
                  <p className="mt-1 text-xs leading-5 text-[#6e746f]">{recommendation.description}</p>
                </div>
                <div className="mt-2">
                  <span className="mgmt-chip is-accent">Recommendation</span>
                </div>
              </div>
            ))}
          </div>
        </OpsSurface>
      </div>
    </PageScaffold>
  );
}
