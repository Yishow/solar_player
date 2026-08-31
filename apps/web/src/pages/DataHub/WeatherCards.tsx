import type {
  WeatherFieldKey,
  WeatherSettings
} from "@solar-display/shared";
import { CustomSelect } from "../../components/management";
import {
  resolveWeatherLocationMode,
  weatherUpdateIntervalOptions,
  type DataHubWeatherViewModel,
  type WeatherSelectOption
} from "./WeatherModel";

export type WeatherChangeHandler = <Key extends keyof WeatherSettings>(
  key: Key,
  value: WeatherSettings[Key]
) => void;

function renderSelectOptions(options: readonly WeatherSelectOption[]) {
  return options.map(({ label, value }) => ({ label, value }));
}

export type WeatherConfigCardProps = {
  countyOptions: Array<{ label: string; value: string }>;
  isDirty: boolean;
  isSaving: boolean;
  onChange: WeatherChangeHandler;
  onSave: () => void | Promise<void>;
  onToggleField: (fieldKey: WeatherFieldKey, enabled: boolean) => void;
  optionsLoaded: boolean;
  optionsErrorMessage: string;
  presetOptions: readonly { label: string; value: WeatherSettings["preset"] }[];
  settings: WeatherSettings;
  stationOptions: Array<{ label: string; value: string }>;
  viewModel: DataHubWeatherViewModel;
};

