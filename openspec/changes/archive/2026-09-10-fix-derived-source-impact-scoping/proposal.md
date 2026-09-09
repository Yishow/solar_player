## Why

Review 自 `8323c33c12464adf1b5f42670d82d4fe7ae03a7c` 至 `5f68fa4c574e0176420440a9bfe409da1e727766` 確認：source impact 的 derived-input 分支只比對 metricKey，忽略 scope selector 與 owning definition 的 siteScopes。經正式 registry save 建立的 KN-only 公式，會把 CL 同名來源也判為使用中，阻止本來安全的停用或改名；先前 draft scope 修復沒有涵蓋這個分支。

## What Changes

- 以 metricKey 與衍生輸入的有效 scope 集合判定來源相依；明確 cl、kn、global 不互相阻擋。
- `output-site` 依 owning definition 的 siteScopes 展開；省略時維持 CL、KN，all 查詢保留全部有效相依。
- 無法解讀必要的衍生 scope 證據時維持 unknown/fail-closed，不把損壞資料當成沒有相依。
- Direct 與 guided first mutation 沿用同一 guard，保留相同 scope 的阻擋、commit-time 重查、拒絕零副作用及原有 idempotency 語意。

## Capabilities

### New Capabilities

無。

### Modified Capabilities

- `guided-data-source-onboarding`: 補足 derived source dependencies 的有效 scope 比對契約與雙寫入路徑回歸情境。

## Impact

主要影響 `apps/server/src/services/sourceImpactService.ts`、既有 derived scope 解析責任及相鄰 service/route tests。讀取既有 `derived_metric_inputs` 與 `derived_metric_definitions`；不新增資料表、API 欄位、依賴套件或部署設定。

本案不改公式求值、來源目的身分保留規則、disabled definition 的既有相依政策、draft/live parser、會計 profile、MQTT 訂閱或畫面。報告與重現證據見 `docs/reviews/2026-09-09-source-mutation-followup-review.md` 的 R1。這是規劃文件，不代表缺陷已修復。
