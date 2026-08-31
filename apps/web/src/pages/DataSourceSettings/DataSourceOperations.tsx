import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  getCalculationSettings,
  getDataSourceOverview,
  resetMonthTrend,
  resetTodayTrend,
  updateCalculationSettings,
  type CalculationSettings,
  type DataSourceOverviewResponse
} from "../../services/api";
import {
  buildDataSourceSettingsViewModel,
  createCalculationSettingsForm,
  type CalculationSettingsForm
} from "./viewModel";
import { DataSourceOperationsView } from "./DataSourceOperationsView";

let cachedDataSourceOverview: DataSourceOverviewResponse | null = null;
let cachedDataSourceErrorMessage = "";
let cachedCalculationSettings: CalculationSettings | null = null;
let cachedCalculationSettingsErrorMessage = "";

type CalculationSettingsActionState = "loading" | "ready" | "saving" | "success" | "error";
type MonitoringResetActionState = "ready" | "resetting" | "success" | "error";
type MonitoringMonthResetActionState = "ready" | "resetting" | "success" | "error";

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

export async function loadDataSourceOperationsRoute() {
  const [overviewResult, calculationSettingsResult] = await Promise.allSettled([
    getDataSourceOverview(),
    getCalculationSettings()
  ]);

  if (overviewResult.status === "fulfilled") {
    cachedDataSourceOverview = overviewResult.value;
    cachedDataSourceErrorMessage = "";
  } else {
    const error = overviewResult.reason;
    cachedDataSourceErrorMessage = error instanceof Error ? error.message : "資料來源診斷同步失敗。";
  }

  if (calculationSettingsResult.status === "fulfilled") {
    cachedCalculationSettings = calculationSettingsResult.value;
    cachedCalculationSettingsErrorMessage = "";
  } else {
    const error = calculationSettingsResult.reason;
    cachedCalculationSettings = null;
    cachedCalculationSettingsErrorMessage = error instanceof Error ? error.message : "換算係數同步失敗。";
  }

  return null;
}

export type DataSourceOperationsProps = {
  children?: ReactNode;
  showTodayReset?: boolean;
};

export function DataSourceOperations({ children, showTodayReset = false }: DataSourceOperationsProps = {}) {
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
  const [monitoringMonthResetActionState, setMonitoringMonthResetActionState] =
    useState<MonitoringMonthResetActionState>("ready");
  const [monitoringMonthResetErrorMessage, setMonitoringMonthResetErrorMessage] = useState("");

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
      monitoringMonthResetErrorMessage,
      monitoringMonthResetState: monitoringMonthResetActionState,
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
      monitoringMonthResetActionState,
      monitoringMonthResetErrorMessage,
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
      await resetTodayTrend("global");
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

  const runResetMonthTrend = async () => {
    setMonitoringMonthResetActionState("resetting");
    setMonitoringMonthResetErrorMessage("");

    try {
      await resetMonthTrend("global");
      const nextOverview = await getDataSourceOverview();
      cachedDataSourceOverview = nextOverview;
      cachedDataSourceErrorMessage = "";
      setOverview(nextOverview);
      setErrorMessage("");
      setMonitoringMonthResetActionState("success");
    } catch (error) {
      setMonitoringMonthResetActionState("error");
      setMonitoringMonthResetErrorMessage(
        error instanceof Error ? error.message : "本月曲線重設失敗。"
      );
    }
  };

  return (
    <DataSourceOperationsView
      onCalculationSettingChange={(key, value) => handleCalculationSettingChange(key, value)}
      onResetMonthTrend={() => void runResetMonthTrend()}
      onResetTodayTrend={() => void runResetTodayTrend()}
      onSaveCalculationSettings={() => void saveCalculationSettings()}
      showTodayReset={showTodayReset}
      viewModel={viewModel}
    >
      {children}
    </DataSourceOperationsView>
  );
}
