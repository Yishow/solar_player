## 1. ViewModel 資料暴露

- [x] 1.1 在 apps/web/src/pages/Overview/viewModel.ts 暴露警示項目列表（取自既有 `displayStoryService` alertTone/fallbackReason 與 device readiness findings），先寫失敗測試再實作；無警示時回傳空列表。對應 design「警示通知 widget 綁定既有警示來源」。

## 2. 發電趨勢 widget（spec：Overview generation trend widget renders from runtime data；design：發電趨勢 widget 綁定既有 metrics history 與 runtime trendSeries）

- [x] 2.1 [P] 在 apps/web/src/pages/Overview/widgets/overviewWidgets.test.tsx 先寫發電趨勢 widget 失敗測試：有 runtime 趨勢資料時以該序列渲染、無資料時顯示空狀態、不渲染 mock。
- [x] 2.2 [P] 實作 apps/web/src/pages/Overview/widgets/GenerationTrendWidget.tsx，綁 Overview runtime `trendSeries`／`GET /api/metrics/history` 趨勢資料使測試通過。滿足 spec requirement「Overview generation trend widget renders from runtime data」。

## 3. 警示通知 widget（spec：Overview alert notifications widget renders from existing alert sources）

- [x] 3.1 [P] 在 apps/web/src/pages/Overview/widgets/overviewWidgets.test.tsx 補警示通知 widget 失敗測試：有警示時列出 runtime 警示、無警示時顯示「無警示」空狀態、不渲染 mock。
- [x] 3.2 [P] 實作 apps/web/src/pages/Overview/widgets/AlertNotificationsWidget.tsx，綁任務 1.1 暴露的警示列表使測試通過。滿足 spec requirement「Overview alert notifications widget renders from existing alert sources」。

## 4. Config region 與預設隱藏（spec：Dashboard widgets are editable regions that default to hidden；design：兩 widget 註冊為預設隱藏的可編輯 region）

- [x] 4.1 在 apps/web/src/pages/Overview/displayPageConfig.ts 為兩 widget 各加一個 `overview-widget-*` 可編輯 region（geometry 路徑 + 顯示/隱藏 toggle 欄位），seed 兩者 `visible: false`；缺省 visibility 視為隱藏；更新對應 config/seed/region 測試斷言。滿足 spec requirement「Dashboard widgets are editable regions that default to hidden」。

## 5. Runtime 渲染串接

- [x] 5.1 在 apps/web/src/pages/Overview/index.tsx 依各 widget 的 `visible` 旗標渲染 GenerationTrendWidget 與 AlertNotificationsWidget（`visible === true` 才顯示；缺省視為隱藏），未啟用時不出現於 playback。

## 6. 驗收

- [x] 6.1 確認範圍邊界：未新增三相電力 widget／資料源、未做 auto-reflow、未改 shared header/footer 與底部導覽；隱藏 widget 仍走既有版面安全驗證。
- [x] 6.2 執行 `pnpm --filter @solar-display/web test` 與 `pnpm run build`，確認全綠、exit 0，且 design Implementation Contract 達成。
