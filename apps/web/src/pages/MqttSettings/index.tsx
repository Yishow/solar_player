import { RemoteSyncBanner } from "../../components/management/RemoteSyncBanner";
import { requestJson } from "../../services/api";
import { MqttSettingsContent } from "./MqttSettingsContent";
import {
  loadMqttEditableModel as loadCachedMqttEditableModel,
  toFormState,
  type MqttSettingsResponse
} from "./loadModel";
import {
  rememberMqttConnectionModel
} from "./mqttSettingsRouteModel";
import {
  useMqttSettingsController
} from "./useMqttSettingsController";
import type { MqttSettingsSurface } from "./MqttSettingsContent.types";
import "./mqttSettings.css";

export async function loadMqttSettingsRoute() {
  try {
    await loadCachedMqttEditableModel();
  } catch {
    // Keep the route reachable; the page surfaces the load failure.
  }
  return null;
}

export async function loadMqttConnectionsRoute() {
  try {
    const response = await requestJson<MqttSettingsResponse>("/api/settings/mqtt");
    rememberMqttConnectionModel({
      settings: toFormState(response.settings),
      status: response.status
    });
  } catch {
    rememberMqttConnectionModel(null);
  }
  return null;
}

export async function loadMqttOperationsRoute() {
  try {
    await loadCachedMqttEditableModel();
  } catch {
    // Keep the route reachable; the operations surface will show the load failure.
  }
  return null;
}

export function MqttConnections() {
  return <MqttSettings surface="connections" />;
}

export function MqttOperations() {
  return <MqttSettings surface="operations" />;
}

export function MqttSettings({ surface = "full" }: { surface?: MqttSettingsSurface } = {}) {
  const controller = useMqttSettingsController(surface);
  const { remoteSync, ...contentProps } = controller;

  return (
    <MqttSettingsContent
      {...contentProps}
      remoteSyncBanner={
        remoteSync.hasPendingRemoteChange ? (
          <RemoteSyncBanner
            onKeepEditing={remoteSync.keepEditing}
            onReloadNow={() => remoteSync.discardAndReload().catch(() => {})}
          />
        ) : null
      }
    />
  );
}