export function WeatherConfigCard({
  countyOptions,
  isDirty,
  isSaving,
  onChange,
  onSave,
  onToggleField,
  optionsLoaded,
  optionsErrorMessage,
  presetOptions,
  settings,
  stationOptions,
  viewModel
}: WeatherConfigCardProps) {
  return (
    <section className="mgmt-card space-y-4 p-5 h-full" data-weather-management>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#edf2ee] pb-3">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-[#687169]">External Data</p>
          <h3 className="text-base font-semibold text-[#27322b]">天氣設定</h3>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs text-[#4d554f] cursor-pointer" data-weather-control="enabled">
            <input
              checked={settings.enabled}
              onChange={(event) => onChange("enabled", event.target.checked)}
              type="checkbox"
              className="rounded border-[#cbd8ce]"
            />
            <span className="font-medium">啟用天氣顯示</span>
          </label>
          <span className={`mgmt-chip ${isDirty ? "is-warning" : "is-success"}`} data-weather-dirty={isDirty}>
            {isDirty ? "尚未儲存" : "已同步"}
          </span>
          <button
            className="mgmt-action mgmt-action-primary text-xs py-1.5 px-3"
            data-weather-action="save"
            disabled={isSaving || !isDirty}
            onClick={() => void onSave()}
            type="button"
          >
            {isSaving ? "儲存中..." : "儲存天氣設定"}
          </button>
        </div>
      </div>

      <div className="space-y-1">
        <span className="text-xs font-semibold text-[#687169]">欄位預設</span>
        <div className="flex flex-wrap gap-1.5" data-weather-control="preset" role="tablist" aria-label="天氣欄位預設">
          {presetOptions.map((option) => (
            <button
              aria-selected={settings.preset === option.value}
              className={`${settings.preset === option.value ? "mgmt-action mgmt-action-primary" : "mgmt-action"} text-xs py-1 px-2.5`}
              data-weather-preset={option.value}
              key={option.value}
              onClick={() => onChange("preset", option.value)}
              role="tab"
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
        <label className="grid gap-1 text-xs text-[#4d554f]" data-weather-control="location-mode">
          <span className="font-medium">定位方式</span>
          <CustomSelect
            onChange={(value) => onChange("locationMode", resolveWeatherLocationMode(value))}
            options={renderSelectOptions(viewModel.locationOptions)}
            value={settings.locationMode}
          />
        </label>
        <label className="grid gap-1 text-xs text-[#4d554f]" data-weather-control="interval">
          <span className="font-medium">更新頻率</span>
          <CustomSelect
            onChange={(value) => onChange("updateIntervalMinutes", Number(value))}
            options={renderSelectOptions(weatherUpdateIntervalOptions)}
            value={String(settings.updateIntervalMinutes)}
          />
        </label>
      </div>

      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
        <label className="grid gap-1 text-xs text-[#4d554f]" data-weather-control="county">
          <span className="font-medium">縣市</span>
          <CustomSelect
            onChange={(value) => onChange("countyName", value || null)}
            options={countyOptions}
            value={settings.countyName ?? ""}
          />
        </label>
        {settings.locationMode === "station" ? (
          <label className="grid gap-1 text-xs text-[#4d554f]" data-weather-control="station">
            <span className="font-medium">測站</span>
            <CustomSelect
              onChange={(value) => onChange("stationId", value || null)}
              options={stationOptions}
              value={settings.stationId ?? ""}
            />
          </label>
        ) : null}
      </div>

      {viewModel.customFieldOptions.length > 0 ? (
        <fieldset className="space-y-1.5 border-t border-[#edf2ee] pt-2.5" data-weather-control="custom-fields">
          <legend className="text-xs font-semibold text-[#4d554f]">自訂欄位</legend>
          <div className="grid gap-2 grid-cols-2 sm:grid-cols-3">
            {viewModel.customFieldOptions.map((option) => (
              <label className="flex items-center gap-1.5 text-xs text-[#4d554f] cursor-pointer" key={option.value}>
                <input
                  checked={option.checked}
                  onChange={(event) => onToggleField(option.value, event.target.checked)}
                  type="checkbox"
                  className="rounded border-[#cbd8ce]"
                />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      {viewModel.stationFeedback ? <div className="mgmt-status is-error text-xs" role="alert">{viewModel.stationFeedback}</div> : null}
      {!optionsLoaded && !optionsErrorMessage ? (
        <div className="mgmt-status text-xs" role="status">正在載入測站／縣市選項...</div>
      ) : null}
      {viewModel.localValidationFeedback ? (
        <div className="mgmt-status is-error text-xs" data-weather-validation role="alert">
          {viewModel.localValidationFeedback}
        </div>
      ) : null}
    </section>
  );
}

export type WeatherPreviewCardProps = {
  isRefreshing: boolean;
  onRefresh: () => void | Promise<void>;
  optionsErrorMessage: string;
  settings: WeatherSettings;
  viewModel: DataHubWeatherViewModel;
};

export function WeatherPreviewCard({
  isRefreshing,
  onRefresh,
  optionsErrorMessage,
  settings,
  viewModel
}: WeatherPreviewCardProps) {
  return (
    <section className="mgmt-card space-y-3.5 p-5" data-weather-preview data-weather-preview-state={viewModel.preview.state}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#edf2ee] pb-2.5">
        <div>
          <p className="text-[11px] uppercase tracking-[0.14em] text-[#687169]">頂欄預覽 (Header Preview)</p>
          <h3 className="text-base font-semibold text-[#27322b]">目前設定預覽</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="mgmt-chip text-xs">{viewModel.preview.state}</span>
          <button
            className="mgmt-action text-xs py-1 px-2.5"
            data-weather-action="refresh"
            disabled={isRefreshing || !settings.enabled}
            onClick={() => void onRefresh()}
            type="button"
          >
            {isRefreshing ? "更新中..." : "立即更新"}
          </button>
        </div>
      </div>

      <div className="rounded-lg bg-[#f7f9f7] border border-[#e2e8e3] p-3 text-center">
        <p className="text-base font-semibold text-[#27322b]">{viewModel.preview.primaryText}</p>
        {viewModel.preview.secondaryText ? <small className="text-xs text-[#687169] block mt-0.5">{viewModel.preview.secondaryText}</small> : null}
      </div>

      <div
        className={`mgmt-status text-xs ${viewModel.currentStatus.tone === "error" ? "is-error" : viewModel.currentStatus.tone === "warning" ? "is-warning" : ""} grid grid-cols-2 gap-1`}
        data-weather-current-source={viewModel.currentStatus.sourceLabel}
        data-weather-current-state={viewModel.currentStatus.fetchState}
      >
        <div><strong>資料狀態：</strong>{viewModel.currentStatus.label}</div>
        <div><strong>來源：</strong>{viewModel.currentStatus.sourceLabel}</div>
        <div><strong>更新：</strong>{viewModel.currentStatus.updatedAtLabel}</div>
        <div><strong>過期：</strong>{viewModel.currentStatus.staleAtLabel}</div>
      </div>
      {viewModel.previewFeedback ? <div className="mgmt-status is-error text-xs" role="alert">{viewModel.previewFeedback}</div> : null}
      {optionsErrorMessage ? <div className="mgmt-status is-error text-xs" role="alert">{optionsErrorMessage}</div> : null}
    </section>
  );
}

export type WeatherDiagnosticCardProps = {
  diagnosticErrorMessage?: string;
  onCopyDiagnostic: (text: string) => void | Promise<void>;
  viewModel: DataHubWeatherViewModel;
};

export function WeatherDiagnosticCard({
  diagnosticErrorMessage,
  onCopyDiagnostic,
  viewModel
}: WeatherDiagnosticCardProps) {
  return (
    <section
      className={`mgmt-card space-y-3 p-5 ${viewModel.diagnostic.tone === "error" ? "is-error" : viewModel.diagnostic.tone === "warning" ? "is-warning" : ""}`}
      data-weather-diagnostic
      data-weather-diagnostic-source={viewModel.diagnostic.source}
      data-weather-diagnostic-stage={viewModel.diagnostic.stage}
      data-weather-diagnostic-state={viewModel.diagnostic.state}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#edf2ee] pb-2">
        <div>
          <p className="text-[11px] uppercase tracking-[0.14em] text-[#687169]">天氣診斷 (Weather Diagnostic)</p>
          <h3 className="text-sm font-semibold text-[#27322b]">最近一次天氣資料診斷</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="mgmt-chip text-xs">{viewModel.diagnostic.stateLabel}</span>
          <button
            className="mgmt-action text-xs py-1 px-2.5"
            data-weather-diagnostic-copy
            onClick={() => void onCopyDiagnostic(viewModel.diagnostic.copyText)}
            type="button"
          >
            複製診斷
          </button>
        </div>
      </div>
      <p className="text-xs text-[#4d554f]">{viewModel.diagnostic.safeSummary}</p>
      <dl className="grid gap-1 text-xs text-[#4d554f] grid-cols-2 bg-[#f7f9f7] rounded-md p-2 border border-[#e2e8e3]">
        <div><dt className="text-[#839185]">錯誤碼</dt><dd className="font-mono">{viewModel.diagnostic.code ?? "—"}</dd></div>
        <div><dt className="text-[#839185]">來源</dt><dd>{viewModel.diagnostic.sourceLabel}</dd></div>
        {viewModel.diagnostic.stageLabel ? <div><dt className="text-[#839185]">失敗階段</dt><dd>{viewModel.diagnostic.stageLabel}</dd></div> : null}
        <div><dt className="text-[#839185]">操作</dt><dd>{viewModel.diagnostic.operationLabel}</dd></div>
        <div><dt className="text-[#839185]">發生時間</dt><dd>{viewModel.diagnostic.occurredAtLabel}</dd></div>
        <div><dt className="text-[#839185]">上次成功</dt><dd>{viewModel.diagnostic.lastSuccessAtLabel}</dd></div>
        <div><dt className="text-[#839185]">重試</dt><dd>{viewModel.diagnostic.retryableLabel}</dd></div>
        {viewModel.diagnostic.httpStatusLabel ? <div><dt className="text-[#839185]">HTTP</dt><dd>{viewModel.diagnostic.httpStatusLabel}</dd></div> : null}
      </dl>
      {diagnosticErrorMessage ? <div className="mgmt-status is-error text-xs" role="alert">{diagnosticErrorMessage}</div> : null}
    </section>
  );
}
