## Problem

現行程式已具備 `SiteEnergyProfileV2` 型別、工程日報儲存、期間彙總與 `/api/data-hub/engineering-results`，但正式 profile preview/apply、projection、readiness 與歷史 consumer 仍只接受 V1 physical meter profile。這使 EPR-R6 的 V2 engineering provider 無法真正套用，工程期間成果也無法成為正式會計來源。

## Root Cause

`siteEnergyProfileService`、profile repository、source snapshot、period consumption 與 readiness 介面都把 `SiteEnergyProfileV1` 和 physical meter evidence 當成唯一輸入；工程結果則停在獨立 route summary。資料庫雖可保存 `schema_version` 與 JSON 欄位，現有讀寫路徑沒有 versioned profile union、engineering source snapshot 或 provider revision fingerprint，因此直接傳入 V2 會在錯誤的層級失敗，或迫使 consumer 猜測／降級。

## Proposed Solution

- 依既有 `engineering-period-results` EPR-R6 建立 typed engineering period provider，輸出 requested period、quality、coverage、missing engineering IDs 與 deterministic revision fingerprint，並只讀 effective report heads。
- 依既有 `site-energy-accounting-profiles` 契約讓 KN profile preview/apply 可保存並重讀 V2 engineering member refs；套用前驗證 sourceRef、engineeringId、mode、review/enabled 狀態、非重疊 membership 與 preview-time provider snapshot。
- 依既有 `consumption-history-projections` 契約讓 common period projection/readiness 依 active profile schema 與 providerKind 分流；V1 physical 計算維持 byte-compatible，V2 engineering 結果不得偽造 meter rows、不得回退到 raw meter 或 lifetime counter。
- 所有尚未支援 V2 的 consumer 都在可辨識的 profile-version boundary 明確失敗；management history 與 readiness 支援後才可宣稱 V2 ready。
- 沿用既有 versioned profile JSON、preview token 與 generic projection result/context 欄位，補齊 repository/service tests、route tests 與 consumer contract tests，覆蓋 apply、restart readback、correction/withdrawal、missing identity、overlap、stale preview 與 V1 regression。

## Non-Goals (optional)

- 不修改 MQTT engineering admission、日報 wire schema 或八工程 identity 清單。
- 不把工程 ID 寫成 E1 physical meter/channel，也不從工程期間 kWh 產生 `factoryCircuit.*Power`。
- 不重新設計 Data Hub 或 display editor UI；本 change 只提供可被現有管理面消費的正式 runtime contract，並在管理面 UI (`SiteEnergySetupPanel` / `SiteEnergyPreviewReview`) 補齊對 V2 engineering profile 的防禦性 fail-closed 提示與唯讀安全容錯，防止在既有管理介面下因 schema 不匹配而產生未捕獲例外。
- 不混合 physical 與 engineering provider；跨 provider 合併需另有明確的非重疊會計設計。

## Success Criteria

- KN V2 engineering profile 可經 preview/apply 原子保存，重啟後仍以相同 schema、members、revision 與 effectiveFrom 讀回；CL V1 profile 的資料與計算不變。
- preview token 綁定每個 referenced engineering source 的 configuration revision 與期間結果 fingerprint；來源、head revision 或 membership 改變後，apply 以 409 且零 profile write 拒絕。
- day/month/year/explicit period 透過同一 typed provider 回傳工程合計、每工程值、quality、coverage、missing IDs 與 fingerprint；correction、withdrawal 與 partial coverage 會更新或降級結果，不沿用舊 final。
- V2 readiness 只有在 profile membership 已審查且 requested period 的 expected identities 完整可用時為 ready；缺值不補零，也不回退到 physical history。
- 不支援 V2 的 consumer 回傳明確、可測試的 unsupported-version/domain failure；不得靜默當作 V1。
- 最終版本通過 focused tests、`pnpm verify` 與 `git diff --check`。

## Impact

- Affected specs: none；本 change 修復既有 EPR-R6、E6 與 E3 契約的實作缺口，不改變 capability-level observable requirements。
- Affected code:
  - Modified: `packages/shared/src/siteEnergyProfile.ts`
  - New: `packages/shared/src/siteEnergyProfileV2.ts`
  - Modified: `packages/shared/src/engineeringPeriodResults.ts`
  - Modified: `packages/shared/src/index.ts`
  - Modified: `apps/server/src/services/siteEnergyProfileRepository.ts`
  - Modified: `apps/server/src/services/siteEnergyProfileService.ts`
  - New: `apps/server/src/services/profilePreviewEvidence.ts`
  - Modified: `apps/server/src/services/profileSourceSnapshot.ts`
  - Modified: `apps/server/src/services/profileReadiness.ts`
  - Modified: `apps/server/src/services/profileReadinessService.ts`
  - Modified: `apps/server/src/services/periodConsumptionService.ts`
  - New: `apps/server/src/services/accountingPeriodService.ts`
  - New: `apps/server/src/services/dailyConsumptionPointsService.ts`
  - Modified: `apps/server/src/services/engineeringReportService.ts`
  - New: `apps/server/src/services/engineeringAccountingPeriodService.ts`
  - Modified: `apps/server/src/services/consumptionProjectionService.ts`
  - Modified: `apps/server/src/services/DailySummaryService.ts`
  - Modified: `apps/server/src/routes/metrics-history.ts`
  - Modified: `apps/web/src/pages/DataHub/SiteEnergySetupPanel.tsx`
  - Modified: `apps/web/src/pages/DataHub/SiteEnergyPreviewReview.tsx`
  - New or modified tests: focused shared/server profile, engineering provider, route, history and readiness test files adjacent to the modules above, and web setup panel tests
  - Removed: none
