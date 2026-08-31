## 1. 打開涵蓋範圍

- [x] 1.1 依「Web runner 以多個 glob 涵蓋所有測試檔命名形式」，讓 `apps/web/scripts/run-tests.mjs` 的 `buildTestRunnerArgs` 在 argv 未指定 target 時同時涵蓋 `src/**/*.test.ts` 與 `src/**/*.test.tsx`，明確指定 target 時的行為不變。此時 53 個 `.test.tsx` 開始被執行，預期出現 6 個失敗——這是預期結果，由第 2 組任務修正。驗證：在 `apps/web/scripts/run-tests.test.mjs` 加入斷言涵蓋預設 target 同時包含兩種副檔名、以及明確 target 覆寫預設，並以 `node --test apps/web/scripts/run-tests.test.mjs` 確認通過。
- [x] 1.2 依「`packages/shared` 取得自己的測試入口與 verify stage」，為 `packages/shared` 新增 tsx 開發相依與 `test` script，並新增 `packages/shared/scripts/run-tests.mjs`，比照 `apps/web/scripts/run-tests.mjs` 的形式（含 win32 以 cmd.exe 包裝 tsx），預設 target 同時涵蓋 `src/**/*.test.ts` 與 `test/**/*.test.ts`。驗證：`pnpm --filter @solar-display/shared test` 實際執行 12 個測試檔共 68 個測試，輸出中可見 3 個既有失敗。
- [x] 1.3 完成「Root verification covers build and all existing test suites」，依「新 stage 置於 server 之前」，在 `scripts/verify.mjs` 的 `VERIFY_STAGES` 於 bundle-budget 之後、server 之前插入 shared stage，並把 `apps/web/scripts/run-tests.test.mjs` 加入既有的 runner stage 參數。驗證：更新 `scripts/verify.test.mjs` 既有的 stage 順序斷言為七個 stage 並通過；`apps/server/scripts/run-tests.test.mjs` 維持通過。

## 2. 修正 web 端暴露的 6 個失敗

- [x] 2.1 完成「Assertion failures surface as failures, not as timeouts」，依「對整份原始碼的 pattern 斷言改為布林斷言」修正實際承載 Overview 原始碼斷言的 `apps/web/src/pages/Overview/configRender.test.tsx`：把該檔案中對整份 `overviewSource` 或 `overviewRuntimeSource` 做 `assert.match` 或 `assert.doesNotMatch` 的斷言改寫為對 `String.prototype.includes` 結果的 `assert.equal` 並附說明訊息，使第 2.4 項的 hydration 契約失敗在一秒內以失敗訊息呈現而非停滯；hydration 契約本身由第 2.4 項判定。另將 `apps/web/src/pages/shared/DisplayLeafOrnament.tsx` 的 built-in PNG 靜態模組 import 改為 `new URL(..., import.meta.url).href`，讓 Node/tsx 可執行原本落在 gate 外的元件測試。驗證：`pnpm exec tsx --test src/pages/Overview/configRender.test.tsx src/pages/shared/DisplayLeafOrnament.test.tsx` 在 apps/web 目錄下通過，且 Overview 斷言在一秒內完成失敗訊息產生。
- [x] 2.2 [P] 修正 factory circuit runtime 的 slot precision 與 hidden unit 失敗：先從測試輸出取得實際斷言差異，判定是測試斷言了已被刻意改掉的實作細節，或是 runtime 偏離了仍然成立的契約，據此修測試或修程式碼。驗證：該測試所在檔案以 tsx 執行通過，並在交付說明記錄判定理由。
- [x] 2.3 [P] 修正 image management 的三個失敗（頁面圍繞 governance 與 editor handoff 重新配置、草稿仍為 dirty 時阻擋跨選取情境切換、library 與 editor 卡片各自保有捲動容器）：三者同屬 image management 介面契約，逐一判定該修測試或該修程式碼。驗證：該三個測試所在檔案以 tsx 執行通過，並在交付說明分別記錄判定理由。
- [x] 2.4 [P] 修正 overview runtime 的 story hydration 分階段失敗：判定該測試斷言的 hydration 分階段契約是否仍然成立，據此修測試或修程式碼。驗證：該測試所在檔案以 tsx 執行通過，並在交付說明記錄判定理由。

## 3. 修正 shared 端暴露的 3 個失敗

- [x] 3.1 [P] 修正 display liveness 的兩個失敗（10 秒 heartbeat 間隔與伺服器持有的無身分 payload、`buildDisplayClientLivenessSnapshot` 不外洩憑證與原始連線細節）：兩者同屬 display client liveness 契約，逐一判定該修測試或該修程式碼。特別注意第二個測試斷言的是不外洩憑證，若程式碼確實外洩則必須修程式碼而非放寬測試。驗證：`pnpm --filter @solar-display/shared test` 中該兩個測試通過，並在交付說明分別記錄判定理由。
- [x] 3.2 [P] 修正「every display runtime metric resolves to exactly one policy category」失敗：判定是新增的 metric 未被歸類，或是分類規則本身有重疊，據此修測試或修程式碼。驗證：`pnpm --filter @solar-display/shared test` 中該測試通過，並在交付說明記錄判定理由。

## 4. 新版 toolchain 啟動相容性

- [x] 4.1 完成「保留新版 toolchain 並消除啟動相容性警告」：保留目前 `pnpm-lock.yaml` 解析出的新版相依，在 `createFastifyOptions` 以 `LogController` 維持 `disableRequestLogging: true` 的既有行為並移除 `FSTDEP023`，讓 `vite.config.ts` 的本地 TypeScript import 可由 native config loader 解析，讓 web tsconfig 符合 TypeScript 7 的無 `baseUrl`、相對 `paths` 與 `noEmit` 下明確 `.ts` import 契約，更新 bundle-budget traversal 以涵蓋 Vite 8.2 lazy subtree 內的 static imports，並更新 workspace build policy讓 better-sqlite3 13 使用 bundled native binaries而不執行 node-gyp；不得以 warning suppression 或新增編譯 toolchain 取代修正。驗證：`pnpm install --frozen-lockfile` 與 better-sqlite3 runtime probe 通過、focused server test、bundle-budget regression 與 web build 通過、`pnpm --filter @solar-display/web exec vite build --configLoader native` 通過，且原生終端的 `pnpm dev` witness 不含 `FSTDEP023` 或 native config loader warning。

## 5. 交付驗證

- [x] 5.1 確認「Root verification covers build and all existing test suites」、「Assertion failures surface as failures, not as timeouts」與「每個失敗逐一判定該修哪一邊」在交付狀態下成立：執行 `pnpm verify` 並確認七個 stage 全綠，且輸出中可見 shared stage 的 label；回報時附上實際輸出摘要、新增執行的測試總數，以及 9 個既有失敗各自修測試或修產品程式碼的判定理由。
