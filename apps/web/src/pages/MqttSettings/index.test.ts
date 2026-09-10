import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const pageDir = path.resolve(import.meta.dirname);
const mqttSettingsIndexSource = fs.readFileSync(path.join(pageDir, "index.tsx"), "utf8");
const factoryTopicSitesSource = fs.readFileSync(path.join(pageDir, "factoryTopicSites.ts"), "utf8");
const mqttSettingsLoadModelSource = fs.readFileSync(path.join(pageDir, "loadModel.ts"), "utf8");
const mqttSettingsBrokerSource = fs.readFileSync(path.join(pageDir, "useMqttSettingsBroker.ts"), "utf8");
const mqttSettingsCardDataSource = fs.readFileSync(path.join(pageDir, "useMqttSettingsCardData.ts"), "utf8");
const mqttSettingsConnectionsPanelSource = fs.readFileSync(path.join(pageDir, "MqttConnectionsPanel.tsx"), "utf8");
const mqttSettingsContentSource = fs.readFileSync(path.join(pageDir, "MqttSettingsContent.tsx"), "utf8");
const mqttSettingsContentTypesSource = fs.readFileSync(path.join(pageDir, "MqttSettingsContent.types.ts"), "utf8");
const mqttSettingsControllerSource = fs.readFileSync(path.join(pageDir, "useMqttSettingsController.ts"), "utf8");
const mqttSettingsDataSource = fs.readFileSync(path.join(pageDir, "useMqttSettingsData.ts"), "utf8");
const mqttSettingsRemoteSyncSource = fs.readFileSync(path.join(pageDir, "useMqttSettingsRemoteSync.ts"), "utf8");
const mqttSettingsRouteModelSource = fs.readFileSync(path.join(pageDir, "mqttSettingsRouteModel.ts"), "utf8");
const mqttSettingsRuntimeSource = fs.readFileSync(path.join(pageDir, "useMqttSettingsRuntime.ts"), "utf8");
const mqttSettingsTopicPanelSource = fs.readFileSync(path.join(pageDir, "MqttTopicPanel.tsx"), "utf8");
const mqttSettingsTopicsSource = fs.readFileSync(path.join(pageDir, "useMqttSettingsTopics.ts"), "utf8");
const mqttSettingsWeatherPanelSource = fs.readFileSync(path.join(pageDir, "MqttWeatherPanel.tsx"), "utf8");
const mqttSettingsWeatherSource = fs.readFileSync(path.join(pageDir, "useMqttSettingsWeather.ts"), "utf8");

test("mqtt settings hooks depend on the canonical content types module", () => {
  assert.match(mqttSettingsContentTypesSource, /export type MqttSettingsSurface = "full" \| "connections" \| "operations"/);
  assert.doesNotMatch(mqttSettingsControllerSource, /type MqttSettingsSurface =/);
  assert.match(
    mqttSettingsControllerSource,
    /import type \{[\s\S]{0,120}MqttSettingsSurface[\s\S]{0,80}\} from "\.\/MqttSettingsContent\.types"/
  );
  assert.match(mqttSettingsTopicsSource, /from "\.\/MqttSettingsContent\.types"/);
  assert.match(mqttSettingsCardDataSource, /from "\.\/MqttSettingsContent\.types"/);
  assert.doesNotMatch(mqttSettingsTopicsSource, /from "\.\/MqttSettingsContent"/);
  assert.doesNotMatch(mqttSettingsCardDataSource, /from "\.\/MqttSettingsContent"/);
});

test("mqtt settings includes custom display names in the topics save payload", () => {
  const saveTopicsSource = mqttSettingsTopicsSource.slice(
    mqttSettingsTopicsSource.indexOf("const saveTopicMappings = useCallback(async () => {"),
    mqttSettingsTopicsSource.indexOf("method: \"PUT\"", mqttSettingsTopicsSource.indexOf("const saveTopicMappings = useCallback(async () => {"))
  );

  assert.match(saveTopicsSource, /nameZh:\s*topic\.nameZh/);
  assert.match(saveTopicsSource, /nameEn:\s*topic\.nameEn/);
  assert.match(saveTopicsSource, /metricScope:\s*topic\.metricScope/);
});

