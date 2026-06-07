import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const pageDir = path.resolve(import.meta.dirname);
const mqttSettingsSource = fs.readFileSync(path.join(pageDir, "index.tsx"), "utf8");

test("mqtt settings only marks broker settings synced after weather settings save succeeds", () => {
  const saveSettingsSource = mqttSettingsSource.slice(
    mqttSettingsSource.indexOf("const saveSettings = async () => {"),
    mqttSettingsSource.indexOf("const testConnection = async () => {")
  );
  const weatherSaveIndex = saveSettingsSource.indexOf(
    "const savedWeatherSettings = await updateWeatherSettings(weatherSettings);"
  );
  const lastSyncedSettingsIndex = saveSettingsSource.indexOf("setLastSyncedSettings(nextSettings);");

  assert.notEqual(weatherSaveIndex, -1);
  assert.notEqual(lastSyncedSettingsIndex, -1);
  assert.ok(
    weatherSaveIndex < lastSyncedSettingsIndex,
    "broker settings should not be marked synced before weather settings save succeeds"
  );
});

test("mqtt settings uses a phase-neutral fallback error when the combined save fails", () => {
  assert.match(mqttSettingsSource, /儲存設定失敗。/);
  assert.doesNotMatch(mqttSettingsSource, /儲存 MQTT 設定失敗。/);
});

test("mqtt settings computes broker topic and weather draft scopes before rendering the workspace", () => {
  assert.match(mqttSettingsSource, /const draftSections = useMemo\(/);
  assert.match(mqttSettingsSource, /broker:\s*hasDisplaySyncDraftChanges\(settings,\s*lastSyncedSettings\)/);
  assert.match(mqttSettingsSource, /topic:\s*hasDisplaySyncDraftChanges\(topics,\s*lastSyncedTopics\)/);
  assert.match(
    mqttSettingsSource,
    /weather:\s*hasDisplaySyncDraftChanges\(weatherSettings,\s*lastSyncedWeatherSettings\)/
  );
  assert.match(mqttSettingsSource, /draftSections=\{draftSections\}/);
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
