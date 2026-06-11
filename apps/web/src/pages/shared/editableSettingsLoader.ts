type EditableSettingsLoader = () => Promise<void>;

export async function loadEditableSettingsLane(loaders: readonly EditableSettingsLoader[]) {
  await Promise.all(loaders.map((loader) => loader()));
}

export function refreshDeferredSettingsDiagnostics(loaders: readonly EditableSettingsLoader[]) {
  void Promise.all(loaders.map((loader) => loader())).catch(() => {});
}
