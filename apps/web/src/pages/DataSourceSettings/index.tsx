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

let cachedDataSourceOverview: DataSourceOverviewResponse | null = null;
let cachedDataSourceErrorMessage = "";
let cachedCalculationSettings: CalculationSettings | null = null;
let cachedCalculationSettingsErrorMessage = "";

type CalculationSettingsActionState = "loading" | "ready" | "saving" | "success" | "error";

const emptyCalculationSettingsForm = createCalculationSettingsForm(null);

function buildCalculationSettingsPayload(
  draft: CalculationSettingsForm
): CalculationSettings {
  return {
    carbonEmissionFactor: Number(draft.carbonEmissionFactor),
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
                className="rounded-[24px] border border-white/10 bg-slate-950/70 p-4 text-white shadow-[0_24px_60px_rgba(15,23,42,0.2)]"
                key={field.key}
              >
                <span className="block text-sm font-semibold">{field.label}</span>
                <span className="mt-1 block text-xs leading-5 text-slate-400">{field.description}</span>
                <input
                  className="mt-3 w-full rounded-2xl border border-white/12 bg-slate-900/80 px-4 py-3 text-base text-white outline-none transition focus:border-emerald-400"
                  inputMode="decimal"
                  step="any"
                  type="number"
                  value={field.value}
                  onChange={(event) => handleCalculationSettingChange(field.key, event.target.value)}
                />
                <span className="mt-2 block text-[11px] uppercase tracking-[0.18em] text-slate-500">
                  {field.unit}
                </span>
              </label>
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
