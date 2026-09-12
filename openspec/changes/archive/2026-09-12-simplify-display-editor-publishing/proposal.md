## Summary

簡化展示編輯器（Display Pages Editor）的儲存與發布檢查流程：消滅「還有未儲存的資料綁定」與「廠區用電設定尚未完成」兩道不合理的發布阻擋。在點擊「檢查並發布」時若有未存變更自動儲存草稿；並將無用電迴路圖表的 Overview（總覽）頁面從廠區用電門禁中解耦，讓使用者調整卡片顯示與外觀時能一鍵順暢發布。

## Motivation

使用者在「展示編輯」頁進行日常維護（如將兩張卡片設為不顯示、調整卡片透明度或文字）時，面臨嚴重的發布摩擦與體驗阻礙：
1. **未儲存草稿被生硬名詞阻擋**：調整卡片後若直接進行發布檢查，系統跳出晦澀的 `[阻擋] 全域 · 還有未儲存的資料綁定。`，強迫操作員先手動點擊「儲存草稿」、等待存檔完成，再手動點擊「檢查並發布」，流程冗贅繁瑣。
2. **無關頁面被電錶連坐阻擋**：Overview 頁面僅顯示太陽能即時發電、累計發電量與天氣資訊，完全無廠區用電迴路或部門占比。然而後端將 Overview 硬納入 `ENERGY_PUBLISH_PAGES`，且判定用電完成要求「5 分鐘內必須有 MQTT 新鮮讀值」。一旦現場或本機超過 5 分鐘無即時電錶串流（`STALE_BOUNDARY`），即被判定為 `[阻擋] 全域 · 廠區用電設定尚未完成。`，導致任何單純的畫面維護皆被鎖死無法發布。

## Proposed Solution

1. **檢查並發布自動儲存草稿**：
   - 調整展示編輯器頂端工具列與發布互動，當 `dirty === true` 時，「檢查並發布」按鈕維持可用；點擊時自動先儲存草稿，存檔完成後直接無縫開啟「發布檢查」抽屜進行預檢，消滅因草稿未存而產生的 `UNSAVED_BINDINGS` 阻擋提示。
2. **解除 Overview 的廠區用電發布門禁**：
   - 在後端發布驗證服務中，將 `overview` 自 `ENERGY_PUBLISH_PAGES` 中移出，僅保留真正具有廠區迴路與用電計算的 `factory-circuit` 與 `factory-circuit-guanyin`。
   - Overview 頁面的任何卡片顯示、樣式調整與文字修改發布不再受廠區電錶連線狀態或時效干擾。

## Non-Goals (optional)

- 不取消 `factory-circuit` 與 `factory-circuit-guanyin` 對廠區用電設定（`site_energy_profiles`）的必要審核。
- 不改動後端真實用電計算與 DataHub 廠區用電設定導引核心。

## Alternatives Considered (optional)

- **保留 Overview 門禁但放寬時效**：仍要求電錶設定但允許過期讀值。但 Overview 本身無用電迴路，牽連用電設定違背第一性原理，因此排除。
- **保留手動兩段式儲存僅改提示文字**：仍要求使用者先儲存再發布。此舉未真正降低操作摩擦，依然造成繁瑣體驗，因此排除。

## Impact

- Affected specs: `display-editor-staged-loading`, `guided-site-energy-setup`
- Affected code:
  - Modified:
    - `apps/web/src/pages/DisplayPagesEditor/index.tsx`
    - `apps/web/src/pages/DisplayPagesEditor/EditorToolbar.tsx`
    - `apps/server/src/services/displayPagePublishingService.ts`
    - `apps/server/src/routes/site-energy-readiness-publishing.test.ts`
  - New: none
  - Removed: none
