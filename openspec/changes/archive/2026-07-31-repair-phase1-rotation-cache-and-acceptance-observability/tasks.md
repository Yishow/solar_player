## 1. Server rotation 求值路徑

- [x] 1.1 在 apps/server/src/routes/device-context-playback.test.ts（承載 /api/playback/runtime 路由測試的檔案）新增會失敗的測試：其一為「同一 published Profile Version 與同一 site scope 連續 50 次 GET /api/playback/runtime 後，readEffectiveRotationEvaluationCount() 只增加 1」，其二為「acceptance metrics 開啟時 if-none-match 命中回 304 仍帶出 x-solar-rotation-evaluations header」；執行 pnpm --filter @solar-display/server test src/routes/device-context-playback.test.ts 並確認兩者在改 source 前為 red。
- [x] 1.2 依「以帶 version 識別的 cache key 收斂兩條求值路徑」決策，於 apps/server/src/services/effectiveRotationCache.ts 的 EffectiveRotationCacheKeyParts 增加可選 profile version 識別欄位，並於 apps/server/src/services/displayRotationService.ts 新增走 effectiveRotationCache 的 published-version 求值入口，revision 依「revision 字串必須反映 readiness 與 freshness」決策由版本快照、readiness revision 與 freshness revision 組成，並依「revision 雜湊必須排除連續變動的欄位」決策在雜湊時排除 freshness 的 ageMs 與 mqtt 狀態的 updatedAt；以 task 1.1 第一個測試轉 green 驗證。
- [x] 1.3 改寫 apps/server/src/routes/playback.ts，使 desired-version 分支改呼叫 task 1.2 的快取入口，並把 acceptance metrics header 設定移到回傳 304 之前；以 task 1.1 兩個測試皆轉 green（執行 pnpm --filter @solar-display/server test src/routes/device-context-playback.test.ts）驗證。
- [x] 1.4 [P] 在 apps/server/src/config.ts 增加具名的 acceptance metrics 旗標讀取器，於 apps/server/src/config.test.ts 補上該讀取器的預設關閉與啟用兩個 case，並讓 apps/server/src/routes/playback.ts 改用該讀取器而不直接讀 process.env；以 pnpm --filter @solar-display/server test src/config.test.ts 驗證。

## 2. Acceptance harness 觀測面

- [x] 2.1 在 scripts/device-scoped-playback-load.test.mjs 新增會失敗的 evaluateAcceptanceThresholds 測試：Time Signal 涵蓋率或 heartbeat 涵蓋率小於 clients 時回報具名 failure；rotation 求值在 publish 後的成長量超過每 cohort 一次時回報具名 failure；執行 node --test scripts/device-scoped-playback-load.test.mjs 並確認為 red。
- [x] 2.2 為 Verify fifty paired Clients through public seams 依「harness 以 Server 讀回面與逐 Client 歸戶取代自我計數」決策修改 scripts/device-scoped-playback-load.mjs，使 Time Signal 改為每個 socket 各自計數並輸出涵蓋率欄位、heartbeat 以每台 Device 的 Server 讀回證據輸出涵蓋率欄位，並把兩個涵蓋率納入 evaluateAcceptanceThresholds 的必填 metric 與門檻檢查；以 task 2.1 的涵蓋率 cases 轉 green 驗證。
- [x] 2.3 為 Enforce bounded heartbeat, Time Signal, and rotation evaluation rates 依「rotation 求值次數取樣三次」決策修改 scripts/device-scoped-playback-load.mjs，在建立 cohort 的 sweep、publish Profile Version 之後與穩態視窗結束之後各取樣一次 x-solar-rotation-evaluations，門檻改為檢查各段成長量上界；以 task 2.1 的成長量 case 轉 green 驗證。
- [x] 2.4 [P] 將 scripts/device-scoped-playback-load.mjs 的 heartbeat 上限改寫為「spec cadence 上界 clients x (1 + floor(durationMs / HEARTBEAT_INTERVAL_MS))」加上「具名的 rollout lifecycle 額度 clients x 2」，並以註解說明該額度來自 harness 驅動 waiting 到 applied 所送的兩次心跳；數值上界維持與現行程式一致，不放寬也不收緊；以 node --test scripts/device-scoped-playback-load.test.mjs 全數通過驗證。

## 3. 文件與最終 gate

- [x] 3.1 [P] 更新 docs/ops/device-scoped-playback-test-matrix.md：JSON 欄位清單補齊 evaluateAcceptanceThresholds 目前的必填 metric、heartbeat 公式改為與程式一致、並載明 acceptance command 需要 playwright 與 chromium 的前置條件。
- [x] 3.2 [P] 更新 docs/ops/conventions.md 的指令表，補上 verify:device-scoped-playback 與 test:offline-playback-browser 兩個 root script。
- [x] 3.3 執行 node --test scripts/device-scoped-playback-load.test.mjs、pnpm test、pnpm build、pnpm verify 與 spectra analyze repair-phase1-rotation-cache-and-acceptance-observability 並回報實際輸出。verify 的 deploy stage 在本機為既有紅燈：以 stash 後的 clean tree 對照兩次，solar-device-agent 測試同樣逾時失敗，屬本 change 範圍外的既有問題；kiosk launcher restarts Firefox 測試的 2 秒硬性 timeout 與其自身 health 輪詢時間相當，在負載下會翻覆，單獨執行於本 change 與 clean tree 皆通過。兩者都不由本 change 的檔案觸及，須在回報中明確標示而非宣稱 gate 全綠。