test("mqtt settings saves broker settings without weather dependency", () => {
  const saveSettingsStart = mqttSettingsBrokerSource.indexOf("const saveSettings = useCallback(async () => {");
  const saveSettingsSource = mqttSettingsBrokerSource.slice(
    saveSettingsStart,
    mqttSettingsBrokerSource.length
  );

  assert.doesNotMatch(mqttSettingsBrokerSource, /updateWeatherSettings/);
  assert.doesNotMatch(saveSettingsSource, /weather/i);
  assert.match(saveSettingsSource, /setLastSyncedSettings\(nextSettings\);/);
  assert.doesNotMatch(saveSettingsSource, /setLastSyncedWeatherSettings|setWeatherSettings/);
  assert.match(saveSettingsSource, /setMessage\("MQTT broker 設定已儲存；連線狀態請查看診斷。"\);/);
  assert.doesNotMatch(saveSettingsSource, /MQTT broker 與天氣設定/);
});

test("mqtt settings uses a phase-neutral fallback error when the broker save fails", () => {
  assert.match(mqttSettingsBrokerSource, /儲存設定失敗。/);
  assert.doesNotMatch(mqttSettingsBrokerSource, /儲存 MQTT 設定失敗。/);
});

test("Data Hub Connections loads and saves only broker settings", () => {
  assert.match(mqttSettingsIndexSource, /export async function loadMqttConnectionsRoute/);
  assert.match(mqttSettingsIndexSource, /export function MqttConnections/);
  assert.match(mqttSettingsIndexSource, /<MqttSettings surface="connections"\s*\/>/);
  assert.match(mqttSettingsControllerSource, /surface === "connections"/);
});

test("Data Hub Sources can lazy-load the MQTT operations surface", () => {
  assert.match(mqttSettingsIndexSource, /export async function loadMqttOperationsRoute/);
  assert.match(mqttSettingsIndexSource, /export function MqttOperations/);
  assert.match(mqttSettingsIndexSource, /<MqttSettings surface="operations"\s*\/>/);
});

