import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const pageDir = path.resolve(import.meta.dirname);
const mqttSettingsSource = fs.readFileSync(path.join(pageDir, "index.tsx"), "utf8");
const factoryTopicSitesSource = fs.readFileSync(path.join(pageDir, "factoryTopicSites.ts"), "utf8");
const mqttSettingsLoadModelSource = fs.readFileSync(path.join(pageDir, "loadModel.ts"), "utf8");

test("mqtt settings includes custom display names in the topics save payload", () => {
  const saveTopicsSource = mqttSettingsSource.slice(
    mqttSettingsSource.indexOf("const saveTopicMappings = useCallback(async () => {"),
    mqttSettingsSource.indexOf("method: \"PUT\"", mqttSettingsSource.indexOf("const saveTopicMappings = useCallback(async () => {"))
  );

  assert.match(saveTopicsSource, /nameZh:\s*topic\.nameZh/);
  assert.match(saveTopicsSource, /nameEn:\s*topic\.nameEn/);
  assert.match(saveTopicsSource, /metricScope:\s*topic\.metricScope/);
});

test("mqtt settings saves broker settings without weather dependency", () => {
  const saveSettingsStart = mqttSettingsSource.indexOf("const saveSettings = useCallback(async () => {");
  const saveSettingsSource = mqttSettingsSource.slice(
    saveSettingsStart,
    mqttSettingsSource.indexOf("const refreshWeather = useCallback", saveSettingsStart)
  );

  assert.doesNotMatch(mqttSettingsSource, /updateWeatherSettings/);
  assert.doesNotMatch(saveSettingsSource, /weather/i);
  assert.match(saveSettingsSource, /setLastSyncedSettings\(nextSettings\);/);
  assert.doesNotMatch(saveSettingsSource, /setLastSyncedWeatherSettings|setWeatherSettings/);
  assert.match(saveSettingsSource, /setMessage\("MQTT broker 設定已儲存；連線狀態請查看診斷。"\);/);
  assert.doesNotMatch(saveSettingsSource, /MQTT broker 與天氣設定/);
});

test("mqtt settings uses a phase-neutral fallback error when the broker save fails", () => {
  assert.match(mqttSettingsSource, /儲存設定失敗。/);
  assert.doesNotMatch(mqttSettingsSource, /儲存 MQTT 設定失敗。/);
});

test("Data Hub Connections loads and saves only broker settings", () => {
  assert.match(mqttSettingsSource, /export async function loadMqttConnectionsRoute/);
  assert.match(mqttSettingsSource, /export function MqttConnections/);
  assert.match(mqttSettingsSource, /<MqttSettings surface="connections"\s*\/>/);
  assert.match(mqttSettingsSource, /surface === "connections"/);
});

test("Data Hub Sources can lazy-load the MQTT operations surface", () => {
  assert.match(mqttSettingsSource, /export async function loadMqttOperationsRoute/);
  assert.match(mqttSettingsSource, /export function MqttOperations/);
  assert.match(mqttSettingsSource, /<MqttSettings surface="operations"\s*\/>/);
  assert.match(mqttSettingsSource, /surface="operations"/);
});

