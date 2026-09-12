import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

// Complements the mounted trigger/keyboard tests with the cross-page wiring contract.
for (const file of [
  "CircuitSettings/CircuitRow.tsx", "DataHub/WeatherCards.tsx", "AssetLibrary/index.tsx",
  "ImageManagement/ImageManagementContent.tsx", "MqttSettings/MqttWeatherPanel.tsx",
  "PlaybackSettings/PlaybackSettingsFormSections.tsx"
]) {
  test(`select-labelled-at-use-sites: ${file} names every interactive select`, () => {
    const source = readFileSync(new URL(`../../pages/${file}`, import.meta.url), "utf8");
    const selects = [...source.matchAll(/<CustomSelect\b[\s\S]*?\/>/g)];
    assert.ok(selects.length > 0);
    for (const [select] of selects) assert.match(select, /aria-(?:label|labelledby)=(?:"[^"]+"|\{[^}]+\})/, `${file}: CustomSelect must name its trigger`);
  });
}
