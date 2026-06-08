import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { AlertNotificationsWidget } from "./AlertNotificationsWidget";

test("AlertNotificationsWidget renders four threshold rules when alwaysShowThresholds is enabled", () => {
    const markup = renderToStaticMarkup(
        <AlertNotificationsWidget
            alerts={[]}
            {...({ alwaysShowThresholds: true } as { alwaysShowThresholds: boolean })}
        />
    );

    assert.match(markup, /即時功率過高/);
    assert.match(markup, /逆變器溫度過高/);
    assert.match(markup, /電網電壓異常/);
    assert.match(markup, /通訊中斷/);
    assert.doesNotMatch(markup, /無警示/);
});

test("AlertNotificationsWidget keeps threshold rules visible alongside live alerts", () => {
    const markup = renderToStaticMarkup(
        <AlertNotificationsWidget
            alerts={[
                {
                    detail: "共享故事缺少今日發電量",
                    id: "metric-todayGeneration",
                    title: "故事版今日發電量",
                    tone: "warning"
                }
            ]}
            {...({ alwaysShowThresholds: true } as { alwaysShowThresholds: boolean })}
        />
    );

    assert.match(markup, /即時功率過高/);
    assert.match(markup, /故事版今日發電量/);
    assert.ok(
        markup.indexOf("故事版今日發電量") < markup.indexOf("即時功率過高"),
        "expected live alerts to appear before threshold reminders"
    );
    assert.equal((markup.match(/overview-alert-item/g) ?? []).length, 4);
});