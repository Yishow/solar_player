## Context

這個 change 對應 umbrella rollout 的 Management Batch C。`/settings/circuits` 主要風險在 CRUD flow 與 form/list/action hierarchy，而不是 MQTT 式的 broker/topic status flow，因此獨立成自己的 CRUD-focused change。

## Goals / Non-Goals

**Goals:**

- 讓 `/settings/circuits` 對齊 `docs/reference/kuozui-green-fhd-html-prototype/html-pages/10-circuit-settings.html` 的 form/list/action composition。
- 保留 create、update、delete、load failure 與 message states。

**Non-Goals:**

- 不處理 `/settings/mqtt`。
- 不處理 monitoring pages。
- 不變更 circuits API schema。

## Decisions

### Treat circuit settings as a CRUD-focused standalone change

這頁的驗證重點是 CRUD 與 message states，應獨立處理。

### Preserve circuit CRUD behavior before density tuning

互動契約必須先固定，再談更細的 FHD 資訊密度。

## Implementation Contract

**Behavior**

- `/settings/circuits` 完成後，表單分區、迴路列表與 action hierarchy 應接近 prototype。
- create、update、delete、load failure 與 message states 仍應可用。

**Interface / data shape**

- 現有 circuits route payload 與 response shape 不變。
- page-local mapping 可整理 CRUD display fields，但不得改變 API contract。

**Failure modes**

- 若 CRUD 行為因版面變更而只更新前端假狀態，這個 change 視為失敗。
- 若 load failure 沒有可見訊息，這個 change 視為失敗。

**Acceptance criteria**

- `pnpm --filter @solar-display/web build` 成功。
- `pnpm --filter @solar-display/server test -- src/routes/circuits.test.ts` 成功。
- 人工 smoke test create、update、delete、load failure。

**Scope boundaries**

- In scope：`/settings/circuits` 與其 CRUD smoke verification。
- Out of scope：其他 settings 頁與 circuits backend redesign。

## Risks / Trade-offs

- [如果 CRUD smoke 沒跑] → 這頁最容易出現 UI 看起來對但互動壞掉。
- [如果把這頁和其他高風險頁混做] → regression 訊號會被稀釋。
