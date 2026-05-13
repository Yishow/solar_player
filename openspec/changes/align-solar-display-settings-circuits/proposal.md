## Why

`/settings/circuits` 有獨立的 CRUD 風險，和 MQTT 一樣不該和其他頁面混做，但它的風險類型是 form/list CRUD，不是 broker/topic status flow。把它獨立出來，可以專注處理 CRUD composition、message states 與 load failures。

## What Changes

- 只處理 `/settings/circuits` 對齊 `docs/reference/kuozui-green-fhd-html-prototype/html-pages/10-circuit-settings.html`。
- 保留 create、update、delete、load failure 與 message/error states。
- 驗證 form/list/action composition 與 CRUD smoke flow。

## Capabilities

### New Capabilities

- `circuit-settings-page-alignment`: 定義 `/settings/circuits` 的 prototype 對位與 CRUD 契約保留。

### Modified Capabilities

(none)

## Impact

- Affected specs: `circuit-settings-page-alignment`
- Affected code:
  - Modified:
    - `apps/web/src/pages/CircuitSettings/index.tsx`
    - `apps/server/src/routes/circuits.ts`
    - `apps/server/src/routes/circuits.test.ts`
  - New:
    - `apps/web/src/pages/CircuitSettings/` 下的 page-local CRUD mapping 檔案
    - `openspec/changes/align-solar-display-settings-circuits/specs/`
  - Removed:
    - (none)
