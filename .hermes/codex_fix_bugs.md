修復 3 個已知 bug 並完成 `strengthen-display-page-publishing-and-safety` 剩餘 tasks。

工作目錄：/Users/yishow/prj/solar_player/

## Bug 1：Rollback 查錯 table（Test 9 - 500 instead of 404）
檔案：apps/server/src/services/displayPagePublishingService.ts
問題：`rollbackToVersion` 函數查詢 `display_page_publish_history.config_json`，但 migration 007 的 history table 沒有 `config_json` 欄位。
修法：改為從 `display_page_stage_configs` 查詢歷史版本的 config。具體做法：
- 讀取 history row 取得 version 和 source_version
- 用 source_version 查 `display_page_stage_configs` 的 `page_key` 和 `stage='live'` 拿到 config_json
- 或者直接在 migration 007 加 `config_json` 欄位到 history table（推薦，更直覺）

## Bug 2：Rollback version 計算錯誤（Test 7 - 2 !== 3）
檔案：apps/server/src/services/displayPagePublishingService.ts:234
問題：rollback 時直接用 `targetVersion` 作為新 live 的 version，應該用 `currentLive.version + 1`。
修法：先讀取當前 live version，用 `newVersion = currentLive.version + 1`，rollback history 紀錄的 source_version 仍為 targetVersion。

## Bug 3：Test 隔離污染（Test 13 - live config 殘留）
問題：Test 13 validate 測試中，live config 應為空但殘留了 `{ heroCopyLayout: { left: 120 } }`。
原因：Test 4（PUT draft saves draft without affecting live）使用 overview/draft，Test 13 也用 overview，但 Test 6（publish）可能已把 overview 的 draft publish 成 live。
修法：確保 Test 13 用不同的 page（如 factory-circuit）或確保每次 test 都重新 migrateDatabase() + seedDatabase()。查看 test 程式碼，確認每個 test 都有獨立 DB。

## Tasks 待完成

### Task 2.2：Editor 顯示 validation results
- 在 DisplayPagesEditor/index.tsx 加入 publish blocking state 顯示
- 當 draft 有 blocking findings 時，UI 顯示錯誤訊息並禁止 publish
- 新增測試到 DisplayPagesEditor/index.test.tsx

### Task 3.1：useDisplayPageConfig 整合 fallbackPolicy
- hook 要能讀取並回傳 live config 的 fallbackPolicy
- 測試：useDisplayPageConfig.test.ts

### Task 3.2：Management API 回傳 fallback status
- 新增 GET /api/display-pages/:pageId/fallback 或整合到现有 route
- 在 publishing status UI 顯示 fallback policy 狀態

## 執行步驟
1. 先修 Bug 1（migration 補欄位或改 service 查詢）
2. 修 Bug 2（version 計算）
3. 修 Bug 3（測試隔離）
4. 跑 `pnpm --filter @solar-display/server test -- src/routes/display-pages.test.ts` 確認全部通過
5. 完成 Task 2.2、3.1、3.2
6. 跑 `pnpm --filter @solar-display/web test`
7. 跑 `pnpm run build`
8. 更新 tasks.md 所有 checkbox 為 - [x]
9. git commit 每個 fix，用 Traditional Chinese commit message

## 約束
- 不修改 AGENTS.md、CLAUDE.md、deploy/、package.json、lockfile
- 不新增依賴
- 測試失敗不可用 .skip 或 disabled
- 所有 .ts 檔案不得超過 400 行
