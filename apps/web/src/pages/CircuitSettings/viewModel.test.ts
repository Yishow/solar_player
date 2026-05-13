import assert from "node:assert/strict";
import test from "node:test";
import { buildCircuitSettingsViewModel } from "./viewModel";

test("buildCircuitSettingsViewModel maps prototype table fields and summary counts", () => {
  const model = buildCircuitSettingsViewModel({
    circuits: [
      {
        attentionMax: 90,
        attentionMin: 70,
        displayOrder: 2,
        enabled: true,
        icon: "fan",
        id: 12,
        mqttTopic: "factory/power/hvac",
        nameEn: "HVAC & Environment",
        nameZh: "空調與環境設備",
        normalMax: 70,
        normalMin: 0,
        ratedCapacity: 320,
        unit: "kW",
        warningMax: 100,
        warningMin: 90
      },
      {
        attentionMax: 90,
        attentionMin: 70,
        displayOrder: 3,
        enabled: false,
        icon: "light",
        id: 13,
        mqttTopic: "factory/power/lighting",
        nameEn: "Lighting",
        nameZh: "照明系統",
        normalMax: 70,
        normalMin: 0,
        ratedCapacity: 180,
        unit: "kW",
        warningMax: 100,
        warningMin: 90
      }
    ],
    errorMessage: "",
    isLoading: false,
    message: "迴路設定已同步。"
  });

  assert.equal(model.summary.totalCircuitCount, 2);
  assert.equal(model.summary.enabledCircuitCount, 1);
  assert.equal(model.summary.disabledCircuitCount, 1);
  assert.equal(model.summary.capacityLabel, "500 kW");
  assert.equal(model.feedbackBanner.tone, "ready");
  assert.equal(model.rows[0]?.orderLabel, "2");
  assert.equal(model.rows[0]?.normalRangeLabel, "0-70");
  assert.equal(model.rows[0]?.attentionRangeLabel, "70-90");
  assert.equal(model.rows[0]?.warningRangeLabel, "90-100");
  assert.equal(model.rows[0]?.visibilityLabel, "顯示中");
  assert.equal(model.rows[1]?.visibilityTone, "disconnected");
  assert.equal(model.rows[1]?.statusLabel, "草稿");
});

test("buildCircuitSettingsViewModel surfaces load failure and empty state clearly", () => {
  const model = buildCircuitSettingsViewModel({
    circuits: [],
    errorMessage: "載入失敗",
    isLoading: false,
    message: "正在載入迴路設定..."
  });

  assert.equal(model.feedbackBanner.tone, "error");
  assert.equal(model.feedbackBanner.title, "載入失敗");
  assert.equal(model.rows.length, 0);
  assert.equal(model.emptyState?.title, "尚未建立任何迴路");
  assert.match(model.emptyState?.description ?? "", /新增第一筆/);
});
