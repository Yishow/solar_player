import type { MqttSettingsForm } from "./viewModel";
import type { MqttSettingsContentProps } from "./MqttSettingsContent.types";
import type { MqttSettingsViewModel } from "./MqttSettingsViewHelpers";

type MqttSourcePanelProps = Pick<
  MqttSettingsViewModel,
  "brokerFields" | "feedbackBanner" | "modeOptions"
> & {
  connStatusVariant: string;
  handleSettingChange: MqttSettingsContentProps["handleSettingChange"];
};

export function MqttSourcePanel({
  brokerFields,
  connStatusVariant,
  feedbackBanner,
  handleSettingChange,
  modeOptions
}: MqttSourcePanelProps) {
  return (
    <div className="mqtt-workspace-panel mqtt-source-panel">
      {feedbackBanner.detail ? (
        <div className={`mgmt-status mqtt-workspace-status is-${feedbackBanner.visualTone}`}>
          {feedbackBanner.detail}
        </div>
      ) : null}

      <div className="seg mqtt-mode-seg" role="tablist">
        {modeOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={option.isActive}
            className={option.isActive ? "active" : ""}
            onClick={() => handleSettingChange("dataMode", option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
      <div className="broker-fields">
        {brokerFields.map((field) => (
          <label key={field.key} className="text-field">
            <span className="field-label">{field.label}</span>
            <input
              type={field.type}
              disabled={field.disabled}
              inputMode={field.inputMode === "numeric" ? "numeric" : undefined}
              value={field.value}
              onChange={(event) =>
                handleSettingChange(
                  field.key as keyof MqttSettingsForm,
                  event.target.value as MqttSettingsForm[keyof MqttSettingsForm]
                )
              }
            />
          </label>
        ))}
      </div>
      <div className={`conn-status mqtt-source-status ${connStatusVariant}`} role="status">
        <span className="conn-status__dot" aria-hidden />
        {feedbackBanner.title}
        <small>{feedbackBanner.detail}</small>
      </div>
    </div>
  );
}
