import type { ReactNode } from "react";
import {
  OpsActionRow,
  OpsInfoBanner,
  OpsSurface,
  OpsSurfaceTitle
} from "../../components/management";
import type {
  CalculationSettingsForm,
  DataSourceSettingsViewModel
} from "./viewModel";

export type DataSourceOperationsViewProps = {
  children?: ReactNode;
  onCalculationSettingChange: (
    key: keyof CalculationSettingsForm,
    value: CalculationSettingsForm[keyof CalculationSettingsForm]
  ) => void;
  onResetMonthTrend: () => void;
  onResetTodayTrend: () => void;
  onSaveCalculationSettings: () => void;
  showTodayReset: boolean;
  viewModel: DataSourceSettingsViewModel;
};

function getFieldIcon(key: string) {
  switch (key) {
    case "carbonEmissionFactor":
      return (
        <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2.5 2.5 0 012 2 2.5 2.5 0 002 2h2a2.5 2.5 0 002.5-2.5V8a2 2 0 00-2-2h-.5A2.5 2.5 0 0113 3.5V2.055m6 10.45a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case "treeEquivalentFactor":
      return (
        <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l-.707-.707M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case "householdDailyUsageKwh":
      return (
        <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
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

export function DataSourceOperationsView({
  children,
  onCalculationSettingChange,
  onResetMonthTrend,
  onResetTodayTrend,
  onSaveCalculationSettings,
  showTodayReset,
  viewModel
}: DataSourceOperationsViewProps) {
  return (
    <div className="grid gap-5 px-10 pb-10" data-data-source-operations>
      {!showTodayReset ? (
        <OpsSurfaceTitle title="進階資料維運" caption="保留 Data Source 的換算、曲線與 runtime 維運能力。" />
      ) : null}
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
                  onChange={(event) => onCalculationSettingChange(field.key, event.target.value)}
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
                onClick={() => onCalculationSettingChange(toggle.key, !toggle.checked)}
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
            onClick={onSaveCalculationSettings}
          >
            {viewModel.calculationSettingsCard.saveButtonLabel}
            <small>Save Coefficients</small>
          </button>
        </OpsActionRow>
      </OpsSurface>

      <OpsSurface family="operations">
        <OpsSurfaceTitle
          caption="當前日 snapshot 診斷與本月 1 日起的曲線重設入口"
          title="曲線維運"
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
          {showTodayReset ? (
            <button
              type="button"
              className="mgmt-action"
              disabled={viewModel.monitoringCard.resetButtonDisabled}
              onClick={onResetTodayTrend}
            >
              {viewModel.monitoringCard.resetButtonLabel}
              <small>Reset Today Trend</small>
            </button>
          ) : null}
          <button
            type="button"
            className="mgmt-action"
            disabled={viewModel.monitoringCard.monthResetButtonDisabled}
            onClick={onResetMonthTrend}
          >
            {viewModel.monitoringCard.monthResetButtonLabel}
            <small>Reset Month Trend</small>
          </button>
        </OpsActionRow>
      </OpsSurface>

      {children}

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

      {viewModel.recommendations.length > 0 ? (
        <OpsSurface family="operations">
          <OpsSurfaceTitle title="維運建議" caption="目前僅提供建議，不會在此建立額外 connector。" />
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {viewModel.recommendations.map((recommendation) => (
              <div className="mgmt-card p-4" key={recommendation.title}>
                <strong className="block text-sm text-[#34383a]">{recommendation.title}</strong>
                <span className="mt-1 block text-xs leading-5 text-[#6e746f]">{recommendation.description}</span>
              </div>
            ))}
          </div>
        </OpsSurface>
      ) : null}

      {viewModel.relatedActions.length > 0 ? (
        <OpsSurface family="operations">
          <OpsSurfaceTitle title="相關管理入口" caption="前往既有管理頁，不改變其權限與 dirty-state 行為。" />
          <div className="mt-4 flex flex-wrap gap-2">
            {viewModel.relatedActions.map((action) => (
              <a className="mgmt-chip" href={action.path} key={action.path}>{action.label}</a>
            ))}
          </div>
        </OpsSurface>
      ) : null}
    </div>
  );
}