test("mqtt settings computes broker topic and weather draft scopes before rendering the workspace", () => {
  assert.match(mqttSettingsRemoteSyncSource, /const draftSections = useMemo\(/);
  assert.match(mqttSettingsRemoteSyncSource, /broker:\s*hasDisplaySyncDraftChanges\(settings,\s*lastSyncedSettings\)/);
  assert.match(
    mqttSettingsRemoteSyncSource,
    /topic:\s*!connectionsOnly\s*&&\s*hasDisplaySyncDraftChanges\(topics,\s*lastSyncedTopics\)/
  );
  assert.match(
    mqttSettingsRemoteSyncSource,
    /weather:\s*!connectionsOnly\s*&&\s*hasDisplaySyncDraftChanges\(weatherSettings,\s*lastSyncedWeatherSettings\)/
  );
  assert.match(mqttSettingsControllerSource, /draftSections:\s*remote\.draftSections/);
});

test("mqtt settings keeps Topic workspace tab selection in route state without resetting drafts", () => {
  assert.match(mqttSettingsCardDataSource, /useState<TopicWorkspaceTab>\("topic"\)/);
  assert.match(mqttSettingsControllerSource, /activeTopicWorkspaceTab:\s*card\.activeTopicWorkspaceTab/);
  assert.match(mqttSettingsControllerSource, /handleTopicWorkspaceTabChange:\s*card\.setActiveTopicWorkspaceTab/);
  assert.doesNotMatch(mqttSettingsCardDataSource, /setSettings\([^)]*activeTopicWorkspaceTab/);
  assert.doesNotMatch(mqttSettingsCardDataSource, /setTopics\([^)]*activeTopicWorkspaceTab/);
});

test("mqtt settings keeps card data site selection in route state without resetting drafts", () => {
  assert.match(mqttSettingsCardDataSource, /useState<CardDataSiteFilter>\("jungli"\)/);
  assert.match(mqttSettingsDataSource, /getPlaybackPages/);
  assert.match(mqttSettingsCardDataSource, /enabledPageKeys\.has\("factory-circuit-guanyin"\)/);
  assert.match(mqttSettingsControllerSource, /enabledCardDataSites:\s*card\.enabledCardDataSites/);
  assert.match(mqttSettingsControllerSource, /handleCardDataSiteChange:\s*card\.handleCardDataSiteChange/);
  assert.doesNotMatch(mqttSettingsCardDataSource, /setSettings\([^)]*activeCardDataSite/);
  assert.doesNotMatch(mqttSettingsCardDataSource, /setTopics\([^)]*activeCardDataSite/);
});

test("mqtt settings loads card diagnostics only for the card data workspace tab", () => {
  assert.match(mqttSettingsCardDataSource, /getDisplayCardData/);
  assert.match(mqttSettingsCardDataSource, /const \[cardData,\s*setCardData\]/);
  assert.match(mqttSettingsCardDataSource, /activeTopicWorkspaceTab !== "card-data"/);
  assert.match(mqttSettingsControllerSource, /cardDataRows:\s*card\.cardData\?\.rows \?\? \[\]/);
  assert.match(mqttSettingsControllerSource, /cardDataErrorMessage:\s*card\.cardDataErrorMessage/);
});

test("mqtt settings renders the merged workspace instead of standalone source and topic cards", () => {
  assert.match(mqttSettingsContentSource, /activeTopicWorkspaceTab/);
  assert.match(mqttSettingsIndexSource, /MqttSettingsContent/);
  assert.doesNotMatch(mqttSettingsIndexSource, /mqtt-mode/);
});

test("mqtt settings lists three-phase metric keys as creatable, manageable topic mappings", () => {
  const optionsBlock = mqttSettingsRouteModelSource.slice(
    mqttSettingsRouteModelSource.indexOf("const defaultMetricOptions = ["),
    mqttSettingsRouteModelSource.indexOf("] as const;", mqttSettingsRouteModelSource.indexOf("const defaultMetricOptions = ["))
  );

  const threePhaseMetricKeys = [
    "phaseRVoltage",
    "phaseRCurrent",
    "phaseRPower",
    "phaseSVoltage",
    "phaseSCurrent",
    "phaseSPower",
    "phaseTVoltage",
    "phaseTCurrent",
    "phaseTPower"
  ];

  for (const metricKey of threePhaseMetricKeys) {
    assert.ok(
      optionsBlock.includes(`"${metricKey}"`),
      `expected ${metricKey} to be a creatable metric option`
    );
  }
});

test("mqtt settings lists semantic Factory Circuit metric keys as creatable scoped topic mappings", () => {
  const optionsBlock = mqttSettingsRouteModelSource.slice(
    mqttSettingsRouteModelSource.indexOf("const defaultMetricOptions = ["),
    mqttSettingsRouteModelSource.indexOf("] as const;", mqttSettingsRouteModelSource.indexOf("const defaultMetricOptions = ["))
  );

  for (const metricKey of [
    "factoryCircuit.stampingPower",
    "factoryCircuit.officePower",
    "factoryCircuit.heavyVehiclePower",
    "factoryCircuit.edCoatingPower"
  ]) {
    assert.ok(factoryTopicSitesSource.includes(metricKey), `expected ${metricKey} to be a Factory Circuit metric key`);
  }

  assert.match(optionsBlock, /\.\.\.jungliFactoryTopicMetricKeys/);
  assert.match(optionsBlock, /\.\.\.guanyinFactoryTopicMetricKeys/);
  assert.match(mqttSettingsTopicsSource, /factoryTopicMetricKeysBySite\[activeCardDataSite\]/);
  assert.match(mqttSettingsTopicsSource, /isTopicMetricVisibleForFactorySite\(option,\s*metricScope,\s*activeCardDataSite\)/);
});

test("mqtt settings defers diagnostics polling and weather preview until persisted controls load", () => {
  assert.match(mqttSettingsRuntimeSource, /hasLoadedMqttEditableModel/);
  assert.match(mqttSettingsRuntimeSource, /useDisplayReadiness\(\{\s*enabled:\s*hasLoadedMqttEditableModel\s*\}\)/);
  assert.match(mqttSettingsRuntimeSource, /useLiveMetrics\(\{\s*enabled:\s*hasLoadedMqttEditableModel\s*\}\)/);
  assert.match(
    mqttSettingsRuntimeSource,
    /useMqttStatus\(undefined,\s*\{\s*enabled:\s*connectionsOnly\s*\?\s*hasLoadedMqttSettings\s*:\s*hasLoadedMqttEditableModel\s*\}\)/
  );
  assert.match(mqttSettingsWeatherSource, /if \(!hasLoadedWeatherSettings\) \{/);
  assert.match(mqttSettingsDataSource, /if \(!hasLoadedTopics\) \{/);
  assert.match(
    mqttSettingsWeatherSource,
    /getWeatherOptions[\s\S]{0,1800}finally[\s\S]{0,300}loadWeatherDiagnostic/
  );
  assert.match(
    mqttSettingsWeatherSource,
    /const refreshWeather[\s\S]{0,1800}finally[\s\S]{0,300}loadWeatherDiagnostic/
  );
});

test("mqtt settings reuses one editable loader before deferred diagnostics refresh", () => {
  assert.match(mqttSettingsDataSource, /loadEditableSettingsLane/);
  assert.match(mqttSettingsRemoteSyncSource, /refreshDeferredSettingsDiagnostics/);
  assert.match(mqttSettingsControllerSource, /readCachedMqttEditableModel\(\)/);
  assert.match(mqttSettingsIndexSource, /export async function loadMqttSettingsRoute\(\)/);
  assert.match(
    mqttSettingsDataSource,
    /const applyMqttEditableModel = useCallback\(\([\s\S]{0,180}model: MqttEditableModel,[\s\S]{0,180}weatherRequest:/
  );
  assert.match(mqttSettingsDataSource, /const initialSettings = initialConnectionModel\?\.settings \?\? initialEditableModel\?\.settings \?\? defaultMqttFormState/);
  assert.match(mqttSettingsDataSource, /useState<MqttSettingsForm>\(initialSettings\)/);
  assert.match(mqttSettingsDataSource, /await loadMqttEditableModel\(\{ force: initialEditableModel !== null \}\)/);
  assert.match(mqttSettingsDataSource, /loadCachedMqttEditableModel\(\{ force \}\)/);
  assert.match(mqttSettingsLoadModelSource, /let cachedMqttEditableModel: MqttEditableModel \| null = null/);
  assert.match(mqttSettingsLoadModelSource, /if \(!options\.force && cachedMqttEditableModel\)/);
  assert.match(mqttSettingsDataSource, /const loadMqttEditableModel = useCallback\(async/);
  assert.match(
    mqttSettingsRemoteSyncSource,
    /await loadMqttEditableModel\(\{[\s\S]{0,180}propagateError: true,[\s\S]{0,180}topicsAsPolling: true,[\s\S]{0,180}weatherDiscard: discardDraft/
  );
  assert.match(mqttSettingsRemoteSyncSource, /refreshDeferredSettingsDiagnostics\(\[reloadReadiness\]\)/);

  const reloadNowSource = mqttSettingsRemoteSyncSource.slice(
    mqttSettingsRemoteSyncSource.indexOf("reloadNow: async (context) => {"),
    mqttSettingsRemoteSyncSource.indexOf("useDisplaySyncRefresh", mqttSettingsRemoteSyncSource.indexOf("reloadNow: async (context) => {"))
  );
  assert.doesNotMatch(reloadNowSource, /Promise\.all\(\[/);
});

test("mqtt settings polling merges runtime topic snapshots without overwriting local drafts", () => {
  assert.match(mqttSettingsDataSource, /lastSyncedTopicsRef/);
  assert.match(mqttSettingsDataSource, /mergePolledTopicMappings/);

  const loadTopicsSource = mqttSettingsDataSource.slice(
    mqttSettingsDataSource.indexOf("const loadTopics = useCallback(async"),
    mqttSettingsDataSource.indexOf("const loadWeatherSettings = useCallback(async")
  );

  assert.match(
    loadTopicsSource,
    /setTopics\(\(current\)\s*=>\s*mergePolledTopicMappings\(current,\s*lastSyncedTopicsRef\.current,\s*response\.topics\)\)/
  );
  assert.match(loadTopicsSource, /lastSyncedTopicsRef\.current\s*=\s*response\.topics/);
});

test("mqtt settings publishes transient numeric test values through the mapped metric key", () => {
  assert.match(
    mqttSettingsTopicsSource,
    /const publishTopicValue = useCallback\(async \(\s*metricScope: TopicMapping\["metricScope"\],\s*metricKey: string,\s*value: number\s*\) => \{/s
  );

  const publishSource = mqttSettingsTopicsSource.slice(
    mqttSettingsTopicsSource.indexOf("const publishTopicValue = useCallback(async ("),
    mqttSettingsTopicsSource.indexOf("const saveTopicMappings = useCallback(async () => {")
  );

  assert.match(publishSource, /`\/api\/settings\/mqtt\/topics\/\$\{encodeURIComponent\(metricKey\)\}\/publish`/);
  assert.match(publishSource, /body:\s*JSON\.stringify\(\{\s*metricScope,\s*value\s*\}\)/);
  assert.match(publishSource, /method:\s*"POST"/);
  assert.match(publishSource, /await loadTopics\(\{\s*isPolling:\s*true\s*\}\)/);
  assert.doesNotMatch(publishSource, /setTopics\(\(current\).*value/);
  assert.match(mqttSettingsControllerSource, /publishTopicValue:\s*topics\.publishTopicValue/);
});

test("mqtt settings keeps route, request, and payload contracts discoverable across extracted modules", () => {
  assert.match(mqttSettingsIndexSource, /export async function loadMqttSettingsRoute/);
  assert.match(mqttSettingsIndexSource, /export async function loadMqttConnectionsRoute/);
  assert.match(mqttSettingsIndexSource, /export async function loadMqttOperationsRoute/);
  assert.match(mqttSettingsIndexSource, /export function MqttConnections/);
  assert.match(mqttSettingsIndexSource, /export function MqttOperations/);

  assert.match(mqttSettingsDataSource, /requestJson(?:<[^>]+>)?\("\/api\/settings\/mqtt"\)/);
  assert.match(
    mqttSettingsBrokerSource,
    /requestJson(?:<[^>]+>)?\("\/api\/settings\/mqtt",\s*\{\s*body:\s*JSON\.stringify\(buildSettingsPayload\(settings\)\),\s*method:\s*"PUT"/
  );
  assert.match(
    mqttSettingsBrokerSource,
    /requestJson(?:<[^>]+>)?\("\/api\/settings\/mqtt\/test",\s*\{\s*body:\s*JSON\.stringify\(buildSettingsPayload\(settings\)\),\s*method:\s*"POST"/
  );
  assert.match(mqttSettingsDataSource, /requestJson(?:<[^>]+>)?\("\/api\/settings\/mqtt\/topics"\)/);
  assert.match(
    mqttSettingsTopicsSource,
    /requestJson(?:<[^>]+>)?\("\/api\/settings\/mqtt\/topics",\s*\{\s*body:\s*JSON\.stringify\(\{\s*topics:\s*topics\.map/
  );
  assert.match(mqttSettingsTopicsSource, /requestJson(?:<[^>]+>)?\("\/api\/settings\/mqtt\/reload",\s*\{\s*method:\s*"POST"/);
  assert.match(mqttSettingsWeatherSource, /requestJson(?:<[^>]+>)?\("\/api\/weather\/refresh",\s*\{\s*method:\s*"POST"/);
  assert.match(mqttSettingsTopicsSource, /metricScope:\s*topic\.metricScope/);
  assert.match(mqttSettingsTopicsSource, /multiplier:\s*topic\.multiplier \?\? 1/);
  assert.match(mqttSettingsTopicsSource, /nameZh:\s*topic\.nameZh\?\.trim\(\) \?\? ""/);
  assert.match(mqttSettingsTopicsSource, /nameEn:\s*topic\.nameEn\?\.trim\(\) \?\? ""/);
  assert.match(mqttSettingsTopicsSource, /topic:\s*topic\.topic\.trim\(\)/);
  assert.match(mqttSettingsTopicsSource, /valuePath:\s*topic\.valuePath\.trim\(\)/);
  assert.match(
    mqttSettingsTopicsSource,
    /`\/api\/settings\/mqtt\/topics\/\$\{encodeURIComponent\(metricKey\)\}\/publish`[\s\S]{0,260}body:\s*JSON\.stringify\(\{\s*metricScope,\s*value\s*\}\)/
  );
});

test("mqtt settings keeps dirty guard and five-second polling lifecycle across controller extraction", () => {
  assert.match(
    mqttSettingsRemoteSyncSource,
    /useDisplaySyncDraftGuard\(\{[\s\S]{0,500}isDirty:\s*isDirty,[\s\S]{0,300}relevantScopes:\s*MQTT_SETTINGS_DISPLAY_SYNC_SCOPES/
  );
  assert.match(mqttSettingsRemoteSyncSource, /useDisplaySyncRefresh\(syncDraftGuard\.handleDisplaySync, MQTT_SETTINGS_DISPLAY_SYNC_SCOPES\)/);
  assert.match(
    mqttSettingsDataSource,
    /window\.setInterval\(\(\) => \{[\s\S]{0,220}loadTopics\(\{\s*isPolling:\s*true\s*\}\)[\s\S]{0,120}\},\s*5000\)/
  );
  assert.match(
    mqttSettingsDataSource,
    /return \(\) => \{\s*active = false;\s*window\.clearInterval\(pollTimer\);\s*\}/
  );
});

test("mqtt settings wires explicit keep-editing and discard actions to the remote sync banner", () => {
  assert.match(mqttSettingsIndexSource, /<RemoteSyncBanner/);
  assert.match(mqttSettingsIndexSource, /onKeepEditing=\{remoteSync\.keepEditing\}/);
  assert.match(
    mqttSettingsIndexSource,
    /onReloadNow=\{\(\) => remoteSync\.discardAndReload\(\)\.catch\(\(\) => \{\}\)\}/
  );
  assert.match(mqttSettingsRemoteSyncSource, /stickyPending:\s*!connectionsOnly/);
  assert.match(mqttSettingsRemoteSyncSource, /weatherDiscard:\s*discardDraft/);
});

test("mqtt settings preserves controller callback wiring for connection and workspace actions", () => {
  assert.match(
    mqttSettingsConnectionsPanelSource,
    /<ConnectionsView[\s\S]{0,1800}onChange=\{props\.handleSettingChange\}[\s\S]{0,300}onTestConnection=\{props\.testConnection\}[\s\S]{0,300}onSaveSettings=\{props\.saveSettings\}/
  );
  assert.match(mqttSettingsContentSource, /onClick=\{\(\) => void props\.testConnection\(\)\}/);
  assert.match(mqttSettingsContentSource, /onClick=\{\(\) => void props\.saveSettings\(\)\}/);
  assert.match(mqttSettingsContentSource, /handleTopicChange=\{props\.handleTopicChange\}/);
  assert.match(mqttSettingsContentSource, /handleTopicPublishDraftChange=\{props\.handleTopicPublishDraftChange\}/);
  assert.match(mqttSettingsContentSource, /publishTopicValue=\{props\.publishTopicValue\}/);
  assert.match(mqttSettingsTopicPanelSource, /onClick=\{\(\) => void props\.reloadTopics\(\)\}/);
  assert.match(mqttSettingsTopicPanelSource, /onClick=\{\(\) => void props\.saveTopicMappings\(\)\}/);
  assert.match(mqttSettingsWeatherPanelSource, /onClick=\{\(\) => void props\.refreshWeather\(\)\}/);
});
