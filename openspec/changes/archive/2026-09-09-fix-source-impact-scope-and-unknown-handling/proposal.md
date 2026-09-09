## Why

最新 main `abd99ba846c25de35100229452e17e2442552a10` 的來源影響檢查會把 KN 草稿的同名指標當成 CL 依賴，也會把無法解析的草稿當成沒有依賴。兩項都已在隔離資料庫重現，分別造成合法操作被誤擋與未知風險被放行；詳見 `docs/reviews/2026-09-09-source-runtime-followup-review.md` 的 D1、D2。

## What Changes

- 草稿依賴依目的地的 scope 與 metricKey 判定；明確綁定另一廠區不阻擋目前來源，繼承裝置與舊版缺省 scope 保守處理。
- 區分有效空草稿與無法判讀的草稿；後者沿用 unknown impact 與 `E1_SOURCE_IMPACT_UNKNOWN`，不可冒充空集合。
- 兩個既有來源寫入入口共用相同判斷，保留拒絕零寫入與 registered expectations 不阻擋的契約。
- 補上 cross-scope、損壞 JSON／結構、有效空值與兩入口的回歸測試。

## Capabilities

### New Capabilities

無。

### Modified Capabilities

- `guided-data-source-onboarding`: 明確補齊草稿依賴的 scope 比對與解析失敗之未知影響契約。

## Impact

主要影響 `apps/server/src/services/sourceImpactService.ts` 與既有來源管理／導引 apply 測試。保留 API 欄位、HTTP 錯誤分類、權限與 destructive-transition 觸發條件；不新增資料表、不修改主規格、不修復或覆寫使用者的草稿內容。

本案不改 live usage 的一般容錯顯示、不重構 derived registry、不加入 profile 相依管理，也不重做已歸檔的 registered expectation 分流。可獨立於另兩個 runtime 修復案實作；本階段僅建立規劃文件。
