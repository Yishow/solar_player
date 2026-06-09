## 1. Shared freshness 回報 required-data presence

- [x] 1.1 在 packages/shared/src/displayPageFreshness.test.ts 新增測試案例:當頁面所有 required metric 皆有讀數但至少一筆 timestamp 超過 freshness window 時，評估結果的 required-data presence 旗標為 true 且 fresh 為 false；當任一 required metric 在 snapshot 缺席時，presence 為 false 且 fresh 為 false。先執行 `npx tsx --test packages/shared/src/displayPageFreshness.test.ts` 確認新案例失敗(red)。
- [x] 1.2 實作 requirement「Evaluate page runtime freshness over the page's required metrics」:在 packages/shared/src/displayPageFreshness.ts 的 evaluatePageRuntimeFreshness 回傳值新增 required-data presence 旗標(語意：每個 requiredMetricKey 在 metrics 中皆有一筆讀數時為 true，與是否新鮮無關)，且不改動既有 fresh、stalestMetricKey、stalestTimestamp 的行為。驗證：`npx tsx --test packages/shared/src/displayPageFreshness.test.ts` 全綠且 `pnpm run build` 通過。

## 2. 文件化 staleData 語意

- [x] 2.1 [P] 在 packages/shared/src/displayPageConfig.ts 的 displayPageFallbackPolicyByTemplateKey 加上註解，說明 staleData 的 hide 僅適用於 never-had-data；曾有資料的 transient staleness 一律續播。此任務不更動任何 policy 列舉值。驗證：內容審閱確認註解存在且值未變，並 `pnpm run build` 通過。

## 3. Rotation gate 韌性判定

- [x] 3.1 實作 requirement「Rotation uses per-page freshness instead of the global latest timestamp」:在 apps/server/src/services/displayRotationService.ts 的 runtime-data 判定改以 (fresh, required-data presence) 決策：當 live-data 頁所需 metric 皆有讀數但至少一筆過期(transient outage)時，該頁留在 playablePages、不回傳 skip、不帶 stale-runtime；當任一所需 metric 從未有讀數時，維持以 stale-runtime 將該頁排除。mock-mode 分支與 readiness(mapping/binding)判定不更動。驗證：第 4 組 server 測試中 rotation-preview 的韌性案例與 never-had-data 排除案例皆綠燈。

## 4. 契約測試更新與整體驗證

- [x] 4.1 [P] 更新 apps/server/src/routes/display-pages.test.ts 中 rotation-preview 相關案例:把「模擬資料過期即期待 stale-runtime skip」改為斷言「所需 metric 皆有讀數但過期」的 live-data 頁仍出現在 playablePages 且未被 skip；另新增/調整一個「缺所需 metric」情境，斷言該頁以 stale-runtime 被排除。既有斷言 staleData 值為 hide 的案例維持不變。驗證：`pnpm --filter @solar-display/server test` 全綠。
- [x] 4.2 [P] 更新 apps/server/src/routes/display-ops.test.ts 與 apps/server/src/routes/playback.test.ts 中依賴「過期即 skip」的案例:改用 never-had-data(缺所需 metric)觸發 stale-runtime skip，或改為斷言過期頁仍可播。驗證：`pnpm --filter @solar-display/server test` 全綠。
- [x] 4.3 整體回歸:確認 `pnpm --filter @solar-display/server test`、`pnpm --filter @solar-display/web test` 全綠，且 `pnpm run build` 通過。驗證：三道指令輸出皆成功且無失敗測試。