test("mqtt settings computes broker topic and weather draft scopes before rendering the workspace", () => {
  assert.match(mqttSettingsSource, /const draftSections = useMemo\(/);
  assert.match(mqttSettingsSource, /broker:\s*hasDisplaySyncDraftChanges\(settings,\s*lastSyncedSettings\)/);
  assert.match(
    mqttSettingsSource,
    /topic:\s*!connectionsOnly\s*&&\s*hasDisplaySyncDraftChanges\(topics,\s*lastSyncedTopics\)/
  );
  assert.match(
    mqttSettingsSource,
    /weather:\s*!connectionsOnly\s*&&\s*hasDisplaySyncDraftChanges\(weatherSettings,\s*lastSyncedWeatherSettings\)/
  );
  assert.match(mqttSettingsSource, /draftSections=\{draftSections\}/);
});

test("mqtt settings keeps Topic workspace tab selection in route state without resetting drafts", () => {
  assert.match(mqttSettingsSource, /useState<TopicWorkspaceTab>\("topic"\)/);
  assert.match(mqttSettingsSource, /activeTopicWorkspaceTab=\{activeTopicWorkspaceTab\}/);
  assert.match(mqttSettingsSource, /handleTopicWorkspaceTabChange=\{setActiveTopicWorkspaceTab\}/);
  assert.doesNotMatch(mqttSettingsSource, /setSettings\([^)]*activeTopicWorkspaceTab/);
  assert.doesNotMatch(mqttSettingsSource, /setTopics\([^)]*activeTopicWorkspaceTab/);
});

test("mqtt settings keeps card data site selection in route state without resetting drafts", () => {
  assert.match(mqttSettingsSource, /useState<CardDataSiteFilter>\("jungli"\)/);
  assert.match(mqttSettingsSource, /activeCardDataSite=\{activeCardDataSite\}/);
  assert.match(mqttSettingsSource, /getPlaybackPages/);
  assert.match(mqttSettingsSource, /enabledCardDataSites=\{enabledCardDataSites\}/);
  assert.match(mqttSettingsSource, /enabledPageKeys\.has\("factory-circuit-guanyin"\)/);
  assert.match(mqttSettingsSource, /handleCardDataSiteChange=\{setActiveCardDataSite\}/);
  assert.doesNotMatch(mqttSettingsSource, /setSettings\([^)]*activeCardDataSite/);
  assert.doesNotMatch(mqttSettingsSource, /setTopics\([^)]*activeCardDataSite/);
});

test("mqtt settings loads card diagnostics only for the card data workspace tab", () => {
  assert.match(mqttSettingsSource, /getDisplayCardData/);
  assert.match(mqttSettingsSource, /const \[cardData,\s*setCardData\]/);
  assert.match(mqttSettingsSource, /activeTopicWorkspaceTab !== "card-data"/);
  assert.match(mqttSettingsSource, /cardDataRows=\{cardData\?\.rows \?\? \[\]\}/);
  assert.match(mqttSettingsSource, /cardDataErrorMessage=\{cardDataErrorMessage\}/);
});

test("mqtt settings renders the merged workspace instead of standalone source and topic cards", () => {
  assert.match(mqttSettingsSource, /activeTopicWorkspaceTab/);
  assert.match(mqttSettingsSource, /MqttSettingsContent/);
  assert.doesNotMatch(mqttSettingsSource, /mqtt-mode/);
});

test("mqtt settings lists three-phase metric keys as creatable, manageable topic mappings", () => {
  const optionsBlock = mqttSettingsSource.slice(
    mqttSettingsSource.indexOf("const defaultMetricOptions = ["),
    mqttSettingsSource.indexOf("] as const;", mqttSettingsSource.indexOf("const defaultMetricOptions = ["))
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
  const optionsBlock = mqttSettingsSource.slice(
    mqttSettingsSource.indexOf("const defaultMetricOptions = ["),
    mqttSettingsSource.indexOf("] as const;", mqttSettingsSource.indexOf("const defaultMetricOptions = ["))
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
  assert.match(mqttSettingsSource, /factoryTopicMetricKeysBySite\[activeCardDataSite\]/);
  assert.match(mqttSettingsSource, /isTopicMetricVisibleForFactorySite\(option,\s*metricScope,\s*activeCardDataSite\)/);
});

test("mqtt settings defers diagnostics polling and weather preview until persisted controls load", () => {
  assert.match(mqttSettingsSource, /hasLoadedMqttEditableModel/);
  assert.match(mqttSettingsSource, /useDisplayReadiness\(\{\s*enabled:\s*hasLoadedMqttEditableModel\s*\}\)/);
  assert.match(mqttSettingsSource, /useLiveMetrics\(\{\s*enabled:\s*hasLoadedMqttEditableModel\s*\}\)/);
  assert.match(
    mqttSettingsSource,
    /useMqttStatus\(undefined,\s*\{\s*enabled:\s*connectionsOnly\s*\?\s*hasLoadedMqttSettings\s*:\s*hasLoadedMqttEditableModel\s*\}\)/
  );
  assert.match(mqttSettingsSource, /if \(!hasLoadedWeatherSettings\) \{/);
  assert.match(mqttSettingsSource, /if \(!hasLoadedTopics\) \{/);
});

test("mqtt settings reuses one editable loader before deferred diagnostics refresh", () => {
  assert.match(mqttSettingsSource, /loadEditableSettingsLane/);
  assert.match(mqttSettingsSource, /refreshDeferredSettingsDiagnostics/);
  assert.match(mqttSettingsSource, /readCachedMqttEditableModel\(\)/);
  assert.match(mqttSettingsSource, /export async function loadMqttSettingsRoute\(\)/);
  assert.match(mqttSettingsSource, /const applyMqttEditableModel = \(model: MqttEditableModel\) => {/);
  assert.match(mqttSettingsSource, /const initialSettings = initialConnectionModel\?\.settings \?\? initialEditableModel\?\.settings \?\? defaultMqttFormState/);
  assert.match(mqttSettingsSource, /useState<MqttSettingsForm>\(initialSettings\)/);
  assert.match(mqttSettingsSource, /await loadMqttEditableModel\(\{ force: initialEditableModel !== null \}\)/);
  assert.match(mqttSettingsSource, /loadCachedMqttEditableModel\(\{ force \}\)/);
  assert.match(mqttSettingsLoadModelSource, /let cachedMqttEditableModel: MqttEditableModel \| null = null/);
  assert.match(mqttSettingsLoadModelSource, /if \(!options\.force && cachedMqttEditableModel\)/);
  assert.match(mqttSettingsSource, /const loadMqttEditableModel = async/);
  assert.match(mqttSettingsSource, /await loadMqttEditableModel\(\{ propagateError: true, topicsAsPolling: true \}\)/);
  assert.match(mqttSettingsSource, /refreshDeferredSettingsDiagnostics\(\[reloadReadiness\]\)/);

  const reloadNowSource = mqttSettingsSource.slice(
    mqttSettingsSource.indexOf("reloadNow: async () => {"),
    mqttSettingsSource.indexOf("useDisplaySyncRefresh", mqttSettingsSource.indexOf("reloadNow: async () => {"))
  );
  assert.doesNotMatch(reloadNowSource, /Promise\.all\(\[/);
});

test("mqtt settings polling merges runtime topic snapshots without overwriting local drafts", () => {
  assert.match(mqttSettingsSource, /lastSyncedTopicsRef/);
  assert.match(mqttSettingsSource, /mergePolledTopicMappings/);

  const loadTopicsSource = mqttSettingsSource.slice(
    mqttSettingsSource.indexOf("const loadTopics = async"),
    mqttSettingsSource.indexOf("const loadWeatherSettings = async")
  );

  assert.match(
    loadTopicsSource,
    /setTopics\(\(current\)\s*=>\s*mergePolledTopicMappings\(current,\s*lastSyncedTopicsRef\.current,\s*response\.topics\)\)/
  );
  assert.match(loadTopicsSource, /lastSyncedTopicsRef\.current\s*=\s*response\.topics/);
});

test("mqtt settings publishes transient numeric test values through the mapped metric key", () => {
  assert.match(mqttSettingsSource, /const publishTopicValue = useCallback\(async \(metricScope: TopicMapping\["metricScope"\], metricKey: string, value: number\) => \{/);

  const publishSource = mqttSettingsSource.slice(
    mqttSettingsSource.indexOf('const publishTopicValue = useCallback(async (metricScope: TopicMapping["metricScope"], metricKey: string, value: number) => {'),
    mqttSettingsSource.indexOf("const saveTopicMappings = useCallback(async () => {")
  );

  assert.match(publishSource, /`\/api\/settings\/mqtt\/topics\/\$\{encodeURIComponent\(metricKey\)\}\/publish`/);
  assert.match(publishSource, /body:\s*JSON\.stringify\(\{\s*metricScope,\s*value\s*\}\)/);
  assert.match(publishSource, /method:\s*"POST"/);
  assert.match(publishSource, /await loadTopics\(\{\s*isPolling:\s*true\s*\}\)/);
  assert.doesNotMatch(publishSource, /setTopics\(\(current\).*value/);
  assert.match(mqttSettingsSource, /publishTopicValue=\{publishTopicValue\}/);
});
