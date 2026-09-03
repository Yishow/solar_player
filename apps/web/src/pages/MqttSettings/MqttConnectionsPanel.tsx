import { ConnectionsView } from "../DataHub/Connections/ConnectionsView";
import type { MqttSettingsContentProps } from "./MqttSettingsContent.types";

export function MqttConnectionsPanel(props: MqttSettingsContentProps) {
  return (
    <ConnectionsView
      settings={props.settings}
      status={props.status}
      lastConnectionTest={props.lastConnectionTest}
      isTesting={props.actionState.isTestingConnection}
      isSaving={props.actionState.isSavingSettings}
      isDirty={props.draftSections?.broker ?? false}
      message={props.message}
      errorMessage={props.errorMessage}
      remoteSyncBanner={props.remoteSyncBanner}
      onChange={props.handleSettingChange}
      onTestConnection={props.testConnection}
      onSaveSettings={props.saveSettings}
    />
  );
}
