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
        displaySlot: "hvac",
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
        displaySlot: null,
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
    deletingId: null,
    dirtyIds: [12],
    errorMessage: "",
    isAdding: false,
    isLoading: false,
    isReloading: false,
    isSaving: false,
    message: "迴路設定已同步。"
  });

  assert.equal(model.summary.totalCircuitCount, 2);
  assert.equal(model.summary.enabledCircuitCount, 1);
  assert.equal(model.summary.disabledCircuitCount, 1);
  assert.equal(model.summary.capacityLabel, "500 kW");
  assert.equal(model.feedbackBanner.tone, "ready");
  assert.equal(model.actions.saveDisabled, false);
  assert.equal(model.rows[0]?.orderLabel, "2");
  assert.equal(model.rows[0]?.normalRangeLabel, "0-70");
  assert.equal(model.rows[0]?.attentionRangeLabel, "70-90");
  assert.equal(model.rows[0]?.warningRangeLabel, "90-100");
  assert.equal(model.rows[0]?.visibilityLabel, "顯示中");
  assert.equal(model.rows[0]?.dirtyLabel, "待儲存");
  assert.equal(model.rows[0]?.validationLabel, "已設定");
  assert.equal(model.rows[1]?.visibilityTone, "disconnected");
  assert.equal(model.rows[1]?.statusLabel, "草稿");
});

test("buildCircuitSettingsViewModel surfaces load failure and empty state clearly", () => {
  const model = buildCircuitSettingsViewModel({
    circuits: [],
    deletingId: null,
    dirtyIds: [],
    errorMessage: "載入失敗",
    isAdding: false,
    isLoading: false,
    isReloading: false,
    isSaving: false,
    message: "正在載入迴路設定..."
  });

  assert.equal(model.feedbackBanner.tone, "error");
  assert.equal(model.feedbackBanner.title, "載入失敗");
  assert.equal(model.rows.length, 0);
  assert.equal(model.emptyState?.title, "尚未建立任何迴路");
  assert.match(model.emptyState?.description ?? "", /新增第一筆/);
});

test("buildCircuitSettingsViewModel exposes row-level slot impact readiness risk and threshold semantics", () => {
  const model = buildCircuitSettingsViewModel({
    circuits: [
      {
        attentionMax: 90,
        attentionMin: 70,
        displayOrder: 1,
        displaySlot: "hvac",
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
        attentionMax: null,
        attentionMin: null,
        displayOrder: 2,
        displaySlot: null,
        enabled: true,
        icon: "bolt",
        id: 13,
        mqttTopic: "",
        nameEn: "Office",
        nameZh: "辦公區域",
        normalMax: 70,
        normalMin: 0,
        ratedCapacity: 180,
        unit: "kW",
        warningMax: null,
        warningMin: null
      }
    ],
    deletingId: null,
    dirtyIds: [13],
    errorMessage: "",
    isAdding: false,
    isLoading: false,
    isReloading: false,
    isSaving: false,
    message: "迴路設定已同步。",
    readiness: {
      findings: [
        {
          blocking: true,
          pageId: "factory-circuit",
          reason: "slot conflict: hvac is claimed by multiple circuits",
          requirementKey: "hvac",
          sourceId: "12,18",
          sourceType: "circuit-slot",
          status: "blocking"
        }
      ],
      generatedAt: "2026-05-28T12:00:00.000Z",
      pages: [],
      summary: {
        blockingCount: 1,
        mqttCoverage: {
          blockingCount: 0,
          readyCount: 0
        },
        readyCount: 0,
        slotCoverage: {
          blockingCount: 1,
          readyCount: 0
        },
        warningCount: 0
      }
    }
  });

  assert.equal(model.rows[0]?.slotImpactLabel, "Factory Circuit slot · HVAC");
  assert.equal(model.rows[0]?.rowRiskLabel, "Blocking Readiness");
  assert.match(model.rows[0]?.rowRiskDetail ?? "", /slot conflict/);
  assert.equal(
    model.rows[0]?.thresholdSummaryLabel,
    "Normal 0-70 · Attention 70-90 · Warning 90-100"
  );
  assert.equal(model.rows[1]?.slotImpactLabel, "尚未綁定 display slot");
  assert.equal(model.rows[1]?.rowRiskLabel, "Dirty Change");
  assert.match(model.rows[1]?.thresholdSummaryLabel ?? "", /Threshold ranges 未完成或順序錯誤/);
});
