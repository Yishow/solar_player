import type { WeatherSettings } from "@solar-display/shared";
import { CustomSelect } from "../../components/management";
import type { MqttSettingsContentProps } from "./MqttSettingsContent.types";
import type { MqttSettingsViewModel } from "./MqttSettingsViewHelpers";

type MqttWeatherPanelProps = {
  copyWeatherDiagnostic?: MqttSettingsContentProps["copyWeatherDiagnostic"];
  handleWeatherSettingChange: MqttSettingsContentProps["handleWeatherSettingChange"];
  refreshWeather: MqttSettingsContentProps["refreshWeather"];
  toggleWeatherField: MqttSettingsContentProps["toggleWeatherField"];
  viewModel: MqttSettingsViewModel;
  weatherSettings: MqttSettingsContentProps["weatherSettings"];
};

export function MqttWeatherPanel(props: MqttWeatherPanelProps) {
  const {
    copyWeatherDiagnostic,
    handleWeatherSettingChange,
    toggleWeatherField,
    viewModel,
    weatherSettings
  } = props;
  return (
    <section className="settings-card mgmt-interactive-card mqtt-weather-card" data-mqtt-section="weather-card">
      <div className="settings-card__title">天氣設定<small>Weather Settings</small></div>
      <div className="mqtt-weather-card__header-actions">
        <div className="seg mqtt-weather-card__presets" role="tablist" aria-label="Preset">
          {viewModel.weatherCard.presetOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={viewModel.weatherCard.preset === option.value}
              className={viewModel.weatherCard.preset === option.value ? "active" : ""}
              onClick={() => handleWeatherSettingChange("preset", option.value as WeatherSettings["preset"])}
            >
              {option.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="mqtt-weather-card__refresh-btn"
          disabled={viewModel.actions.refreshWeatherDisabled}
          onClick={() => void props.refreshWeather()}
        >
          {viewModel.actions.refreshWeatherLabel}
        </button>
      </div>
      <div className="mqtt-weather-card__body">
        {viewModel.weatherCard.configFeedback ? (
          <div className="mgmt-status mqtt-weather-card__config-notice">{viewModel.weatherCard.configFeedback}</div>
        ) : null}
        <div
          className={`mqtt-weather-diagnostic ${viewModel.weatherCard.diagnostic.tone === "error" ? "is-error" : viewModel.weatherCard.diagnostic.tone === "warning" ? "is-warning" : ""}`}
          data-weather-diagnostic-source={viewModel.weatherCard.diagnostic.source}
          data-weather-diagnostic-stage={viewModel.weatherCard.diagnostic.stage}
          data-weather-diagnostic-state={viewModel.weatherCard.diagnostic.state}
        >
          <div className="mqtt-weather-diagnostic__header">
            <div>
              <strong>最近一次天氣資料診斷</strong>
              <small>{viewModel.weatherCard.diagnostic.stateLabel}</small>
            </div>
            <button
              type="button"
              className="map-add"
              data-weather-diagnostic-copy
              onClick={() => void copyWeatherDiagnostic?.(viewModel.weatherCard.diagnostic.copyText)}
            >
              複製診斷
            </button>
          </div>
          <p>{viewModel.weatherCard.diagnostic.safeSummary}</p>
          <dl className="mqtt-weather-diagnostic__details">
            <div><dt>錯誤碼</dt><dd>{viewModel.weatherCard.diagnostic.code ?? "—"}</dd></div>
            <div><dt>來源</dt><dd>{viewModel.weatherCard.diagnostic.sourceLabel}</dd></div>
            {viewModel.weatherCard.diagnostic.stageLabel ? (
              <div><dt>階段</dt><dd>{viewModel.weatherCard.diagnostic.stageLabel}</dd></div>
            ) : null}
            <div><dt>操作</dt><dd>{viewModel.weatherCard.diagnostic.operationLabel}</dd></div>
            <div><dt>發生時間</dt><dd>{viewModel.weatherCard.diagnostic.occurredAtLabel}</dd></div>
            <div><dt>上次成功</dt><dd>{viewModel.weatherCard.diagnostic.lastSuccessAtLabel}</dd></div>
            <div><dt>重試</dt><dd>{viewModel.weatherCard.diagnostic.retryableLabel}</dd></div>
            {viewModel.weatherCard.diagnostic.httpStatusLabel ? (
              <div><dt>HTTP</dt><dd>{viewModel.weatherCard.diagnostic.httpStatusLabel}</dd></div>
            ) : null}
          </dl>
        </div>
        <div className="mqtt-weather-card__controls">
          <label className="map-row__toggle mqtt-weather-card__toggle">
            <input
              type="checkbox"
              checked={viewModel.weatherCard.enabled}
              onChange={(event) => handleWeatherSettingChange("enabled", event.target.checked)}
            />
            啟用天氣顯示
          </label>

          <div className="mqtt-weather-card__field-row">
            <label className="text-field mqtt-weather-card__field">
              <span className="field-label">定位方式</span>
              <CustomSelect
                value={viewModel.weatherCard.locationMode}
                onChange={(value) => handleWeatherSettingChange("locationMode", value as WeatherSettings["locationMode"])}
                options={viewModel.weatherCard.locationOptions}
              />
            </label>

            <label className="text-field mqtt-weather-card__field">
              <span className="field-label">更新頻率</span>
              <CustomSelect
                value={String(weatherSettings.updateIntervalMinutes ?? 30)}
                onChange={(value) => handleWeatherSettingChange("updateIntervalMinutes", Number(value))}
                options={[
                  { label: "10 分鐘", value: "10" },
                  { label: "30 分鐘", value: "30" },
                  { label: "1 小時", value: "60" },
                  { label: "3 小時", value: "180" },
                  { label: "6 小時", value: "360" },
                  { label: "12 小時", value: "720" },
                  { label: "手動更新", value: "0" }
                ]}
              />
            </label>
          </div>

          <div className="mqtt-weather-card__field-row">
            <label className="text-field mqtt-weather-card__field">
              <span className="field-label">縣市</span>
              <CustomSelect
                value={weatherSettings.countyName ?? ""}
                onChange={(value) => handleWeatherSettingChange("countyName", value || null)}
                options={[
                  { label: "請選擇縣市", value: "" },
                  ...viewModel.weatherCard.countyOptions.map((county) => ({
                    label: county,
                    value: county
                  }))
                ]}
              />
            </label>

            {viewModel.weatherCard.locationMode === "station" ? (
              <label className="text-field mqtt-weather-card__field">
                <span className="field-label">測站</span>
                <CustomSelect
                  value={weatherSettings.stationId ?? ""}
                  onChange={(value) => handleWeatherSettingChange("stationId", value || null)}
                  options={[
                    { label: "請選擇測站", value: "" },
                    ...viewModel.weatherCard.stationOptions.map((station) => ({
                      label: station.stationName,
                      value: station.stationId
                    }))
                  ]}
                />
              </label>
            ) : null}
          </div>

          {viewModel.weatherCard.customFieldOptions.length > 0 ? (
            <div className="mqtt-weather-card__custom-fields">
              <span className="field-label">自訂欄位</span>
              <div className="mqtt-weather-card__custom-grid">
                {viewModel.weatherCard.customFieldOptions.map((option) => (
                  <label key={option.value} className="map-row__toggle">
                    <input
                      type="checkbox"
                      checked={option.checked}
                      onChange={(event) => toggleWeatherField(option.value, event.target.checked)}
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {viewModel.weatherCard.stationFeedback ? (
          <div className="mgmt-status is-error mqtt-weather-card__feedback">{viewModel.weatherCard.stationFeedback}</div>
        ) : null}
        {viewModel.weatherCard.localValidationFeedback ? (
          <div className="mgmt-status is-error mqtt-weather-card__feedback">
            {viewModel.weatherCard.localValidationFeedback}
          </div>
        ) : null}
      </div>

      <div className="mqtt-weather-card__preview">
        <div style={{ marginBottom: 8 }}>
          <strong>Header Preview</strong>
        </div>
        <p>{viewModel.weatherCard.preview.primaryText}</p>
        {viewModel.weatherCard.preview.secondaryText ? (
          <small>{viewModel.weatherCard.preview.secondaryText}</small>
        ) : null}
      </div>

      {viewModel.weatherCard.previewFeedback ? (
        <div className="mgmt-status is-error mqtt-weather-card__feedback">{viewModel.weatherCard.previewFeedback}</div>
      ) : null}
    </section>
  );
}
