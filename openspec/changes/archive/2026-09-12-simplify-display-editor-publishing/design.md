## Context

在展示頁編輯器（DisplayPagesEditor）中，使用者進行卡片可見度、樣式調整時，發布流程受到兩重不合理的門禁限制：
1. 工具列發布按鈕被未儲存變更鎖死，且發布預檢將 `dirty` 標記為 `UNSAVED_BINDINGS`（未儲存的資料綁定），導致無法直接檢查並發布。
2. 後端發布預檢服務（`displayPagePublishingService`）將無用電迴路的 `overview` 納入 `ENERGY_PUBLISH_PAGES`，當電錶讀值超過 300 秒無 MQTT 更新時即判定 `ENERGY_PROFILE_INCOMPLETE` 阻擋發布。

## Goals / Non-Goals

**Goals:**
- 讓展示頁編輯器的「檢查並發布」操作支援自動儲存草稿，消滅兩段式手動存檔負擔與「還有未儲存的資料綁定」阻擋。
- 將 `overview` 自 `ENERGY_PUBLISH_PAGES` 中移出，使純展示型太陽能總覽頁面的視覺調整與廠區電錶連線狀態徹底解耦。

**Non-Goals:**
- 不取消包含工廠用電迴路的頁面（`factory-circuit`、`factory-circuit-guanyin`）對用電設定檔的檢查。
- 不改變 DataHub 既有的用電設定與計算核心。

## Decisions

### 1. 檢查並發布時自動儲存未存草稿

在 `DisplayPagesEditor` 工具列點擊「檢查並發布」時：
- 若 `dirty === true`，不再 disabled 反灰該按鈕，亦不在抽屜中顯示 blocking 錯誤。
- 點擊時由 `onPublishCheck` 自動先觸發 `handleSave()`，待草稿儲存完成（`dirty` 清除且後端 draft 更新）後，自動切換至 `rightTab = "publish"` 並觸發 `refresh()` 進行預檢。
- 如此一來，操作員只需點擊一次「檢查並發布」，系統即自動完成「儲存草稿 → 預檢 → 展開審查面板」。

### 2. Overview 頁面與廠區用電門禁解耦

在後端 `displayPagePublishingService.ts` 中：
- 將 `ENERGY_PUBLISH_PAGES` 調整為 `new Set(["factory-circuit", "factory-circuit-guanyin"])`。
- `overview` 頁面發布不再執行 `collectEnergyAuthoringFindings`，不再因電錶無資料或資料過期（`STALE_BOUNDARY`）而被判定為阻擋。
- 只有真正具有廠區用電迴路圖表的 `factory-circuit` 與 `factory-circuit-guanyin` 仍受廠區用電就緒狀態門禁保護。

## Implementation Contract

- **前端互動行為**：
  - `EditorToolbar` 頂部「檢查並發布」按鈕在 `!canEdit || isPublishing` 時 disabled，不再因 `dirty` 反灰。
  - 當有未儲存草稿時點擊「檢查並發布」，按鈕顯示「儲存並檢查中...」，自動呼叫儲存邏輯，成功後開啟發布抽屜。
  - 發布抽屜中不再出現 `[阻擋] 全域 · 還有未儲存的資料綁定。`。
- **後端服務行為**：
  - 發布 `overview` 頁面草稿時，預檢回傳中不再含有 `ENERGY_PROFILE_INCOMPLETE`。
  - `POST /api/display-pages/overview/validate` 與 `POST /api/display-pages/overview/publish` 在無廠區用電設定的情境下回傳 `canPublish: true`。
- **測試回歸**：
  - 更新既有測試對 `overview` 發布用電門禁的假定，將用電門禁測試改由 `factory-circuit` 或專屬迴路頁驗證。

## Risks / Trade-offs

- **[Risk] 使用者誤觸「檢查並發布」直接儲存了不想保留的編輯** → Mitigation: 工具列仍保留「復原」與「重新同步」按鈕，且「檢查並發布」只儲存草稿並打開檢查面板，仍需點擊抽屜內的「確認發布」才會正式寫入播放頁，操作安全有保障。
