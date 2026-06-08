import assert from "node:assert/strict";
import test from "node:test";
import {
    createOverviewDisplayPageSeedConfig,
    overviewDisplayPageEditorRegions,
    resolveOverviewModernDefaultConfig
} from "./displayPageConfig";

test("overview seed config includes Better KPI footer defaults", () => {
    const config = createOverviewDisplayPageSeedConfig() as typeof createOverviewDisplayPageSeedConfig extends (...args: never[]) => infer T ? T : never;

    assert.equal((config.kpiCards.today as typeof config.kpiCards.today & { footerType?: string }).footerType, "progress");
    assert.equal((config.kpiCards.today as typeof config.kpiCards.today & { targetValue?: number }).targetValue, 5000);
    assert.equal((config.kpiCards.total as typeof config.kpiCards.total & { footerType?: string }).footerType, "text");
    assert.equal(
        (config.kpiCards.total as typeof config.kpiCards.total & { footerText?: string }).footerText,
        "自建置起 2022 / 01 至今"
    );
    assert.equal((config.kpiCards.co2Today as typeof config.kpiCards.co2Today & { footerType?: string }).footerType, "co2-tree");
    assert.equal((config.kpiCards.co2Total as typeof config.kpiCards.co2Total & { footerType?: string }).footerType, "co2-tree");
});

test("overview config falls back to seed footer metadata when persisted KPI cards predate footer fields", () => {
    const seed = createOverviewDisplayPageSeedConfig();
    const persisted = createOverviewDisplayPageSeedConfig() as unknown as Omit<typeof seed, "kpiCards"> & {
        kpiCards: Record<string, Record<string, unknown>>;
    };
    const todayCard = persisted.kpiCards.today as Record<string, unknown>;
    const totalCard = persisted.kpiCards.total as Record<string, unknown>;

    const {
        footerType: _todayFooterType,
        targetValue: _todayTargetValue,
        ...legacyToday
    } = todayCard;
    persisted.kpiCards.today = legacyToday;

    const {
        footerText: _totalFooterText,
        footerType: _totalFooterType,
        ...legacyTotal
    } = totalCard;
    persisted.kpiCards.total = legacyTotal;

    const resolved = resolveOverviewModernDefaultConfig(persisted as unknown as typeof seed, seed) as typeof seed & {
        kpiCards: Record<string, Record<string, unknown>>;
    };

    assert.equal(resolved.kpiCards.today.footerType, "progress");
    assert.equal(resolved.kpiCards.today.targetValue, 5000);
    assert.equal(resolved.kpiCards.total.footerType, "text");
    assert.equal(resolved.kpiCards.total.footerText, "自建置起 2022 / 01 至今");
});

test("overview config preserves explicit KPI footer and visibility edits even when card geometry still matches legacy defaults", () => {
    const seed = createOverviewDisplayPageSeedConfig();
    const persisted = createOverviewDisplayPageSeedConfig();

    persisted.kpiCards.today = {
        ...persisted.kpiCards.today,
        footerType: "text",
        footerText: "操作員自訂說明",
        targetValue: 7200,
        visible: false
    };

    const resolved = resolveOverviewModernDefaultConfig(persisted, seed);

    assert.equal(resolved.kpiCards.today.footerType, "text");
    assert.equal(resolved.kpiCards.today.footerText, "操作員自訂說明");
    assert.equal(resolved.kpiCards.today.targetValue, 7200);
    assert.equal(resolved.kpiCards.today.visible, false);
});

test("overview KPI editor regions expose footer controls with visibleWhen wiring", () => {
    const todayRegion = overviewDisplayPageEditorRegions.find((region) => region.id === "overview-kpi-today");
    assert.ok(todayRegion, "expected overview-kpi-today region");

    const footerTypeField = todayRegion.fields.find((field) => field.path.join(".") === "kpiCards.today.footerType");
    const targetValueField = todayRegion.fields.find((field) => field.path.join(".") === "kpiCards.today.targetValue");
    assert.ok(footerTypeField, "expected footerType inspector field");
    assert.ok(targetValueField, "expected targetValue inspector field");
    assert.equal(footerTypeField.fieldType, "select");
    assert.equal(targetValueField.fieldType, "number");
    assert.deepEqual(targetValueField.visibleWhen, {
        equals: "progress",
        path: ["kpiCards", "today", "footerType"]
    });

    const totalRegion = overviewDisplayPageEditorRegions.find((region) => region.id === "overview-kpi-total");
    assert.ok(totalRegion, "expected overview-kpi-total region");
    const footerTextField = totalRegion.fields.find((field) => field.path.join(".") === "kpiCards.total.footerText");
    assert.ok(footerTextField, "expected footerText inspector field");
    assert.equal(footerTextField.fieldType, "text");
    assert.deepEqual(footerTextField.visibleWhen, {
        equals: "text",
        path: ["kpiCards", "total", "footerType"]
    });
});

test("overview seed config enables alert threshold rows by default and restores the toggle on legacy configs", () => {
    const seed = createOverviewDisplayPageSeedConfig() as ReturnType<typeof createOverviewDisplayPageSeedConfig> & {
        dashboardWidgets: Record<string, Record<string, unknown>>;
    };
    assert.equal(seed.dashboardWidgets.alertNotifications.alwaysShowThresholds, true);

    const persisted = createOverviewDisplayPageSeedConfig() as typeof seed;
    persisted.dashboardWidgets.alertNotifications = {
        ...persisted.dashboardWidgets.alertNotifications
    };
    delete persisted.dashboardWidgets.alertNotifications.alwaysShowThresholds;

    const resolved = resolveOverviewModernDefaultConfig(
        persisted as unknown as ReturnType<typeof createOverviewDisplayPageSeedConfig>,
        seed as unknown as ReturnType<typeof createOverviewDisplayPageSeedConfig>
    ) as typeof seed;

    assert.equal(resolved.dashboardWidgets.alertNotifications.alwaysShowThresholds, true);
});

test("overview alert notification widget region exposes the alwaysShowThresholds toggle", () => {
    const region = overviewDisplayPageEditorRegions.find(
        (entry) => entry.id === "overview-widget-alertNotifications"
    );
    assert.ok(region, "expected overview-widget-alertNotifications region");

    const thresholdField = region.fields.find(
        (field) => field.path.join(".") === "dashboardWidgets.alertNotifications.alwaysShowThresholds"
    );

    assert.ok(thresholdField, "expected alwaysShowThresholds field");
    assert.equal(thresholdField.fieldType, "toggle");
});