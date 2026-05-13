## Context

這個 change 對應 umbrella rollout 的 Management Batch B。`/settings/mqtt` 必須獨立處理，因為它不只是視覺密度高，還有 save/test/topic mapping/status feedback/error flow 等高風險互動契約。

## Goals / Non-Goals

**Goals:**

- 讓 `/settings/mqtt` 對齊 `docs/reference/kuozui-green-fhd-html-prototype/html-pages/09-mqtt-settings.html` 的區塊與資訊層級。
- 保留所有 load/save/test/status/error flows。
- 明確整理 broker status、topic rows 與 disabled state 的展示映射。

**Non-Goals:**

- 不處理其他 settings routes。
- 不變更 MQTT backend contract。

## Decisions

### Isolate the MQTT settings page as a dedicated high-risk change

這頁必須獨立驗證，不能和其他 settings 頁混包。

### Preserve MQTT save, test, and topic-mapping behavior before visual polish

任何視覺對位都不得犧牲現有 save/test/topic mapping 的行為準確性。

### Centralize MQTT display-state mapping

broker status、topic row runtime fields、error/loading/disabled state 需要集中定義，避免 JSX 分支爆炸。

## Implementation Contract

**Behavior**

- `/settings/mqtt` 完成後，應接近 `docs/reference/kuozui-green-fhd-html-prototype/html-pages/09-mqtt-settings.html` 的 layout。
- save/test/topic mapping/status/error flows 應保持可用且可觀察。

**Interface / data shape**

- 現有 settings-mqtt route payload 與 response shape 不變。
- page-local adapter 需定義 broker status、topic row、disabled state 的 display fields。

**Failure modes**

- 若 test connection 失敗卻沒有可見回饋，這個 change 視為失敗。
- 若 save/test 行為因視覺重構被吞掉，這個 change 視為失敗。

**Acceptance criteria**

- `pnpm --filter @solar-display/web build` 成功。
- `pnpm --filter @solar-display/server test -- src/routes/settings-mqtt.test.ts src/routes/settings-mqtt-save-regression.test.ts` 成功。
- 人工 smoke test save/test 成功與失敗各至少一組。

**Scope boundaries**

- In scope：`/settings/mqtt`、其 page-local status mapping、相關 smoke evidence。
- Out of scope：其他 settings routes 與 MQTT backend redesign。

## Risks / Trade-offs

- [如果這頁不獨立驗證] → 最容易在版面切換時漏掉真正重要的 error/status flow。
- [如果 display-state mapping 沒集中] → topic row 狀態最容易 drift。
