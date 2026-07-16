## Why

目前「裝置狀態」已呈現 CPU load、記憶體與磁碟摘要，但缺少 Pi 5 主機溫度與風扇的可信狀態，也沒有把所有資源欄位明確約束為低成本、按需更新。維運人員需要在同一頁快速判斷過熱、風扇異常或資源壓力，同時避免為監控本身增加常駐程序、資料庫寫入或高頻輪詢。

## What Changes

- 擴充既有 `/api/device/status`，回傳實際量測的 Pi 5 系統溫度、CPU、記憶體、磁碟與風扇狀態。
- 溫度與風扇優先讀取 Linux `/sys` 暴露的低成本來源；風扇有 RPM 時回傳 RPM，只有 cooling state 時回傳運轉狀態與 state。
- 無法讀取、硬體不支援或權限不足時回傳明確 unavailable，不使用固定值或推測值。
- 裝置狀態頁在既有載入與刷新流程中更新這些欄位，不新增背景採集器、MQTT 訊息、資料庫持久化或高頻輪詢。
- 以 server route 與 web view-model/rendering focused tests 覆蓋可用及不可用狀態。

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `device-status-runtime-telemetry`: 擴充可信 runtime telemetry 契約，納入 Pi 5 溫度、CPU、記憶體、磁碟與風扇狀態，並要求以低資源的按需方式更新。

## Impact

- Affected specs: `device-status-runtime-telemetry`
- Affected code:
  - Modified:
    - `apps/server/src/routes/device.ts`
    - `apps/server/src/routes/device.test.ts`
    - `apps/web/src/services/api.ts`
    - `apps/web/src/pages/DeviceStatus/viewModel.ts`
    - `apps/web/src/pages/DeviceStatus/viewModel.test.ts`
    - `apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx`
    - `apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx`
  - New: none
  - Removed: none
- API: `/api/device/status` 的 response 新增 nullable 的 temperature 與 fan telemetry，既有欄位保持相容。
- Runtime: 僅在既有 API 請求發生時讀取 `/proc`、`/sys` 與 filesystem stats，不新增常駐採集工作。
