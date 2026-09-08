## Why

2026-09-08 review 發現廠區設定的正式 preview API 沒有接上計算器，因此即使資料完整，介面仍顯示「尚無差值」。新設定是否 ready 又取決於是否改動分母下拉選單，而不是設定與資料的實際狀態，會造成錯誤的完成提示或發布阻擋。

## What Changes

- R9：正式 preview route 使用後端驗證並凍結的草稿／來源快照，計算總量、部門分子、共同分母、占比與品質；前後端共用明確回應契約。
- R10：後端依結構、審查與資料證據決定 incomplete、configured-awaiting-data 或 ready；保留預設分母不影響正確完成，切換選項也不能偽造 ready。
- 保留目前預覽 token、來源快照、版本衝突及重試不重複套用的保護，補上從全新設定起走完正式畫面的驗收。

## Capabilities

### New Capabilities

無。

### Modified Capabilities

- `site-energy-accounting-profiles`：补強正式 API 的計算預覽契約與後端權威 readiness。
- `guided-site-energy-setup`：補強預設分母、新設定完成路徑與等待資料的真實提示。

## Impact

涉及 `routes/site-energy-profiles.ts`、`siteEnergyProfileService.ts`、來源快照與期間計算服務、shared profile 型別、web `SiteEnergySetupPanel.tsx` 及讀取設定狀態的發布檢查。優先沿用既有公開 API，避免另開與正式計算不同的「示意預覽」。

## Review Baseline and Evidence

包含起點 `8323c33c12464adf1b5f42670d82d4fe7ae03a7c`，review head 為 `eebfc62e5c08cb58770e060d23b471ac6420673a`。證據與驗證界限見 `docs/reviews/2026-09-08-energy-authoring-review.md` 的 R9–R10。

## Dependencies and Non-goals

數值契約與 `fix-energy-period-consumer-consistency` 共用同一套期間／占比計算；有現成合格電錶時，不必等待 MQTT 接入提案才可進行 UI 與 profile 測試。不得為預覽建立假的正式 revision、回填基準、發送 MQTT，或寫入正式歷史與投影。預覽 token 的必要儲存不視為正式資料變更。本次依使用者指示進入 apply；使用者驗收後才 archive，commit 另行確認。
