## Why

在 `26c5598e590c05d993833b3b890149657ede13ab` 的 review 中，已於隔離資料庫確認：來源仍被展示草稿引用、`readSourceImpact` 回報 `canMutate=false`，guided MQTT apply 仍能保存 `enabled=false` 並停用 mapping。一般來源編輯已有相依保護，導引入口不能成為繞過同一保護的另一條路。

## What Changes

- Guided 首次 apply 在交易內、寫入來源之前，檢查既有來源從啟用轉為停用，或變更目的 metricKey 的影響；使用目前資料庫中的來源與原目的身分，不相信客戶端的影響聲明。
- 有未解除的草稿、已發布頁面或衍生指標引用時，沿用 `E1_SOURCE_IN_USE`；影響無法查明時沿用 `E1_SOURCE_IMPACT_UNKNOWN`。Apply 回 HTTP 409，來源、mapping、audit、receipt 及 runtime subscription 都不得因拒絕而改動。
- 與一般來源編輯共用最小必要保護，涵蓋 preview 後才新增引用的情境；保留已提交請求的冪等重送與現有 ownership 防護。
- 預覽的 ownership-only 409 分類不擴張；本案的必要阻擋點是 apply，不把相依問題偽裝成保留名稱衝突。

## Capabilities

### New Capabilities

無。

### Modified Capabilities

- `guided-mqtt-tag-mapping`: 明確要求 destructive guided source apply 與既有來源管理使用一致、提交當下有效且拒絕零寫入的相依保護。

## Impact

主要範圍為 `apps/server/src/services/guidedMqttMappingService.ts`、`sourceImpactService.ts`、`routes/meter-sources.ts` 與相關 service/route tests；僅在需要保留既有錯誤回應時檢查 `routes/site-energy-profiles.ts`。規範依據為 `guided-data-source-onboarding` U2-R5 與 `guided-mqtt-tag-mapping` 的原子套用契約。

不新增資料表、API 欄位、強制解除引用按鈕、跨站相依模型或訂閱協定；不改頁面內容、不自動解除綁定、不放寬安全規則。無需新套件。此案可獨立於 `fix-reviewed-power-event-ordering` 實作。

Review 與成功重現的界線見 `docs/reviews/2026-09-08-mqtt-runtime-safety-review.md` F1；本提案未實作修復。
