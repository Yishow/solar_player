## Problem

Server 全量測試有 13 個可在 change 前基線 `a8efa55` 重現的失敗。失敗 expectation 仍使用舊 Sustainability 換算預設值、舊的全域 cumulative generation 來源，或把已存在但公式輸入不足的卡片誤判為 missing topic；這使任何無關 change 都無法通過 `pnpm test` 與 `pnpm verify`。

## Root Cause

commit `42877f2` 已將正式 Sustainability 預設值更新為 0.467／0.16／13／400／4.5，但 `sustainability-calculation-settings` spec 與部分 household、Sustainability、Card Data 測試仍保留 0.495／2.6／4／120／5 的舊 expectation。另有測試未依既有 `chungli-household-equivalent-alignment` 與 `sustainability-factory-scope-by-playback-settings` 契約建立 factory summary／playback scope fixture，因而期待已不再使用的 global cumulative provenance。

## Proposed Solution

- 將 `sustainability-calculation-settings` 的 recommended defaults 契約同步為目前已交付且 migration 保證的 0.467／0.16／13／400／4.5。
- 逐一把 13 個失敗測試改成自足 fixture：需要測 factory aggregate 時明確建立 scope 與 summary；需要測日用電、碳係數或樹木係數時明確設定係數；需要測 unavailable/missing-topic 時移除正確的 runtime 依賴。
- 保留現行 household、Sustainability 與 Card Data runtime 行為；只有當測試揭露程式違反既有 spec 時才做最小 source fix。

## Non-Goals

- 不改 Playback Profile、registry 或 migration schema。
- 不回滾 commit `42877f2` 的台灣場域預設值。
- 不改前端畫面、API response shape、MQTT topic 或 factory scope 規則。
- 不以批次替換 expected literals 取代逐案例 fixture/provenance 驗證。

## Success Criteria

- 原 13 個 baseline failures 全部通過，且測試名稱與 assertion 仍能表達對應既有 spec 行為。
- `sustainability-calculation-settings` spec、migration/service defaults 與測試使用同一組 recommended defaults。
- focused household/Sustainability/Card Data tests、完整 server/web suites、build 與 `pnpm verify` 全部通過。
- 修復後可返回 `default-playback-profile-compatibility` 完成其 task 3.2。

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `sustainability-calculation-settings`: 將 recommended defaults 更新為目前 migration、service 與 operator runbook 已採用的台灣場域值。

## Impact

- Affected specs: sustainability-calculation-settings
- Affected code:
  - Modified: `openspec/specs/sustainability-calculation-settings/spec.md`
  - Modified: `apps/server/src/services/householdEquivalenceService.test.ts`
  - Modified: `apps/server/src/services/sustainabilityStoryService.test.ts`
  - Modified: `apps/server/src/routes/display-card-data.test.ts`
  - Modified: `apps/server/src/routes/sustainability-story.test.ts`
  - Modified only if an existing spec violation is reproduced: `apps/server/src/services/householdEquivalenceService.ts`, `apps/server/src/services/sustainabilityStoryService.ts`, `apps/server/src/services/displayCardDataService.ts`
